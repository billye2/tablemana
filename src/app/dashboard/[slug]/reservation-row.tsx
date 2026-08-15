"use client";

import { useTransition } from "react";
import { setReservationStatus } from "./actions";

export function ReservationRow({
  slug,
  ownerKey,
  id,
  status,
  label,
  who,
}: {
  slug: string;
  ownerKey: string;
  id: string;
  status: string;
  label: string;
  who: string;
}) {
  const [pending, startTransition] = useTransition();
  const act = (s: "seated" | "no_show" | "canceled") =>
    startTransition(() => setReservationStatus(slug, ownerKey, id, s));

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
      <div>
        <p className="font-medium text-zinc-900">{label}</p>
        <p className="text-zinc-500">{who}</p>
      </div>
      {status === "confirmed" ? (
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() => act("seated")}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white disabled:opacity-50"
          >
            Seated
          </button>
          <button
            disabled={pending}
            onClick={() => act("no_show")}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-600 disabled:opacity-50"
          >
            No-show
          </button>
          <button
            disabled={pending}
            onClick={() => act("canceled")}
            className="rounded-lg border border-red-300 px-3 py-1.5 font-medium text-red-600 disabled:opacity-50"
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
