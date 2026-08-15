# tableside

Multi-tenant SaaS for independent restaurants: upload a menu photo, get a live
website with online ordering (prepaid pickup) and reservations — flat pricing,
no commissions, the restaurant owns its customer data.

**Production:** https://rc02-ivory.vercel.app · demo tenant: [/t/golden-poppy](https://rc02-ivory.vercel.app/t/golden-poppy)

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

## Development

```bash
vercel env pull            # DATABASE_URL, BLOB_READ_WRITE_TOKEN, ...
npm install
npm run db:push            # sync Drizzle schema to Neon
npm run db:seed            # seed the golden-poppy demo (prints owner links)
npm run dev
```

Tenant subdomains work locally via `{slug}.localhost:3000`. Without Stripe keys,
checkout uses a simulated-paid path; without Twilio keys, SMS logs to stdout.

## Deploy

```bash
npm run lint && npm run build
vercel deploy          # preview
vercel deploy --prod   # production
```
