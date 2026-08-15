import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/tenant";
import { todayInTz } from "@/lib/time";
import { ReserveClient } from "./reserve-client";

export default async function ReservePage({ params }: PageProps<"/t/[slug]/reserve">) {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r || !r.reservationsEnabled) notFound();

  const dates = Array.from({ length: 14 }, (_, i) => todayInTz(r.timezone, i));
  return (
    <ReserveClient
      slug={slug}
      timezone={r.timezone}
      maxPartySize={r.maxPartySize}
      dates={dates}
    />
  );
}
