import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireOwner } from "@/lib/owner";
import { DashboardNav, Unauthorized } from "../nav";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  params,
  searchParams,
}: PageProps<"/dashboard/[slug]/customers">) {
  const { slug } = await params;
  const { key } = (await searchParams) as { key?: string };
  const r = await requireOwner(slug, key);
  if (!r) return <Unauthorized />;

  const list = await db
    .select()
    .from(customers)
    .where(eq(customers.restaurantId, r.id))
    .orderBy(desc(customers.createdAt));

  return (
    <div className="min-h-screen bg-zinc-50">
      <DashboardNav slug={slug} ownerKey={key!} active="/customers" restaurantName={r.name} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Your customers</h2>
            <p className="text-sm text-zinc-500">
              {list.length} people. This list is yours — export it any time.
            </p>
          </div>
          <a
            href={`/api/export/customers?slug=${slug}&key=${key}`}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Export CSV
          </a>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5">Marketing OK</th>
                <th className="px-4 py-2.5">First seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2.5 font-medium text-zinc-900">{c.name}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{c.phone}</td>
                  <td className="px-4 py-2.5">{c.marketingConsent ? "Yes" : "No"}</td>
                  <td className="px-4 py-2.5 text-zinc-500">
                    {c.createdAt.toLocaleDateString("en-US")}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-zinc-500">
                    No customers yet — they appear here after their first order or
                    reservation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
