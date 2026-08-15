import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "./index";
import { DEFAULT_HOURS, menuItems, menuSections, restaurants } from "./schema";

const MENU: Record<string, [string, string, number][]> = {
  Starters: [
    ["Charred Shishito Peppers", "Blistered shishitos, smoked sea salt, lemon aioli", 900],
    ["Whipped Feta Toast", "Grilled sourdough, whipped feta, hot honey, thyme", 1100],
    ["Golden Beet Salad", "Roasted beets, pistachio, citrus, chevre", 1300],
  ],
  Mains: [
    ["Harissa Half Chicken", "Wood-roasted half chicken, harissa glaze, herbed rice", 2400],
    ["Grilled Salmon Plate", "King salmon, charred lemon, farro, salsa verde", 2600],
    ["Poppy Smash Burger", "Double patty, aged cheddar, poppy-seed bun, fries", 1800],
    ["Wild Mushroom Tagine", "Seasonal mushrooms, apricot, almond, couscous", 2000],
  ],
  Desserts: [
    ["Olive Oil Cake", "Meyer lemon glaze, creme fraiche", 900],
    ["Chocolate Pot de Creme", "Dark chocolate, olive oil, flaky salt", 1000],
  ],
  Drinks: [
    ["House Lemonade", "Fresh-squeezed, mint", 500],
    ["Sparkling Water", "750ml bottle", 400],
  ],
};

async function seed() {
  const slug = "golden-poppy";
  const existing = await db.select().from(restaurants).where(eq(restaurants.slug, slug));
  if (existing.length > 0) {
    await db.delete(restaurants).where(eq(restaurants.slug, slug));
    console.log("Removed existing golden-poppy tenant");
  }

  const [r] = await db
    .insert(restaurants)
    .values({
      slug,
      name: "Golden Poppy Kitchen",
      description:
        "California-Mediterranean neighborhood kitchen. Wood-fired, seasonal, and made from scratch every morning.",
      cuisine: "California-Mediterranean",
      phone: "+15555550123",
      email: "hello@goldenpoppy.example",
      address1: "412 Alder Street",
      city: "Portland",
      region: "OR",
      postalCode: "97204",
      timezone: "America/Los_Angeles",
      hours: DEFAULT_HOURS,
      taxRateBps: 0, // Oregon: no sales tax — exercise the flat-rate config elsewhere
      theme: "classic",
      accent: "#b45309",
      coversPerSlot: 10,
      maxPartySize: 8,
      ownerToken: randomBytes(16).toString("hex"),
    })
    .returning();

  let sectionOrder = 0;
  for (const [sectionName, items] of Object.entries(MENU)) {
    const [section] = await db
      .insert(menuSections)
      .values({ restaurantId: r.id, name: sectionName, sortOrder: sectionOrder++ })
      .returning();
    await db.insert(menuItems).values(
      items.map(([name, description, priceCents], i) => ({
        restaurantId: r.id,
        sectionId: section.id,
        name,
        description,
        priceCents,
        sortOrder: i,
      })),
    );
  }

  console.log(`Seeded ${r.name}`);
  console.log(`  tenant site:  http://${slug}.localhost:3000/`);
  console.log(`  dashboard:    http://localhost:3000/dashboard/${slug}?key=${r.ownerToken}`);
  console.log(`  counter:      http://localhost:3000/counter/${slug}?key=${r.ownerToken}`);
}

seed().then(() => process.exit(0));
