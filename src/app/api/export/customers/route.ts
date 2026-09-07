import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireOwner } from "@/lib/owner";

/** The "own your customer data" promise, made real (PLAN.md §5.5). */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  const r = await requireOwner(slug);
  if (!r) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const list = await db
    .select()
    .from(customers)
    .where(eq(customers.restaurantId, r.id))
    .orderBy(desc(customers.createdAt));

  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const rows = [
    "name,phone,email,marketing_consent,first_seen",
    ...list.map((c) =>
      [
        esc(c.name),
        esc(c.phone),
        esc(c.email ?? ""),
        c.marketingConsent ? "yes" : "no",
        c.createdAt.toISOString().slice(0, 10),
      ].join(","),
    ),
  ].join("\n");

  return new NextResponse(rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-customers.csv"`,
    },
  });
}
