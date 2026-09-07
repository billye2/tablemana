import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/t/[slug]/help">): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  return { title: r ? `How ordering works · ${r.name}` : "Help" };
}

/**
 * Diner-facing help, rendered inside the restaurant's own theme. Every
 * statement reflects the live settings (refund window, reservations on/off),
 * so it stays true when the owner changes them.
 */
export default async function TenantHelpPage({ params }: PageProps<"/t/[slug]/help">) {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) notFound();

  const card = "space-y-3 rounded-2xl border p-5 text-sm leading-relaxed";
  const cardStyle = { borderColor: "var(--t-line)", background: "var(--t-card)" } as const;
  const h2 = "text-lg font-bold";

  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-3xl font-bold">How ordering works</h1>
      <p className="mt-2" style={{ color: "var(--t-muted)" }}>
        Everything you need to know before ordering pickup or booking a table at{" "}
        {r.name}.
      </p>

      <div className="mt-8 space-y-6">
        <section className="space-y-3">
          <h2 className={h2}>Pickup orders</h2>
          <div className={card} style={cardStyle}>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Pick your dishes, add a tip if you like (every cent goes to the
                restaurant), enter your name and mobile number, and pay.
              </li>
              <li>
                The kitchen sees your order right away and confirms it with a pickup
                time. You get a text, and your order page shows the same status.
              </li>
              <li>
                When it is ready you get another text. Come in and show the
                four-character code on your order page.
              </li>
            </ol>
            <p>
              <strong>You are never charged for an order that is not accepted.</strong>{" "}
              If the restaurant cannot confirm within {r.autoRejectMinutes} minutes, or
              declines it, your payment is refunded in full and you are told by text.
            </p>
            <p>
              Ordering may be paused during a rush. If you see that message, check
              back shortly.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className={h2}>Reservations</h2>
          <div className={card} style={cardStyle}>
            {r.reservationsEnabled ? (
              <>
                <p>
                  Choose a date, a time inside our opening hours, and your party size
                  (up to {r.maxPartySize}). You get a confirmation text with a link to
                  cancel if your plans change. No deposit is taken.
                </p>
                <p>
                  Times that no longer appear are full. If the group is larger than
                  the form allows, call us and we will do our best.
                </p>
              </>
            ) : (
              <p>{r.name} is not taking online reservations at the moment. Walk-ins welcome.</p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className={h2}>Your details</h2>
          <div className={card} style={cardStyle}>
            <p>
              Your name and mobile number are used to run your order or booking and to
              text you about it. They are kept by {r.name}, not sold or shared. You will
              only hear about offers if you tick the box saying so.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className={h2}>Need a hand?</h2>
          <div className={card} style={cardStyle}>
            <p>
              {r.phone ? (
                <>
                  Call us on{" "}
                  <a href={`tel:${r.phone}`} className="font-semibold underline">
                    {r.phone}
                  </a>
                  .
                </>
              ) : (
                <>Ask at the counter and we will sort it out.</>
              )}
            </p>
          </div>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={`/t/${slug}/order`}
          className="rounded-full px-5 py-2.5 font-semibold text-white"
          style={{ background: "var(--t-accent)" }}
        >
          Order pickup
        </Link>
        <Link
          href={`/t/${slug}`}
          className="rounded-full border px-5 py-2.5 font-medium"
          style={{ borderColor: "var(--t-line)" }}
        >
          Back to menu
        </Link>
      </div>
    </div>
  );
}
