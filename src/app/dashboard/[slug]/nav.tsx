import Link from "next/link";

const TABS = [
  ["", "Overview"],
  ["/menu", "Menu"],
  ["/settings", "Settings"],
  ["/customers", "Customers"],
] as const;

export function DashboardNav({
  slug,
  active,
  restaurantName,
}: {
  slug: string;
  active: string;
  restaurantName: string;
}) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">{restaurantName}</h1>
            <p className="text-sm text-zinc-500">Owner dashboard</p>
          </div>
          <div className="flex gap-2 text-sm">
            <a
              href={`/t/${slug}`}
              target="_blank"
              className="rounded-lg border border-zinc-300 px-3 py-2 font-medium text-zinc-700"
            >
              View site ↗
            </a>
            <Link
              href={`/counter/${slug}`}
              className="rounded-lg bg-zinc-900 px-3 py-2 font-medium text-white"
            >
              Open counter
            </Link>
          </div>
        </div>
        <nav className="mt-4 flex gap-1">
          {TABS.map(([path, label]) => (
            <Link
              key={path}
              href={`/dashboard/${slug}${path}`}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
                active === path
                  ? "border border-b-0 border-zinc-200 bg-zinc-50 text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function Unauthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-600">
      <p>Invalid or missing dashboard key. Open the link from your welcome email.</p>
    </div>
  );
}
