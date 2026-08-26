import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["4155551234", "+14155551234"],
    ["(415) 555-1234", "+14155551234"],
    ["415.555.1234", "+14155551234"],
    ["1 415 555 1234", "+14155551234"],
    ["+1 (415) 555-1234", "+14155551234"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([["555-1234"], [""], ["abc"], ["+44 20 7946 0958"], ["24155551234"], ["41555512345"]])(
    "rejects %s",
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );
});
