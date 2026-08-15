# HANDOFF — tableside (rc02)

_Last updated 2026-08-15. State of the world for whoever (human or agent) picks
this up next._

## What exists and works (all verified end-to-end in production)

- **Full order loop:** diner browses `/t/{slug}` → cart → tip presets → prepaid
  checkout → order lands on the counter tablet → accept-with-ETA → ready →
  picked up, with SMS events fired at each step (logged to stdout until Twilio).
  Auto-reject + refund for unacknowledged orders runs via per-minute cron
  (`/api/cron/auto-reject`) *and* opportunistically on counter-page loads.
- **Reservations:** real-time slot capacity from hours config, SMS confirm with
  one-tap cancel link, seated/no-show tracking in the dashboard.
- **AI onboarding** (`/start`): menu photo/PDF (click or drag-drop) → Claude
  `claude-haiku-4-5` via official SDK with structured outputs → menu + template
  + accent color → live site. Verified with a rendered test menu (7/7 items,
  correct prices, sensible theme pick).
- **Dish photos:** Pexels stock defaults at onboarding (needs `PEXELS_API_KEY`,
  currently absent → silently skipped) + owner uploads to Vercel Blob from the
  menu editor (verified: upload → Blob → DB → renders).
- **Owner dashboard:** stats, menu editor (with photo controls), settings
  (hours/tax/template/capacity), customer list with consent-flagged CSV export.
- **Counter tablet PWA:** installable, order columns, 86 board, pause ordering.

## Live URLs

- Production: **https://rc02-ivory.vercel.app**
- Demo tenant: `/t/golden-poppy` — owner key for dashboard/counter is the
  `ownerToken` column in the `restaurants` table (re-seed prints it; treat as
  secret).
- User-created test tenant: `/t/hello-world` (created from a real menu drag-in).

## Credentials & infrastructure map

| Thing | Where | Notes |
|---|---|---|
| Vercel project | `billys-projects-7712fade/rc02` | CLI logged in as `billye-2920` |
| Neon Postgres | Vercel Marketplace integration | `DATABASE_URL` in all envs; schema via `npm run db:push` |
| Claude API key | Vercel env `ANTHROPIC_API_KEY` | Preview + Production, sensitive (not pullable); model `claude-haiku-4-5` in `src/lib/ingest.ts` |
| Blob store | `tableside-photos` (public) | `BLOB_READ_WRITE_TOKEN` in all envs |
| Pexels | **missing** | Free key from pexels.com/api → add as `PEXELS_API_KEY` → stock photos activate, no code change |
| Stripe | **not provisioned** | Marketplace terms not yet accepted: https://vercel.com/billys-projects-7712fade/~/integrations/accept-terms/stripe?source=cli — then `vercel integration add stripe --no-claim`. Adapter ready in `src/lib/payments.ts` (Connect Standard, 50¢ app fee); dev fallback = simulated-paid |
| Resend (email) | **not provisioned** | Terms: .../accept-terms/resend — only messaging provider on the marketplace (no SMS) |
| Twilio SMS | **no account** | Not on Vercel marketplace. Adapter in `src/lib/sms.ts` reads `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER`; logs to stdout until set |
| Custom domain | **none** | Buy + add wildcard to project, set `ROOT_DOMAIN` env → tenant subdomains activate automatically (`src/lib/tenant.ts`, `src/proxy.ts`) |
| Owner auth | **v1 token links** | `?key={ownerToken}` per restaurant; Clerk planned (marketplace-native) |

## Open work (in rough order)

1. **Stripe sandbox** — one terms-tap, then wire webhook for checkout-session
   completion (currently the dev path marks paid synchronously).
2. **Pexels key** — one signup, activates stock photos.
3. **Twilio** — account + 3 env vars; SMS then goes live everywhere at once.
4. **Owner accounts (Clerk)** — replace `?key=` token links.
5. **Custom domain + `ROOT_DOMAIN`** — pretty tenant subdomains.
6. **Phone verification at checkout** (plan §5.5) — deferred until Twilio.
7. From the plan, untouched: Google Places lookup at onboarding, sitemap, SMS
   reservation reminders cron (~2h before; confirm-link is done, reminder isn't).

## Conventions

- **`mistakes.md`**: every fixed mistake gets an entry (symptom, root cause,
  fix, lesson) in the same change — rule lives in `AGENTS.md`.
- Money is integer cents everywhere; tax stored as basis points.
- Order state changes go through `src/lib/orders.ts` (validated transitions +
  `order_events` records + SMS) — never update `orders.status` directly.
- New fulfillment surfaces (POS, printers) consume the `order_events` stream.

## Verification commands

```bash
npm run lint && npm run build       # must be clean before deploy
npm run db:seed                     # rebuild the golden-poppy demo
curl -s -X POST <base>/api/onboard -F name=Test -F "menu=@menu.png;type=image/png"
```
