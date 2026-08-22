"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveChefProfile, type ChefProfileInput } from "@/lib/admin/actions";
import { Field, inputClass } from "@/components/admin/Field";
import { LocationPicker } from "@/components/admin/LocationPicker";
import { TimingsEditor, defaultTimings } from "@/components/admin/TimingsEditor";
import { parseTimings, type Timings } from "@/types/schemas";
import type { AdminChefDetail, RefData } from "@/lib/admin/queries";

export function ChefEditorForm({ chef, ref }: { chef: AdminChefDetail; ref: RefData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    displayName: chef.displayName,
    kitchenName: chef.kitchenName,
    bio: chef.bio ?? "",
    phoneE164: chef.phoneE164 ?? "",
    whatsappE164: chef.whatsappE164 ?? "",
    instagramHandle: chef.instagramHandle ?? "",
    addressText: chef.addressText ?? "",
    addressArea: chef.addressArea ?? "",
    serviceRadiusKm: chef.serviceRadiusKm,
    fssaiNumber: chef.fssaiNumber ?? "",
    dietaryProfile: chef.dietaryProfile,
    neighbourhoodSlug: chef.neighbourhoodSlug,
  });
  const [cuisines, setCuisines] = useState<string[]>(chef.cuisineSlugs);
  const [tags, setTags] = useState<string[]>(chef.dietaryTagSlugs);
  const [lat, setLat] = useState<number | null>(chef.lat);
  const [lng, setLng] = useState<number | null>(chef.lng);
  const [timings, setTimings] = useState<Timings>(parseTimings(chef.timings) ?? defaultTimings());

  const cityNeighbourhoods = ref.neighbourhoods.filter((n) => n.citySlug === chef.citySlug);

  function toggle(list: string[], setList: (v: string[]) => void, slug: string) {
    setList(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
  }

  function submit() {
    setError(null);
    setSaved(false);
    // Resolve neighbourhood slug → id is done server-side by matching; here we
    // pass the neighbourhood_id via the chosen slug's centroid record. The
    // editor stores slug; convert to id through the ref list is not available
    // (centroids don't carry id), so we pass neighbourhoodId=null when unchanged.
    const input: ChefProfileInput = {
      displayName: form.displayName,
      kitchenName: form.kitchenName,
      bio: form.bio || null,
      phoneE164: form.phoneE164 || null,
      whatsappE164: form.whatsappE164 || null,
      instagramHandle: form.instagramHandle || null,
      addressText: form.addressText || null,
      addressArea: form.addressArea || null,
      serviceRadiusKm: form.serviceRadiusKm,
      fssaiNumber: form.fssaiNumber || null,
      dietaryProfile: form.dietaryProfile,
      neighbourhoodId:
        cityNeighbourhoods.find((n) => n.slug === form.neighbourhoodSlug)?.id ?? null,
      cuisineSlugs: cuisines,
      dietaryTagSlugs: tags,
      timings,
      lat,
      lng,
    };
    startTransition(async () => {
      const res = await saveChefProfile(chef.id, input);
      if (!res.ok) setError(res.error ?? "Failed");
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <Field label="Bio">
        <textarea
          className={inputClass}
          rows={3}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="WhatsApp (E.164)" hint="e.g. +919900000001">
          <input
            className={inputClass}
            value={form.whatsappE164}
            onChange={(e) => setForm({ ...form, whatsappE164: e.target.value })}
          />
        </Field>
        <Field label="Phone (E.164)">
          <input
            className={inputClass}
            value={form.phoneE164}
            onChange={(e) => setForm({ ...form, phoneE164: e.target.value })}
          />
        </Field>
        <Field label="Instagram">
          <input
            className={inputClass}
            value={form.instagramHandle}
            onChange={(e) => setForm({ ...form, instagramHandle: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Neighbourhood">
          <select
            className={inputClass}
            value={form.neighbourhoodSlug ?? ""}
            onChange={(e) => setForm({ ...form, neighbourhoodSlug: e.target.value || null })}
          >
            <option value="">—</option>
            {cityNeighbourhoods.map((n) => (
              <option key={n.slug} value={n.slug}>
                {n.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Public area text" hint="e.g. Indiranagar 2nd Stage">
          <input
            className={inputClass}
            value={form.addressArea}
            onChange={(e) => setForm({ ...form, addressArea: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Full address (private, admin only)">
        <input
          className={inputClass}
          value={form.addressText}
          onChange={(e) => setForm({ ...form, addressText: e.target.value })}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Service radius (km)">
          <input
            className={inputClass}
            type="number"
            step="0.5"
            min="0.5"
            max="50"
            value={form.serviceRadiusKm}
            onChange={(e) => setForm({ ...form, serviceRadiusKm: Number(e.target.value) })}
          />
        </Field>
        <Field label="FSSAI number">
          <input
            className={inputClass}
            value={form.fssaiNumber}
            onChange={(e) => setForm({ ...form, fssaiNumber: e.target.value })}
          />
        </Field>
        <Field label="Dietary profile">
          <select
            className={inputClass}
            value={form.dietaryProfile ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                dietaryProfile: (e.target.value || null) as typeof form.dietaryProfile,
              })
            }
          >
            <option value="">—</option>
            <option value="veg_only">Veg only</option>
            <option value="non_veg">Non-veg</option>
            <option value="mixed">Mixed</option>
          </select>
        </Field>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Cuisines
        </p>
        <div className="flex flex-wrap gap-2">
          {ref.cuisines.map((c) => (
            <Chip
              key={c.slug}
              label={c.name}
              active={cuisines.includes(c.slug)}
              onClick={() => toggle(cuisines, setCuisines, c.slug)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Dietary tags
        </p>
        <div className="flex flex-wrap gap-2">
          {ref.dietaryTags.map((t) => (
            <Chip
              key={t.slug}
              label={t.name}
              active={tags.includes(t.slug)}
              onClick={() => toggle(tags, setTags, t.slug)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Location
        </p>
        <LocationPicker
          lat={lat}
          lng={lng}
          onChange={(la, ln) => {
            setLat(la);
            setLng(ln);
          }}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Timings
        </p>
        <TimingsEditor value={timings} onChange={setTimings} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">Saved.</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="rounded-md bg-zuby-500 px-4 py-2 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset transition ${
        active
          ? "bg-zuby-500 text-white ring-zuby-500"
          : "bg-white text-neutral-600 ring-neutral-300 hover:ring-zuby-400"
      }`}
    >
      {label}
    </button>
  );
}
