import { NextRequest, NextResponse } from "next/server";
import { ownerCookieName, ownerSlugFromPath } from "@/lib/owner-token";

/**
 * Hostname-based tenancy (PLAN.md §7): `{slug}.<root>` serves the tenant site
 * by rewriting to /t/{slug}/...; the root domain serves marketing, onboarding,
 * dashboard, and counter. Custom domains are a fast-follow — they'll resolve
 * here via a domain→slug lookup.
 */
export default function proxy(req: NextRequest) {
  // Owner links carry ?key= once; park it in an HttpOnly cookie and drop it
  // from the URL so the token stops leaking via history/referrers/logs.
  const ownerSlug = ownerSlugFromPath(req.nextUrl.pathname);
  const key = req.nextUrl.searchParams.get("key");
  if (ownerSlug && key) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("key");
    const res = NextResponse.redirect(url);
    res.cookies.set(ownerCookieName(ownerSlug), key, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  }

  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const root = (process.env.ROOT_DOMAIN ?? "localhost").toLowerCase().split(":")[0];

  const isRoot =
    host === root || host === `www.${root}` || host.endsWith(".vercel.app");
  if (isRoot) return NextResponse.next();

  if (host.endsWith(`.${root}`)) {
    const slug = host.slice(0, -(root.length + 1));
    if (slug && !slug.includes(".")) {
      const url = req.nextUrl.clone();
      const internal = `/t/${slug}`;
      // Internal /t/{slug}/... paths (from links or router.push) canonicalize
      // back to the pretty subdomain URL instead of double-rewriting to a 404.
      if (url.pathname === internal || url.pathname.startsWith(`${internal}/`)) {
        url.pathname = url.pathname.slice(internal.length) || "/";
        return NextResponse.redirect(url);
      }
      url.pathname = `${internal}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico|manifest|icons/).*)"],
};
