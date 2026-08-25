"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy/en";
import type { CuisineRecord, DietaryTagRecord } from "@/lib/supabase/queries";

import { ALL_AREAS_RADIUS_KM } from "@/components/home/LocationPicker";

/** The last option isn't really "a distance" — it's the same city-wide scope
 *  LocationPicker's "All of <city>" choice sets, given its own label so it
 *  doesn't read as "50 km" (which nobody actually means to pick). */
const RADIUS_OPTIONS = [
  { km: 2, label: "2 km" },
  { km: 5, label: "5 km" },
  { km: 10, label: "10 km" },
  { km: ALL_AREAS_RADIUS_KM, label: "All areas" },
] as const;

interface FilterBarProps {
  cuisines: CuisineRecord[];
  dietaryTags: DietaryTagRecord[];
}

/**
 * Reads/writes the /search URL's query string directly — the page itself is a
 * plain server component that re-fetches on navigation, so there is no client
 * data-fetch here, just URL building. Works from a cold load because the
 * initial render reflects whatever the server already put in the URL.
 */
export function FilterBar({ cuisines, dietaryTags }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentRadius = Number(searchParams.get("radius") ?? "5");
  const currentTags = new Set((searchParams.get("tags") ?? "").split(",").filter(Boolean));
  const currentCuisines = new Set((searchParams.get("cuisines") ?? "").split(",").filter(Boolean));
  const verifiedOnly = searchParams.get("verified") !== "0"; // defaults ON

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const toggleInSet = (key: "tags" | "cuisines", current: Set<string>, slug: string) => {
    update((params) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      if (next.size > 0) params.set(key, [...next].join(","));
      else params.delete(key);
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-sand-200 p-4">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sand-500">
          {copy.search.radiusLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map(({ km, label }) => (
            <button
              key={km}
              type="button"
              onClick={() => update((params) => params.set("radius", String(km)))}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition",
                currentRadius === km
                  ? "bg-zuby-500 text-white ring-zuby-500"
                  : "bg-white text-sand-700 ring-sand-300 hover:ring-zuby-500/50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sand-500">
          {copy.search.dietaryLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {dietaryTags.map((tag) => (
            <button
              key={tag.slug}
              type="button"
              onClick={() => toggleInSet("tags", currentTags, tag.slug)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition",
                currentTags.has(tag.slug)
                  ? "bg-zuby-500 text-white ring-zuby-500"
                  : "bg-white text-sand-700 ring-sand-300 hover:ring-zuby-500/50",
              )}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sand-500">
          {copy.search.cuisineLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {cuisines.map((cuisine) => (
            <button
              key={cuisine.slug}
              type="button"
              onClick={() => toggleInSet("cuisines", currentCuisines, cuisine.slug)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition",
                currentCuisines.has(cuisine.slug)
                  ? "bg-zuby-500 text-white ring-zuby-500"
                  : "bg-white text-sand-700 ring-sand-300 hover:ring-zuby-500/50",
              )}
            >
              {cuisine.name}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-sand-700">
        <input
          type="checkbox"
          checked={verifiedOnly}
          onChange={(e) => update((params) => params.set("verified", e.target.checked ? "1" : "0"))}
          className="h-4 w-4 rounded border-sand-300 text-zuby-500 focus:ring-zuby-500"
        />
        {copy.search.verifiedOnlyLabel}
      </label>
    </div>
  );
}
