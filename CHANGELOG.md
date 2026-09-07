# Changelog

All notable changes to tablemana are documented here. This project follows
[Keep a Changelog](https://keepachangelog.com/) conventions.

Versioning: each version component counts 0–9 and carries into the next, like
an odometer — 1.0.9 → 1.1.0 → 1.1.1, … 1.9.9 → 2.0.0 (the pdfmana scheme).
`npm run release` bumps, checks, commits, and tags; `npm run release:publish`
pushes (which deploys production) and creates the GitHub release from the
matching section below. Write the next version's section before running the
release.

## [1.0.4] — 2026-09-07

### Added

- **Demo disclaimer on the reservation form** — under the Book table button,
  diners are told the SMS provider is not enabled and no confirmation text will
  be sent (the booking is still recorded). It disappears on its own once the
  Twilio env vars exist (`isSmsConfigured()` in `src/lib/sms.ts`).

## [1.0.3] — 2026-09-07

### Added

- **Help everywhere, not just the admin side.** `/help` is a public guide for
  prospects and owners before they sign in: setup steps, pricing, the website,
  ordering with the auto-refund promise, reservations, customer data, accounts
  and the tablet key, and an FAQ. Linked from the landing header and footer.
  Each restaurant site gets `/t/{slug}/help` in its own theme for diners: how
  pickup works, the refund guarantee with that restaurant's real window,
  reservations (or a note that they are off), what happens to their details,
  and how to reach the restaurant. Linked from the tenant footer.

## [1.0.2] — 2026-09-07

### Added

- **Live demo on the landing page** — a "See a live demo" button in the hero
  opens the Restaurant Demo tenant (`/t/restaurant-demo`) in a new tab so
  prospects can browse a generated site, place a test order, and book a table
  before signing up.

## [1.0.1] — 2026-09-06

### Added

- **Owner accounts via Clerk** — sign in with an email code or Google. A
  restaurant now belongs to a Clerk user (`owner_user_id`), so the dashboard
  opens from any device with a login instead of a bookmarked secret link, and
  the menu upload (which spends Claude credits) only runs for a signed-in
  person. `/dashboard` lists your restaurants or jumps straight into the only
  one. Restaurants created before accounts existed are claimed by opening their
  old welcome link once while signed in.
- **Separate counter tablet key** — the old owner token now opens the counter
  only. Settings → Counter tablet shows the tablet link, copies it, and issues a
  new key when a device goes missing. The owner's own session also opens the
  counter, so no key is needed on the owner's phone.

### Changed

- The help page's "Getting in" chapter describes accounts and the tablet key;
  the landing header shows Sign in or Dashboard depending on session state.
- Proxy routing logic moved to `src/lib/routing.ts` so it stays unit-testable
  under Clerk's middleware wrapper; new `src/lib/access.ts` holds the pure
  owner/counter decisions with tests (156 cases total).

### Migration

- Two nullable columns on `restaurants`: `owner_user_id`, `owner_email`
  (`vercel env run -e production -- npm run db:push`).

## [1.0.0] — 2026-09-06

Baseline release stamping the first fully-live state under the tablemana name.

### Added

- **Owner help page** at `/dashboard/{slug}/help` — a Help tab in the dashboard
  and a `?` in the counter header. Explains the key-to-cookie login, the
  Overview tiles, the counter flow (accept with a time, decline, ready, picked
  up, the auto-refund clock, pause, 86 board), the menu editor, every Settings
  field, reservations, customers, and an order-lifecycle table with the exact
  texts diners receive.
- **Release tooling** — `scripts/release.mjs`, this changelog, and the version
  line at the bottom of the help page.

### Changed

- **Rebranded from tableside to tablemana** — landing page, browser metadata,
  counter PWA name, package name, docs. The GitHub repo is now public at
  `billye2/tablemana`, the Vercel project is `tablemana`, and production is
  https://tablemana.vercel.app.

### Fixed

- **Production was dead** — the original Vercel project had been renamed by
  another app on 2026-08-31, which dropped the alias. tablemana now deploys
  from its own git-connected project, with the Neon resource verified as its
  database and the sensitive API keys re-entered.

[1.0.4]: https://github.com/billye2/tablemana/releases/tag/v1.0.4
[1.0.3]: https://github.com/billye2/tablemana/releases/tag/v1.0.3
[1.0.2]: https://github.com/billye2/tablemana/releases/tag/v1.0.2
[1.0.1]: https://github.com/billye2/tablemana/releases/tag/v1.0.1
[1.0.0]: https://github.com/billye2/tablemana/releases/tag/v1.0.0
