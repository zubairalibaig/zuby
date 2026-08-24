"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { copy } from "@/lib/copy/en";
import type { NeighbourhoodRecord } from "@/lib/supabase/queries";

type Status = "locating" | "denied" | "done";

/**
 * Mounted on /search only when the URL has no lat/lng yet. Requests the
 * buyer's location once; on success, adds lat/lng to the URL so the server
 * component re-fetches with real results. On denial/failure, shows the
 * neighbourhood-picker fallback in place rather than a dead end (AC4).
 */
export function SearchLocationGate({ neighbourhoods }: { neighbourhoods: NeighbourhoodRecord[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("locating");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("lat", position.coords.latitude.toFixed(5));
        params.set("lng", position.coords.longitude.toFixed(5));
        setStatus("done");
        router.replace(`/search?${params.toString()}`);
      },
      () => setStatus("denied"),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
    // Only ever run this once per mount — re-running on every searchParams
    // change would re-prompt geolocation whenever a filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "locating") {
    return (
      <div className="rounded-2xl border border-sand-200 p-8 text-center text-sand-500">
        {copy.search.loading}
      </div>
    );
  }

  if (status === "done") return null;

  // With 100+ neighbourhoods now seeded (supabase/seed.sql), a flat unscrolled
  // grid of every one of them made this the longest thing on the page — the
  // same problem the home LocationPicker already solved with a filter input
  // and a capped, scrollable list. Mirrored here rather than shared as one
  // component, since the two render very differently (a sheet vs. inline).
  const shown = filter.trim()
    ? neighbourhoods.filter((n) => n.name.toLowerCase().includes(filter.trim().toLowerCase()))
    : neighbourhoods;

  return (
    <div className="rounded-2xl border border-sand-200 p-6">
      <h2 className="font-semibold text-sand-900">{copy.search.locationDeniedHeading}</h2>
      <p className="mt-1 text-sm text-sand-500">{copy.search.locationDeniedBody}</p>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={copy.home.areaFilterPlaceholder}
        aria-label={copy.home.areaFilterPlaceholder}
        className="mt-4 w-full rounded-lg border border-sand-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
      />

      <ul className="mt-3 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
        {shown.map((n) => (
          <li key={`${n.citySlug}/${n.slug}`}>
            <Link
              href={`/${n.citySlug}/${n.slug}`}
              className="block rounded-lg border border-sand-200 px-3 py-2 text-center text-sm font-medium text-sand-700 hover:border-zuby-500/50 hover:text-zuby-600"
            >
              {n.name}
            </Link>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="col-span-full py-2 text-center text-sm text-sand-400">
            {copy.home.noAreas}
          </li>
        )}
      </ul>
    </div>
  );
}
