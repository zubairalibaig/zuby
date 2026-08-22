"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createChef } from "@/lib/admin/actions";
import { Field, inputClass } from "@/components/admin/Field";
import { slugSchema } from "@/types/schemas";
import type { RefData } from "@/lib/admin/queries";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Manual chef creation — for phone/WhatsApp onboarding where the founder does
 * the data entry. Creates a draft; the full editor fills in the rest.
 */
export function CreateChefForm({ ref }: { ref: RefData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    kitchenName: "",
    displayName: "",
    citySlug: ref.cities[0]?.slug ?? "bangalore",
    neighbourhoodSlug: "",
    whatsappE164: "",
    slug: "",
  });

  const slug = form.slug || slugify(form.kitchenName);
  const cityNeighbourhoods = ref.neighbourhoods.filter((n) => n.citySlug === form.citySlug);

  function submit() {
    setError(null);
    if (!form.kitchenName.trim()) return setError("Kitchen name is required.");
    if (!slugSchema.safeParse(slug).success)
      return setError("Slug must be lowercase letters, numbers and hyphens.");
    startTransition(async () => {
      const res = await createChef({
        kitchenName: form.kitchenName,
        displayName: form.displayName || form.kitchenName,
        citySlug: form.citySlug,
        neighbourhoodSlug: form.neighbourhoodSlug || null,
        whatsappE164: form.whatsappE164 || null,
        slug,
      });
      if (!res.ok) setError(res.error ?? "Failed");
      else if (res.chefId) router.push(`/admin/chefs/${res.chefId}`);
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <Field label="Kitchen name">
        <input
          className={inputClass}
          value={form.kitchenName}
          onChange={(e) => setForm({ ...form, kitchenName: e.target.value })}
        />
      </Field>
      <Field label="Chef name">
        <input
          className={inputClass}
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
        />
      </Field>
      <Field
        label="URL slug"
        hint={`Page will be /${form.citySlug}/${form.neighbourhoodSlug || "…"}/${slug}`}
      >
        <input
          className={inputClass}
          value={form.slug}
          placeholder={slugify(form.kitchenName)}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="City">
          <select
            className={inputClass}
            value={form.citySlug}
            onChange={(e) => setForm({ ...form, citySlug: e.target.value, neighbourhoodSlug: "" })}
          >
            {ref.cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Neighbourhood">
          <select
            className={inputClass}
            value={form.neighbourhoodSlug}
            onChange={(e) => setForm({ ...form, neighbourhoodSlug: e.target.value })}
          >
            <option value="">—</option>
            {cityNeighbourhoods.map((n) => (
              <option key={n.slug} value={n.slug}>
                {n.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="WhatsApp (E.164)" hint="e.g. +919900000001">
        <input
          className={inputClass}
          value={form.whatsappE164}
          onChange={(e) => setForm({ ...form, whatsappE164: e.target.value })}
        />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="rounded-md bg-zuby-500 px-4 py-2 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create draft listing"}
      </button>
    </div>
  );
}
