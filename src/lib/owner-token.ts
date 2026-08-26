import { timingSafeEqual } from "node:crypto";

/** Name of the HttpOnly cookie that carries a restaurant's owner token. */
export function ownerCookieName(slug: string): string {
  return `ts_owner_${slug}`;
}

/** Constant-time comparison of a presented token against the stored one. */
export function tokensMatch(presented: string | undefined | null, expected: string): boolean {
  if (!presented || !expected) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Owner-gated paths whose ?key= should be moved into the cookie by the proxy. */
export function ownerSlugFromPath(pathname: string): string | null {
  const m = /^\/(?:dashboard|counter)\/([^/?#]+)/.exec(pathname);
  return m ? m[1] : null;
}
