import { del, put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { requireOwner } from "@/lib/owner";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024;

/** Owner uploads a real dish photo (replaces any stock default). */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const slug = String(form.get("slug") ?? "");
  const itemId = String(form.get("itemId") ?? "");
  const photo = form.get("photo");

  const r = await requireOwner(slug);
  if (!r) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Attach a photo." }, { status: 400 });
  }
  if (!IMAGE_TYPES.includes(photo.type)) {
    return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });
  }
  if (photo.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo must be under 8 MB." }, { status: 400 });
  }

  const [item] = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.restaurantId, r.id)));
  if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
  const blob = await put(`dishes/${slug}/${itemId}.${ext}`, photo, {
    access: "public",
    addRandomSuffix: true,
  });

  // Clean up a previously uploaded blob (leave stock URLs alone).
  if (item.photoUrl?.includes(".blob.vercel-storage.com/")) {
    await del(item.photoUrl).catch(() => {});
  }

  await db.update(menuItems).set({ photoUrl: blob.url }).where(eq(menuItems.id, item.id));
  return NextResponse.json({ url: blob.url });
}

/** Remove a dish photo. */
export async function DELETE(req: NextRequest) {
  const { slug, itemId } = (await req.json()) as { slug?: string; itemId?: string };
  const r = await requireOwner(slug ?? "");
  if (!r) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [item] = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.id, itemId ?? ""), eq(menuItems.restaurantId, r.id)));
  if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  if (item.photoUrl?.includes(".blob.vercel-storage.com/")) {
    await del(item.photoUrl).catch(() => {});
  }
  await db.update(menuItems).set({ photoUrl: null }).where(eq(menuItems.id, item.id));
  return NextResponse.json({ ok: true });
}
