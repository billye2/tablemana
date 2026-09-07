"use client";

import { useEffect, useState, useTransition } from "react";
import { bookReservation, getSlots } from "../actions";

type SlotLite = { startIso: string; remaining: number };

function slotLabel(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function dateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function ReserveClient({
  slug,
  timezone,
  maxPartySize,
  dates,
  smsEnabled,
}: {
  slug: string;
  timezone: string;
  maxPartySize: number;
  dates: string[];
  smsEnabled: boolean;
}) {
  const [date, setDate] = useState(dates[0]);
  const [slotsData, setSlotsData] = useState<{ date: string; slots: SlotLite[] } | null>(
    null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    getSlots(slug, date).then((s) => {
      if (alive) setSlotsData({ date, slots: s });
    });
    return () => {
      alive = false;
    };
  }, [slug, date]);
  const slots = slotsData?.date === date ? slotsData.slots : null;

  function submit() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await bookReservation({
        slug,
        slotStartIso: selected,
        partySize,
        name,
        phone,
        marketingConsent: consent,
      });
      if (result.ok) {
        setConfirmation(result.message);
      } else {
        setError(result.error);
      }
    });
  }

  if (confirmation) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-3xl font-bold">You&apos;re booked!</h1>
        <p className="mt-3" style={{ color: "var(--t-muted)" }}>
          {confirmation}
        </p>
        <p className="mt-2 text-sm" style={{ color: "var(--t-muted)" }}>
          A confirmation text is on its way with a cancel link if plans change.
        </p>
      </div>
    );
  }

  const available = (slots ?? []).filter((s) => s.remaining >= partySize);

  return (
    <div className="mx-auto max-w-xl py-8 sm:py-10">
      <h1 className="text-2xl font-bold">Reserve a table</h1>

      <p className="mt-6 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>
        Party size
      </p>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: maxPartySize }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => setPartySize(n)}
            className="h-11 w-11 rounded-full border text-sm font-semibold"
            style={
              partySize === n
                ? { background: "var(--t-accent)", borderColor: "var(--t-accent)", color: "#fff" }
                : { borderColor: "var(--t-line)" }
            }
          >
            {n}
          </button>
        ))}
      </div>

      <p className="mt-6 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>
        Date
      </p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {dates.map((d) => (
          <button
            key={d}
            onClick={() => {
              setDate(d);
              setSelected(null);
            }}
            className="min-h-11 shrink-0 rounded-lg border px-4 text-sm font-medium"
            style={
              date === d
                ? { background: "var(--t-accent)", borderColor: "var(--t-accent)", color: "#fff" }
                : { borderColor: "var(--t-line)" }
            }
          >
            {dateLabel(d)}
          </button>
        ))}
      </div>

      <p className="mt-6 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>
        Time
      </p>
      {slots === null ? (
        <p className="text-sm" style={{ color: "var(--t-muted)" }}>Loading times…</p>
      ) : available.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--t-muted)" }}>
          No times available for {partySize} on this date — try another day.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((s) => (
            <button
              key={s.startIso}
              onClick={() => setSelected(s.startIso)}
              className="min-h-11 rounded-lg border px-4 text-sm font-medium"
              style={
                selected === s.startIso
                  ? { background: "var(--t-accent)", borderColor: "var(--t-accent)", color: "#fff" }
                  : { borderColor: "var(--t-line)" }
              }
            >
              {slotLabel(s.startIso, timezone)}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="mt-8 scroll-mt-20 rounded-2xl border p-4 sm:p-5"
          style={{ background: "var(--t-card)", borderColor: "var(--t-line)" }}
        >
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              enterKeyHint="next"
              className="min-h-11 w-full rounded-lg border bg-transparent px-3 text-sm"
              style={{ borderColor: "var(--t-line)" }}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile number (for confirmation text)"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="done"
              className="min-h-11 w-full rounded-lg border bg-transparent px-3 text-sm"
              style={{ borderColor: "var(--t-line)" }}
            />
            <label className="flex min-h-11 items-center gap-2.5 text-xs" style={{ color: "var(--t-muted)" }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="h-5 w-5 shrink-0"
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
            className="mt-4 min-h-12 w-full rounded-full font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--t-accent)" }}
          >
            {pending ? "Booking…" : `Book table for ${partySize}`}
          </button>
          {!smsEnabled && (
            <p className="mt-3 text-center text-xs" style={{ color: "var(--t-muted)" }}>
              This is a demo: the SMS provider is not enabled, so no confirmation text
              will be sent. Your booking is still recorded.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
