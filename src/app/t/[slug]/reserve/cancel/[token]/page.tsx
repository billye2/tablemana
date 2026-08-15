import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/tenant";
import { CancelClient } from "./cancel-client";

export default async function CancelReservationPage({
  params,
}: PageProps<"/t/[slug]/reserve/cancel/[token]">) {
  const { slug, token } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) notFound();
  return <CancelClient slug={slug} token={token} restaurantName={r.name} />;
}
