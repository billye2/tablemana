import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help",
  description:
    "How tablemana works for restaurants: setup from a menu photo, pricing, ordering, reservations, your customer data, and accounts.",
};

/**
 * Public, site-wide help for prospects and owners who are not signed in.
 * The signed-in owner help (/dashboard/{slug}/help) goes deeper on the
 * dashboard and counter; diners get their own page on each restaurant site.
 */

const SECTIONS = [
  ["start", "Getting started"],
  ["pricing", "Pricing and payments"],
  ["site", "Your website"],
  ["orders", "Online ordering"],
  ["reservations", "Reservations"],
  ["data", "Your customer data"],
  ["accounts", "Accounts and the tablet"],
  ["faq", "Common questions"],
] as const;

const FAQ: [string, string][] = [
  [
    "Do I need a website already?",
    "No. Upload a photo or PDF of your menu and a site is generated for you, with a design picked to match your restaurant. Everything on it is editable afterwards.",
  ],
  [
    "Can I use my own domain?",
    "Custom domains are on the way. Today every restaurant lives at tablemana.vercel.app/t/your-name, which works fine on menus, receipts, and social profiles.",
  ],
  [
    "What if my menu photo is blurry?",
    "Skip the upload and add items by hand in the menu editor, or try again with a clearer photo. Reading the menu never touches anything you already set up.",
  ],
  [
    "Is there a contract?",
    "No. Flat monthly price, cancel any time, and your customer list exports to a spreadsheet whenever you like.",
  ],
  [
    "Do diners need an account?",
    "No. Diners check out as guests with a name and mobile number. Only restaurant owners sign in.",
  ],
];

export default function HelpPage() {
  const h2 = "scroll-mt-24 text-xl font-bold text-zinc-900";
  const card = "space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 text-sm leading-relaxed text-zinc-700";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:py-5">
        <Link href="/" className="text-lg font-black tracking-tight">
          ▲ tablemana
        </Link>
        <div className="flex items-center gap-3 text-sm sm:gap-4">
          <Link href="/sign-in" className="font-medium text-zinc-600">
            Sign in
          </Link>
          <Link
            href="/start"
            className="inline-flex min-h-11 items-center rounded-full bg-zinc-900 px-4 font-semibold text-white sm:px-5"
          >
            Get started<span className="hidden sm:inline">&nbsp;free</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
        <h1 className="text-3xl font-black tracking-tight">Help</h1>
        <p className="mt-2 text-zinc-600">
          How tablemana works, from the first menu photo to your first order. Already
          running a restaurant here? Every dashboard has a Help tab with the full
          owner guide.
        </p>

        <nav className="mt-6 flex flex-wrap gap-2 text-sm">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="inline-flex min-h-9 items-center rounded-full border border-zinc-300 bg-white px-3 text-zinc-700"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-10 space-y-10">
          <section className="space-y-3">
            <h2 id="start" className={h2}>Getting started</h2>
            <div className={card}>
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  <strong>Create an account.</strong> Sign up with your email and a
                  one-time code, or with Google. No password to remember.
                </li>
                <li>
                  <strong>Upload your menu.</strong> A photo or PDF is enough. Every
                  item and price is read off it, a design is chosen to fit, and your
                  site goes live in minutes.
                </li>
                <li>
                  <strong>Check the menu editor.</strong> Fix any price the photo got
                  wrong, add descriptions, upload dish photos.
                </li>
                <li>
                  <strong>Set your hours and details</strong> under Settings, and put the
                  counter screen on a tablet by the register.
                </li>
                <li>
                  <strong>Share your link.</strong> Put it on your door, your receipts,
                  and your social profiles. Orders and bookings start arriving.
                </li>
              </ol>
              <p>
                Want to see the result first?{" "}
                <a href="/t/restaurant-demo/order" className="font-medium underline" target="_blank" rel="noreferrer">
                  Open the live demo restaurant
                </a>
                .
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="pricing" className={h2}>Pricing and payments</h2>
            <div className={card}>
              <p>
                One plan: <strong>$50 a month plus 50¢ per online order</strong>. Never a
                percentage. Reservations, the website, the counter app, and the customer
                list are all included. Tips go to you in full.
              </p>
              <p>
                Card payments are processed by Stripe and paid out to your own bank
                account, so you are the merchant, not us. Diners pay when they order,
                which is what makes the no-show-free pickup flow below possible.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="site" className={h2}>Your website</h2>
            <div className={card}>
              <p>
                Three templates (Classic, Bistro, Bold) with an accent colour you pick.
                The site shows your menu with photos, hours, address, phone, and
                buttons for pickup ordering and reservations. It is built to be found:
                structured data tells search engines you are a restaurant.
              </p>
              <p>
                Prefer to skip the front page? A setting sends visitors from your web
                address straight to the pickup order page instead.
              </p>
              <p>
                Everything updates the moment you change it in the dashboard, including
                taking an item off for the day from the counter.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="orders" className={h2}>Online ordering</h2>
            <div className={card}>
              <p>
                Diners order pickup from their phone, add a tip, and pay. The order lands
                on your counter tablet in seconds. You accept it with a ready time, and
                the diner is told. Mark it ready, they come in, they show a four-character
                code, done.
              </p>
              <p>
                <strong>The promise that makes prepaid work:</strong> if nobody accepts an
                order within your window (15 minutes by default, adjustable), it is
                refunded in full automatically and the diner is told. You can also
                decline any order with one tap, and pause ordering entirely during a
                rush.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="reservations" className={h2}>Reservations</h2>
            <div className={card}>
              <p>
                Diners pick a day, a half-hour slot inside your hours, and a party size.
                You set how many covers fit in each slot and the largest party you take.
                They get a confirmation with a cancel link; you mark seated or no-show on
                the dashboard. No deposits, no third-party booking fees. Turn it off
                entirely if you do not take bookings.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="data" className={h2}>Your customer data</h2>
            <div className={card}>
              <p>
                Every diner who orders or books is on your list with their name, mobile
                number, and whether they agreed to hear from you. Export it as a
                spreadsheet any time. Delivery apps keep this from you; here it is yours,
                and it leaves with you if you ever cancel.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="accounts" className={h2}>Accounts and the tablet</h2>
            <div className={card}>
              <p>
                Your dashboard belongs to your account. Sign in from any device with an
                email code or Google. One account can run several restaurants.
              </p>
              <p>
                The counter tablet uses a separate key instead of your login, so a
                device left by the register can take orders but can never open your
                settings or customer list. Lose a tablet? Issue a new key from Settings
                and the old one stops working.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="faq" className={h2}>Common questions</h2>
            <div className={card}>
              <dl className="space-y-4">
                {FAQ.map(([q, a]) => (
                  <div key={q}>
                    <dt className="font-semibold text-zinc-900">{q}</dt>
                    <dd className="mt-1">{a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <div className="rounded-2xl bg-zinc-900 p-6 text-center text-white">
            <p className="font-semibold">Ready to try it?</p>
            <Link
              href="/start"
              className="mt-3 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900"
            >
              Generate my site
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-10 text-center text-sm text-zinc-500">
        © {new Date().getFullYear()} tablemana ·{" "}
        <Link href="/" className="underline">
          Home
        </Link>
      </footer>
    </div>
  );
}
