"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";
import { addItem, addSection, deleteItem, deleteSection, updateItem } from "../actions";

type ItemLite = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  available: boolean;
  photoUrl: string | null;
};
type SectionLite = { id: string; name: string; items: ItemLite[] };

function ItemForm({
  initial,
  onSubmit,
  onCancel,
  pending,
}: {
  initial?: ItemLite;
  onSubmit: (v: { name: string; description?: string; priceCents: number }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(
    initial ? (initial.priceCents / 100).toFixed(2) : "",
  );
  const priceCents = Math.round(parseFloat(price || "0") * 100);

  return (
    <div className="space-y-2 rounded-lg border border-zinc-300 bg-zinc-50 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500">$</span>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          inputMode="decimal"
          className="w-24 rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <div className="ml-auto flex gap-2">
          <button
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-sm text-zinc-500"
          >
            Cancel
          </button>
          <button
            disabled={pending || !name || !(priceCents >= 0) || price === ""}
            onClick={() =>
              onSubmit({ name, description: description || undefined, priceCents })
            }
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function MenuEditor({ slug, menu }: { slug: string; menu: SectionLite[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newSection, setNewSection] = useState("");
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);

  async function uploadPhoto(itemId: string, file: File) {
    setPhotoBusy(itemId);
    try {
      const form = new FormData();
      form.set("slug", slug);
      form.set("itemId", itemId);
      form.set("photo", file);
      const res = await fetch("/api/upload-photo", { method: "POST", body: form });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error ?? "Upload failed — try again.");
      }
      router.refresh();
    } finally {
      setPhotoBusy(null);
    }
  }

  async function removePhoto(itemId: string) {
    setPhotoBusy(itemId);
    try {
      await fetch("/api/upload-photo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, itemId }),
      });
      router.refresh();
    } finally {
      setPhotoBusy(null);
    }
  }

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      setEditing(null);
      setAddingTo(null);
    });

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-bold text-zinc-900">Menu editor</h2>
      {menu.map((section) => (
        <section key={section.id}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              {section.name}
            </h3>
            <div className="flex gap-3 text-sm">
              <button
                onClick={() => setAddingTo(section.id)}
                className="font-medium text-zinc-900"
              >
                + Add item
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  if (confirm(`Delete section "${section.name}" and all its items?`)) {
                    run(() => deleteSection(slug, section.id));
                  }
                }}
                className="text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
          <ul className="space-y-2">
            {addingTo === section.id && (
              <li>
                <ItemForm
                  pending={pending}
                  onCancel={() => setAddingTo(null)}
                  onSubmit={(v) => run(() => addItem(slug, section.id, v))}
                />
              </li>
            )}
            {section.items.map((item) => (
              <li key={item.id}>
                {editing === item.id ? (
                  <ItemForm
                    initial={item}
                    pending={pending}
                    onCancel={() => setEditing(null)}
                    onSubmit={(v) => run(() => updateItem(slug, item.id, v))}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
                    <label
                      className="group relative block h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
                      title={item.photoUrl ? "Replace photo" : "Add photo"}
                    >
                      {item.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.photoUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-lg text-zinc-400">
                          +
                        </span>
                      )}
                      {photoBusy === item.id && (
                        <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs">
                          …
                        </span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={photoBusy !== null}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadPhoto(item.id, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-900">
                        {item.name}
                        {!item.available && (
                          <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                            86&apos;d
                          </span>
                        )}
                      </p>
                      {item.description && (
                        <p className="text-sm text-zinc-500">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-medium">{formatCents(item.priceCents)}</span>
                      {item.photoUrl && (
                        <button
                          disabled={photoBusy !== null}
                          onClick={() => removePhoto(item.id)}
                          className="text-zinc-400 underline"
                          title="Remove photo"
                        >
                          No photo
                        </button>
                      )}
                      <button
                        onClick={() => setEditing(item.id)}
                        className="text-zinc-600 underline"
                      >
                        Edit
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => {
                          if (confirm(`Delete "${item.name}"?`)) {
                            run(() => deleteItem(slug, item.id));
                          }
                        }}
                        className="text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex gap-2 border-t border-zinc-200 pt-6">
        <input
          value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
          placeholder="New section name (e.g. Specials)"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          disabled={pending || !newSection.trim()}
          onClick={() =>
            run(async () => {
              await addSection(slug, newSection);
              setNewSection("");
            })
          }
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add section
        </button>
      </div>
    </div>
  );
}
