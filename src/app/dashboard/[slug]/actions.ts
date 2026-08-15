"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  menuItems,
  menuSections,
  reservations,
  restaurants,
  type WeeklyHours,
} from "@/db/schema";
import { requireOwner } from "@/lib/owner";

async function owner(slug: string, key: string) {
  const r = await requireOwner(slug, key);
  if (!r) throw new Error("Unauthorized");
  return r;
}

function refresh(slug: string) {
  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/t/${slug}`);
}

// ---- Menu management -------------------------------------------------------

export async function addSection(slug: string, key: string, name: string): Promise<void> {
  const r = await owner(slug, key);
  if (!name.trim()) return;
  const existing = await db
    .select()
    .from(menuSections)
    .where(eq(menuSections.restaurantId, r.id));
  await db.insert(menuSections).values({
    restaurantId: r.id,
    name: name.trim(),
    sortOrder: existing.length,
  });
  refresh(slug);
}

export async function deleteSection(slug: string, key: string, sectionId: string): Promise<void> {
  const r = await owner(slug, key);
  await db
    .delete(menuSections)
    .where(and(eq(menuSections.id, sectionId), eq(menuSections.restaurantId, r.id)));
  refresh(slug);
}

const itemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  priceCents: z.number().int().min(0).max(1000000),
});

export async function addItem(
  slug: string,
  key: string,
  sectionId: string,
  input: { name: string; description?: string; priceCents: number },
): Promise<void> {
  const r = await owner(slug, key);
  const parsed = itemSchema.parse(input);
  await db.insert(menuItems).values({
    restaurantId: r.id,
    sectionId,
    name: parsed.name,
    description: parsed.description || null,
    priceCents: parsed.priceCents,
  });
  refresh(slug);
}

export async function updateItem(
  slug: string,
  key: string,
  itemId: string,
  input: { name: string; description?: string; priceCents: number },
): Promise<void> {
  const r = await owner(slug, key);
  const parsed = itemSchema.parse(input);
  await db
    .update(menuItems)
    .set({
      name: parsed.name,
      description: parsed.description || null,
      priceCents: parsed.priceCents,
    })
    .where(and(eq(menuItems.id, itemId), eq(menuItems.restaurantId, r.id)));
  refresh(slug);
}

export async function deleteItem(slug: string, key: string, itemId: string): Promise<void> {
  const r = await owner(slug, key);
  await db
    .delete(menuItems)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.restaurantId, r.id)));
  refresh(slug);
}

// ---- Settings --------------------------------------------------------------

const settingsSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  phone: z.string().max(30).optional(),
  taxRatePercent: z.number().min(0).max(30),
  theme: z.enum(["classic", "bistro", "bold"]),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  coversPerSlot: z.number().int().min(1).max(500),
  maxPartySize: z.number().int().min(1).max(50),
  autoRejectMinutes: z.number().int().min(5).max(60),
  reservationsEnabled: z.boolean(),
  hours: z.record(
    z.string(),
    z.array(z.tuple([z.string().regex(/^\d{2}:\d{2}$/), z.string().regex(/^\d{2}:\d{2}$/)])),
  ),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export async function updateSettings(
  slug: string,
  key: string,
  input: SettingsInput,
): Promise<{ ok: boolean; error?: string }> {
  const r = await owner(slug, key);
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid settings." };
  const s = parsed.data;
  await db
    .update(restaurants)
    .set({
      name: s.name,
      description: s.description || null,
      phone: s.phone || null,
      taxRateBps: Math.round(s.taxRatePercent * 100),
      theme: s.theme,
      accent: s.accent,
      coversPerSlot: s.coversPerSlot,
      maxPartySize: s.maxPartySize,
      autoRejectMinutes: s.autoRejectMinutes,
      reservationsEnabled: s.reservationsEnabled,
      hours: s.hours as WeeklyHours,
    })
    .where(eq(restaurants.id, r.id));
  refresh(slug);
  return { ok: true };
}

// ---- Reservations ----------------------------------------------------------

export async function setReservationStatus(
  slug: string,
  key: string,
  reservationId: string,
  status: "seated" | "no_show" | "canceled",
): Promise<void> {
  const r = await owner(slug, key);
  await db
    .update(reservations)
    .set({ status })
    .where(and(eq(reservations.id, reservationId), eq(reservations.restaurantId, r.id)));
  refresh(slug);
}
