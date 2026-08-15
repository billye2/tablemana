import { notFound } from "next/navigation";
import { getMenu, getRestaurantBySlug } from "@/lib/tenant";
import { OrderClient } from "./order-client";

export default async function OrderPage({ params }: PageProps<"/t/[slug]/order">) {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) notFound();
  const menu = await getMenu(r.id);

  return (
    <OrderClient
      slug={slug}
      orderingPaused={r.orderingPaused}
      taxRateBps={r.taxRateBps}
      menu={menu.map(({ section, items }) => ({
        id: section.id,
        name: section.name,
        items: items
          .filter((i) => i.available)
          .map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            priceCents: i.priceCents,
            photoUrl: i.photoUrl,
          })),
      }))}
    />
  );
}
