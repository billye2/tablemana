"use server";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/db";
import {
  customers,
  menuItems,
  orderItems,
  orders,
  reservations,
} from "@/db/schema";
import { PLATFORM_FEE_CENTS, taxFor } from "@/lib/money";
import { generateOrderCode, markPaid, recordEvent } from "@/lib/orders";
import { beginPayment } from "@/lib/payments";
import { slotsForDate } from "@/lib/slots";
import { sendSms } from "@/lib/sms";
import { getRestaurantBySlug, tenantUrl } from "@/lib/tenant";
import { formatSlotFull, todayInTz } from "@/lib/time";

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

async function upsertCustomer(
  restaurantId: string,
  name: string,
  phone: string,
  marketingConsent: boolean,
): Promise<string> {
  const [existing] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.restaurantId, restaurantId), eq(customers.phone, phone)));
  if (existing) {
    await db
      .update(customers)
      .set({ name, marketingConsent: existing.marketingConsent || marketingConsent })
      .where(eq(customers.id, existing.id));
    return existing.id;
  }
  const [created] = await db
    .insert(customers)
    .values({ restaurantId, name, phone, marketingConsent })
    .returning();
  return created.id;
}

const placeOrderSchema = z.object({
  slug: z.string(),
  name: z.string().min(1).max(120),
  phone: z.string(),
  tipPercent: z.number().min(0).max(100),
  notes: z.string().max(500).optional(),
  marketingConsent: z.boolean(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(50),
});

export type PlaceOrderResult =
  | { ok: true; redirect: string }
  | { ok: false; error: string };

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid order." };
  const { slug, name, tipPercent, notes, marketingConsent, items } = parsed.data;

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return { ok: false, error: "Restaurant not found." };
  if (restaurant.orderingPaused) {
    return { ok: false, error: "Ordering is paused right now — please check back soon." };
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { ok: false, error: "Enter a valid US phone number." };

  // Server-side price + availability check — never trust the cart.
  const dbItems = await db
    .select()
    .from(menuItems)
    .where(
      and(
        eq(menuItems.restaurantId, restaurant.id),
        inArray(
          menuItems.id,
          items.map((i) => i.menuItemId),
        ),
      ),
    );
  const byId = new Map(dbItems.map((i) => [i.id, i]));
  for (const line of items) {
    const item = byId.get(line.menuItemId);
    if (!item) return { ok: false, error: "An item in your cart no longer exists." };
    if (!item.available) {
      return { ok: false, error: `"${item.name}" just sold out — please remove it.` };
    }
  }

  const subtotalCents = items.reduce(
    (sum, line) => sum + byId.get(line.menuItemId)!.priceCents * line.quantity,
    0,
  );
  const taxCents = taxFor(subtotalCents, restaurant.taxRateBps);
  const tipCents = Math.round((subtotalCents * tipPercent) / 100);
  const totalCents = subtotalCents + taxCents + tipCents;

  const customerId = await upsertCustomer(restaurant.id, name, phone, marketingConsent);

  const [order] = await db
    .insert(orders)
    .values({
      restaurantId: restaurant.id,
      customerId,
      code: generateOrderCode(),
      subtotalCents,
      taxCents,
      tipCents,
      totalCents,
      platformFeeCents: PLATFORM_FEE_CENTS,
      notes,
    })
    .returning();

  await db.insert(orderItems).values(
    items.map((line) => {
      const item = byId.get(line.menuItemId)!;
      return {
        orderId: order.id,
        menuItemId: item.id,
        name: item.name,
        priceCents: item.priceCents,
        quantity: line.quantity,
      };
    }),
  );
  await recordEvent(order.id, "created", { subtotalCents, totalCents });

  const statusPath = `/order/${order.id}`;
  const summary = items
    .map((l) => `${l.quantity}× ${byId.get(l.menuItemId)!.name}`)
    .join(", ");
  const payment = await beginPayment(
    restaurant,
    order,
    summary,
    tenantUrl(slug, statusPath),
  );
  if (payment.type === "redirect") {
    return { ok: true, redirect: payment.url };
  }
  if (payment.type === "unavailable") {
    console.error(`[payments] refusing order ${order.id} for ${slug}: ${payment.reason}`);
    await db.update(orders).set({ status: "canceled" }).where(eq(orders.id, order.id));
    await recordEvent(order.id, "canceled", { reason: payment.reason });
    return {
      ok: false,
      error: "Online payment isn't set up for this restaurant yet — please call to order.",
    };
  }
  await markPaid(restaurant, order);
  return { ok: true, redirect: `/t/${slug}${statusPath}` };
}

const reserveSchema = z.object({
  slug: z.string(),
  slotStartIso: z.string(),
  partySize: z.number().int().min(1).max(50),
  name: z.string().min(1).max(120),
  phone: z.string(),
  marketingConsent: z.boolean(),
});

export type ReserveResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function bookReservation(input: unknown): Promise<ReserveResult> {
  const parsed = reserveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid reservation." };
  const { slug, slotStartIso, partySize, name, marketingConsent } = parsed.data;

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant || !restaurant.reservationsEnabled) {
    return { ok: false, error: "Reservations are unavailable." };
  }
  if (partySize > restaurant.maxPartySize) {
    return {
      ok: false,
      error: `For parties over ${restaurant.maxPartySize}, please call us.`,
    };
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { ok: false, error: "Enter a valid US phone number." };

  const slotStart = new Date(slotStartIso);
  if (Number.isNaN(slotStart.getTime()) || slotStart.getTime() < Date.now()) {
    return { ok: false, error: "That time is no longer available." };
  }

  // Re-check capacity at booking time — the slot list the diner saw may be stale.
  const [{ covers }] = await db
    .select({ covers: sql<number>`coalesce(sum(${reservations.partySize}), 0)::int` })
    .from(reservations)
    .where(
      and(
        eq(reservations.restaurantId, restaurant.id),
        eq(reservations.slotStart, slotStart),
        ne(reservations.status, "canceled"),
      ),
    );
  if (covers + partySize > restaurant.coversPerSlot) {
    return { ok: false, error: "That slot just filled up — pick another time." };
  }

  const customerId = await upsertCustomer(restaurant.id, name, phone, marketingConsent);
  const cancelToken = randomBytes(12).toString("hex");
  await db.insert(reservations).values({
    restaurantId: restaurant.id,
    customerId,
    slotStart,
    partySize,
    cancelToken,
  });

  const when = formatSlotFull(slotStart, restaurant.timezone);
  await sendSms(
    phone,
    `${restaurant.name}: table for ${partySize} confirmed — ${when}. Need to cancel? ${tenantUrl(slug, `/reserve/cancel/${cancelToken}`)}`,
  );
  return { ok: true, message: `Table for ${partySize} confirmed — ${when}.` };
}

export async function cancelReservation(slug: string, token: string): Promise<boolean> {
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return false;
  const [updated] = await db
    .update(reservations)
    .set({ status: "canceled" })
    .where(
      and(
        eq(reservations.restaurantId, restaurant.id),
        eq(reservations.cancelToken, token),
        eq(reservations.status, "confirmed"),
      ),
    )
    .returning();
  return Boolean(updated);
}

/** Slot availability for the reserve page (client refetches on date change). */
export async function getSlots(slug: string, dateStr: string) {
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return [];
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateStr
    : todayInTz(restaurant.timezone);
  const slots = await slotsForDate(restaurant, valid);
  return slots.map((s) => ({ startIso: s.start.toISOString(), remaining: s.remaining }));
}
