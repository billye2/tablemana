import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/tenant";
import { themeFor } from "@/lib/themes";

// Tenant content is live data (menus, 86s, pausing) — never prerender.
export const dynamic = "force-dynamic";

const playfair = Playfair_Display({
  variable: "--font-heading-serif",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: LayoutProps<"/t/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) return {};
  return {
    title: r.name,
    description: r.description ?? `${r.name} — order pickup and reserve a table.`,
  };
}

export default async function TenantLayout({
  children,
  params,
}: LayoutProps<"/t/[slug]">) {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) notFound();
  const theme = themeFor(r.theme);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: r.name,
    servesCuisine: r.cuisine ?? undefined,
    telephone: r.phone ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: r.address1 ?? undefined,
      addressLocality: r.city ?? undefined,
      addressRegion: r.region ?? undefined,
      postalCode: r.postalCode ?? undefined,
    },
    acceptsReservations: r.reservationsEnabled,
  };

  return (
    <div
      className={`${playfair.variable} flex min-h-screen flex-col`}
      data-theme-dark={theme.dark ? "" : undefined}
      style={{
        ...(theme.vars as React.CSSProperties),
        ["--t-accent" as string]: r.accent,
        background: "var(--t-bg)",
        color: "var(--t-fg)",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header
        className="sticky top-0 z-20 border-b backdrop-blur"
        style={{
          borderColor: "var(--t-line)",
          background: "color-mix(in srgb, var(--t-bg) 88%, transparent)",
        }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
          <Link
            href={`/t/${slug}`}
            className={`min-w-0 truncate ${
              theme.headingFont === "serif"
                ? "text-lg font-semibold [font-family:var(--font-heading-serif)] sm:text-xl"
                : "text-lg font-extrabold tracking-tight sm:text-xl"
            }`}
          >
            {r.name}
          </Link>
          <nav className="flex shrink-0 items-center gap-2 text-sm">
            <Link
              href={`/t/${slug}/order`}
              className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold text-white"
              style={{ background: "var(--t-accent)" }}
            >
              Order<span className="hidden sm:inline">&nbsp;pickup</span>
            </Link>
            {r.reservationsEnabled && (
              <Link
                href={`/t/${slug}/reserve`}
                className="inline-flex min-h-11 items-center rounded-full border px-4 font-medium"
                style={{ borderColor: "var(--t-line)" }}
              >
                Reserve
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-4xl flex-1 px-4 pb-16">{children}</main>
      <footer
        className="border-t px-4 py-8 pb-safe text-center text-sm"
        style={{ borderColor: "var(--t-line)", color: "var(--t-muted)" }}
      >
        <p>
          {r.address1 && `${r.address1}, `}
          {r.city && `${r.city}, `}
          {r.region} {r.postalCode}
          {r.phone && ` · ${r.phone}`}
        </p>
        <p className="mt-1">
          © {new Date().getFullYear()} {r.name} ·{" "}
          <Link href={`/t/${slug}/help`} className="underline">
            How ordering works
          </Link>
        </p>
      </footer>
    </div>
  );
}
