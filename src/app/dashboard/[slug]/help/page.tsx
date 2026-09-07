import { requireOwner } from "@/lib/owner";
import { APP_VERSION } from "@/lib/version";
import { DashboardNav, Unauthorized } from "../nav";

export const dynamic = "force-dynamic";

/**
 * Owner-facing help for the admin side (dashboard + counter). Everything here
 * describes behavior that exists in the code today; when a feature changes,
 * change its paragraph in the same commit.
 */

const SECTIONS = [
  ["access", "Getting in"],
  ["overview", "Overview"],
  ["counter", "Counter screen"],
  ["orders", "Order lifecycle"],
  ["menu", "Menu editor"],
  ["settings", "Settings"],
  ["reservations", "Reservations"],
  ["customers", "Customers"],
  ["notes", "Good to know"],
] as const;

const ORDER_STEPS: [string, string, string][] = [
  ["New", "Diner placed and paid. Shows in amber in the New column.", "“We'll text you the moment it's confirmed with a pickup time.”"],
  ["Accepted", "You tapped Accept and chose a time.", "“Order ABCD confirmed — ready in about 20 min.”"],
  ["Ready", "You tapped Mark ready.", "“Order ABCD is ready for pickup!” — the status page shows the code in big type."],
  ["Picked up", "You tapped Picked up. The card leaves the board.", "No text."],
  ["Declined", "You tapped Decline. Refunded in full.", "“Sorry — order ABCD was declined. Your payment was refunded in full.”"],
  ["Auto-refunded", "Nobody accepted it inside the window. Refunded in full.", "“We couldn't confirm order ABCD in time. You have NOT been charged.”"],
];

