import type { Metadata } from "next";
import Link from "next/link";
import { Show } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Your restaurant, online — no commissions",
  description:
    "A generated website with online ordering and reservations. Flat pricing, your customer data, live in ten minutes from a menu photo.",
};

/** A real tenant kept as the public showcase; its owner dashboard is private. */
const DEMO_URL = "/t/restaurant-demo";

const FEATURES = [
  [
    "No commissions. Ever.",
    "Flat $50/month plus 50¢ per online order — a fixed fee, never a percentage. Delivery apps take up to 30% of every ticket; we don't.",
  ],
  [
    "Menu photo → live site in minutes",
    "Upload a photo of your menu. We read every item and price, pick a design that fits your restaurant, and put you online with ordering and reservations built in.",
  ],
  [
    "Your customers stay yours",
    "Every diner who orders or books is on your list — names, numbers, consent — exportable any time. No platform sitting between you and your regulars.",
  ],
  [
    "Built for the counter",
    "Orders land on a tablet screen made for a rush: accept with a pickup time, 86 items with one tap, pause ordering when you're slammed. Diners get texts at every step.",
  ],
] as const;

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="text-lg font-black tracking-tight">▲ tablemana</span>
        <div className="flex items-center gap-4 text-sm">
          <Show
            when="signed-in"
            fallback={
              <Link href="/sign-in" className="font-medium text-zinc-600">
                Sign in
              </Link>
            }
          >
            <Link href="/dashboard" className="font-medium text-zinc-600">
              Dashboard
            </Link>
          </Show>
          <Link
            href="/start"
            className="rounded-full bg-zinc-900 px-5 py-2.5 font-semibold text-white"
          >
            Get started free
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            Stop paying 30% to own your own customers.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-600">
            A website with online ordering and reservations, generated from a
            photo of your menu. Flat pricing. Your data. Live today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/start"
              className="rounded-full bg-zinc-900 px-7 py-3.5 font-semibold text-white"
            >
              Generate my site
            </Link>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-zinc-900 px-7 py-3.5 font-semibold text-zinc-900"
            >
              See a live demo ↗
            </a>
            <a
              href="#pricing"
              className="rounded-full border border-zinc-300 px-7 py-3.5 font-semibold"
            >
              Pricing
            </a>
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            The demo is a real generated site: browse the menu, place a test order,
            book a table.
          </p>
        </section>

        <section className="mx-auto grid max-w-5xl gap-5 px-4 pb-20 sm:grid-cols-2">
          {FEATURES.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-zinc-200 p-6">
              <h2 className="font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
            </div>
          ))}
        </section>

        <section id="pricing" className="border-t border-zinc-200 bg-zinc-50 py-20">
          <div className="mx-auto max-w-md px-4 text-center">
            <h2 className="text-3xl font-black">One plan. No math.</h2>
            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-8">
              <p className="text-5xl font-black">
                $50<span className="text-lg font-medium text-zinc-500">/mo</span>
              </p>
              <p className="mt-2 text-zinc-600">+ 50¢ per online order — never a percentage</p>
              <ul className="mt-6 space-y-2 text-left text-sm text-zinc-700">
                {[
                  "Generated website + your own subdomain",
                  "Online ordering with prepaid pickup",
                  "Reservations with SMS confirmations",
                  "Counter tablet app + 86 board",
                  "Your full customer list, exportable",
                  "Tips go 100% to you",
                ].map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <Link
                href="/start"
                className="mt-8 block rounded-full bg-zinc-900 py-3.5 font-semibold text-white"
              >
                Get started
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 text-center text-sm text-zinc-500">
        © {new Date().getFullYear()} tablemana
      </footer>
    </div>
  );
}
