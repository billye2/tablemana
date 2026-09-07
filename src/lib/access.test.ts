import { describe, expect, it } from "vitest";
import { counterAllowed, ownerVerdict } from "./access";

describe("ownerVerdict", () => {
  it("denies anyone who is not signed in, key or not", () => {
    expect(ownerVerdict({ userId: null, ownerUserId: null, legacyKeyMatches: true })).toBe("deny");
    expect(ownerVerdict({ userId: null, ownerUserId: "u1", legacyKeyMatches: false })).toBe("deny");
  });
  it("grants the owning user", () => {
    expect(ownerVerdict({ userId: "u1", ownerUserId: "u1", legacyKeyMatches: false })).toBe("owner");
  });
  it("denies a signed-in user who does not own the restaurant", () => {
    expect(ownerVerdict({ userId: "u2", ownerUserId: "u1", legacyKeyMatches: false })).toBe("deny");
  });
  it("a legacy key cannot steal a restaurant that already has an owner", () => {
    expect(ownerVerdict({ userId: "u2", ownerUserId: "u1", legacyKeyMatches: true })).toBe("deny");
  });
  it("lets a signed-in user claim an unowned tenant with the legacy key", () => {
    expect(ownerVerdict({ userId: "u1", ownerUserId: null, legacyKeyMatches: true })).toBe("claim");
  });
  it("does not hand an unowned tenant to a signed-in user without the key", () => {
    expect(ownerVerdict({ userId: "u1", ownerUserId: null, legacyKeyMatches: false })).toBe("deny");
  });
});

describe("counterAllowed", () => {
  it("opens for the tablet key alone", () => {
    expect(counterAllowed({ keyMatches: true, isOwner: false })).toBe(true);
  });
  it("opens for the owner without the key", () => {
    expect(counterAllowed({ keyMatches: false, isOwner: true })).toBe(true);
  });
  it("stays closed otherwise", () => {
    expect(counterAllowed({ keyMatches: false, isOwner: false })).toBe(false);
  });
});
