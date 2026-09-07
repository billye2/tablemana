# HANDOFF — tablemana

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
  (hours/tax/template/capacity), customer list with consent-flagged CSV export, and a Help tab (`/dashboard/{slug}/help`) describing every admin behavior — update it in the same change when admin behavior changes.
- **Counter tablet PWA:** installable, order columns, 86 board, pause ordering.
- **Help, three audiences:** public `/help` (landing header/footer), diner `/t/{slug}/help` in the tenant theme (footer), owner `/dashboard/{slug}/help`. All hand-written prose — update alongside behavior changes.
- **Demo disclaimers:** the reserve and checkout forms show "SMS provider not enabled" under their buttons while `isSmsConfigured()` is false; they vanish once the Twilio vars exist.
- **Front-page redirect (v1.0.7):** `restaurants.home_redirects_to_order` (default false) — Settings checkbox "Send visitors straight to ordering"; `/t/{slug}` redirects to `/order` when set (`src/app/t/[slug]/page.tsx`). The header name link still goes to `/t/{slug}`, so it lands on ordering too while the flag is on.
- **Mobile-first layout (v1.0.6):** base Tailwind classes target a 375px phone, `sm:`/`lg:` widen. Global invariants live in `src/app/globals.css`: 16px form controls below `sm` (iOS zoom), `pb-safe`/`pt-safe` utilities, `overflow-x: hidden` on body. Keep tap targets at `min-h-11`. The pickup page's bottom "View order" bar (`order-client.tsx`) hides via a scroll-position check once the cart panel is on screen.
- **Tests + CI:** 156 vitest cases over the pure modules (`npm test`); GitHub Actions runs lint + typecheck + test + build on every push/PR.
- **Payments gate:** simulated-paid checkout only runs outside production (`ALLOW_SIMULATED_PAYMENTS=1` overrides for demos).

## Live URLs

- Production: **https://tablemana.vercel.app** (Vercel project `tablemana`, git-connected: push to `main` deploys)
- Demo tenant: `/t/golden-poppy` — owner key for dashboard/counter is the
  `ownerToken` column in the `restaurants` table (re-seed prints it; treat as
  secret).
- User-created test tenant: `/t/hello-world` (created from a real menu drag-in).

## Credentials & infrastructure map

| Thing | Where | Notes |
|---|---|---|
| Vercel project | `billys-projects-7712fade/tablemana` (created 2026-09-06 as `tableside`, renamed the same day) | CLI logged in as `billye-2920`. The original project `rc02` was taken over and renamed `scanmana` by another app on 2026-08-31; nothing of tableside runs there any more |
| Neon Postgres | Marketplace resource `neon-chestnut-jacket` — the live restaurant DB, connected only to `tablemana` | `DATABASE_URL` in all envs; schema via `npm run db:push`. Never delete this resource |
| Claude API key | Vercel env `ANTHROPIC_API_KEY` | Preview + Production, sensitive (not pullable); model `claude-haiku-4-5` in `src/lib/ingest.ts` |
| Blob store | `tableside-photos` (public) | `BLOB_READ_WRITE_TOKEN` in all envs |
| Pexels | Vercel env `PEXELS_API_KEY` | Preview + Production, sensitive; stock photos active |
| Stripe | **not provisioned** (`STRIPE_SECRET_KEY` unset) | Marketplace terms not yet accepted: https://vercel.com/billys-projects-7712fade/~/integrations/accept-terms/stripe?source=cli — then `vercel integration add stripe --no-claim`. Adapter ready in `src/lib/payments.ts` (Connect Standard, 50¢ app fee); dev-only fallback = simulated-paid; production refuses orders until Stripe is live |
| Resend (email) | **not provisioned** | Terms: .../accept-terms/resend — only messaging provider on the marketplace (no SMS) |
| Twilio SMS | **no account** | Not on Vercel marketplace. Adapter in `src/lib/sms.ts` reads `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`; logs to stdout until set |
| Cron auth | Vercel env `CRON_SECRET` | Production only, sensitive, generated 2026-09-06. Vercel sends it as the bearer token on `/api/cron/auto-reject`; the route fails closed in production without it |
| Custom domain | **none** | Buy + add wildcard to project, set `ROOT_DOMAIN` env → tenant subdomains activate automatically (`src/lib/tenant.ts`, `src/proxy.ts`) |
| Owner auth | **Clerk** (marketplace resource `clerk-violet-clock`, env `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) | `restaurants.owner_user_id` = Clerk user id, `owner_email` snapshot. `src/proxy.ts` wraps `clerkMiddleware` and protects /start, /dashboard, /api/onboard, /api/export, /api/upload-photo. Legacy tenants (null owner) are claimed by the first signed-in visit that presents the old `?key=`. Sign-in methods (email code, Google) are configured in the Clerk dashboard: `vercel integration open clerk` |
| Counter key | `restaurants.owner_token` column, exposed as `counterToken` | Tablet-only credential: `/counter/{slug}?key=` → proxy parks it in the `ts_owner_{slug}` cookie. Rotated from Settings → Counter tablet. Never opens the dashboard |

## Open work (in rough order)

1. **Stripe sandbox** — one terms-tap, then wire webhook for checkout-session
   completion (currently the dev path marks paid synchronously).
2. **Pexels key** — one signup, activates stock photos.
3. **Twilio** — account + 3 env vars; SMS then goes live everywhere at once.
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

Release: write the next "## [x.y.z]" CHANGELOG.md section, `npm run release`
(odometer bump 0–9 per segment, runs `npm run check`, commits "Release vx.y.z",
tags), then `npm run release:publish` (push = deploy, GitHub release from the
changelog). Same scheme as pdfmana. Version shows on /dashboard/{slug}/help.
npm run db:seed                     # rebuild the golden-poppy demo
curl -s -X POST <base>/api/onboard -F name=Test -F "menu=@menu.png;type=image/png"
```
