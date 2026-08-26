import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, restaurants, type Order, type Restaurant } from "@/db/schema";
import { rejectOrder } from "./orders";
import { tokensMatch } from "./owner-token";

/** An order is stale once it has sat unacknowledged past the restaurant's window. */
export function isStale(
  order: Pick<Order, "placedAt" | "createdAt">,
  restaurant: Pick<Restaurant, "autoRejectMinutes">,
  nowMs: number,
): boolean {
  const placedAt = (order.placedAt ?? order.createdAt).getTime();
  return nowMs - placedAt > restaurant.autoRejectMinutes * 60000;
}

/**
 * Cron auth fails closed: without CRON_SECRET the endpoint is only callable in
 * development, never in production.
 */
export function cronAuthorized(
  authorization: string | null,
  secret: string | undefined,
  nodeEnv = process.env.NODE_ENV,
): boolean {
  if (!secret) return nodeEnv !== "production";
  return tokensMatch(authorization?.replace(/^Bearer\s+/i, ""), secret);
}

/**
 * Auto-reject sweep (PLAN.md §5.3): any order unacknowledged past the
 * restaurant's window is rejected and refunded in full. Runs from the cron
 * backstop and opportunistically on counter-page loads, so a live tablet
 * keeps the guarantee timely even without cron.
 */
export async function sweepStaleOrders(restaurantId?: string): Promise<number> {
  const where = restaurantId
    ? and(eq(orders.status, "placed"), eq(orders.restaurantId, restaurantId))
    : eq(orders.status, "placed");
  const stale = await db
    .select({ order: orders, restaurant: restaurants })
    .from(orders)
    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(where);

  let count = 0;
  const now = Date.now();
  for (const { order, restaurant } of stale) {
    if (isStale(order, restaurant, now)) {
      await rejectOrder(restaurant, order, true);
      count++;
    }
  }
  return count;
}
