import { requireOwner } from "@/lib/owner";
import { DashboardNav, Unauthorized } from "../nav";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
  searchParams,
}: PageProps<"/dashboard/[slug]/settings">) {
  const { slug } = await params;
  const { key } = (await searchParams) as { key?: string };
  const r = await requireOwner(slug, key);
  if (!r) return <Unauthorized />;

  return (
    <div className="min-h-screen bg-zinc-50">
      <DashboardNav slug={slug} ownerKey={key!} active="/settings" restaurantName={r.name} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <SettingsForm
          slug={slug}
          ownerKey={key!}
          initial={{
            name: r.name,
            description: r.description ?? "",
            phone: r.phone ?? "",
            taxRatePercent: r.taxRateBps / 100,
            theme: r.theme as "classic" | "bistro" | "bold",
            accent: r.accent,
            coversPerSlot: r.coversPerSlot,
            maxPartySize: r.maxPartySize,
            autoRejectMinutes: r.autoRejectMinutes,
            reservationsEnabled: r.reservationsEnabled,
            hours: r.hours,
          }}
        />
      </main>
    </div>
  );
}
