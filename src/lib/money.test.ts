import { describe, expect, it } from "vitest";
import { PLATFORM_FEE_CENTS, TIP_PRESETS, formatCents, taxFor } from "./money";

describe("taxFor", () => {
  it("applies basis points and rounds to the cent", () => {
    expect(taxFor(1000, 875)).toBe(88); // 8.75% of $10.00 = 87.5¢ → 88
    expect(taxFor(1999, 0)).toBe(0);
    expect(taxFor(0, 875)).toBe(0);
    expect(taxFor(100, 1)).toBe(0); // 0.01% of $1 rounds away
  });
  it("is exact for whole-percent rates", () => {
    expect(taxFor(2500, 1000)).toBe(250);
  });
});

describe("formatCents", () => {
  it("formats as USD", () => {
    expect(formatCents(1234)).toBe("$12.34");
    expect(formatCents(5)).toBe("$0.05");
    expect(formatCents(100000)).toBe("$1,000.00");
  });
});

describe("pricing constants", () => {
  it("platform fee is a fixed cents amount, not a percentage", () => {
    expect(PLATFORM_FEE_CENTS).toBe(50);
  });
  it("tip presets are ascending percentages", () => {
    expect([...TIP_PRESETS]).toEqual([15, 18, 20]);
  });
});
