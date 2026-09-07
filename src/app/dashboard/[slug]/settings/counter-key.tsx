"use client";

import { useState, useTransition } from "react";
import { rotateCounterToken } from "../actions";

/**
 * The counter tablet's link. Shown only to the signed-in owner; the key inside
 * it opens the counter and nothing else.
 */
export function CounterKey({ slug, token }: { slug: string; token: string }) {
  const [current, setCurrent] = useState(token);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const link =
    (typeof window !== "undefined" ? window.location.origin : "") +
    `/counter/${slug}?key=${current}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (http, permissions) — the field below is selectable.
    }
  }

  function rotate() {
    if (!confirm("Issue a new tablet key? Every tablet using the old link stops working until it opens the new one.")) return;
    startTransition(async () => {
      setCurrent(await rotateCounterToken(slug));
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-sm font-bold text-zinc-900">Counter tablet</p>
      <p className="text-xs text-zinc-500">
        Open this link on the tablet by the register and add it to the home screen.
        It carries the tablet key, which opens the counter only — not this dashboard.
      </p>
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700"
      />
      <div className="flex gap-2">
        <button
          onClick={copy}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={`/counter/${slug}`}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
        >
          Open counter here
        </a>
        <button
          disabled={pending}
          onClick={rotate}
          className="ml-auto rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
        >
          {pending ? "Issuing…" : "Issue new key"}
        </button>
      </div>
    </div>
  );
}
