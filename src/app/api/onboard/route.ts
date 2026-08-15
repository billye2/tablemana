import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/db";
import { DEFAULT_HOURS, menuItems, menuSections, restaurants } from "@/db/schema";
import { ingestMenu, type IngestedMenu } from "@/lib/ingest";
import { findStockPhotos } from "@/lib/stock-photos";

export const maxDuration = 120;

const fieldsSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  address1: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(50).optional(),
  postalCode: z.string().max(20).optional(),
  taxRatePercent: z.coerce.number().min(0).max(30).default(0),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || "restaurant";
  for (let i = 0; i < 20; i++) {
    const [taken] = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.slug, slug));
    if (!taken) return slug;
    slug = `${base}-${randomBytes(2).toString("hex")}`;
  }
  throw new Error("Could not allocate slug");
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const raw = Object.fromEntries(form.entries());
  if (typeof raw.taxRatePercent === "string" && raw.taxRatePercent.trim() === "") {
    delete raw.taxRatePercent;
  }
  const parsed = fieldsSchema.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const error =
      field === "taxRatePercent"
        ? "Sales tax should be a number like 8.5 — leave it blank if you don't charge tax."
        : field === "name"
          ? "Enter your restaurant's name."
          : "Check the restaurant details.";
    return NextResponse.json({ error }, { status: 400 });
  }
  const fields = parsed.data;

  const file = form.get("menu");
  let ingested: IngestedMenu | null = null;
  if (file instanceof File && file.size > 0) {
    if (!ACCEPTED.includes(file.type)) {
      return NextResponse.json(
        { error: "Upload a photo (JPG/PNG) or PDF of your menu." },
        { status: 400 },
      );
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Menu file must be under 15 MB." }, { status: 400 });
    }
    try {
      ingested = await ingestMenu(
        { data: new Uint8Array(await file.arrayBuffer()), mediaType: file.type },
        fields.name,
      );
    } catch (err) {
      console.error("[onboard] ingestion failed", err);
      // Don't blame the photo for infrastructure failures (gateway auth/billing).
      const msg = err instanceof Error ? `${err.message} ${String(err.cause ?? "")}` : "";
      const isInfra = /credit card|verification|unauthorized|api key|gateway|403|429/i.test(msg);
      return NextResponse.json(
        {
          error: isInfra
            ? "Menu reading is temporarily unavailable on our side — skip the upload for now and add items from your dashboard, or try again later."
            : "We couldn't read that menu — try a clearer photo, or skip the upload and add items by hand.",
        },
        { status: isInfra ? 503 : 422 },
      );
    }
  }

  const slug = await uniqueSlug(slugify(fields.name));
  const [r] = await db
    .insert(restaurants)
    .values({
      slug,
      name: fields.name,
      description: ingested?.description ?? null,
      cuisine: ingested?.cuisine ?? null,
      phone: fields.phone || null,
      address1: fields.address1 || null,
      city: fields.city || null,
      region: fields.region || null,
      postalCode: fields.postalCode || null,
      hours: DEFAULT_HOURS,
      taxRateBps: Math.round(fields.taxRatePercent * 100),
      theme: ingested?.theme ?? "classic",
      accent: ingested?.accentHex?.toLowerCase() ?? "#b45309",
      ownerToken: randomBytes(16).toString("hex"),
    })
    .returning();

  if (ingested) {
    let order = 0;
    const inserted: { id: string; name: string }[] = [];
    for (const section of ingested.sections) {
      const [s] = await db
        .insert(menuSections)
        .values({ restaurantId: r.id, name: section.name, sortOrder: order++ })
        .returning();
      if (section.items.length > 0) {
        const rows = await db
          .insert(menuItems)
          .values(
            section.items.map((item, i) => ({
              restaurantId: r.id,
              sectionId: s.id,
              name: item.name,
              description: item.description ?? null,
              priceCents: Math.max(0, item.priceCents),
              sortOrder: i,
            })),
          )
          .returning({ id: menuItems.id, name: menuItems.name });
        inserted.push(...rows);
      }
    }

    // Stock defaults so the site never looks empty; owners replace with real
    // photos from the menu editor. Best-effort — skipped without a Pexels key.
    const photos = await findStockPhotos(inserted.map((i) => i.name));
    for (const item of inserted) {
      const url = photos.get(item.name);
      if (url) {
        await db.update(menuItems).set({ photoUrl: url }).where(eq(menuItems.id, item.id));
      }
    }
  }

  return NextResponse.json({
    slug,
    ownerToken: r.ownerToken,
    itemCount: ingested?.sections.reduce((n, s) => n + s.items.length, 0) ?? 0,
    theme: r.theme,
  });
}
