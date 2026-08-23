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
}: {
  citySlug: string;
  neighbourhoods: NeighbourhoodRecord[];
}) {
  const [location, setLocation] = useState<ChosenLocation | null>(null);

  const nearYouHref = location ? `/search?lat=${location.lat}&lng=${location.lng}` : "/search";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <LocationPicker neighbourhoods={neighbourhoods} value={location} onChange={setLocation} />
        <div className="flex-1">
          <OmniSearch citySlug={citySlug} location={location} />
        </div>
      </div>

      {location ? (
        <Link
          href={nearYouHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zuby-600 hover:text-zuby-700"
        >
          {copy.home.nearYouHeading} — {location.label} →
        </Link>
      ) : (
        <p className="text-sm text-neutral-500">{copy.home.heroLocationPrompt}</p>
      )}
    </div>
  );
}
