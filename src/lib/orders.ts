import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  orderEvents,
  orders,
  type Order,
  type OrderEventType,
  type OrderStatus,
  type Restaurant,
} from "@/db/schema";
import { refundPayment } from "./payments";
import { sendSms } from "./sms";

export async function recordEvent(
  orderId: string,
  type: OrderEventType,
  data?: Record<string, unknown>,
): Promise<void> {
  await db.insert(orderEvents).values({ orderId, type, data });
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["placed", "canceled"],
  placed: ["accepted", "rejected", "auto_rejected"],
  accepted: ["ready", "rejected"],
  ready: ["picked_up"],
  picked_up: [],
  rejected: [],
  auto_rejected: [],
  canceled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

async function customerPhone(order: Order): Promise<string | null> {
  if (!order.customerId) return null;
  const [c] = await db
    .select({ phone: customers.phone })
    .from(customers)
    .where(eq(customers.id, order.customerId));
  return c?.phone ?? null;
}

async function notify(order: Order, body: string): Promise<void> {
  const phone = await customerPhone(order);
  if (!phone) return;
  const ok = await sendSms(phone, body);
  await recordEvent(order.id, "sms_sent", { body, delivered: ok });
}

export async function markPaid(restaurant: Restaurant, order: Order): Promise<Order> {
  const [updated] = await db
    .update(orders)
    .set({ status: "placed", placedAt: new Date() })
    .where(eq(orders.id, order.id))
    .returning();
  await recordEvent(order.id, "paid", { totalCents: order.totalCents });
  await notify(
    updated,
    `${restaurant.name}: got your order ${order.code}! We'll text you when it's confirmed with a pickup time.`,
  );
  return updated;
}

export async function acceptOrder(
  restaurant: Restaurant,
  order: Order,
  etaMinutes: number,
): Promise<Order> {
  if (!canTransition(order.status, "accepted")) {
    throw new Error(`Cannot accept order in status ${order.status}`);
  }
  const [updated] = await db
    .update(orders)
    .set({ status: "accepted", etaMinutes })
    .where(eq(orders.id, order.id))
    .returning();
  await recordEvent(order.id, "accepted", { etaMinutes });
  await notify(
    updated,
    `${restaurant.name}: order ${order.code} confirmed — ready in about ${etaMinutes} min.`,
  );
  return updated;
}

export async function markReady(restaurant: Restaurant, order: Order): Promise<Order> {
  if (!canTransition(order.status, "ready")) {
    throw new Error(`Cannot mark ready from status ${order.status}`);
  }
  const [updated] = await db
    .update(orders)
    .set({ status: "ready" })
    .where(eq(orders.id, order.id))
    .returning();
  await recordEvent(order.id, "ready");
  await notify(
    updated,
    `${restaurant.name}: order ${order.code} is ready for pickup!`,
  );
  return updated;
}

export async function markPickedUp(order: Order): Promise<Order> {
  if (!canTransition(order.status, "picked_up")) {
    throw new Error(`Cannot mark picked up from status ${order.status}`);
  }
  const [updated] = await db
    .update(orders)
    .set({ status: "picked_up" })
    .where(eq(orders.id, order.id))
    .returning();
  await recordEvent(order.id, "picked_up");
  return updated;
}

export async function rejectOrder(
  restaurant: Restaurant,
  order: Order,
  auto: boolean,
  reason?: string,
): Promise<Order> {
  const to: OrderStatus = auto ? "auto_rejected" : "rejected";
  if (!canTransition(order.status, to)) {
    throw new Error(`Cannot reject from status ${order.status}`);
  }
  const [updated] = await db
    .update(orders)
    .set({ status: to })
    .where(eq(orders.id, order.id))
    .returning();
  await recordEvent(order.id, to, reason ? { reason } : undefined);
  // Money must never sit against a silent restaurant (PLAN.md §5.3).
  await refundPayment(restaurant, order.stripePaymentIntentId);
  await recordEvent(order.id, "refunded");
  await notify(
    updated,
    auto
      ? `${restaurant.name}: sorry — we couldn't confirm order ${order.code} in time. You have NOT been charged; your payment was refunded in full.`
      : `${restaurant.name}: sorry — order ${order.code} was declined${reason ? ` (${reason})` : ""}. Your payment was refunded in full.`,
  );
  return updated;
}

export function generateOrderCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
