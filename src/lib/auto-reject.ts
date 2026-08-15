import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, restaurants } from "@/db/schema";
import { rejectOrder } from "./orders";

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
    const placedAt = (order.placedAt ?? order.createdAt).getTime();
    if (now - placedAt > restaurant.autoRejectMinutes * 60000) {
      await rejectOrder(restaurant, order, true);
      count++;
    }
  }
  return count;
}
