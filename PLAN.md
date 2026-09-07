# PLAN — Restaurant PWA Platform (working name: tablemana)

> Product spec settled via design-tree grilling, 2026-08-14. Every decision below was
> explicitly made; open items are marked TBD, not assumed.
>
> **Status 2026-08-15: v1 built, verified end-to-end, and live in production** at
> https://rc02-ivory.vercel.app. See `HANDOFF.md` for current state and
> `mistakes.md` for the fixed-mistakes log. Decisions changed during the build
> are marked ⟲ inline below and summarized in §9.

## 1. What this is

A multi-tenant, self-serve SaaS for **US independent single-location restaurants**.
An owner signs up, feeds the platform a **menu photo/PDF** plus their **Google Business
Profile**, and gets a live, well-designed restaurant website with:

- a structured, editable menu
- **online ordering (pickup only, prepaid)**
- **real-time slot-based reservations**
- a counter-tablet PWA for receiving/fulfilling orders

The diner-facing site is a fast website; the **PWA framing earns its keep on the
restaurant side** — the installable counter tablet is the order screen.

## 2. Positioning

- **Lead (the wedge):** "No commissions. Own your site and your customer data."
  Flat ~$50/mo + ~$0.50 fixed per order — a *fixed fee, never a percentage* —
  positioned directly against DoorDash/Toast ~30% takes.
- **Closer:** "Menu photo → live ordering site in 10 minutes."
- **Table stakes, not pitch:** the generated sites genuinely look good.

