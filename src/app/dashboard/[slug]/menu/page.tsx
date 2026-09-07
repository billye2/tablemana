import { requireOwner } from "@/lib/owner";
import { getMenu } from "@/lib/tenant";
import { DashboardNav, Unauthorized } from "../nav";
import { MenuEditor } from "./menu-editor";

export const dynamic = "force-dynamic";

export default async function MenuPage({ params }: PageProps<"/dashboard/[slug]/menu">) {
  const { slug } = await params;
  const r = await requireOwner(slug);
  if (!r) return <Unauthorized />;
  const menu = await getMenu(r.id);

  return (
    <div className="min-h-screen bg-zinc-50">
      <DashboardNav slug={slug} active="/menu" restaurantName={r.name} />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <MenuEditor
          slug={slug}
          menu={menu.map(({ section, items }) => ({
            id: section.id,
            name: section.name,
            items: items.map((i) => ({
              id: i.id,
              name: i.name,
              description: i.description,
              priceCents: i.priceCents,
              available: i.available,
              photoUrl: i.photoUrl,
            })),
          }))}
        />
      </main>
    </div>
  );
}
