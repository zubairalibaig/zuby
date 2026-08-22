"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/admin/Field";

/**
 * Lat/lng entry with a live OpenStreetMap preview (free, no token, no map JS).
 * The numeric inputs are the source of truth — always reliable — and the
 * embedded map is a visual confirmation of where the pin lands. "Use my
 * location" fills the fields from the admin's browser when they're on-site.
 */
export function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}) {
  const [locating, setLocating] = useState(false);

  const hasPoint = lat !== null && lng !== null;
  const d = 0.01;
  const bbox = hasPoint ? `${lng! - d},${lat! - d},${lng! + d},${lat! + d}` : "";
  const embedSrc = hasPoint
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`
    : null;

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude">
          <input
            type="number"
            step="any"
            className={inputClass}
            value={lat ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value), lng)}
          />
        </Field>
        <Field label="Longitude">
          <input
            type="number"
            step="any"
            className={inputClass}
            value={lng ?? ""}
            onChange={(e) => onChange(lat, e.target.value === "" ? null : Number(e.target.value))}
          />
        </Field>
      </div>
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
      >
        {locating ? "Locating…" : "Use my current location"}
      </button>
      {embedSrc && (
        <iframe
          title="Location preview"
          className="h-56 w-full rounded-md border border-neutral-200"
          src={embedSrc}
          loading="lazy"
        />
      )}
      <p className="text-xs text-neutral-400">
        The exact point is never shown to buyers — public pages get a ~100 m rounded location.
      </p>
    </div>
  );
}
