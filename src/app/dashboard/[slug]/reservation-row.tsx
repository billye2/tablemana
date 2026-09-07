"use client";

import { useTransition } from "react";
import { setReservationStatus } from "./actions";

export function ReservationRow({
  slug,
  id,
  status,
  label,
  who,
}: {
  slug: string;
  id: string;
  status: string;
  label: string;
  who: string;
}) {
  const [pending, startTransition] = useTransition();
  const act = (s: "seated" | "no_show" | "canceled") =>
    startTransition(() => setReservationStatus(slug, id, s));

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm sm:px-5">
      <div className="min-w-0">
        <p className="font-medium text-zinc-900">{label}</p>
        <p className="text-zinc-500">{who}</p>
      </div>
      {status === "confirmed" ? (
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            disabled={pending}
            onClick={() => act("seated")}
            className="min-h-10 flex-1 rounded-lg bg-emerald-600 px-3 font-medium text-white disabled:opacity-50 sm:flex-none"
          >
            Seated
          </button>
          <button
            disabled={pending}
            onClick={() => act("no_show")}
            className="min-h-10 flex-1 rounded-lg border border-zinc-300 px-3 font-medium text-zinc-600 disabled:opacity-50 sm:flex-none"
          >
            No-show
          </button>
          <button
            disabled={pending}
            onClick={() => act("canceled")}
            className="min-h-10 flex-1 rounded-lg border border-red-300 px-3 font-medium text-red-600 disabled:opacity-50 sm:flex-none"
          >
            Cancel
          </button>
        </div>
      ) : (
        <span className="font-medium text-zinc-500">{status.replace("_", " ")}</span>
      )}
    </li>
  );
}
