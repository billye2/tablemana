# tablemana

Multi-tenant SaaS for independent restaurants (formerly "tableside"): upload a menu photo, get a live
website with online ordering (prepaid pickup) and reservations — flat pricing,
no commissions, the restaurant owns its customer data.

**Production:** https://tablemana.vercel.app · demo tenant: [/t/golden-poppy](https://tablemana.vercel.app/t/golden-poppy)

- `PLAN.md` — product spec and decisions (with build-time changes in §9)
- `HANDOFF.md` — current state, credentials map, open items
- `mistakes.md` — log of every fixed mistake (see AGENTS.md for the convention)

## Stack

Next.js 16 (App Router) on Vercel · Neon Postgres via Drizzle · Claude API
(`claude-haiku-4-5`) for menu ingestion · Vercel Blob for dish photos · Pexels
for stock photo defaults · Stripe Connect + Twilio SMS (adapters built, keys
pending — see HANDOFF).

## Surfaces

| Surface | Route |
|---|---|
| Marketing / landing | `/` |
| AI onboarding wizard | `/start` |
| Tenant diner site | `/t/{slug}` (or `{slug}.$ROOT_DOMAIN` with a custom domain) |
| Ordering / status | `/t/{slug}/order`, `/t/{slug}/order/{id}` |
| Reservations | `/t/{slug}/reserve` |
| Owner dashboard | `/dashboard/{slug}?key={ownerToken}` |
| Counter tablet PWA | `/counter/{slug}?key={ownerToken}` |
| Owner help | `/dashboard/{slug}/help` (linked from the dashboard tabs and the counter header) |

## Development

```bash
vercel env pull            # DATABASE_URL, BLOB_READ_WRITE_TOKEN, ...
npm install
npm run db:push            # sync Drizzle schema to Neon
npm run db:seed            # seed the golden-poppy demo (prints owner links)
npm run dev
```

Tenant subdomains work locally via `{slug}.localhost:3000`. Without Stripe keys,
checkout uses a simulated-paid path **in development only** — production refuses
orders until Stripe is live (override with `ALLOW_SIMULATED_PAYMENTS=1` for a
public demo, and remove it once Stripe lands). Without Twilio keys, SMS logs to
stdout.

## Architecture

- **Tenancy:** one Postgres database, every row scoped by `restaurant_id`. Tenants are served at `/t/{slug}`; with a custom `ROOT_DOMAIN`, `src/proxy.ts` rewrites `{slug}.domain` to the same routes. Owner surfaces (`/dashboard`, `/counter`) are gated by a per-restaurant token that the proxy moves from the welcome link into an HttpOnly cookie (`src/lib/owner.ts`).
- **Orders:** an explicit state machine (`src/lib/orders.ts`: awaiting_payment → placed → accepted → ready → picked_up, with rejected/auto_rejected/canceled as terminal states) plus an append-only `order_events` log that every surface (counter tablet, SMS, future POS adapters) consumes. Prices are re-computed server-side and snapshotted onto `order_items`. Unacknowledged orders are auto-rejected and refunded by a per-minute cron backstop.
- **Reservations:** slots derived from weekly hours in the restaurant's timezone (`src/lib/slots.ts`, `src/lib/time.ts` — Intl only, no date library), capacity re-checked at booking time.
- **AI onboarding:** a menu photo/PDF goes to Claude with a JSON-schema structured output (`src/lib/ingest.ts`); the result is validated again with Zod before it becomes a live site.
- **Adapters with dev fallbacks:** payments (`src/lib/payments.ts`, Stripe Connect), SMS (`src/lib/sms.ts`, Twilio), stock photos (Pexels). Each degrades explicitly — simulated payments only outside production, SMS to stdout — and says so in logs.

## Testing

```bash
npm test          # vitest over the pure modules (state machine, slots, timezone, auth token, proxy routing, schemas)
npm run check     # lint + typecheck + test + build — what CI runs
```

## Deploy

The Vercel project `tableside` is connected to this GitHub repo: every push to
`main` deploys to production and every other branch gets a preview. Manual
deploys still work:

```bash
npm run check          # what CI runs
vercel deploy          # preview
vercel deploy --prod   # production
```

Secrets live only in Vercel env (`vercel env add NAME production --sensitive`);
run local commands that need them through `vercel env run -- <cmd>`.
