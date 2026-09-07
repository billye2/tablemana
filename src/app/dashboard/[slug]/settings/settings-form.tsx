"use client";

import { useState, useTransition } from "react";
import { updateSettings, type SettingsInput } from "../actions";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const THEME_OPTIONS = [
  ["classic", "Classic — warm, serif"],
  ["bistro", "Bistro — dark, elegant"],
  ["bold", "Bold — bright, punchy"],
] as const;

/** "11:00-21:00, 22:00-23:30" ⇄ [["11:00","21:00"],…] */
function rangesToText(ranges: [string, string][]): string {
  return ranges.map(([o, c]) => `${o}-${c}`).join(", ");
}
function textToRanges(text: string): [string, string][] | null {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const out: [string, string][] = [];
  for (const part of trimmed.split(",")) {
    const m = part.trim().match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (!m) return null;
    const pad = (t: string) => (t.length === 4 ? `0${t}` : t);
    out.push([pad(m[1]), pad(m[2])]);
  }
  return out;
}

export function SettingsForm({ slug, initial }: { slug: string; initial: SettingsInput }) {
  const [form, setForm] = useState(initial);
  const [hoursText, setHoursText] = useState<Record<string, string>>(
    Object.fromEntries(
      DAY_NAMES.map((_, i) => [String(i), rangesToText(initial.hours[String(i)] ?? [])]),
    ),
  );
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function save() {
    setStatus(null);
    const hours: SettingsInput["hours"] = {};
    for (const [day, text] of Object.entries(hoursText)) {
      const ranges = textToRanges(text);
      if (ranges === null) {
        setStatus(`Check ${DAY_NAMES[Number(day)]} hours — use "11:00-21:00" format.`);
        return;
      }
      hours[day] = ranges;
    }
    startTransition(async () => {
      const result = await updateSettings(slug, { ...form, hours });
      setStatus(result.ok ? "Saved." : (result.error ?? "Something went wrong."));
    });
  }

  const input = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-zinc-900">Settings</h2>

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <div>
          <label className={label}>Restaurant name</label>
          <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className={label}>Description</label>
          <textarea
            className={input}
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Phone</label>
            <input className={input} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label className={label}>Sales tax %</label>
            <input
              className={input}
              inputMode="decimal"
              value={form.taxRatePercent}
              onChange={(e) => set("taxRatePercent", parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <div>
          <label className={label}>Site template</label>
          <div className="space-y-1.5">
            {THEME_OPTIONS.map(([id, name]) => (
              <label key={id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={form.theme === id}
                  onChange={() => set("theme", id)}
                />
                {name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Accent color</label>
          <input
            type="color"
            value={form.accent}
            onChange={(e) => set("accent", e.target.value)}
            className="h-10 w-20 cursor-pointer rounded border border-zinc-300"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-bold text-zinc-900">Hours</p>
        <p className="text-xs text-zinc-500">
          Ranges like <code>11:00-21:00</code>, comma-separated for split service. Leave
          blank for closed.
        </p>
        {DAY_NAMES.map((day, i) => (
          <div key={day} className="flex items-center gap-3">
            <span className="w-24 text-sm font-medium text-zinc-700">{day}</span>
            <input
              className={input}
              value={hoursText[String(i)]}
              onChange={(e) =>
                setHoursText((h) => ({ ...h, [String(i)]: e.target.value }))
              }
              placeholder="Closed"
            />
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
          <input
            type="checkbox"
            checked={form.reservationsEnabled}
            onChange={(e) => set("reservationsEnabled", e.target.checked)}
          />
          Accept reservations
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={label}>Covers / 30-min slot</label>
            <input
              className={input}
              inputMode="numeric"
              value={form.coversPerSlot}
              onChange={(e) => set("coversPerSlot", parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className={label}>Max party size</label>
            <input
              className={input}
              inputMode="numeric"
              value={form.maxPartySize}
              onChange={(e) => set("maxPartySize", parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className={label}>Auto-refund after (min)</label>
            <input
              className={input}
              inputMode="numeric"
              value={form.autoRejectMinutes}
              onChange={(e) => set("autoRejectMinutes", parseInt(e.target.value) || 15)}
            />
          </div>
        </div>
      </div>

      {status && (
        <p className={`text-sm ${status === "Saved." ? "text-emerald-600" : "text-red-600"}`}>
          {status}
        </p>
      )}
      <button
        disabled={pending}
        onClick={save}
        className="rounded-lg bg-zinc-900 px-5 py-2.5 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
