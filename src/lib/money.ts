/** Fixed per-order platform fee — a fixed fee, never a percentage (PLAN.md §2). */
export const PLATFORM_FEE_CENTS = 50;

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function taxFor(subtotalCents: number, taxRateBps: number): number {
  return Math.round((subtotalCents * taxRateBps) / 10000);
}

export const TIP_PRESETS = [15, 18, 20] as const;
