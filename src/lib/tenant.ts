import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  menuItems,
  menuSections,
  restaurants,
  type MenuItem,
  type MenuSection,
  type Restaurant,
} from "@/db/schema";

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const [r] = await db.select().from(restaurants).where(eq(restaurants.slug, slug));
  return r ?? null;
}

export type MenuTree = { section: MenuSection; items: MenuItem[] }[];

export async function getMenu(restaurantId: string): Promise<MenuTree> {
  const sections = await db
    .select()
    .from(menuSections)
    .where(eq(menuSections.restaurantId, restaurantId))
    .orderBy(asc(menuSections.sortOrder), asc(menuSections.name));
  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.restaurantId, restaurantId))
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.name));
  return sections.map((section) => ({
    section,
    items: items.filter((i) => i.sectionId === section.id),
  }));
}

/**
 * Base URL of a tenant site. Subdomains need a custom domain (ROOT_DOMAIN) —
 * *.vercel.app only supports one wildcard level, so slug.project.vercel.app
 * doesn't resolve. Until a custom domain exists, use the /t/{slug} path form.
 */
export function tenantUrl(slug: string, path = ""): string {
  const root = process.env.ROOT_DOMAIN;
  if (root) {
    const proto = root.startsWith("localhost") ? "http" : "https";
    return `${proto}://${slug}.${root}${path}`;
  }
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}/t/${slug}${path}`;
  return `http://${slug}.localhost:3000${path}`;
}
