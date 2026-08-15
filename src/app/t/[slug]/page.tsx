import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCents } from "@/lib/money";
import { getMenu, getRestaurantBySlug } from "@/lib/tenant";
import { themeFor } from "@/lib/themes";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hh} ${ampm}` : `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default async function TenantHome({ params }: PageProps<"/t/[slug]">) {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) notFound();
  const menu = await getMenu(r.id);
  const theme = themeFor(r.theme);
  const headingClass =
    theme.headingFont === "serif"
      ? "[font-family:var(--font-heading-serif)]"
      : "tracking-tight";

  return (
    <div>
      <section className="py-14 text-center sm:py-20">
        <p
          className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: "var(--t-accent)" }}
        >
          {r.cuisine}
        </p>
        <h1 className={`text-4xl font-bold sm:text-5xl ${headingClass}`}>{r.name}</h1>
        {r.description && (
          <p className="mx-auto mt-4 max-w-xl text-lg" style={{ color: "var(--t-muted)" }}>
            {r.description}
          </p>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href={`/t/${slug}/order`}
            className="rounded-full px-6 py-3 font-semibold text-white"
            style={{ background: "var(--t-accent)" }}
          >
            Order pickup
          </Link>
          {r.reservationsEnabled && (
            <Link
              href={`/t/${slug}/reserve`}
              className="rounded-full border px-6 py-3 font-medium"
              style={{ borderColor: "var(--t-line)" }}
            >
              Reserve a table
            </Link>
          )}
        </div>
      </section>

      <section id="menu">
        <h2 className={`mb-6 text-2xl font-bold ${headingClass}`}>Menu</h2>
        <div className="space-y-10">
          {menu.map(({ section, items }) => (
            <div key={section.id}>
              <h3
                className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--t-accent)" }}
              >
                {section.name}
              </h3>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-xl border p-4"
                    style={{
                      background: "var(--t-card)",
                      borderColor: "var(--t-line)",
                      opacity: item.available ? 1 : 0.5,
                    }}
                  >
                    {item.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {item.name}
                        {!item.available && (
                          <span className="ml-2 text-xs font-medium" style={{ color: "var(--t-muted)" }}>
                            sold out today
                          </span>
                        )}
                      </p>
                      {item.description && (
                        <p className="mt-0.5 text-sm" style={{ color: "var(--t-muted)" }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 font-semibold">{formatCents(item.priceCents)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className={`mb-4 text-2xl font-bold ${headingClass}`}>Hours</h2>
        <ul
          className="divide-y rounded-xl border text-sm"
          style={{ borderColor: "var(--t-line)", background: "var(--t-card)" }}
        >
          {DAY_NAMES.map((day, i) => {
            const ranges = r.hours[String(i)] ?? [];
            return (
              <li
                key={day}
                className="flex justify-between px-4 py-2.5"
                style={{ borderColor: "var(--t-line)" }}
              >
                <span className="font-medium">{day}</span>
                <span style={{ color: "var(--t-muted)" }}>
                  {ranges.length === 0
                    ? "Closed"
                    : ranges.map(([o, c]) => `${fmtTime(o)} – ${fmtTime(c)}`).join(", ")}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
