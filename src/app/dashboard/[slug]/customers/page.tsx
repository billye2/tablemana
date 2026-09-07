import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireOwner } from "@/lib/owner";
import { DashboardNav, Unauthorized } from "../nav";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ params }: PageProps<"/dashboard/[slug]/customers">) {
  const { slug } = await params;
  const r = await requireOwner(slug);
  if (!r) return <Unauthorized />;

  const list = await db
    .select()
    .from(customers)
    .where(eq(customers.restaurantId, r.id))
    .orderBy(desc(customers.createdAt));

  return (
    <div className="min-h-screen bg-zinc-50">
      <DashboardNav slug={slug} active="/customers" restaurantName={r.name} />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-zinc-900">Your customers</h2>
            <p className="text-sm text-zinc-500">
              {list.length} people. This list is yours — export it any time.
            </p>
          </div>
          <a
            href={`/api/export/customers?slug=${slug}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white sm:min-h-10"
          >
            Export CSV
          </a>
        </div>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-2.5 sm:px-4">Name</th>
                <th className="px-3 py-2.5 sm:px-4">Phone</th>
                <th className="px-3 py-2.5 sm:px-4">
                  <span className="sm:hidden">Texts</span>
                  <span className="hidden sm:inline">Marketing OK</span>
                </th>
                <th className="hidden px-4 py-2.5 sm:table-cell">First seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-3 font-medium text-zinc-900 sm:px-4 sm:py-2.5">
                    {c.name}
                    <span className="block text-xs font-normal text-zinc-400 sm:hidden">
                      {c.createdAt.toLocaleDateString("en-US")}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-zinc-600 sm:px-4 sm:py-2.5">{c.phone}</td>
                  <td className="px-3 py-3 sm:px-4 sm:py-2.5">{c.marketingConsent ? "Yes" : "No"}</td>
                  <td className="hidden px-4 py-2.5 text-zinc-500 sm:table-cell">
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
