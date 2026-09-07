import { notFound } from "next/navigation";
import { isSmsConfigured } from "@/lib/sms";
import { getMenu, getRestaurantBySlug } from "@/lib/tenant";
import { OrderClient } from "./order-client";

export default async function OrderPage({ params }: PageProps<"/t/[slug]/order">) {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) notFound();
  const menu = await getMenu(r.id);
  const address = [r.address1, r.city, [r.region, r.postalCode].filter(Boolean).join(" ")]
    .filter((part) => part && part.trim())
    .join(", ");

  return (
    <OrderClient
      slug={slug}
      restaurant={{ name: r.name, address: address || null, phone: r.phone }}
      orderingPaused={r.orderingPaused}
      taxRateBps={r.taxRateBps}
      smsEnabled={isSmsConfigured()}
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
