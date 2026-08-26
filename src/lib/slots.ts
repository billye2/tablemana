import { and, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { reservations, type Restaurant } from "@/db/schema";
import { dayOfWeek, zonedTimeToUtc } from "./time";

export type Slot = {
  start: Date;
  /** Covers still available (coversPerSlot - booked). */
  remaining: number;
};

/** Slot start instants for a date: open hours stepped by slotMinutes, last seating one slot before close. */
export function slotStartsFor(
  r: Pick<Restaurant, "hours" | "timezone" | "slotMinutes">,
  dateStr: string,
): Date[] {
  const ranges = r.hours[String(dayOfWeek(dateStr))] ?? [];
  const starts: Date[] = [];
  for (const [open, close] of ranges) {
    const openUtc = zonedTimeToUtc(dateStr, open, r.timezone).getTime();
    const closeUtc = zonedTimeToUtc(dateStr, close, r.timezone).getTime();
    for (let t = openUtc; t + r.slotMinutes * 60000 <= closeUtc; t += r.slotMinutes * 60000) {
      starts.push(new Date(t));
    }
  }
  return starts;
}

/** Covers remaining per slot given booked covers keyed by slot start ms. */
export function remainingFor(
  starts: Date[],
  bookedBySlot: Map<number, number>,
  coversPerSlot: number,
  nowMs: number,
): Slot[] {
  return starts
    .filter((s) => s.getTime() > nowMs)
    .map((s) => ({
      start: s,
      remaining: Math.max(0, coversPerSlot - (bookedBySlot.get(s.getTime()) ?? 0)),
    }));
}

/**
 * Real-time slot availability for a date (PLAN.md §5.4): slots derived from
 * open hours + slotMinutes, capacity = coversPerSlot minus confirmed covers.
 */
export async function slotsForDate(r: Restaurant, dateStr: string): Promise<Slot[]> {
  const starts = slotStartsFor(r, dateStr);
  if (starts.length === 0) return [];

  const dayStart = starts[0];
  const dayEnd = new Date(starts[starts.length - 1].getTime() + r.slotMinutes * 60000);
  const booked = await db
    .select({
      slotStart: reservations.slotStart,
      covers: sql<number>`sum(${reservations.partySize})::int`,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.restaurantId, r.id),
        gte(reservations.slotStart, dayStart),
        lt(reservations.slotStart, dayEnd),
        ne(reservations.status, "canceled"),
      ),
    )
    .groupBy(reservations.slotStart);

  const bookedBySlot = new Map(booked.map((b) => [b.slotStart.getTime(), b.covers]));
  return remainingFor(starts, bookedBySlot, r.coversPerSlot, Date.now());
}
