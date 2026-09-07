# Mistakes Log

Every mistake we catch and fix gets an entry: what went wrong, the root cause,
the fix, and the lesson. Newest first.

---

## 2026-09-07 — Sales tax field would not accept a decimal point

- **Symptom:** Typing `8.25` into Settings → Sales tax % produced `8`, then
  `82`, then `825`: the decimal point vanished the moment it was typed.
- **Root cause:** The input was controlled by a number in form state and
  every keystroke ran `parseFloat`. `parseFloat("8.")` is `8`, so React
  re-rendered the field as `8` and the trailing dot was lost before the next
  digit could land.
- **Fix:** `src/app/dashboard/[slug]/settings/settings-form.tsx` keeps the
  tax rate as a string while editing and parses it once on save, with a
  0–30 range check that reports a message instead of silently saving 0.
- **Lesson:** A controlled input that must accept partial numeric text
  ("8.", "-", "") needs string state during editing. Parse at the boundary
  (submit), never per keystroke.

---

## 2026-09-07 — The diner site was built desktop-first, on a product whose diners are on phones

- **Symptom:** On a phone, the pickup page put the cart and Pay button below
  the entire menu with nothing pointing to it; iOS zoomed into every form
  field on focus; Add buttons and tip chips were ~32px tall; long restaurant
  names pushed the header buttons off screen; dashboard tabs and the counter
  header wrapped into three lines.
- **Root cause:** Every layout was written at laptop width and only got
  `sm:`/`lg:` variants where the desktop layout obviously broke. Nothing
  enforced the phone baseline: 14px inputs (below iOS's 16px no-zoom
  threshold), no minimum tap target, no viewport export, no safe-area
  handling.
- **Fix:** `src/app/globals.css` sets 16px form controls below `sm` and adds
  `pb-safe`/`pt-safe`; `src/app/layout.tsx` exports a `viewport`; every
  surface got `min-h-11` targets, truncating headers, and phone-first
  stacking. `src/app/t/[slug]/order/order-client.tsx` adds a fixed bottom bar
  that jumps to the cart and hides when the cart is on screen (a plain
  scroll-position check; IntersectionObserver never fired inside the iframe
  harness used to verify at 390px, so the scroll check is what was tested).
- **Lesson:** For a product diners open from a QR code, the phone is the
  default and the desktop is the variant. Write base classes for 375px and
  add `sm:` up, and keep the three phone invariants in global CSS where a
  page cannot forget them: 16px inputs, 44px targets, no horizontal scroll.

---

## 2026-09-06 — Onboarding created restaurants that belonged to nobody

- **Symptom:** Anyone could upload a menu and get a live ordering site with no
  email or login attached. The only credential was a random token in a link;
  lose the link and the restaurant was unreachable, and every anonymous upload
  spent Claude credits.
- **Root cause:** v1 shipped with a "token now, accounts later" stopgap and the
  stopgap became the product. The same token also opened both the dashboard and
  the shared counter tablet.
- **Fix:** Clerk owner accounts (`src/lib/owner.ts`, `src/proxy.ts`,
  `src/app/api/onboard/route.ts`): onboarding and the dashboard require a
  session, restaurants carry `owner_user_id`, and the old token is demoted to a
  counter-only key rotated from Settings. Pure decisions live in
  `src/lib/access.ts` with tests.
- **Lesson:** Anything that spends money or creates a durable tenant needs an
  identity behind it from day one. And one credential should open one surface:
  a device left on a counter must not be an admin login.

---

## 2026-09-06 — Production URL dead: the Vercel project had been taken over by another app

- **Symptom:** https://rc02-ivory.vercel.app returned `DEPLOYMENT_NOT_FOUND` on
  every path, and `vercel project inspect rc02` said the project did not exist,
  though nobody had deleted anything.
- **Root cause:** On 2026-08-31 a different app (Scanmana) was deployed from a
  folder whose `.vercel/project.json` pointed at this project. That session then
  renamed the project `rc02` → `scanmana` and git-connected it to the Scanmana
  repo. Renaming a project drops its `<name>-<hash>.vercel.app` alias, so the
  tableside production URL vanished. Its handoff doc also labelled tableside's
  Neon resource an "orphan, safe to remove".
- **Fix:** New Vercel project `tableside` (git-connected to this repo), the Neon
  resource `neon-chestnut-jacket` verified as the tableside DB by matching
  `NEON_PROJECT_ID`, connected to the new project and disconnected from Scanmana.
  Blob token and a fresh `CRON_SECRET` set; the sensitive API keys had to be
  re-entered. README + HANDOFF now point at https://tableside-mu.vercel.app.
- **Lesson:** Before the first `--prod` deploy onto a pre-existing Vercel
  project, run `vercel ls` and check what its alias serves. Never rename a
  project that another app depends on. And verify a resource is unused (compare
  project IDs) before writing "safe to delete" in a handoff.

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
