import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, menuItems, menuSections, orderItems, orders } from "@/db/schema";
import { sweepStaleOrders } from "@/lib/auto-reject";
import { requireOwner } from "@/lib/owner";
import { CounterClient } from "./counter-client";

export const dynamic = "force-dynamic";

export default async function CounterPage({
  params,
  searchParams,
}: PageProps<"/counter/[slug]">) {
  const { slug } = await params;
  const { key } = (await searchParams) as { key?: string };
  const r = await requireOwner(slug, key);
  if (!r) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <p>Invalid or missing counter key. Open the link from your welcome email.</p>
      </div>
    );
  }

  await sweepStaleOrders(r.id);

  const activeOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, r.id),
        inArray(orders.status, ["placed", "accepted", "ready", "picked_up"]),
        gte(orders.createdAt, sql`now() - interval '24 hours'`),
      ),
    )
    .orderBy(desc(orders.createdAt));

  const orderIds = activeOrders.map((o) => o.id);
  const items = orderIds.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
    : [];
  const customerIds = activeOrders.flatMap((o) => (o.customerId ? [o.customerId] : []));
  const custs = customerIds.length
    ? await db.select().from(customers).where(inArray(customers.id, customerIds))
    : [];
  const custById = new Map(custs.map((c) => [c.id, c]));

  const sections = await db
    .select()
    .from(menuSections)
    .where(eq(menuSections.restaurantId, r.id));
  const menu = await db.select().from(menuItems).where(eq(menuItems.restaurantId, r.id));
  const sectionName = new Map(sections.map((s) => [s.id, s.name]));

  return (
    <CounterClient
      slug={slug}
      counterKey={key!}
      restaurantName={r.name}
      orderingPaused={r.orderingPaused}
      autoRejectMinutes={r.autoRejectMinutes}
      orders={activeOrders.map((o) => ({
        id: o.id,
        code: o.code,
        status: o.status,
        totalCents: o.totalCents,
        tipCents: o.tipCents,
        etaMinutes: o.etaMinutes,
        notes: o.notes,
        placedAtIso: (o.placedAt ?? o.createdAt).toISOString(),
        customerName: o.customerId ? (custById.get(o.customerId)?.name ?? "Guest") : "Guest",
        items: items
          .filter((i) => i.orderId === o.id)
          .map((i) => ({ id: i.id, name: i.name, quantity: i.quantity })),
      }))}
      menuItems={menu.map((m) => ({
        id: m.id,
        name: m.name,
        available: m.available,
        section: sectionName.get(m.sectionId) ?? "",
      }))}
    />
  );
}
