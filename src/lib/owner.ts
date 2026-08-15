import type { Restaurant } from "@/db/schema";
import { getRestaurantBySlug } from "./tenant";

/**
 * v1 owner gate: per-restaurant secret token carried as ?key= on dashboard and
 * counter URLs (handed to the owner at onboarding). Replaced by real owner
 * accounts when the auth integration lands (task: integrations).
 */
export async function requireOwner(
  slug: string,
  key: string | undefined,
): Promise<Restaurant | null> {
  if (!key) return null;
  const r = await getRestaurantBySlug(slug);
  if (!r || r.ownerToken !== key) return null;
  return r;
}
