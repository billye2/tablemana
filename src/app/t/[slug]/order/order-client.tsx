"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCents, TIP_PRESETS } from "@/lib/money";
import { placeOrder } from "../actions";

type MenuItemLite = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  photoUrl: string | null;
};
type SectionLite = { id: string; name: string; items: MenuItemLite[] };

export function OrderClient({
  slug,
  menu,
  taxRateBps,
  orderingPaused,
}: {
  slug: string;
  menu: SectionLite[];
  taxRateBps: number;
  orderingPaused: boolean;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [tipPercent, setTipPercent] = useState<number>(18);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allItems = useMemo(
    () => new Map(menu.flatMap((s) => s.items).map((i) => [i.id, i])),
    [menu],
  );
  const lines = Object.entries(cart).filter(([, q]) => q > 0);
  const subtotal = lines.reduce(
    (sum, [id, q]) => sum + (allItems.get(id)?.priceCents ?? 0) * q,
    0,
  );
  const tax = Math.round((subtotal * taxRateBps) / 10000);
  const tip = Math.round((subtotal * tipPercent) / 100);
  const total = subtotal + tax + tip;

  const add = (id: string, delta: number) =>
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }));

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await placeOrder({
        slug,
        name,
        phone,
        tipPercent,
        notes: notes || undefined,
        marketingConsent: consent,
        items: lines.map(([menuItemId, quantity]) => ({ menuItemId, quantity })),
      });
      if (result.ok) {
        router.push(result.redirect);
      } else {
        setError(result.error);
      }
    });
  }

  if (orderingPaused) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Ordering is paused</h1>
        <p className="mt-2" style={{ color: "var(--t-muted)" }}>
          The kitchen is catching up — please check back in a few minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 py-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Order pickup</h1>
        {menu.map((section) => (
          <div key={section.id}>
            <h2
              className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: "var(--t-accent)" }}
            >
              {section.name}
            </h2>
            <ul className="space-y-2">
              {section.items.map((item) => {
                const qty = cart[item.id] ?? 0;
                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border p-3"
                    style={{ background: "var(--t-card)", borderColor: "var(--t-line)" }}
                  >
                    {item.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm" style={{ color: "var(--t-muted)" }}>
                        {formatCents(item.priceCents)}
                      </p>
                    </div>
                    {qty === 0 ? (
                      <button
                        onClick={() => add(item.id, 1)}
                        className="shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold"
                        style={{ borderColor: "var(--t-accent)", color: "var(--t-accent)" }}
                      >
                        Add
                      </button>
                    ) : (
                      <div
                        className="flex shrink-0 items-center gap-3 rounded-full px-2 py-1 text-white"
                        style={{ background: "var(--t-accent)" }}
                      >
                        <button onClick={() => add(item.id, -1)} className="px-2 text-lg leading-none" aria-label={`Remove one ${item.name}`}>
                          −
                        </button>
                        <span className="text-sm font-bold">{qty}</span>
                        <button onClick={() => add(item.id, 1)} className="px-2 text-lg leading-none" aria-label={`Add one ${item.name}`}>
                          +
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div
          className="rounded-2xl border p-5"
          style={{ background: "var(--t-card)", borderColor: "var(--t-line)" }}
        >
          <h2 className="mb-4 text-lg font-bold">Your order</h2>
          {lines.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--t-muted)" }}>
              Add something from the menu to get started.
            </p>
          ) : (
            <>
              <ul className="mb-4 space-y-1 text-sm">
                {lines.map(([id, q]) => (
                  <li key={id} className="flex justify-between">
                    <span>
                      {q}× {allItems.get(id)?.name}
                    </span>
                    <span>{formatCents((allItems.get(id)?.priceCents ?? 0) * q)}</span>
                  </li>
                ))}
              </ul>

              <div className="mb-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>
                  Tip (100% goes to the restaurant)
                </p>
                <div className="flex gap-2">
                  {[...TIP_PRESETS, 0].map((p) => (
                    <button
                      key={p}
                      onClick={() => setTipPercent(p)}
                      className="flex-1 rounded-lg border px-2 py-1.5 text-sm font-semibold"
                      style={
                        tipPercent === p
                          ? { background: "var(--t-accent)", borderColor: "var(--t-accent)", color: "#fff" }
                          : { borderColor: "var(--t-line)" }
                      }
                    >
                      {p === 0 ? "None" : `${p}%`}
                    </button>
                  ))}
                </div>
              </div>

              <dl className="mb-4 space-y-1 border-t pt-3 text-sm" style={{ borderColor: "var(--t-line)" }}>
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCents(subtotal)}</dd></div>
                <div className="flex justify-between"><dt>Tax</dt><dd>{formatCents(tax)}</dd></div>
                <div className="flex justify-between"><dt>Tip</dt><dd>{formatCents(tip)}</dd></div>
                <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatCents(total)}</dd></div>
              </dl>

              <div className="space-y-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
                  style={{ borderColor: "var(--t-line)" }}
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile number (for pickup texts)"
                  inputMode="tel"
                  className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
                  style={{ borderColor: "var(--t-line)" }}
                />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for the kitchen (optional)"
                  rows={2}
                  className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
                  style={{ borderColor: "var(--t-line)" }}
                />
                <label className="flex items-start gap-2 text-xs" style={{ color: "var(--t-muted)" }}>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  The restaurant may text me about future offers.
                </label>
              </div>

              {error && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <button
                onClick={submit}
                disabled={pending || !name || !phone}
                className="mt-4 w-full rounded-full py-3 font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--t-accent)" }}
              >
                {pending ? "Placing order…" : `Pay ${formatCents(total)}`}
              </button>
              <p className="mt-2 text-center text-xs" style={{ color: "var(--t-muted)" }}>
                Pay online now — pick up when we text you it&apos;s ready.
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
