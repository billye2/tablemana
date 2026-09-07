import Link from "next/link";
import { SignOutButton, UserButton } from "@clerk/nextjs";

const TABS = [
  ["", "Overview"],
  ["/menu", "Menu"],
  ["/settings", "Settings"],
  ["/customers", "Customers"],
  ["/help", "Help"],
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
          <div className="flex items-center gap-2 text-sm">
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
            <span className="ml-1">
              <UserButton />
            </span>
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50 px-4 text-center text-zinc-600">
      <p>This restaurant belongs to a different account.</p>
      <p className="text-sm">
        Signed in with the wrong email?{" "}
        <SignOutButton>
          <button className="underline">Sign out</button>
        </SignOutButton>{" "}
        and try again, or open the original welcome link while signed in to claim an
        older restaurant.
      </p>
      <Link href="/dashboard" className="text-sm underline">
        Your restaurants
      </Link>
    </div>
  );
}
