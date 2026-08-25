"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { NeighbourhoodRecord } from "@/lib/supabase/queries";
import { copy } from "@/lib/copy/en";

export interface ChosenLocation {
  label: string;
  lat: number;
  lng: number;
  /** Set when this is the "All of <city>" choice — see ALL_AREAS_RADIUS_KM. */
  radiusKm?: number;
}

/**
 * The radius used for the "All of <city>" choice — wide enough to cover a
 * whole metro from its centre point without meaning "unlimited" (a real
 * ST_DWithin query stays index-backed either way). Matches the AREA_RADIUS_KM
 * convention lib/seo/landings.ts already uses for city-wide queries.
 */
export const ALL_AREAS_RADIUS_KM = 50;

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
  cityName,
  cityLat,
  cityLng,
}: {
  neighbourhoods: NeighbourhoodRecord[];
  value: ChosenLocation | null;
  onChange: (loc: ChosenLocation | null) => void;
  /** When provided, an "All of <cityName>" option is pinned above the area
   *  list — a city-wide search isn't the same action as picking one area, so
   *  it gets its own entry rather than being buried in the filterable list. */
  cityName?: string;
  cityLat?: number;
  cityLng?: number;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState(0);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

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
    // Setting a location used to only relabel this pill — nothing on the home
    // page itself is filtered by distance (the rails below are city-wide), so
    // the only visible effect was a small link appearing further down the
    // page that the buyer had to notice and click a second time. That read as
    // "nothing happened" / broken. Go straight to the results instead, same
    // as tapping "Show chefs near X" would — one action, one outcome.
    //
    // Merge into whatever's already in the URL rather than replacing it —
    // this component is also used as the persistent "change location"
    // control on /search itself now, where a buyer's dietary/cuisine filters
    // must survive picking a new area (previously the only way to change
    // location there was the browser back button, which lost them anyway).
    const params = new URLSearchParams(searchParams.toString());
    params.set("lat", String(loc.lat));
    params.set("lng", String(loc.lng));
    if (loc.radiusKm) params.set("radius", String(loc.radiusKm));
    router.push(`/search?${params.toString()}`);
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

  // Type-forward, not autocomplete: the input filters our own coverage list,
  // it never calls out to a places API (see the note above). But filtering
  // alone still left no way to submit without reaching for the mouse — Enter
  // did nothing, so a keyboard user (or anyone used to hitting Enter after
  // typing an area, the same as OmniSearch already supports) hit a dead end.
  // Mirror OmniSearch's arrow-key + Enter pattern so the two pickers behave
  // the same way.
  function onFilterKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (shown.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % shown.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + shown.length) % shown.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const n = shown[active] ?? shown[0];
      if (n) choose({ label: n.name, lat: n.lat, lng: n.lng });
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

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

            {cityName && cityLat !== undefined && cityLng !== undefined && (
              <button
                type="button"
                onClick={() =>
                  choose({
                    label: copy.home.allOfCity(cityName),
                    lat: cityLat,
                    lng: cityLng,
                    radiusKm: ALL_AREAS_RADIUS_KM,
                  })
                }
                className="mt-1.5 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-sand-700 hover:bg-sand-50"
              >
                <span aria-hidden>🗺️</span>
                {copy.home.allOfCity(cityName)}
              </button>
            )}

            <input
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setActive(0);
              }}
              onKeyDown={onFilterKeyDown}
              placeholder={copy.home.areaFilterPlaceholder}
              aria-label={copy.home.areaFilterPlaceholder}
              role="combobox"
              aria-expanded
              aria-controls="zuby-area-options"
              autoFocus
              className="mt-3 w-full rounded-lg border border-sand-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
            />

            <ul id="zuby-area-options" role="listbox" className="mt-2 max-h-64 overflow-y-auto">
              {shown.map((n, i) => (
                <li key={`${n.citySlug}/${n.slug}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose({ label: n.name, lat: n.lat, lng: n.lng })}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm text-sand-700 ${
                      i === active ? "bg-sand-100" : "hover:bg-sand-50"
                    }`}
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
