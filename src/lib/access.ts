/**
 * Pure access decisions for the admin side, kept free of Clerk and the DB so
 * they can be unit-tested. `owner.ts` gathers the inputs and acts on the
 * verdicts.
 */

export type OwnerVerdict = "owner" | "claim" | "deny";

/**
 * Dashboard access. A restaurant belongs to exactly one Clerk user. Tenants
 * created before accounts existed have no owner yet; the first signed-in
 * visitor who presents the legacy key (proof of ownership) claims them.
 */
export function ownerVerdict(input: {
  userId: string | null;
  ownerUserId: string | null;
  legacyKeyMatches: boolean;
}): OwnerVerdict {
  if (!input.userId) return "deny";
  if (input.ownerUserId === input.userId) return "owner";
  if (input.ownerUserId === null && input.legacyKeyMatches) return "claim";
  return "deny";
}

/**
 * Counter access. The tablet holds a per-restaurant key (cookie or ?key=);
 * the owner's own session also opens the counter so they can check it from
 * any device without the key.
 */
export function counterAllowed(input: { keyMatches: boolean; isOwner: boolean }): boolean {
  return input.keyMatches || input.isOwner;
}
