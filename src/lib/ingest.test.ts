import { describe, expect, it } from "vitest";
import { ingestSchema } from "./ingest";

const valid = {
  cuisine: "Thai",
  description: "Family-run Thai kitchen.",
  theme: "classic",
  accentHex: "#b45309",
  sections: [
    { name: "Curries", items: [{ name: "Green curry", description: "Coconut, basil", priceCents: 1450 }] },
  ],
};

describe("ingestSchema", () => {
  it("accepts a well-formed menu", () => {
    expect(ingestSchema.parse(valid)).toEqual(valid);
  });
  it("accepts items without a description and uppercase hex", () => {
    const m = { ...valid, accentHex: "#B45309", sections: [{ name: "A", items: [{ name: "x", priceCents: 100 }] }] };
    expect(ingestSchema.safeParse(m).success).toBe(true);
  });
  it("rejects an unknown theme", () => {
    expect(ingestSchema.safeParse({ ...valid, theme: "neon" }).success).toBe(false);
  });
  it("rejects a malformed accent color", () => {
    expect(ingestSchema.safeParse({ ...valid, accentHex: "b45309" }).success).toBe(false);
    expect(ingestSchema.safeParse({ ...valid, accentHex: "#b45" }).success).toBe(false);
    expect(ingestSchema.safeParse({ ...valid, accentHex: "red" }).success).toBe(false);
  });
  it("rejects fractional prices — money is integer cents", () => {
    const m = { ...valid, sections: [{ name: "A", items: [{ name: "x", priceCents: 12.5 }] }] };
    expect(ingestSchema.safeParse(m).success).toBe(false);
  });
  it("rejects an empty menu or an empty section", () => {
    expect(ingestSchema.safeParse({ ...valid, sections: [] }).success).toBe(false);
    expect(ingestSchema.safeParse({ ...valid, sections: [{ name: "A", items: [] }] }).success).toBe(false);
  });
  it("rejects missing required fields", () => {
    const { cuisine: _c, ...noCuisine } = valid;
    void _c;
    expect(ingestSchema.safeParse(noCuisine).success).toBe(false);
  });
});