export default async function HelpPage({ params }: PageProps<"/dashboard/[slug]/help">) {
  const { slug } = await params;
  const r = await requireOwner(slug);
  if (!r) return <Unauthorized />;

  const h2 = "scroll-mt-24 text-lg font-bold text-zinc-900";
  const card = "space-y-3 rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-relaxed text-zinc-700";
  const kbd = "rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-900";

  return (
    <div className="min-h-screen bg-zinc-50">
      <DashboardNav slug={slug} active="/help" restaurantName={r.name} />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-zinc-900">Help</h2>
          <p className="text-sm text-zinc-500">
            How the tablemana admin side works: the dashboard you are in now and the
            counter screen for your tablet. The public guide for prospects lives at{" "}
            <a href="/help" className="underline">/help</a>, and diners get their own
            page at{" "}
            <a href={`/t/${slug}/help`} className="underline">/t/{slug}/help</a>.
          </p>
        </div>

        <nav className="mb-8 flex flex-wrap gap-2 text-sm">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-zinc-700"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="space-y-8">
          <section className="space-y-3">
            <h2 id="access" className={h2}>Getting in</h2>
            <div className={card}>
              <p>
                The dashboard belongs to your account. Sign in with your email (a one-time
                code) or with Google from any device and your restaurants are there. Use
                the account menu in the top right to sign out or change your email.
              </p>
              <p>
                The counter tablet is different: it holds a per-restaurant key instead of
                your login, so a tablet left by the register can never open this
                dashboard. Copy the tablet link, or issue a fresh key if a tablet goes
                missing, under <span className={kbd}>Settings → Counter tablet</span>.
              </p>
              <p>
                Had a restaurant before accounts existed? Sign in, then open your original
                welcome link once. Its key proves the restaurant is yours and attaches it
                to your account.
              </p>
              <p>
                <span className={kbd}>View site ↗</span> opens what diners see.{" "}
                <span className={kbd}>Open counter</span> opens the tablet screen.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="overview" className={h2}>Overview</h2>
            <div className={card}>
              <p>
                The three tiles count the last 24 hours: orders that were paid and not
                declined, the money they brought in, and how many people are on your
                customer list overall.
              </p>
              <p>
                <strong>Upcoming reservations</strong> lists the next 20 bookings. When the
                party arrives tap <span className={kbd}>Seated</span>; if they never show
                tap <span className={kbd}>No-show</span>. <span className={kbd}>Cancel</span>{" "}
                frees the slot for someone else. These marks are for your records only,
                nothing is texted.
              </p>
              <p>
                <strong>Recent orders</strong> shows the last 10 with their four-letter code,
                status, and total.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="counter" className={h2}>Counter screen</h2>
            <div className={card}>
              <p>
                Open the counter link on the tablet by the register and add it to the
                home screen (Share → Add to Home Screen on iPad, the install prompt on
                Android). It runs full screen and refreshes itself every five seconds, so
                new orders appear without anyone touching it.
              </p>
              <p>
                Orders move left to right across three columns. <strong>New</strong> cards
                are amber and need an answer. <strong>In progress</strong> is what the
                kitchen is making. <strong>Ready</strong> is waiting on the shelf.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <span className={kbd}>Accept — pick time</span> then choose 10, 15, 20, 30
                  or 45 minutes. The diner is texted that time straight away.
                </li>
                <li>
                  <span className={kbd}>Decline</span> refunds the diner in full and texts
                  them. Use it when you cannot make the order.
                </li>
                <li>
                  <span className={kbd}>Mark ready</span> texts the diner to come in.{" "}
                  <span className={kbd}>Picked up</span> clears the card.
                </li>
              </ul>
              <p>
                <strong>The auto-refund clock.</strong> A new order that nobody accepts
                within your window (Settings, default 15 minutes) is refunded
                automatically and the diner is told. The card turns up a red countdown
                when five minutes remain. This is the promise that lets diners prepay
                with confidence, so keep the tablet awake during service.
              </p>
              <p>
                <strong>Pause ordering</strong> in the header stops new orders on your site
                instantly. The button turns red while paused; tap it again to resume.
                Reservations are not affected.
              </p>
              <p>
                <strong>86 board.</strong> Tap any item to mark it sold out. It vanishes from
                the diner site the same second and comes back when you tap again. The
                menu editor shows an <em>86&apos;d</em> badge on those items.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="orders" className={h2}>Order lifecycle</h2>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">What happened</th>
                    <th className="px-4 py-2.5">What the diner gets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700">
                  {ORDER_STEPS.map(([status, what, diner]) => (
                    <tr key={status} className="align-top">
                      <td className="px-4 py-2.5 font-medium text-zinc-900">{status}</td>
                      <td className="px-4 py-2.5">{what}</td>
                      <td className="px-4 py-2.5 text-zinc-500">{diner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-zinc-500">
              Every order is prepaid, so declining or timing out always means a full
              refund. Tips go to you in full.
            </p>
          </section>

          <section className="space-y-3">
            <h2 id="menu" className={h2}>Menu editor</h2>
            <div className={card}>
              <p>
                Your menu was read from the photo you uploaded, so check prices and names
                once. Every change here is live on the diner site immediately.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <span className={kbd}>+ Add item</span> under a section heading. Name and
                  price are required, description is optional.
                </li>
                <li>
                  <span className={kbd}>Edit</span> changes name, description or price.{" "}
                  <span className={kbd}>✕</span> deletes the item after a confirmation.
                </li>
                <li>
                  Tap the square photo box to add or replace a dish photo. Dishes read from
                  your menu photo at setup got a stock photo matched to their name; items
                  you add later have none until you upload one.{" "}
                  <span className={kbd}>No photo</span> removes your upload.
                </li>
                <li>
                  New sections are added at the bottom. Deleting a section deletes every
                  item in it.
                </li>
              </ul>
              <p>
                To take an item off for the day without deleting it, use the 86 board on
                the counter instead.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="settings" className={h2}>Settings</h2>
            <div className={card}>
              <p>
                <strong>Name, description, phone</strong> appear on the site header and in
                search results. <strong>Sales tax %</strong> is added to every order.
              </p>
              <p>
                <strong>Site template</strong> switches between three looks: Classic (warm,
                serif), Bistro (dark), Bold (bright). <strong>Accent color</strong> tints
                buttons and highlights on whichever template you pick.
              </p>
              <p>
                <strong>Front page → Send visitors straight to ordering</strong> makes
                your web address open the pickup order page instead of the front page.
                Turn it on when the menu is the whole story; leave it off if you want
                diners to see your description, photos, hours, and address first. The
                front page is still there either way, one tap on your name in the header.
              </p>
              <p>
                <strong>Hours</strong> use ranges like <code>11:00-21:00</code>. Separate
                lunch and dinner with a comma: <code>11:00-14:00, 17:00-22:00</code>. Leave
                a day blank to show it as closed. Hours drive which reservation times are
                offered.
              </p>
              <p>
                <strong>Accept reservations</strong> turns the Reserve page on or off.{" "}
                <strong>Covers per 30-min slot</strong> caps how many seats can be booked
                in each half hour. <strong>Max party size</strong> is the largest group the
                form allows.
              </p>
              <p>
                <strong>Auto-refund after</strong> is the counter clock described above,
                from 5 to 60 minutes. Shorter is a stronger promise to diners; longer
                gives a busy counter more slack.
              </p>
              <p>
                <strong>Counter tablet</strong> at the top shows the tablet link and lets you
                issue a new key. Issuing one locks out every tablet on the old link until
                it opens the new one, which is exactly what you want if a device walks off.
              </p>
              <p>Nothing is saved until you tap <span className={kbd}>Save settings</span>.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="reservations" className={h2}>Reservations</h2>
            <div className={card}>
              <p>
                Diners pick a day, a half-hour slot inside your hours, and a party size.
                A slot disappears once its covers are used up. They get a confirmation
                text with a cancel link; cancelling through that link frees the slot and
                marks the booking canceled on your Overview.
              </p>
              <p>
                No deposits are taken. Mark no-shows on the Overview so you have a record.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="customers" className={h2}>Customers</h2>
            <div className={card}>
              <p>
                Everyone who orders or books lands here with their name, phone, whether
                they agreed to hear from you, and the date you first saw them.{" "}
                <span className={kbd}>Export CSV</span> downloads the whole list. It is
                your data and there is no lock-in.
              </p>
              <p>
                Only message people whose Marketing column says Yes.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 id="notes" className={h2}>Good to know</h2>
            <div className={card}>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Card payments run through Stripe. Until your restaurant&apos;s Stripe
                  account is connected, diners see ordering as unavailable and cannot be
                  charged.
                </li>
                <li>
                  Texts to diners go out once messaging is switched on for the platform.
                  The status page at the link in their confirmation always shows the
                  current state either way.
                </li>
                <li>
                  The counter also sweeps for overdue orders every time it loads, so the
                  auto-refund promise holds even if the tablet was asleep.
                </li>
                <li>
                  Order codes are four characters, letters and digits with the confusable ones
                  (0, O, 1, I, L) left out, so they read cleanly across a counter.
                </li>
              </ul>
            </div>
          </section>
        </div>
        <p className="mt-10 text-center text-xs text-zinc-400">tablemana v{APP_VERSION}</p>
      </main>
    </div>
  );
}
