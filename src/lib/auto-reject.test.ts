import { describe, expect, it } from "vitest";
import { cronAuthorized, isStale } from "./auto-reject";

describe("isStale", () => {
  const now = Date.UTC(2026, 7, 25, 12, 0);
  const r = { autoRejectMinutes: 15 };
  const at = (minsAgo: number) => new Date(now - minsAgo * 60000);

  it("is not stale inside the window", () => {
    expect(isStale({ placedAt: at(14), createdAt: at(20) }, r, now)).toBe(false);
  });
  it("is not stale exactly at the boundary", () => {
    expect(isStale({ placedAt: at(15), createdAt: at(20) }, r, now)).toBe(false);
  });
  it("is stale past the window", () => {
    expect(isStale({ placedAt: at(16), createdAt: at(20) }, r, now)).toBe(true);
  });
  it("measures from placedAt, not createdAt, when both exist", () => {
    expect(isStale({ placedAt: at(5), createdAt: at(60) }, r, now)).toBe(false);
  });
  it("falls back to createdAt when placedAt is null", () => {
    expect(isStale({ placedAt: null, createdAt: at(60) }, r, now)).toBe(true);
  });
  it("honors a per-restaurant window", () => {
    expect(isStale({ placedAt: at(16), createdAt: at(16) }, { autoRejectMinutes: 30 }, now)).toBe(false);
  });
});

describe("cronAuthorized", () => {
  it("accepts the matching bearer secret", () => {
    expect(cronAuthorized("Bearer s3cret", "s3cret", "production")).toBe(true);
  });
  it("rejects a wrong or missing header when a secret is set", () => {
    expect(cronAuthorized("Bearer nope", "s3cret", "production")).toBe(false);
    expect(cronAuthorized(null, "s3cret", "production")).toBe(false);
    expect(cronAuthorized("s3cret", "s3cret", "production")).toBe(true);
  });
  it("fails closed in production when no secret is configured", () => {
    expect(cronAuthorized(null, undefined, "production")).toBe(false);
    expect(cronAuthorized("Bearer anything", undefined, "production")).toBe(false);
  });
  it("stays open in development when no secret is configured", () => {
    expect(cronAuthorized(null, undefined, "development")).toBe(true);
    expect(cronAuthorized(null, "", "test")).toBe(true);
  });
});
