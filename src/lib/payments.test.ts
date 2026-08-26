import { afterEach, describe, expect, it, vi } from "vitest";
import type { Order, Restaurant } from "@/db/schema";
import { beginPayment, canSimulatePayment, isStripeConfigured } from "./payments";

const restaurant = { name: "Test", stripeAccountId: null } as unknown as Restaurant;
const order = { id: "o1", totalCents: 1200, platformFeeCents: 50 } as unknown as Order;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("canSimulatePayment", () => {
  it("is allowed outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(canSimulatePayment()).toBe(true);
  });
  it("is refused in production by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_SIMULATED_PAYMENTS", "");
    expect(canSimulatePayment()).toBe(false);
  });
  it("can be explicitly enabled in production for demos", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_SIMULATED_PAYMENTS", "1");
    expect(canSimulatePayment()).toBe(true);
  });
});

describe("beginPayment without Stripe", () => {
  it("simulates a paid order in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(isStripeConfigured()).toBe(false);
    await expect(beginPayment(restaurant, order, "1× Taco", "https://x/return")).resolves.toEqual({
      type: "paid",
    });
  });
  it("refuses in production when the platform key is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("ALLOW_SIMULATED_PAYMENTS", "");
    const res = await beginPayment(restaurant, order, "1× Taco", "https://x/return");
    expect(res.type).toBe("unavailable");
    expect(res).toMatchObject({ reason: expect.stringContaining("Stripe key") });
  });
  it("refuses in production when the restaurant has no connected account", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("ALLOW_SIMULATED_PAYMENTS", "");
    const res = await beginPayment(restaurant, order, "1× Taco", "https://x/return");
    expect(res).toMatchObject({ type: "unavailable", reason: expect.stringContaining("Stripe account") });
  });
});
