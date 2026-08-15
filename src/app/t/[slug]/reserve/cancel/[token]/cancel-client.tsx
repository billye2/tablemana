"use client";

import { useState, useTransition } from "react";
import { cancelReservation } from "../../../actions";

export function CancelClient({
  slug,
  token,
  restaurantName,
}: {
  slug: string;
  token: string;
  restaurantName: string;
}) {
  const [done, setDone] = useState<"canceled" | "failed" | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-md py-20 text-center">
      {done === "canceled" ? (
        <>
          <h1 className="text-3xl font-bold">Reservation canceled</h1>
          <p className="mt-3" style={{ color: "var(--t-muted)" }}>
            Thanks for letting {restaurantName} know — the table is freed up.
          </p>
        </>
      ) : done === "failed" ? (
        <>
          <h1 className="text-3xl font-bold">Nothing to cancel</h1>
          <p className="mt-3" style={{ color: "var(--t-muted)" }}>
            This reservation was already canceled or the link has expired.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold">Cancel your reservation?</h1>
          <p className="mt-3" style={{ color: "var(--t-muted)" }}>
            This lets {restaurantName} give your table to another guest.
          </p>
          <button
            onClick={() =>
              startTransition(async () => {
                const ok = await cancelReservation(slug, token);
                setDone(ok ? "canceled" : "failed");
              })
            }
            disabled={pending}
            className="mt-8 rounded-full bg-red-600 px-8 py-3 font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Canceling…" : "Yes, cancel it"}
          </button>
        </>
      )}
    </div>
  );
}
