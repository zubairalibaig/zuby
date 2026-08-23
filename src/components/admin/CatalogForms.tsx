"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCuisine, addNeighbourhood } from "@/lib/admin/actions";
import { Field, inputClass } from "@/components/admin/Field";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * The two supabase/ops.sql §8 snippets (add a cuisine, add a neighbourhood),
 * as a form instead of a SQL Editor paste. Same admin-only path either way —
 * these actions call RLS-gated inserts / a SECURITY DEFINER RPC that
 * re-checks is_admin() at the database, not just in this UI.
 */
export function AddCuisineForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const effectiveSlug = slug || slugify(name);

  function submit() {
    setError(null);
    setDone(null);
    if (!name.trim()) return setError("Name is required.");
    startTransition(async () => {
      const res = await addCuisine({ slug: effectiveSlug, name });
      if (!res.ok) setError(res.error ?? "Failed");
      else {
        setDone(`Added "${name}".`);
        setName("");
        setSlug("");
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-md space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="font-semibold text-neutral-900">Add a cuisine</h2>
      <Field label="Display name" hint="e.g. Chettinad, Awadhi, Peranakan">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Slug" hint={`Defaults to "${slugify(name) || "…"}"`}>
        <input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-green-700">{done}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="rounded-md bg-zuby-500 px-4 py-2 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add cuisine"}
      </button>
    </div>
  );
}

export function AddNeighbourhoodForm({ cities }: { cities: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? "");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const effectiveSlug = slug || slugify(name);

  function submit() {
    setError(null);
    setDone(null);
    if (!name.trim()) return setError("Name is required.");
    if (!citySlug) return setError("Pick a city.");
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!lat.trim() || !Number.isFinite(latNum)) return setError("Latitude must be a number.");
    if (!lng.trim() || !Number.isFinite(lngNum)) return setError("Longitude must be a number.");
    startTransition(async () => {
      const res = await addNeighbourhood({
        citySlug,
        slug: effectiveSlug,
        name,
        lat: latNum,
        lng: lngNum,
      });
      if (!res.ok) setError(res.error ?? "Failed");
      else {
        setDone(`Added "${name}".`);
        setName("");
        setSlug("");
        setLat("");
        setLng("");
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-md space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="font-semibold text-neutral-900">Add a neighbourhood</h2>
      <Field label="City">
        <select
          className={inputClass}
          value={citySlug}
          onChange={(e) => setCitySlug(e.target.value)}
        >
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Display name" hint="e.g. Indiranagar, Tanjong Pagar">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Slug" hint={`Defaults to "${slugify(name) || "…"}"`}>
        <input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" hint="Right-click the spot on Google Maps">
          <input className={inputClass} value={lat} onChange={(e) => setLat(e.target.value)} />
        </Field>
        <Field label="Longitude">
          <input className={inputClass} value={lng} onChange={(e) => setLng(e.target.value)} />
        </Field>
      </div>
      <p className="text-xs text-neutral-400">
        Coordinates don&rsquo;t need to be survey-precise — a locality centroid is plenty. A
        chef&rsquo;s own delivery radius is what actually gates who shows up in search, not this
        point.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-green-700">{done}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="rounded-md bg-zuby-500 px-4 py-2 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add neighbourhood"}
      </button>
    </div>
  );
}