**The Square Online question** (it's free): answer = economics + ownership + zero-effort
onboarding, and (v2) we *inject into* Square rather than fight it.

## 3. Market & go-to-market

- Wedge: independent single-location restaurants, **one US metro**, sold by walking in.
- Built as multi-tenant self-serve from day one; *sold* hands-on — founder personally
  onboards the first customers.
- **Open items (TBD, required before GTM section is real):**
  - [ ] Launch metro
  - [ ] First-customer shortlist (warm restaurant contacts)
  - [ ] Product name (placeholder budget: one hour, not a branch)

## 4. Business model & money flow

- **Pricing:** ~$50/mo subscription + ~$0.50 fixed per-order fee. No percentages.
- **Rails:** **Stripe Connect, Standard accounts** — restaurant is merchant of record;
  refunds and disputes land on the restaurant, not the platform. Platform fee taken
  automatically per order.
- **Tax:** owner configures a **flat sales-tax rate** in settings (single-location =
  single jurisdiction). No Stripe Tax in v1 (its ~0.5% erodes the pricing pitch).
- **Tips:** checkout presets (15/18/20/custom), default on, **100% to the restaurant**,
  stated on the receipt (reinforces anti-commission positioning).

## 5. v1 scope

### 5.1 AI onboarding (the demo magic)
- Inputs: **menu photo/PDF upload** → vision model → structured menu; **Google Places
  lookup** for hours, address, photos (Places does not provide menu data — menu comes
  from the upload).
- No website-URL scraping (flaky, legally gray).
- Wizard fallback/editor for everything the AI produced.

### 5.2 Generated sites
- **3–5 hand-crafted, genuinely good templates.** AI selects template, palette, and
  typography from cuisine + uploaded photos and fills content. **No freeform
  AI-generated layouts** — consistent excellence over occasional brilliance.
- Menu management post-generation: owner edits prices/items anytime; **86ing an item
  from the counter tablet takes effect immediately**.

### 5.3 Ordering (pickup only, prepaid only)
- Diner: browse menu → cart → **pay online (no pay-at-counter)** → SMS updates.
- Restaurant: **accept with ETA** ("accept, ready in 20 min" → diner SMS) on the
  counter-tablet PWA, with SMS/email fallback notification of new orders.
- **Auto-reject + full refund** if an order is unacknowledged for X minutes
  (non-negotiable — money must never sit against a silent restaurant).
- **Busy controls:** pause all ordering; 86 items — both from the counter tablet.
- Order pipeline built on an **event/adapter model** so fulfillment channels
  (POS connectors, printers) bolt on without rework.

### 5.4 Reservations
- **Real-time slot booking**: dead-simple capacity config (X covers per 30-min slot),
  party size, instant confirmation.
- SMS: booking confirmation, reminder ~2h before, **one-tap cancel link**.
- **No card holds / no-show fees in v1** — schema designed so a per-restaurant hold
  policy can be added later. No floor plans, turn times, or waitlists (Resy territory).
- Degrade path: request-based (owner confirms) for restaurants that won't configure
  capacity.

### 5.5 Diner identity & the data promise
- **Guest checkout**: name + SMS-verified phone. No diner accounts in v1
  (Stripe Link autofill covers repeat-order convenience).
- **Consent-checked, exportable customer list** per restaurant — this export *is* the
  "own your customer data" promise; it must be real in v1.

### 5.6 Notifications
- SMS (Twilio or similar) + email for: order received/accepted/ready, reservation
  confirm/reminder/cancel. iOS PWA push is not relied on.

### 5.7 Domains & SEO
- v1: subdomain per tenant (`joes-tacos.<platform>.com`).
- **Custom domains as fast-follow** (weeks, not months) — architecture assumes them
  from day one (hostname-resolved tenancy; Vercel handles SSL for both).
- SEO basics in every generated site: proper metadata, schema.org `Restaurant` +
  `Menu` structured data, sitemap; Google Business Profile linkage.

## 6. Explicitly out of v1 (ordered v2 roadmap)

1. **Square POS connector** (open Orders API; our exact market; retention weapon) —
   first couple months post-launch.
2. **Thermal printers** (Star CloudPRNT / Epson ePOS) via the same order-event adapter
   rail. A prospect demanding one is a v2-pull signal, not a v1 requirement.
3. **Custom domains** connect/purchase flow (fast-follow, see 5.7).
4. **Delivery** via DoorDash Drive / Uber Direct API integration only — never own
   logistics.
5. **Clover connector**; **Toast** only when big enough for their partner program.
   No aggregator middleware (Chowly/ItsaCheckmate ≈ $100+/mo/location — kills the
   economics pitch).
6. Diner accounts; reservation card-hold/no-show fees (per-restaurant opt-in).

## 7. Architecture (the boring default, chosen deliberately)

- **Next.js (App Router) on Vercel** — one app serves tenant sites (resolved by
  hostname), the owner dashboard, and the counter-tablet PWA.
- **Neon Postgres** (Vercel Marketplace) — single database, tenant-scoped rows.
- **Stripe Connect (Standard)** — payments, platform fees, payouts.
- **AI Gateway** — vision model for menu ingestion, model-agnostic.
- **Twilio (or similar)** — SMS.
- Owner auth via a marketplace auth provider (e.g. Clerk); diners stay guest.
- **Order events as first-class records** — every fulfillment surface (tablet, SMS,
  future POS/printer adapters) consumes the same event stream.

### Data model sketch
`Restaurant` (tenant root: slug/domain, hours, tax rate, stripe_account, capacity
config) → `Menu` → `Section` → `Item` (price, photo, available/86'd) ·
`Order` → `OrderItem`, `OrderEvent` (created/accepted/ready/picked_up/auto_rejected) ·
`Reservation` (slot, party size, status) · `Customer` (phone-verified, per-restaurant,
consent flag) · `Template/Theme` selection per restaurant.

## 8. Definition of v1 done

The **full loop live for 3–5 paying restaurants** in the launch metro, each personally
onboarded:

> AI onboarding → generated subdomain site → real prepaid pickup orders hitting the
> counter tablet (accept-with-ETA, SMS to diner) → real slot reservations with
> reminders → weekly payout arriving in the restaurant's bank account.

One restaurant proves the demo; three prove the product.

## 9. Decisions changed during the build (⟲)

1. **AI ingestion runs on the Claude API directly** (official `@anthropic-ai/sdk`,
   model `claude-haiku-4-5`, structured outputs) — not Vercel AI Gateway. The
   gateway required a card-on-file the user preferred not to add; the user chose
   direct API + lowest-cost model. Key lives in Vercel env (`ANTHROPIC_API_KEY`,
   Preview + Production, sensitive).
2. **Tenant URLs are path-form (`/t/{slug}`) until a custom domain exists.**
   `vercel.app` supports only one wildcard level, so `{slug}.project.vercel.app`
   can never resolve. Setting `ROOT_DOMAIN=<customdomain>` flips everything back
   to subdomain form (the code supports both).
3. **Dish photos (scope addition):** stock defaults matched by dish name via
   Pexels at onboarding (needs `PEXELS_API_KEY`, free) + owner uploads stored in
   Vercel Blob (`tableside-photos` store) replacing them. Photos render on the
   diner site, order page, and menu editor.
4. **Working name is "tablemana"** (renamed from "tableside" on 2026-09-06; the Vercel project, GitHub repo, and Blob store keep their old names).
