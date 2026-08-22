"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMenuItem, deleteMenuItem, type MenuItemInput } from "@/lib/admin/actions";
import { formatPrice } from "@/lib/format";
import { inputClass } from "@/components/admin/Field";
import type { Nutrition } from "@/types/schemas";

interface MenuItem extends MenuItemInput {
  id?: string;
}

function emptyItem(sortOrder: number): MenuItem {
  return {
    name: "",
    description: null,
    price: null,
    unit: null,
    dietary: null,
    isBestSeller: false,
    isAvailable: true,
    nutrition: {},
    sortOrder,
  };
}

export function MenuEditor({
  chefId,
  currencyCode,
  items,
}: {
  chefId: string;
  currencyCode: string;
  items: MenuItem[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(item: MenuItem) {
    setError(null);
    if (!item.name.trim()) {
      setError("Name is required.");
      return;
    }
    startTransition(async () => {
      const res = await saveMenuItem(chefId, currencyCode, item);
      if (!res.ok) setError(res.error ?? "Failed");
      else {
        setEditing(null);
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteMenuItem(chefId, id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-neutral-900">{item.name}</span>
              {item.isBestSeller && (
                <span className="rounded bg-zuby-50 px-1.5 text-[10px] font-semibold text-zuby-600">
                  Best seller
                </span>
              )}
              {!item.isAvailable && <span className="text-xs text-neutral-400">unavailable</span>}
            </div>
            {item.price !== null && (
              <span className="text-sm text-neutral-500">
                {formatPrice(item.price, currencyCode)}
              </span>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setEditing(item)}
              className="text-xs font-medium text-zuby-600 hover:underline"
            >
              Edit
            </button>
            {item.id && (
              <button
                type="button"
                onClick={() => remove(item.id!)}
                disabled={pending}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}

      {editing ? (
        <ItemForm
          item={editing}
          currencyCode={currencyCode}
          pending={pending}
          error={error}
          onCancel={() => {
            setEditing(null);
            setError(null);
          }}
          onSave={save}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(emptyItem(items.length))}
          className="rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-500 hover:border-zuby-400 hover:text-zuby-600"
        >
          + Add menu item
        </button>
      )}
    </div>
  );
}

function ItemForm({
  item,
  currencyCode,
  pending,
  error,
  onCancel,
  onSave,
}: {
  item: MenuItem;
  currencyCode: string;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (item: MenuItem) => void;
}) {
  const [draft, setDraft] = useState<MenuItem>(item);
  const [showNutrition, setShowNutrition] = useState(
    Boolean(item.nutrition && Object.keys(item.nutrition).length > 0),
  );
  const nutrition = (draft.nutrition ?? {}) as Nutrition;

  function setNut(key: keyof Nutrition, val: string) {
    setDraft({
      ...draft,
      nutrition: { ...nutrition, [key]: val === "" ? undefined : Number(val) },
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-zuby-200 bg-zuby-50/40 p-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        className={inputClass}
        placeholder="Item name"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <textarea
        className={inputClass}
        placeholder="Description (optional)"
        rows={2}
        value={draft.description ?? ""}
        onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          className={inputClass}
          type="number"
          step="0.01"
          placeholder={`Price (${currencyCode})`}
          value={draft.price ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, price: e.target.value === "" ? null : Number(e.target.value) })
          }
        />
        <input
          className={inputClass}
          placeholder="Unit (per plate)"
          value={draft.unit ?? ""}
          onChange={(e) => setDraft({ ...draft, unit: e.target.value || null })}
        />
        <select
          className={inputClass}
          value={draft.dietary ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, dietary: (e.target.value || null) as MenuItem["dietary"] })
          }
        >
          <option value="">—</option>
          <option value="veg">Veg</option>
          <option value="non_veg">Non-veg</option>
          <option value="egg">Egg</option>
        </select>
      </div>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={draft.isBestSeller}
            onChange={(e) => setDraft({ ...draft, isBestSeller: e.target.checked })}
          />
          Best seller
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={draft.isAvailable}
            onChange={(e) => setDraft({ ...draft, isAvailable: e.target.checked })}
          />
          Available
        </label>
        <button
          type="button"
          onClick={() => setShowNutrition((v) => !v)}
          className="text-xs text-zuby-600 hover:underline"
        >
          {showNutrition ? "Hide" : "Add"} nutrition info
        </button>
      </div>
      {showNutrition && (
        <div className="grid grid-cols-5 gap-2">
          {(["calories_kcal", "protein_g", "carbs_g", "fat_g", "serving_g"] as const).map((k) => (
            <input
              key={k}
              className={inputClass}
              type="number"
              placeholder={k.replace(/_/g, " ")}
              value={nutrition[k] ?? ""}
              onChange={(e) => setNut(k, e.target.value)}
            />
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onSave(draft)}
          className="rounded-md bg-zuby-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
        >
          Save item
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
