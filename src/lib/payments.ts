import type { Order, Restaurant } from "@/db/schema";

/**
 * Payments adapter — Stripe Connect (Standard) per PLAN.md §4. The platform's
 * fixed per-order fee rides as an application fee on the restaurant's account.
 * Until Stripe env vars are provisioned (Vercel Marketplace), local dev uses an
 * immediate-paid path so the order loop stays testable end to end.
 */

export type BeginPaymentResult =
  | { type: "redirect"; url: string }
  | { type: "paid" }
  | { type: "unavailable"; reason: string };

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Whether a real charge can be taken for this restaurant. The simulated-paid
 * path below exists only so the order loop is testable without Stripe; it must
 * never run against real diners, so in production it is refused outright.
 */
export function canSimulatePayment(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_SIMULATED_PAYMENTS === "1";
}

async function stripeApi(
  path: string,
  params: Record<string, string>,
  stripeAccount?: string | null,
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(stripeAccount ? { "Stripe-Account": stripeAccount } : {}),
    },
    body: new URLSearchParams(params),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = json.error as { message?: string } | undefined;
    throw new Error(`Stripe ${path}: ${err?.message ?? res.status}`);
  }
  return json;
}

export async function beginPayment(
  restaurant: Restaurant,
  order: Order,
  itemSummary: string,
  returnUrl: string,
): Promise<BeginPaymentResult> {
  if (!isStripeConfigured() || !restaurant.stripeAccountId) {
    if (!canSimulatePayment()) {
      return {
        type: "unavailable",
        reason: !isStripeConfigured()
          ? "platform Stripe key not configured"
          : "restaurant has no connected Stripe account",
      };
    }
    console.warn(`[payments:dev] simulating paid order ${order.id} (${order.totalCents}¢)`);
    return { type: "paid" };
  }

  const session = await stripeApi(
    "checkout/sessions",
    {
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(order.totalCents),
      "line_items[0][price_data][product_data][name]": `${restaurant.name} — ${itemSummary}`,
      "payment_intent_data[application_fee_amount]": String(order.platformFeeCents),
      success_url: `${returnUrl}?paid=1`,
      cancel_url: `${returnUrl}?canceled=1`,
      "metadata[orderId]": order.id,
    },
    restaurant.stripeAccountId,
  );
  return { type: "redirect", url: session.url as string };
}

export async function refundPayment(
  restaurant: Restaurant,
  paymentIntentId: string | null,
): Promise<void> {
  if (!isStripeConfigured() || !restaurant.stripeAccountId || !paymentIntentId) {
    console.log(`[payments:dev] refund for pi=${paymentIntentId ?? "none"}`);
    return;
  }
  await stripeApi(
    "refunds",
    { payment_intent: paymentIntentId },
    restaurant.stripeAccountId,
  );
}
