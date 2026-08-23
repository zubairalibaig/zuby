"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chefSaveMenuItem, chefDeleteMenuItem } from "@/lib/chef/actions";
import { copy } from "@/lib/copy/en";
import type { Nutrition } from "@/types/schemas";
import type { Json } from "@/types/db";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  price: number | null;
  currencyCode: string;
  unit: string | null;
  isBestSeller: boolean;
  isAvailable: boolean;
  dietary: "veg" | "non_veg" | "egg" | null;
  nutrition: Json | null;
  sortOrder: number;
}

interface Props {
  chefId: string;
  currencyCode: string;
  menuItems: MenuItem[];
}

const EMPTY_ITEM = {
  name: "",
  description: null as string | null,
  price: null as number | null,
  unit: "per plate" as string | null,
  dietary: null as "veg" | "non_veg" | "egg" | null,
  isBestSeller: false,
  isAvailable: true,
  nutrition: {} as Nutrition,
  sortOrder: 0,
};

/** Nutrition fields shown in the expander, in the order chefs think about them. */
const NUTRITION_FIELDS: { key: keyof Nutrition; label: string; suffix: string }[] = [
  { key: "calories_kcal", label: "Calories", suffix: "kcal" },
  { key: "protein_g", label: "Protein", suffix: "g" },
  { key: "carbs_g", label: "Carbs", suffix: "g" },
  { key: "fat_g", label: "Fat", suffix: "g" },
  { key: "serving_g", label: "Serving size", suffix: "g" },
];

