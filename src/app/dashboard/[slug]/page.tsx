import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders, reservations } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { requireOwner } from "@/lib/owner";
import { formatSlotFull } from "@/lib/time";
import { DashboardNav, Unauthorized } from "./nav";
import { ReservationRow } from "./reservation-row";

export const dynamic = "force-dynamic";

export default async function DashboardOverview({
  params,
  searchParams,
}: PageProps<"/dashboard/[slug]">) {
  const { slug } = await params;
  const { key } = (await searchParams) as { key?: string };
  const r = await requireOwner(slug, key);
  if (!r) return <Unauthorized />;

  const [todayStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
      tips: sql<number>`coalesce(sum(${orders.tipCents}), 0)::int`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, r.id),
        gte(orders.createdAt, sql`now() - interval '24 hours'`),
        inArray(orders.status, ["placed", "accepted", "ready", "picked_up"]),
      ),
    );

  const [customerCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(eq(customers.restaurantId, r.id));

  const upcoming = await db
    .select({ reservation: reservations, customer: customers })
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .where(
      and(
        eq(reservations.restaurantId, r.id),
        gte(reservations.slotStart, sql`now()`),
        ne(reservations.status, "canceled"),
      ),
    )
    .orderBy(reservations.slotStart)
    .limit(20);

  const recentOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.restaurantId, r.id), ne(orders.status, "awaiting_payment")))
    .orderBy(desc(orders.createdAt))
    .limit(10);

  return (
    <div className="min-h-screen bg-zinc-50">
      <DashboardNav slug={slug} active="" restaurantName={r.name} />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Orders (24h)", String(todayStats.count)],
            ["Revenue (24h)", formatCents(todayStats.revenue)],
            ["Customer list", `${customerCount.count} people`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zinc-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {label}
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
            </div>
          ))}
        </div>

        <section>
          <h2 className="mb-3 font-bold text-zinc-900">Upcoming reservations</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {upcoming.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">No upcoming reservations.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {upcoming.map(({ reservation, customer }) => (
                  <ReservationRow
                    key={reservation.id}
                    slug={slug}
                    ownerKey={key ?? ""}
                    id={reservation.id}
                    status={reservation.status}
                    label={`${formatSlotFull(reservation.slotStart, r.timezone)} · party of ${reservation.partySize}`}
                    who={customer ? `${customer.name} (${customer.phone})` : "Guest"}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-bold text-zinc-900">Recent orders</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <ul className="divide-y divide-zinc-100 text-sm">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between px-5 py-3">
                  <span className="font-mono font-bold">{o.code}</span>
                  <span className="text-zinc-500">{o.status.replace("_", " ")}</span>
                  <span className="font-medium">{formatCents(o.totalCents)}</span>
                </li>
              ))}
              {recentOrders.length === 0 && (
                <li className="px-5 py-6 text-zinc-500">No orders yet.</li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
