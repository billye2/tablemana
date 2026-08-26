import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@/db/schema";
import { canTransition, generateOrderCode } from "./orders";

const ALL: OrderStatus[] = [
  "awaiting_payment", "placed", "accepted", "ready",
  "picked_up", "rejected", "auto_rejected", "canceled",
];

const LEGAL: [OrderStatus, OrderStatus][] = [
  ["awaiting_payment", "placed"],
  ["awaiting_payment", "canceled"],
  ["placed", "accepted"],
  ["placed", "rejected"],
  ["placed", "auto_rejected"],
  ["accepted", "ready"],
  ["accepted", "rejected"],
  ["ready", "picked_up"],
];

describe("order state machine", () => {
  it.each(LEGAL)("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  const illegal = ALL.flatMap((from) =>
    ALL.filter((to) => !LEGAL.some(([f, t]) => f === from && t === to)).map((to) => [from, to] as const),
  );
  it.each(illegal)("forbids %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it.each(["picked_up", "rejected", "auto_rejected", "canceled"] as OrderStatus[])(
    "%s is terminal",
    (status) => {
      for (const to of ALL) expect(canTransition(status, to)).toBe(false);
    },
  );

  it("never skips payment: awaiting_payment cannot jump to accepted/ready", () => {
    expect(canTransition("awaiting_payment", "accepted")).toBe(false);
    expect(canTransition("awaiting_payment", "ready")).toBe(false);
  });

  it("cannot auto-reject an order the kitchen already accepted", () => {
    expect(canTransition("accepted", "auto_rejected")).toBe(false);
  });

  it("treats unknown statuses as non-transitionable", () => {
    expect(canTransition("bogus" as OrderStatus, "placed")).toBe(false);
  });
});

describe("generateOrderCode", () => {
  it("is 4 chars from an unambiguous alphabet (no 0/O/1/I/L)", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateOrderCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/);
    }
  });
});
