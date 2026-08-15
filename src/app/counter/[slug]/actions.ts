"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { menuItems, orders, restaurants } from "@/db/schema";
import {
  acceptOrder,
  markPickedUp,
  markReady,
  rejectOrder,
} from "@/lib/orders";
import { requireOwner } from "@/lib/owner";

async function getOrder(restaurantId: string, orderId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId)));
  return order ?? null;
}

export async function counterAccept(
  slug: string,
  key: string,
  orderId: string,
  etaMinutes: number,
): Promise<void> {
  const r = await requireOwner(slug, key);
  if (!r) throw new Error("Unauthorized");
  const order = await getOrder(r.id, orderId);
  if (!order) throw new Error("Order not found");
  await acceptOrder(r, order, etaMinutes);
  revalidatePath(`/counter/${slug}`);
}

export async function counterReject(
  slug: string,
  key: string,
  orderId: string,
  reason?: string,
): Promise<void> {
  const r = await requireOwner(slug, key);
  if (!r) throw new Error("Unauthorized");
  const order = await getOrder(r.id, orderId);
  if (!order) throw new Error("Order not found");
  await rejectOrder(r, order, false, reason);
  revalidatePath(`/counter/${slug}`);
}

export async function counterReady(slug: string, key: string, orderId: string): Promise<void> {
  const r = await requireOwner(slug, key);
  if (!r) throw new Error("Unauthorized");
  const order = await getOrder(r.id, orderId);
  if (!order) throw new Error("Order not found");
  await markReady(r, order);
  revalidatePath(`/counter/${slug}`);
}

export async function counterPickedUp(slug: string, key: string, orderId: string): Promise<void> {
  const r = await requireOwner(slug, key);
  if (!r) throw new Error("Unauthorized");
  const order = await getOrder(r.id, orderId);
  if (!order) throw new Error("Order not found");
  await markPickedUp(order);
  revalidatePath(`/counter/${slug}`);
}

export async function togglePause(slug: string, key: string, paused: boolean): Promise<void> {
  const r = await requireOwner(slug, key);
  if (!r) throw new Error("Unauthorized");
  await db
    .update(restaurants)
    .set({ orderingPaused: paused })
    .where(eq(restaurants.id, r.id));
  revalidatePath(`/counter/${slug}`);
}

export async function toggleItemAvailable(
  slug: string,
  key: string,
  menuItemId: string,
  available: boolean,
): Promise<void> {
  const r = await requireOwner(slug, key);
  if (!r) throw new Error("Unauthorized");
  await db
    .update(menuItems)
    .set({ available })
    .where(and(eq(menuItems.id, menuItemId), eq(menuItems.restaurantId, r.id)));
  revalidatePath(`/counter/${slug}`);
}
