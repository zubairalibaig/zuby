"use client";

import { useEffect, useState } from "react";
import type { NeighbourhoodRecord } from "@/lib/supabase/queries";
import { copy } from "@/lib/copy/en";

export interface ChosenLocation {
  label: string;
  lat: number;
  lng: number;
}

const STORAGE_KEY = "zuby.location";

/**
 * Location selector, Swiggy-style: a pill in the header that opens a sheet
 * offering "use my location" or a list of areas.
 *
 * Deliberately NOT Google Places. Two reasons, in order of importance:
 *
 *  1. Places would autocomplete to any address on earth, including thousands of
 *     places Zuby has no chefs in. Suggesting "Koramangala 5th Block" when we
 *     serve it, and nothing when we don't, is better UX than a perfect address
 *     picker that leads to an empty result page.
 *  2. It's a metered paid API, and CLAUDE.md puts new paid services behind
 *     founder approval.
 *
 * Our own neighbourhoods table is free, has no network round trip, and only
 * ever offers real coverage. Browser geolocation covers "near me".
 */
export function LocationPicker({
  neighbourhoods,
  value,
  onChange,
}: {
  neighbourhoods: NeighbourhoodRecord[];
  value: ChosenLocation | null;
  onChange: (loc: ChosenLocation | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  // Restore the last choice so a returning buyer isn't asked again.
  useEffect(() => {
    if (value) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) onChange(JSON.parse(saved) as ChosenLocation);
    } catch {
      /* private mode or cleared storage — just ask again */
    }
    // Only on mount: re-running when `value` changes would fight the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(loc: ChosenLocation) {
    onChange(loc);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {
      /* non-fatal */
    }
    setOpen(false);
    setFilter("");
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setDenied(true);
      return;
    }
    setLocating(true);
    setDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        choose({
          label: copy.home.nearMe,
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        });
      },
      () => {
        setLocating(false);
        setDenied(true);
      },
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }

  const shown = filter.trim()
    ? neighbourhoods.filter((n) => n.name.toLowerCase().includes(filter.trim().toLowerCase()))
    : neighbourhoods;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-full items-center gap-2 rounded-full border-2 border-zuby-200 bg-zuby-50 px-4 py-3.5 text-sm font-semibold text-zuby-800 transition hover:border-zuby-300 hover:bg-zuby-100 sm:max-w-[15rem]"
      >
        <span aria-hidden>📍</span>
        <span className="truncate">{value?.label ?? copy.home.setLocation}</span>
        <span className="text-sand-400" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <>
          {/* Click-away layer, below the panel */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default bg-black/10"
          />
          <div className="absolute left-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-sand-200 bg-white p-3 shadow-lg">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="flex w-full items-center gap-2 rounded-xl bg-zuby-50 px-3 py-2.5 text-left text-sm font-semibold text-zuby-700 hover:bg-zuby-100 disabled:opacity-60"
            >
              <span aria-hidden>🎯</span>
              {locating ? copy.home.locating : copy.home.useMyLocation}
            </button>
            {denied && <p className="mt-2 text-xs text-sand-500">{copy.home.locationDenied}</p>}

            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={copy.home.areaFilterPlaceholder}
              className="mt-3 w-full rounded-lg border border-sand-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
            />

            <ul className="mt-2 max-h-64 overflow-y-auto">
              {shown.map((n) => (
                <li key={`${n.citySlug}/${n.slug}`}>
                  <button
                    type="button"
                    onClick={() => choose({ label: n.name, lat: n.lat, lng: n.lng })}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-sand-700 hover:bg-sand-50"
                  >
                    {n.name}
                  </button>
                </li>
              ))}
              {shown.length === 0 && (
                <li className="px-3 py-2 text-sm text-sand-400">{copy.home.noAreas}</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
