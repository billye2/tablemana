"use client";

import { useRef, useState } from "react";

type Result = { slug: string; counterToken: string; itemCount: number; theme: string };

const MENU_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export function StartWizard() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function acceptFile(f: File | undefined) {
    if (!f) return;
    if (!MENU_TYPES.includes(f.type)) {
      setError("Drop a photo (JPG/PNG) or PDF of your menu.");
      return;
    }
    setError(null);
    // Sync into the input so the form's FormData picks it up on submit.
    const dt = new DataTransfer();
    dt.items.add(f);
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
    setFile(f);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        body: new FormData(e.currentTarget),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong — try again.");
      } else {
        setResult(json);
      }
    } catch {
      setError("Network hiccup — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    // Path form works everywhere; subdomains need a custom domain.
    const siteUrl = `/t/${result.slug}`;
    return (
      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-xl font-bold text-emerald-900">Your site is live 🎉</h2>
        {result.itemCount > 0 && (
          <p className="mt-1 text-sm text-emerald-800">
            We read {result.itemCount} menu items and picked the “{result.theme}”
            template for you — everything is editable.
          </p>
        )}
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <a href={siteUrl} className="font-semibold text-emerald-900 underline" target="_blank">
              View your website ↗
            </a>
          </li>
          <li>
            <a
              href={`/dashboard/${result.slug}`}
              className="font-semibold text-emerald-900 underline"
            >
              Open your dashboard →
            </a>
          </li>
          <li>
            <a
              href={`/counter/${result.slug}?key=${result.counterToken}`}
              className="font-semibold text-emerald-900 underline"
            >
              Open the counter screen (install this on your tablet) →
            </a>
          </li>
        </ul>
        <p className="mt-4 text-xs text-emerald-700">
          The dashboard is tied to your account — sign in from any device. The counter
          link carries the tablet key; you can copy or regenerate it from Settings.
        </p>
      </div>
    );
  }

  const input =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400";

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          acceptFile(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? "border-zinc-900 bg-zinc-100" : "border-zinc-300 bg-white"
        }`}
      >
        <label className="block cursor-pointer">
          <span className="text-sm font-semibold text-zinc-900">
            {dragging
              ? "Drop it here"
              : file
                ? file.name
                : "Upload or drag in a photo or PDF of your menu"}
          </span>
          <p className="mt-1 text-xs text-zinc-500">
            {file
              ? "Looks good — we'll read every item and price."
              : "A clear phone photo works great. Optional — you can add items by hand instead."}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            name="menu"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
        </label>
      </div>

      <input name="name" required placeholder="Restaurant name" className={input} />
      <input name="phone" placeholder="Phone (optional)" className={input} />
      <input name="address1" placeholder="Street address (optional)" className={input} />
      <div className="grid grid-cols-3 gap-3">
        <input name="city" placeholder="City" className={input} />
        <input name="region" placeholder="State" className={input} />
        <input name="postalCode" placeholder="ZIP" className={input} />
      </div>
      <div>
        <input
          name="taxRatePercent"
          placeholder="Sales tax % (e.g. 8.5 — leave blank if none)"
          inputMode="decimal"
          className={input}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        disabled={busy}
        className="w-full rounded-full bg-zinc-900 py-3.5 font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Reading your menu and building your site…" : "Generate my site"}
      </button>
      <p className="text-center text-xs text-zinc-500">
        No commissions, ever. Flat monthly price + 50¢ per online order.
      </p>
    </form>
  );
}
