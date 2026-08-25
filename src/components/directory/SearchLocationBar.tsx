"use client";

import { useSearchParams } from "next/navigation";
import { LocationPicker, ALL_AREAS_RADIUS_KM } from "@/components/home/LocationPicker";
import type { NeighbourhoodRecord } from "@/lib/supabase/queries";
import { copy } from "@/lib/copy/en";

/**
 * The persistent "change location" control for /search. Before this, the
 * only way to change location once results were showing was the browser
 * back button — losing whatever filters were set. Reuses the same
 * LocationPicker the home page uses (it merges into the current query
 * string rather than replacing it, specifically so this works).
 *
 * A small distance is close enough to call a match — neighbourhood
 * centroids are approximate by design (supabase/seed.sql), and a buyer's
 * geolocation reading is never going to land exactly on one anyway.
 */
const MATCH_EPSILON_DEG = 0.01; // roughly ~1 km at Bangalore's latitude

export function SearchLocationBar({
  neighbourhoods,
  cityName,
  cityLat,
  cityLng,
}: {
  neighbourhoods: NeighbourhoodRecord[];
  cityName: string;
  cityLat: number;
  cityLng: number;
}) {
  const searchParams = useSearchParams();
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Number(searchParams.get("radius") ?? "5");
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);

  let label: string | null = null;
  if (hasLocation) {
    if (radius >= ALL_AREAS_RADIUS_KM) {
      label = copy.home.allOfCity(cityName);
    } else {
      const match = neighbourhoods.find(
        (n) =>
          Math.abs(n.lat - lat) < MATCH_EPSILON_DEG && Math.abs(n.lng - lng) < MATCH_EPSILON_DEG,
      );
      label = match?.name ?? copy.home.nearMe;
    }
  }

  return (
    <div className="flex items-center gap-2">
      <LocationPicker
        neighbourhoods={neighbourhoods}
        value={label ? { label, lat, lng } : null}
        onChange={() => {
          /* LocationPicker navigates on choose(); no local state to track here. */
        }}
        cityName={cityName}
        cityLat={cityLat}
        cityLng={cityLng}
      />
      {!hasLocation && (
        <span className="text-sm text-sand-500">{copy.search.locationDeniedBody}</span>
      )}
    </div>
  );
}
