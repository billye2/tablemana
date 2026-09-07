import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { routeRequest as proxy } from "./routing";

const req = (url: string) => new NextRequest(url, { headers: { host: new URL(url).host } });

afterEach(() => vi.unstubAllEnvs());

describe("owner key capture", () => {
  it("moves ?key= into an HttpOnly cookie and redirects without it", () => {
    vi.stubEnv("NODE_ENV", "test");
    const res = proxy(req("http://localhost:3000/dashboard/golden-poppy/menu?key=tok123&tab=2"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard/golden-poppy/menu?tab=2");
    const cookie = res.cookies.get("ts_owner_golden-poppy");
    expect(cookie?.value).toBe("tok123");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
  });
  it("captures on the counter path too", () => {
    const res = proxy(req("http://localhost:3000/counter/golden-poppy?key=abc"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/counter/golden-poppy");
    expect(res.cookies.get("ts_owner_golden-poppy")?.value).toBe("abc");
  });
  it("leaves diner pages alone even if they carry ?key=", () => {
    const res = proxy(req("http://localhost:3000/t/golden-poppy?key=abc"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get("ts_owner_golden-poppy")).toBeUndefined();
  });
  it("passes owner pages through when no key is present", () => {
    const res = proxy(req("http://localhost:3000/dashboard/golden-poppy"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });
});

describe("hostname tenancy", () => {
  it("rewrites {slug}.root to /t/{slug}", () => {
    vi.stubEnv("ROOT_DOMAIN", "tablemana.test");
    const res = proxy(req("https://golden-poppy.tablemana.test/reserve?d=1"));
    expect(res.headers.get("x-middleware-rewrite")).toBe(
      "https://golden-poppy.tablemana.test/t/golden-poppy/reserve?d=1",
    );
  });
  it("serves the root and www hosts directly", () => {
    vi.stubEnv("ROOT_DOMAIN", "tablemana.test");
    expect(proxy(req("https://tablemana.test/start")).headers.get("x-middleware-rewrite")).toBeNull();
    expect(proxy(req("https://www.tablemana.test/")).headers.get("x-middleware-rewrite")).toBeNull();
  });
  it("never rewrites *.vercel.app (single-level wildcard only)", () => {
    vi.stubEnv("ROOT_DOMAIN", "tablemana.test");
    expect(proxy(req("https://rc02-ivory.vercel.app/t/x")).headers.get("x-middleware-rewrite")).toBeNull();
  });
  it("ignores multi-level subdomains", () => {
    vi.stubEnv("ROOT_DOMAIN", "tablemana.test");
    expect(proxy(req("https://a.b.tablemana.test/")).headers.get("x-middleware-rewrite")).toBeNull();
  });
  it("canonicalizes an internal /t/{slug} path on the subdomain back to the pretty URL", () => {
    vi.stubEnv("ROOT_DOMAIN", "tablemana.test");
    const res = proxy(req("https://golden-poppy.tablemana.test/t/golden-poppy/order"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://golden-poppy.tablemana.test/order");
  });
  it("strips a port from the host before matching", () => {
    vi.stubEnv("ROOT_DOMAIN", "localhost");
    const res = proxy(req("http://golden-poppy.localhost:3000/"));
    expect(res.headers.get("x-middleware-rewrite")).toBe("http://golden-poppy.localhost:3000/t/golden-poppy");
  });
});
