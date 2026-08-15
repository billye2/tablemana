import type { Metadata } from "next";
import { StartWizard } from "./start-wizard";

export const metadata: Metadata = { title: "Get your restaurant online" };

export default function StartPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-xl px-4 py-14">
        <h1 className="text-3xl font-bold text-zinc-900">
          Menu photo in, live site out.
        </h1>
        <p className="mt-2 text-zinc-600">
          Snap your menu, tell us your name, and get a website with online
          ordering and reservations — usually in under ten minutes.
        </p>
        <StartWizard />
      </main>
    </div>
  );
}
