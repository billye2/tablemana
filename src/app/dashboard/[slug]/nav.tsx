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
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-zinc-900">{restaurantName}</h1>
            <p className="text-sm text-zinc-500">Owner dashboard</p>
          </div>
          <span className="shrink-0 sm:hidden">
            <UserButton />
          </span>
          <div className="hidden items-center gap-2 text-sm sm:flex">
            <a
              href={`/t/${slug}`}
              target="_blank"
              className="inline-flex min-h-10 items-center rounded-lg border border-zinc-300 px-3 font-medium text-zinc-700"
            >
              View site ↗
            </a>
            <Link
              href={`/counter/${slug}`}
              className="inline-flex min-h-10 items-center rounded-lg bg-zinc-900 px-3 font-medium text-white"
            >
              Open counter
            </Link>
            <span className="ml-1">
              <UserButton />
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:hidden">
          <a
            href={`/t/${slug}`}
            target="_blank"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 font-medium text-zinc-700"
          >
            View site ↗
          </a>
          <Link
            href={`/counter/${slug}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-900 font-medium text-white"
          >
            Open counter
          </Link>
        </div>
        <nav className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mt-4 [&::-webkit-scrollbar]:hidden">
          {TABS.map(([path, label]) => (
            <Link
              key={path}
              href={`/dashboard/${slug}${path}`}
              className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-t-lg px-3.5 text-sm font-medium sm:px-4 ${
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
