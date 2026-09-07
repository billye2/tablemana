"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";
import {
  counterAccept,
  counterPickedUp,
  counterReady,
  counterReject,
  toggleItemAvailable,
  togglePause,
} from "./actions";

type OrderLite = {
  id: string;
  code: string;
  status: string;
  totalCents: number;
  tipCents: number;
  etaMinutes: number | null;
  notes: string | null;
  placedAtIso: string;
  customerName: string;
  items: { id: string; name: string; quantity: number }[];
};

type MenuItemLite = { id: string; name: string; available: boolean; section: string };

const ETA_CHOICES = [10, 15, 20, 30, 45];

function minutesAgo(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

export function CounterClient({
  slug,
  counterKey,
  restaurantName,
  orderingPaused,
  autoRejectMinutes,
  orders,
  menuItems,
}: {
  slug: string;
  counterKey: string;
  restaurantName: string;
  orderingPaused: boolean;
  autoRejectMinutes: number;
  orders: OrderLite[];
  menuItems: MenuItemLite[];
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<"orders" | "menu">("orders");
  const [etaFor, setEtaFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const poll = setInterval(() => router.refresh(), 5000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [router]);

  const act = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  const incoming = orders.filter((o) => o.status === "placed");
  const inProgress = orders.filter((o) => o.status === "accepted");
  const ready = orders.filter((o) => o.status === "ready");
  const done = orders.filter((o) => o.status === "picked_up");

  function OrderCard({ o }: { o: OrderLite }) {
    const age = minutesAgo(o.placedAtIso, now);
    const isNew = o.status === "placed";
    const left = autoRejectMinutes - age;
    return (
      <div
        className={`rounded-xl border p-4 ${
          isNew ? "border-amber-400 bg-amber-500/10" : "border-zinc-700 bg-zinc-900"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xl font-black tracking-widest">{o.code}</p>
          <p className="min-w-0 truncate text-right text-sm text-zinc-400">
            {o.customerName} · {age}m ago
          </p>
        </div>
        <ul className="mt-2 space-y-0.5 text-lg">
          {o.items.map((i) => (
            <li key={i.id}>
              <span className="font-bold">{i.quantity}×</span> {i.name}
            </li>
          ))}
        </ul>
        {o.notes && (
          <p className="mt-2 rounded bg-zinc-800 px-2 py-1 text-sm text-amber-200">
            “{o.notes}”
          </p>
        )}
        <p className="mt-2 text-sm text-zinc-400">
          {formatCents(o.totalCents)} · tip {formatCents(o.tipCents)}
        </p>

        {isNew && (
          <div className="mt-3">
            {left <= 5 && (
              <p className="mb-2 text-sm font-semibold text-red-400">
                {left > 0
                  ? `Auto-refunds in ${left} min if not accepted`
                  : "Auto-refund imminent"}
              </p>
            )}
            {etaFor === o.id ? (
              <div className="flex flex-wrap gap-2">
                {ETA_CHOICES.map((m) => (
                  <button
                    key={m}
                    disabled={pending}
                    onClick={() => act(() => counterAccept(slug, counterKey, o.id, m))}
                    className="min-h-12 flex-1 rounded-lg bg-emerald-600 px-4 text-lg font-bold disabled:opacity-50 sm:flex-none"
                  >
                    {m}m
                  </button>
                ))}
                <button
                  onClick={() => setEtaFor(null)}
                  className="min-h-12 rounded-lg border border-zinc-600 px-4"
                >
                  Back
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  disabled={pending}
                  onClick={() => setEtaFor(o.id)}
                  className="flex-1 rounded-lg bg-emerald-600 py-3 text-lg font-bold disabled:opacity-50"
                >
                  Accept — pick time
                </button>
                <button
                  disabled={pending}
                  onClick={() => act(() => counterReject(slug, counterKey, o.id))}
                  className="rounded-lg border border-red-500 px-4 py-3 font-semibold text-red-400 disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        )}
        {o.status === "accepted" && (
          <button
            disabled={pending}
            onClick={() => act(() => counterReady(slug, counterKey, o.id))}
            className="mt-3 w-full rounded-lg bg-sky-600 py-3 text-lg font-bold disabled:opacity-50"
          >
            Mark ready {o.etaMinutes != null && `(quoted ${o.etaMinutes}m)`}
          </button>
        )}
        {o.status === "ready" && (
          <button
            disabled={pending}
            onClick={() => act(() => counterPickedUp(slug, counterKey, o.id))}
            className="mt-3 w-full rounded-lg bg-zinc-700 py-3 text-lg font-bold disabled:opacity-50"
          >
            Picked up
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 px-4 py-2.5 pt-safe sm:py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <h1 className="truncate font-bold">{restaurantName}</h1>
            <p className="text-xs text-zinc-400">Counter</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/dashboard/${slug}/help#counter`}
              className="inline-flex min-h-11 items-center rounded-lg bg-zinc-800 px-3 text-sm font-semibold text-zinc-300"
              title="How the counter works"
              aria-label="How the counter works"
            >
              ?
            </a>
            <button
              onClick={() => setTab("orders")}
              className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${tab === "orders" ? "bg-zinc-100 text-zinc-950" : "bg-zinc-800"}`}
            >
              Orders{incoming.length > 0 && ` (${incoming.length})`}
            </button>
            <button
              onClick={() => setTab("menu")}
              className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${tab === "menu" ? "bg-zinc-100 text-zinc-950" : "bg-zinc-800"}`}
            >
              86 board
            </button>
            <button
              disabled={pending}
              onClick={() => act(() => togglePause(slug, counterKey, !orderingPaused))}
              className={`min-h-11 rounded-lg px-3 text-sm font-bold ${
                orderingPaused ? "bg-red-600" : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {orderingPaused ? (
                <>
                  <span className="sm:hidden">PAUSED — resume</span>
                  <span className="hidden sm:inline">Ordering PAUSED — resume</span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">Pause</span>
                  <span className="hidden sm:inline">Pause ordering</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 pb-safe sm:py-6">
        {tab === "orders" ? (
          <div className="grid gap-6 md:grid-cols-3">
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-amber-400">
                New ({incoming.length})
              </h2>
              <div className="space-y-3">
                {incoming.map((o) => (
                  <OrderCard key={o.id} o={o} />
                ))}
                {incoming.length === 0 && (
                  <p className="text-sm text-zinc-500">No new orders.</p>
                )}
              </div>
            </section>
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-emerald-400">
                In progress ({inProgress.length})
              </h2>
              <div className="space-y-3">
                {inProgress.map((o) => (
                  <OrderCard key={o.id} o={o} />
                ))}
              </div>
            </section>
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-sky-400">
                Ready ({ready.length})
              </h2>
              <div className="space-y-3">
                {ready.map((o) => (
                  <OrderCard key={o.id} o={o} />
                ))}
                {done.length > 0 && (
                  <p className="pt-2 text-xs text-zinc-500">
                    {done.length} picked up in the last 24h
                  </p>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-2">
            <p className="mb-4 text-sm text-zinc-400">
              Tap an item to 86 it — it disappears from the site instantly and
              comes back when you tap again.
            </p>
            {menuItems.map((m) => (
              <button
                key={m.id}
                disabled={pending}
                onClick={() => act(() => toggleItemAvailable(slug, counterKey, m.id, !m.available))}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
                  m.available
                    ? "border-zinc-700 bg-zinc-900"
                    : "border-red-500/50 bg-red-950/40 text-red-300"
                }`}
              >
                <span>
                  <span className="font-semibold">{m.name}</span>
                  <span className="ml-2 text-xs text-zinc-500">{m.section}</span>
                </span>
                <span className="text-sm font-bold">
                  {m.available ? "Available" : "86'd"}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
