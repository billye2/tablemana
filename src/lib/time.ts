/** Timezone helpers using Intl only — no date library. */

/** Offset of `tz` from UTC in minutes at the given instant. */
function tzOffsetMinutes(atUtc: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(atUtc).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtc - atUtc.getTime()) / 60000;
}

/** UTC instant for local wall time `HH:MM` on `YYYY-MM-DD` in `tz`. */
export function zonedTimeToUtc(dateStr: string, timeStr: string, tz: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Two-pass: offset can differ across a DST boundary near the guess.
  const offset1 = tzOffsetMinutes(new Date(guess), tz);
  const utc = guess - offset1 * 60000;
  const offset2 = tzOffsetMinutes(new Date(utc), tz);
  return new Date(guess - offset2 * 60000);
}

/** `YYYY-MM-DD` for the current date in `tz`. */
export function todayInTz(tz: string, offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86400000);
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return dtf.format(now);
}

/** Day of week (0=Sun..6=Sat) of `YYYY-MM-DD` interpreted as a plain date. */
export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatSlotLabel(slot: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(slot);
}

export function formatSlotFull(slot: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(slot);
}
