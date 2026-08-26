import { describe, expect, it } from "vitest";
import { ownerCookieName, ownerSlugFromPath, tokensMatch } from "./owner-token";

describe("tokensMatch", () => {
  it("matches identical tokens", () => {
    expect(tokensMatch("abc123", "abc123")).toBe(true);
  });
  it("rejects different tokens of the same length", () => {
    expect(tokensMatch("abc124", "abc123")).toBe(false);
  });
  it("rejects different lengths without throwing", () => {
    expect(tokensMatch("abc", "abc123")).toBe(false);
    expect(tokensMatch("abc123456", "abc123")).toBe(false);
  });
  it("rejects empty, null, and undefined", () => {
    expect(tokensMatch("", "abc")).toBe(false);
    expect(tokensMatch(null, "abc")).toBe(false);
    expect(tokensMatch(undefined, "abc")).toBe(false);
    expect(tokensMatch("abc", "")).toBe(false);
  });
});

describe("ownerCookieName", () => {
  it("is scoped per restaurant", () => {
    expect(ownerCookieName("golden-poppy")).toBe("ts_owner_golden-poppy");
    expect(ownerCookieName("a")).not.toBe(ownerCookieName("b"));
  });
});

describe("ownerSlugFromPath", () => {
  it("extracts the slug from dashboard and counter paths", () => {
    expect(ownerSlugFromPath("/dashboard/golden-poppy")).toBe("golden-poppy");
    expect(ownerSlugFromPath("/dashboard/golden-poppy/menu")).toBe("golden-poppy");
    expect(ownerSlugFromPath("/counter/hello-world")).toBe("hello-world");
  });
  it("ignores diner-facing and unrelated paths", () => {
    expect(ownerSlugFromPath("/t/golden-poppy")).toBeNull();
    expect(ownerSlugFromPath("/")).toBeNull();
    expect(ownerSlugFromPath("/dashboard")).toBeNull();
    expect(ownerSlugFromPath("/dashboards/x")).toBeNull();
  });
});
