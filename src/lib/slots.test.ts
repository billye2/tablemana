import { describe, expect, it } from "vitest";
import { remainingFor, slotStartsFor } from "./slots";

const base = { timezone: "America/New_York", slotMinutes: 30 };

describe("slotStartsFor", () => {
  it("steps through open hours, last seating one slot before close", () => {
    const starts = slotStartsFor({ ...base, hours: { "1": [["11:00", "13:00"]] } }, "2026-08-24");
    expect(starts.map((d) => d.toISOString())).toEqual([
      "2026-08-24T15:00:00.000Z",
      "2026-08-24T15:30:00.000Z",
      "2026-08-24T16:00:00.000Z",
      "2026-08-24T16:30:00.000Z",
    ]);
  });
  it("returns nothing on a closed day", () => {
    expect(slotStartsFor({ ...base, hours: { "0": [] } }, "2026-08-23")).toEqual([]);
    expect(slotStartsFor({ ...base, hours: {} }, "2026-08-23")).toEqual([]);
  });
  it("supports split shifts (lunch + dinner)", () => {
    const starts = slotStartsFor(
      { ...base, hours: { "2": [["11:00", "12:00"], ["17:00", "18:00"]] } },
      "2026-08-25",
    );
    expect(starts).toHaveLength(4);
    expect(starts[2].toISOString()).toBe("2026-08-25T21:00:00.000Z");
  });
  it("yields nothing when a range is shorter than one slot", () => {
    expect(slotStartsFor({ ...base, hours: { "1": [["11:00", "11:15"]] } }, "2026-08-24")).toEqual([]);
  });
  it("respects slotMinutes", () => {
    const starts = slotStartsFor(
      { ...base, slotMinutes: 60, hours: { "1": [["11:00", "14:00"]] } },
      "2026-08-24",
    );
    expect(starts).toHaveLength(3);
  });
});

describe("remainingFor", () => {
  const t0 = Date.UTC(2026, 7, 24, 15, 0);
  const starts = [0, 30, 60].map((m) => new Date(t0 + m * 60000));

  it("subtracts booked covers per slot and floors at zero", () => {
    const booked = new Map([[t0, 3], [t0 + 30 * 60000, 12]]);
    const out = remainingFor(starts, booked, 8, t0 - 1);
    expect(out.map((s) => s.remaining)).toEqual([5, 0, 8]);
  });
  it("hides slots that have already started", () => {
    const out = remainingFor(starts, new Map(), 8, t0 + 30 * 60000);
    expect(out.map((s) => s.start.getTime())).toEqual([t0 + 60 * 60000]);
  });
  it("returns an empty list when everything is in the past", () => {
    expect(remainingFor(starts, new Map(), 8, t0 + 3600000)).toEqual([]);
  });
});
