import { requireOwner } from "@/lib/owner";
import { getMenu } from "@/lib/tenant";
import { DashboardNav, Unauthorized } from "../nav";
import { MenuEditor } from "./menu-editor";

export const dynamic = "force-dynamic";

export default async function MenuPage({
  params,
  searchParams,
}: PageProps<"/dashboard/[slug]/menu">) {
  const { slug } = await params;
  const { key } = (await searchParams) as { key?: string };
  const r = await requireOwner(slug, key);
  if (!r) return <Unauthorized />;
  const menu = await getMenu(r.id);

  return (
    <div className="min-h-screen bg-zinc-50">
      <DashboardNav slug={slug} ownerKey={key!} active="/menu" restaurantName={r.name} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <MenuEditor
          slug={slug}
          ownerKey={key!}
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
