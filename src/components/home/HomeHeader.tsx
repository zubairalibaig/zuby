"use client";

import { useState } from "react";
import Link from "next/link";
import { LocationPicker, type ChosenLocation } from "@/components/home/LocationPicker";
import { OmniSearch } from "@/components/home/OmniSearch";
import type { NeighbourhoodRecord } from "@/lib/supabase/queries";
import { copy } from "@/lib/copy/en";

/**
 * The Swiggy header pattern: location on the left, search filling the rest.
 * Location and search share state — a chosen location scopes what "Enter" on a
 * free-text search means, so the two controls have to live in one client
 * component rather than being independently mounted.
 */
export function HomeHeader({
  citySlug,
  neighbourhoods,
  cityName,
  cityLat,
  cityLng,
}: {
  citySlug: string;
  neighbourhoods: NeighbourhoodRecord[];
  cityName?: string;
  cityLat?: number;
  cityLng?: number;
}) {
  const [location, setLocation] = useState<ChosenLocation | null>(null);

  const nearYouHref = location
    ? `/search?lat=${location.lat}&lng=${location.lng}${location.radiusKm ? `&radius=${location.radiusKm}` : ""}`
    : "/search";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <LocationPicker
          neighbourhoods={neighbourhoods}
          value={location}
          onChange={setLocation}
          cityName={cityName}
          cityLat={cityLat}
          cityLng={cityLng}
        />
        <div className="flex-1">
          <OmniSearch citySlug={citySlug} location={location} />
        </div>
      </div>

      {location ? (
        <Link
          href={nearYouHref}
          className="inline-flex items-center gap-1.5 rounded-full bg-leaf-50 px-3.5 py-2 text-sm font-semibold text-leaf-700 transition hover:bg-leaf-100"
        >
          <span aria-hidden>🎯</span>
          {copy.home.showChefsNear(location.label)} →
        </Link>
      ) : (
        <p className="px-1 text-sm text-sand-500">{copy.home.heroLocationPrompt}</p>
      )}
    </div>
  );
}
