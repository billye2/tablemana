import type { Metadata } from "next";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { StartWizard } from "./start-wizard";

export const metadata: Metadata = { title: "Get your restaurant online" };
export const dynamic = "force-dynamic";

/** Signed-in only (the proxy sends everyone else to sign-in first). */
export default async function StartPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-xl px-4 py-8 sm:py-14">
        <div className="mb-8 flex items-center justify-between gap-3 text-sm text-zinc-500">
          <span className="min-w-0 truncate">
            Signed in{email ? ` as ${email}` : ""} ·{" "}
            <Link href="/dashboard" className="underline">
              your restaurants
            </Link>
          </span>
          <span className="shrink-0">
            <UserButton />
          </span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900">
          Menu photo in, live site out.
        </h1>
        <p className="mt-2 text-zinc-600">
          Snap your menu, tell us your name, and get a website with online
          ordering and reservations — usually in under ten minutes. The
          restaurant is tied to this account, so you can sign in from anywhere.
        </p>
        <StartWizard />
      </main>
    </div>
  );
}
