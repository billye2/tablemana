import { describe, expect, it } from "vitest";
import { dayOfWeek, formatSlotFull, formatSlotLabel, todayInTz, zonedTimeToUtc } from "./time";

describe("zonedTimeToUtc", () => {
  it("converts New York standard time (UTC-5)", () => {
    expect(zonedTimeToUtc("2026-01-15", "11:00", "America/New_York").toISOString()).toBe(
      "2026-01-15T16:00:00.000Z",
    );
  });
  it("converts New York daylight time (UTC-4)", () => {
    expect(zonedTimeToUtc("2026-07-15", "11:00", "America/New_York").toISOString()).toBe(
      "2026-07-15T15:00:00.000Z",
    );
  });
  it("handles the spring-forward day after the gap", () => {
    // DST starts 2026-03-08 02:00 in NY; 11:00 that day is already EDT.
    expect(zonedTimeToUtc("2026-03-08", "11:00", "America/New_York").toISOString()).toBe(
      "2026-03-08T15:00:00.000Z",
    );
  });
  it("handles the fall-back day", () => {
    // DST ends 2026-11-01 02:00 in NY; 11:00 that day is EST.
    expect(zonedTimeToUtc("2026-11-01", "11:00", "America/New_York").toISOString()).toBe(
      "2026-11-01T16:00:00.000Z",
    );
  });
  it("works for a UTC+ zone and for UTC itself", () => {
    expect(zonedTimeToUtc("2026-06-01", "09:30", "Asia/Tokyo").toISOString()).toBe(
      "2026-06-01T00:30:00.000Z",
    );
    expect(zonedTimeToUtc("2026-06-01", "09:30", "UTC").toISOString()).toBe(
      "2026-06-01T09:30:00.000Z",
    );
  });
  it("accepts midnight and 23:59", () => {
    expect(zonedTimeToUtc("2026-06-01", "00:00", "America/Los_Angeles").toISOString()).toBe(
      "2026-06-01T07:00:00.000Z",
    );
    expect(zonedTimeToUtc("2026-06-01", "23:59", "America/Los_Angeles").toISOString()).toBe(
      "2026-06-02T06:59:00.000Z",
    );
  });
});

describe("dayOfWeek", () => {
  it("returns 0=Sun..6=Sat regardless of host timezone", () => {
    expect(dayOfWeek("2026-08-23")).toBe(0); // Sunday
    expect(dayOfWeek("2026-08-24")).toBe(1);
    expect(dayOfWeek("2026-08-29")).toBe(6);
  });
});

describe("todayInTz", () => {
  it("returns YYYY-MM-DD", () => {
    expect(todayInTz("America/New_York")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("offsetDays shifts the date", () => {
    const today = todayInTz("UTC");
    const tomorrow = todayInTz("UTC", 1);
    expect(new Date(tomorrow).getTime() - new Date(today).getTime()).toBe(86400000);
  });
});

describe("formatting", () => {
  const slot = new Date("2026-08-28T23:30:00.000Z"); // Fri 7:30 PM in NY
  it("formats a slot label in the restaurant's zone", () => {
    expect(formatSlotLabel(slot, "America/New_York")).toBe("7:30 PM");
  });
  it("formats a full slot with weekday and date", () => {
    expect(formatSlotFull(slot, "America/New_York")).toBe("Fri, Aug 28, 7:30 PM");
  });
});