export function DashboardMenuEditor({ chefId, currencyCode, menuItems }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_ITEM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const bestSellerCount = menuItems.filter((m) => m.isBestSeller).length;

  function startEdit(item: MenuItem) {
    setEditing(item.id);
    setAdding(false);
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      unit: item.unit,
      dietary: item.dietary,
      isBestSeller: item.isBestSeller,
      isAvailable: item.isAvailable,
      nutrition: (item.nutrition ?? {}) as Nutrition,
      sortOrder: item.sortOrder,
    });
    setError(null);
  }

  function startAdd() {
    setAdding(true);
    setEditing(null);
    setForm({ ...EMPTY_ITEM, sortOrder: menuItems.length });
    setError(null);
  }

  function cancel() {
    setEditing(null);
    setAdding(false);
    setError(null);
  }

  function save(id?: string) {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    startTransition(async () => {
      const result = await chefSaveMenuItem(chefId, currencyCode, {
        id,
        name: form.name.trim(),
        description: form.description?.trim() || null,
        price: form.price,
        unit: form.unit,
        dietary: form.dietary,
        isBestSeller: form.isBestSeller,
        isAvailable: form.isAvailable,
        nutrition: form.nutrition,
        sortOrder: form.sortOrder,
      });
      if (!result.ok) {
        setError(result.error ?? "Failed");
        return;
      }
      cancel();
      router.refresh();
    });
  }

  function remove(itemId: string) {
    startTransition(async () => {
      await chefDeleteMenuItem(chefId, itemId);
      router.refresh();
    });
  }

  const dietaryIcon = (d: string | null) => {
    if (d === "veg") return "🟢";
    if (d === "non_veg") return "🔴";
    if (d === "egg") return "🟡";
    return "";
  };

  return (
    <div className="mt-6 space-y-4">
      {/* List */}
      {menuItems.map((item) => (
        <div key={item.id} className="rounded-xl border border-neutral-200 bg-white p-4">
          {editing === item.id ? (
            <ItemForm
              form={form}
              setForm={setForm}
              error={error}
              isPending={isPending}
              bestSellerCount={bestSellerCount}
              currentId={item.id}
              onSave={() => save(item.id)}
              onCancel={cancel}
            />
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span>{dietaryIcon(item.dietary)}</span>
                  <p className="font-medium text-neutral-900">{item.name}</p>
                  {item.isBestSeller && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {copy.chef.bestSellerBadge}
                    </span>
                  )}
                  {!item.isAvailable && (
                    <span className="text-xs text-neutral-400">{copy.chef.unavailable}</span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-1 text-sm text-neutral-500">{item.description}</p>
                )}
                {item.price != null && (
                  <p className="mt-1 text-sm font-medium text-neutral-700">
                    {item.currencyCode} {item.price}
                    {item.unit && <span className="text-neutral-400"> / {item.unit}</span>}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="text-sm text-zuby-500 hover:text-zuby-600"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={isPending}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add form */}
      {adding ? (
        <div className="rounded-xl border-2 border-dashed border-zuby-300 bg-white p-4">
          <ItemForm
            form={form}
            setForm={setForm}
            error={error}
            isPending={isPending}
            bestSellerCount={bestSellerCount}
            currentId={undefined}
            onSave={() => save()}
            onCancel={cancel}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={startAdd}
          className="w-full rounded-xl border-2 border-dashed border-neutral-300 py-4 text-sm font-medium text-neutral-500 hover:border-zuby-400 hover:text-zuby-600"
        >
          + {copy.dashboard.addItem}
        </button>
      )}

      <p className="text-xs text-neutral-400">{copy.dashboard.bestSellerMax}</p>
    </div>
  );
}

function ItemForm({
  form,
  setForm,
  error,
  isPending,
  bestSellerCount,
  currentId,
  onSave,
  onCancel,
}: {
  form: typeof EMPTY_ITEM;
  setForm: (f: typeof EMPTY_ITEM) => void;
  error: string | null;
  isPending: boolean;
  bestSellerCount: number;
  currentId: string | undefined;
  onSave: () => void;
  onCancel: () => void;
}) {
  const canToggleBestSeller = form.isBestSeller || bestSellerCount < 3;
  const nutrition = form.nutrition ?? {};
  const [showNutrition, setShowNutrition] = useState(Object.keys(nutrition).length > 0);

  function setNut(key: keyof Nutrition, val: string) {
    setForm({
      ...form,
      nutrition: { ...nutrition, [key]: val === "" ? undefined : Number(val) },
    });
  }

  return (
    <div className="space-y-3">
      <input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Item name"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
      />
      <textarea
        value={form.description ?? ""}
        onChange={(e) => setForm({ ...form, description: e.target.value || null })}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          value={form.price ?? ""}
          onChange={(e) =>
            setForm({ ...form, price: e.target.value ? Number(e.target.value) : null })
          }
          placeholder="Price"
          min={0}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
        />
        <select
          value={form.unit ?? ""}
          onChange={(e) => setForm({ ...form, unit: e.target.value || null })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
        >
          <option value="">Unit</option>
          <option value="per plate">per plate</option>
          <option value="per kg">per kg</option>
          <option value="per tiffin">per tiffin</option>
          <option value="per box">per box</option>
          <option value="per piece">per piece</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          value={form.dietary ?? ""}
          onChange={(e) =>
            setForm({
              ...form,
              dietary: (e.target.value || null) as "veg" | "non_veg" | "egg" | null,
            })
          }
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
        >
          <option value="">Dietary</option>
          <option value="veg">🟢 Veg</option>
          <option value="non_veg">🔴 Non-veg</option>
          <option value="egg">🟡 Egg</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isAvailable}
            onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
          />
          Available
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isBestSeller}
            disabled={!canToggleBestSeller}
            onChange={(e) => setForm({ ...form, isBestSeller: e.target.checked })}
          />
          Best seller{!canToggleBestSeller && " (max 3)"}
        </label>
      </div>
      {/* Nutrition — optional, tucked behind an expander so the common path stays short. */}
      <div>
        <button
          type="button"
          onClick={() => setShowNutrition((v) => !v)}
          className="text-sm font-medium text-zuby-600 hover:text-zuby-700"
        >
          {showNutrition ? "Hide" : "Add"} nutrition info
        </button>
        {showNutrition && (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-neutral-50 p-3 sm:grid-cols-3">
            {NUTRITION_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-neutral-500">
                  {f.label} ({f.suffix})
                </label>
                <input
                  type="number"
                  min={0}
                  value={nutrition[f.key] ?? ""}
                  onChange={(e) => setNut(f.key, e.target.value)}
                  className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm focus:border-zuby-500 focus:outline-none"
                />
              </div>
            ))}
            <p className="col-span-full text-xs text-neutral-400">
              Per serving. Leave blank what you don&apos;t know — partial info still shows.
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="rounded-lg bg-zuby-500 px-4 py-2 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
        >
          {isPending ? "Saving…" : currentId ? "Update" : "Add item"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
