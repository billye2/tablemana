import { cookies } from "next/headers";
import type { Restaurant } from "@/db/schema";
import { ownerCookieName, tokensMatch } from "./owner-token";
import { getRestaurantBySlug } from "./tenant";

/**
 * v1 owner gate: a per-restaurant secret token handed to the owner at
 * onboarding. It arrives once as ?key= on the welcome link; the proxy moves it
 * into an HttpOnly cookie and strips it from the URL, so it never sits in
 * browser history, referrers, or logs after the first visit. A key passed
 * explicitly (API routes, first visit) still works. Replaced by real owner
 * accounts when the auth integration lands.
 */
export async function requireOwner(
  slug: string,
  key?: string | null,
): Promise<Restaurant | null> {
  const r = await getRestaurantBySlug(slug);
  if (!r) return null;
  const presented = key || (await cookies()).get(ownerCookieName(slug))?.value;
  if (!tokensMatch(presented, r.ownerToken)) return null;
  return r;
}
