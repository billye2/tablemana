import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { restaurants, type Restaurant } from "@/db/schema";
import { counterAllowed, ownerVerdict } from "./access";
import { ownerCookieName, tokensMatch } from "./owner-token";
import { getRestaurantBySlug } from "./tenant";

/** The counter key as presented: explicit (?key=, API body) or the cookie the proxy set. */
async function presentedKey(slug: string, key?: string | null): Promise<string | undefined> {
  return key || (await cookies()).get(ownerCookieName(slug))?.value;
}

/**
 * Dashboard gate: the signed-in Clerk user must own the restaurant. Tenants
 * created before accounts existed are claimed by the first signed-in visitor
 * who arrives with the old `?key=` link (the proxy parks it in the cookie),
 * which is what the legacy welcome links did. Returns null when denied.
 */
export async function requireOwner(slug: string): Promise<Restaurant | null> {
  const r = await getRestaurantBySlug(slug);
  if (!r) return null;
  const { userId } = await auth();
  const verdict = ownerVerdict({
    userId: userId ?? null,
    ownerUserId: r.ownerUserId,
    legacyKeyMatches: tokensMatch(await presentedKey(slug), r.counterToken),
  });
  if (verdict === "deny") return null;
  if (verdict === "claim") {
    const user = await currentUser();
    const ownerEmail = user?.primaryEmailAddress?.emailAddress ?? null;
    const [updated] = await db
      .update(restaurants)
      .set({ ownerUserId: userId, ownerEmail })
      .where(eq(restaurants.id, r.id))
      .returning();
    return updated;
  }
  return r;
}

/**
 * Counter gate: the tablet's per-restaurant key (cookie or explicit), or the
 * owner's own session. The key never opens the dashboard.
 */
export async function requireCounter(
  slug: string,
  key?: string | null,
): Promise<Restaurant | null> {
  const r = await getRestaurantBySlug(slug);
  if (!r) return null;
  const keyMatches = tokensMatch(await presentedKey(slug, key), r.counterToken);
  let isOwner = false;
  if (!keyMatches) {
    const { userId } = await auth();
    isOwner = Boolean(userId) && r.ownerUserId === userId;
  }
  return counterAllowed({ keyMatches, isOwner }) ? r : null;
}

/** Every restaurant the signed-in user owns, oldest first. */
export async function ownedRestaurants(): Promise<Restaurant[]> {
  const { userId } = await auth();
  if (!userId) return [];
  return db
    .select()
    .from(restaurants)
    .where(eq(restaurants.ownerUserId, userId))
    .orderBy(restaurants.createdAt);
}
