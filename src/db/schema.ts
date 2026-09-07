import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Weekly hours: 0=Sun..6=Sat, each day a list of [open, close] "HH:MM" ranges. */
export type WeeklyHours = Record<string, [string, string][]>;

export const DEFAULT_HOURS: WeeklyHours = {
  "0": [],
  "1": [["11:00", "21:00"]],
  "2": [["11:00", "21:00"]],
  "3": [["11:00", "21:00"]],
  "4": [["11:00", "21:00"]],
  "5": [["11:00", "22:00"]],
  "6": [["11:00", "22:00"]],
};

export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  cuisine: text("cuisine"),
  phone: text("phone"),
  email: text("email"),
  address1: text("address1"),
  city: text("city"),
  region: text("region"),
  postalCode: text("postal_code"),
  timezone: text("timezone").notNull().default("America/New_York"),
  hours: jsonb("hours").$type<WeeklyHours>().notNull(),
  taxRateBps: integer("tax_rate_bps").notNull().default(0),
  theme: text("theme").notNull().default("classic"),
  accent: text("accent").notNull().default("#b45309"),
  heroImageUrl: text("hero_image_url"),
  orderingPaused: boolean("ordering_paused").notNull().default(false),
  autoRejectMinutes: integer("auto_reject_minutes").notNull().default(15),
  reservationsEnabled: boolean("reservations_enabled").notNull().default(true),
  // Owner choice: /t/{slug} sends visitors straight to /order instead of the
  // front page (description, menu with photos, hours, address).
  homeRedirectsToOrder: boolean("home_redirects_to_order").notNull().default(false),
  slotMinutes: integer("slot_minutes").notNull().default(30),
  coversPerSlot: integer("covers_per_slot").notNull().default(8),
  maxPartySize: integer("max_party_size").notNull().default(8),
  stripeAccountId: text("stripe_account_id"),
  // Clerk user who owns this restaurant. Null only for tenants created before
  // accounts existed; the first signed-in visit with the legacy key claims them.
  ownerUserId: text("owner_user_id"),
  ownerEmail: text("owner_email"),
  // Shared-device key for the counter tablet (column keeps its pre-accounts
  // name). Rotated from Settings; never grants dashboard access on its own.
  counterToken: text("owner_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const menuSections = pgTable(
  "menu_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("menu_sections_restaurant_idx").on(t.restaurantId)],
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => menuSections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    photoUrl: text("photo_url"),
    available: boolean("available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("menu_items_restaurant_idx").on(t.restaurantId)],
);

/** Per-restaurant customer record — this table backs the "own your customer data" export. */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customers_restaurant_phone_idx").on(t.restaurantId, t.phone)],
);

export type OrderStatus =
  | "awaiting_payment"
  | "placed"
  | "accepted"
  | "ready"
  | "picked_up"
  | "rejected"
  | "auto_rejected"
  | "canceled";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id),
    code: text("code").notNull(),
    status: text("status").$type<OrderStatus>().notNull().default("awaiting_payment"),
    subtotalCents: integer("subtotal_cents").notNull(),
    taxCents: integer("tax_cents").notNull(),
    tipCents: integer("tip_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    platformFeeCents: integer("platform_fee_cents").notNull().default(0),
    etaMinutes: integer("eta_minutes"),
    notes: text("notes"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    placedAt: timestamp("placed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_restaurant_status_idx").on(t.restaurantId, t.status),
    index("orders_restaurant_created_idx").on(t.restaurantId, t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id").references(() => menuItems.id),
    // Name/price snapshotted at order time — menu edits must not rewrite history.
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull(),
    quantity: integer("quantity").notNull().default(1),
    notes: text("notes"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export type OrderEventType =
  | "created"
  | "paid"
  | "accepted"
  | "ready"
  | "picked_up"
  | "rejected"
  | "auto_rejected"
  | "canceled"
  | "refunded"
  | "sms_sent";

/**
 * First-class event stream. Every fulfillment surface (counter tablet, SMS,
 * future POS/printer adapters) consumes this — see PLAN.md §5.3.
 */
export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text("type").$type<OrderEventType>().notNull(),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

export type ReservationStatus = "confirmed" | "canceled" | "seated" | "no_show";

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id),
    slotStart: timestamp("slot_start", { withTimezone: true }).notNull(),
    partySize: integer("party_size").notNull(),
    status: text("status").$type<ReservationStatus>().notNull().default("confirmed"),
    cancelToken: text("cancel_token").notNull(),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reservations_restaurant_slot_idx").on(t.restaurantId, t.slotStart)],
);

export type Restaurant = typeof restaurants.$inferSelect;
export type MenuSection = typeof menuSections.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
