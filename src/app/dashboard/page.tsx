import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ownedRestaurants } from "@/lib/owner";

export const dynamic = "force-dynamic";

/**
 * Where a sign-in lands: straight into the only restaurant, a picker when
 * there are several, or onboarding when the account has none yet.
 */
export default async function DashboardIndex() {
  const mine = await ownedRestaurants();
  if (mine.length === 0) redirect("/start");
  if (mine.length === 1) redirect(`/dashboard/${mine[0].slug}`);

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-xl px-4 py-14">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">Your restaurants</h1>
          <UserButton />
        </div>
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {mine.map((r) => (
            <li key={r.id}>
              <Link
                href={`/dashboard/${r.slug}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-900">{r.name}</span>
                <span className="text-sm text-zinc-500">/t/{r.slug} →</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/start" className="mt-6 inline-block text-sm font-medium text-zinc-700 underline">
          + Add another restaurant
        </Link>
      </main>
    </div>
  );
}
