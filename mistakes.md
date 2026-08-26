# Mistakes Log

Every mistake we catch and fix gets an entry: what went wrong, the root cause,
the fix, and the lesson. Newest first.

---

## 2026-08-25 — CI typecheck failed on a fresh clone: `PageProps` not found

- **Symptom:** First CI run errored with `TS2304: Cannot find name 'PageProps'`
  / `'LayoutProps'` in every page and layout, though `tsc` was clean locally.
- **Root cause:** Those are global helper types Next generates into
  `.next/types` during `next dev`/`next build`. Locally they existed from
  past dev runs; on a clean checkout `tsc --noEmit` ran before anything had
  generated them.
- **Fix:** `npm run typecheck` is now `next typegen && tsc --noEmit`
  (`package.json`) — `next typegen` produces the route types without a build.
- **Lesson:** "Works on my machine" for typecheck can depend on generated
  files. Anything CI runs must be reproducible from a clean clone; when a
  framework generates types, generate them explicitly in the script.

## 2026-08-25 — Owner token lived in every dashboard URL

- **Symptom:** The per-restaurant owner secret rode along as `?key=` on every
  dashboard/counter link, export URL, and tab — so it sat in browser history,
  referrer headers, and request logs, and was compared with plain `!==`.
- **Root cause:** v1 auth was "token in link" end to end; nothing ever moved
  the secret out of the URL after the first visit.
- **Fix:** `src/proxy.ts` catches `?key=` on `/dashboard/*` and `/counter/*`,
  stores it in an HttpOnly `ts_owner_{slug}` cookie, and redirects with the key
  stripped. `requireOwner` accepts explicit key or cookie and compares with
  `crypto.timingSafeEqual` (`src/lib/owner-token.ts`). Internal links no longer
  carry the key.
- **Lesson:** A bearer secret in a URL is leaked the moment it's clicked. Move
  it to a cookie on first sight, and never string-compare secrets.

## 2026-08-25 — Cron endpoint was public whenever CRON_SECRET was unset

- **Symptom:** `/api/cron/auto-reject` skipped its auth check when
  `CRON_SECRET` was absent — which it was in production.
- **Root cause:** "Optional secret" logic: `if (secret && ...)` fails open.
- **Fix:** `cronAuthorized()` in `src/lib/auto-reject.ts` fails closed in
  production without a secret and only stays open in development.
- **Lesson:** Auth checks gated on config presence fail open in exactly the
  environment that forgot the config. Fail closed and gate the exception on
  `NODE_ENV`.

## 2026-08-25 — Simulated "paid" path ran in production, so orders were free

- **Symptom:** With Stripe not yet provisioned, a diner could place a real order
  on the production site and it landed on the counter tablet as paid — no
  charge was ever taken.
- **Root cause:** `beginPayment` fell back to `{ type: "paid" }` whenever
  Stripe was unconfigured or the restaurant had no connected account. That
  fallback was meant for local dev but nothing tied it to the environment.
- **Fix:** `canSimulatePayment()` only allows the fallback outside production
  (or with an explicit `ALLOW_SIMULATED_PAYMENTS=1`). In production without
  Stripe, `beginPayment` returns `unavailable`; `placeOrder` cancels the order,
  records the reason, and tells the diner to call. (`src/lib/payments.ts`,
  `src/app/t/[slug]/actions.ts`)
- **Lesson:** A dev convenience that touches money must be gated on the
  environment, not on whether the real integration happens to be configured.
  "Not configured" is exactly the state production starts in.

## 2026-08-15 — Tenant subdomain links pointed at unreachable URLs

- **Symptom:** After generating a site, the success screen linked to
  `{slug}.rc02-ivory.vercel.app` — "site can't be reached."
- **Root cause:** `vercel.app` wildcard DNS/TLS covers only one subdomain level,
  so tenant subdomains can never resolve on the default domain. The URL builder
  assumed subdomains work everywhere.
- **Fix:** `tenantUrl()`, the start-wizard success screen, and the dashboard
  "View site" link all emit `/t/{slug}` path URLs unless `ROOT_DOMAIN` (a real
  custom domain) is configured. (`src/lib/tenant.ts`)
- **Lesson:** Verify the URL scheme actually resolves on the deployment target
  before shipping links to users. Subdomain tenancy requires a custom domain.

## 2026-08-15 — Error message blamed the user's photo for our billing problem

- **Symptom:** Menu upload failed with "try a clearer photo" when the real
  failure was AI Gateway refusing requests (no credit card on file).
- **Root cause:** One catch-all error message for every ingestion failure.
- **Fix:** Infra/auth/billing failures now return an honest "temporarily
  unavailable on our side" (503); only genuine read failures suggest a clearer
  photo (422). (`src/app/api/onboard/route.ts`)
- **Lesson:** Never let an error message assign blame the code can't verify.
  Distinguish "your input" errors from "our infrastructure" errors.

## 2026-08-14 — White text on white input fields on dark-mode phones

- **Symptom:** On an iPhone in dark mode, everything typed into the onboarding
  form was invisible.
- **Root cause:** The create-next-app scaffold flips body text to near-white
  under `prefers-color-scheme: dark`, while our pages paint light backgrounds.
  Unstyled inputs inherited white text on white fields.
- **Fix:** Removed the OS dark-mode flip — every surface declares its palette
  explicitly — plus `color-scheme: light` on form controls and explicit
  input/placeholder colors. (`src/app/globals.css`)
- **Lesson:** Any surface that paints its own background must also pin its
  foreground colors. Test forms in OS dark mode.

## 2026-08-14 — Subdomain checkout 404'd after payment

- **Symptom:** Placing an order on `golden-poppy.localhost` redirected to a 404.
- **Root cause:** Client code pushed the internal `/t/{slug}/...` path; the
  hostname proxy prepended `/t/{slug}` again, producing `/t/x/t/x/...`.
- **Fix:** The proxy now canonicalizes internal `/t/{slug}` paths on subdomain
  hosts back to the pretty URL via redirect. (`src/proxy.ts`)
- **Lesson:** When rewriting by hostname, always handle the case where the
  internal path leaks into client navigation — test the full flow, not just
  the landing page.

## 2026-08-14 — Vague validation error on the onboarding form

- **Symptom:** Non-numeric text in the sales-tax field produced "Check the
  restaurant details" with no hint of which field or why.
- **Fix:** Field-specific messages ("Sales tax should be a number like 8.5 —
  leave it blank if you don't charge tax."). (`src/app/api/onboard/route.ts`)
- **Lesson:** Validation errors name the field and show a valid example.
