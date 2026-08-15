import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { getRestaurantBySlug } from "@/lib/tenant";
import { AutoRefresh } from "./auto-refresh";

const STATUS_COPY: Record<string, { title: string; detail: string; live: boolean }> = {
  awaiting_payment: {
    title: "Finishing payment…",
    detail: "Complete payment to send your order to the kitchen.",
    live: true,
  },
  placed: {
    title: "Waiting for the kitchen to confirm",
    detail: "We'll text you the moment it's confirmed with a pickup time.",
    live: true,
  },
  accepted: {
    title: "Confirmed — the kitchen is on it",
    detail: "We'll text you when it's ready to pick up.",
    live: true,
  },
  ready: {
    title: "Ready for pickup!",
    detail: "Show your order code at the counter.",
    live: true,
  },
  picked_up: { title: "Picked up — enjoy!", detail: "Thanks for ordering direct.", live: false },
  rejected: {
    title: "Order declined",
    detail: "You have not been charged — your payment was refunded in full.",
    live: false,
  },
  auto_rejected: {
    title: "Order couldn't be confirmed",
    detail: "You have not been charged — your payment was refunded in full.",
    live: false,
  },
  canceled: { title: "Order canceled", detail: "", live: false },
};

export default async function OrderStatusPage({
  params,
}: PageProps<"/t/[slug]/order/[orderId]">) {
  const { slug, orderId } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) notFound();
  if (!/^[0-9a-f-]{36}$/.test(orderId)) notFound();

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.restaurantId, r.id)));
  if (!order) notFound();
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const copy = STATUS_COPY[order.status];

  return (
    <div className="mx-auto max-w-md py-14 text-center">
      {copy.live && <AutoRefresh />}
      <p
        className="text-xs font-semibold uppercase tracking-[0.2em]"
        style={{ color: "var(--t-accent)" }}
      >
        Order {order.code}
      </p>
      <h1 className="mt-2 text-3xl font-bold">{copy.title}</h1>
      <p className="mt-2" style={{ color: "var(--t-muted)" }}>
        {copy.detail}
      </p>
      {order.status === "accepted" && order.etaMinutes != null && (
        <p
          className="mx-auto mt-6 w-fit rounded-full px-5 py-2 font-semibold text-white"
          style={{ background: "var(--t-accent)" }}
        >
          Ready in about {order.etaMinutes} min
        </p>
      )}
      {order.status === "ready" && (
        <p
          className="mx-auto mt-6 w-fit rounded-2xl px-8 py-4 text-4xl font-black tracking-widest text-white"
          style={{ background: "var(--t-accent)" }}
        >
          {order.code}
        </p>
      )}

      <div
        className="mt-10 rounded-2xl border p-5 text-left"
        style={{ background: "var(--t-card)", borderColor: "var(--t-line)" }}
      >
        <ul className="space-y-1 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>
                {i.quantity}× {i.name}
              </span>
              <span>{formatCents(i.priceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl
          className="mt-3 space-y-1 border-t pt-3 text-sm"
          style={{ borderColor: "var(--t-line)" }}
        >
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt>Tax</dt><dd>{formatCents(order.taxCents)}</dd></div>
          <div className="flex justify-between"><dt>Tip</dt><dd>{formatCents(order.tipCents)}</dd></div>
          <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatCents(order.totalCents)}</dd></div>
        </dl>
      </div>
    </div>
  );
}
