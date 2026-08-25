import type { Metadata } from "next";
import {
  getActiveCities,
  getChefsInCity,
  getCuisines,
  getDietaryTags,
  getNeighbourhoodsForCity,
  searchChefs,
} from "@/lib/supabase/queries";
import { ChefCard } from "@/components/directory/ChefCard";
import { FilterBar } from "@/components/directory/FilterBar";
import { SearchLocationBar } from "@/components/directory/SearchLocationBar";
import { SearchLocationGate } from "@/components/directory/SearchLocationGate";
import { ALL_AREAS_RADIUS_KM } from "@/components/home/LocationPicker";
import { copy } from "@/lib/copy/en";
import { chefIdsMatchingText } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: `${copy.search.heading} | Zuby`,
  robots: { index: false, follow: true }, // canonical SEO surface is the city/neighbourhood pages
};

interface SearchPageProps {
  searchParams: Promise<{
    lat?: string;
    lng?: string;
    radius?: string;
    tags?: string;
    cuisines?: string;
    verified?: string;
    /** Free text from the home-page search box — a dish, kitchen or keyword. */
    q?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const lat = sp.lat ? Number(sp.lat) : null;
  const lng = sp.lng ? Number(sp.lng) : null;
  const hasLocation = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);

  const [cuisines, dietaryTags, cities] = await Promise.all([
    getCuisines(),
    getDietaryTags(),
    getActiveCities(),
  ]);

  // V1 is single-city; the neighbourhood-picker fallback shows the first
  // (only) active city's neighbourhoods.
  const fallbackCity = cities[0] ?? null;
  const neighbourhoods = fallbackCity ? await getNeighbourhoodsForCity(fallbackCity.slug) : [];

  const cuisineNamesFor = new Map(cuisines.map((c) => [c.slug, c.name]));

  let results: Awaited<ReturnType<typeof searchChefs>> = [];
  // Set when the requested radius found nothing and a wider look did — the
  // banner below is what keeps that from reading as "here are some random
  // results" instead of a deliberate fallback. "browse-all" is the stronger
  // version: not filtered by distance at all, only shown when even the
  // widest point-radius search came up empty.
  let expandedFromKm: number | null = null;
  let expandedToBrowseAll = false;

  if (hasLocation) {
    const radius = Number(sp.radius ?? "5");
    const effectiveRadius = Number.isFinite(radius) ? radius : 5;
    const tagSlugs = (sp.tags ?? "").split(",").filter(Boolean);
    const cuisineSlugs = (sp.cuisines ?? "").split(",").filter(Boolean);
    const verifiedOnly = sp.verified !== "0";
    const tagsOrNull = tagSlugs.length > 0 ? tagSlugs : null;
    const cuisinesOrNull = cuisineSlugs.length > 0 ? cuisineSlugs : null;

    const runSearch = async (maxKm: number) => {
      let r = await searchChefs({
        lat: lat as number,
        lng: lng as number,
        maxKm,
        tagSlugs: tagsOrNull,
        cuisineSlugs: cuisinesOrNull,
      });
      if (verifiedOnly) r = r.filter((c) => c.is_verified);
      return r;
    };

    // "All areas" (LocationPicker's pinned "All of <city>" option) is a
    // fundamentally different question from "who delivers to this point" —
    // it means the whole city's directory, full stop. Routing it through
    // searchChefs (point + radius) was the actual bug reported: search_chefs
    // gates on least(chef's own radius, this radius), so a big radius from a
    // single centre point can only ever narrow toward a chef's own radius,
    // never widen past it — a kitchen whose radius doesn't reach that exact
    // point stays invisible no matter how "all areas" the buyer's choice
    // was. chefs_in_city() has no geo gate at all; it's the real thing this
    // option was supposed to do (see its migration comment, 20260815000020).
    if (effectiveRadius >= ALL_AREAS_RADIUS_KM && fallbackCity) {
      results = await getChefsInCity(fallbackCity.slug, tagsOrNull, cuisinesOrNull);
      if (verifiedOnly) results = results.filter((c) => c.is_verified);
    } else {
      results = await runSearch(effectiveRadius);

      // Zuby doesn't arrange delivery — a chef's own service_radius_km
      // already decides who's shown, so a wider look here just surfaces
      // kitchens that are further away but still willing to deliver, never
      // ones that wouldn't.
      if (results.length === 0) {
        const wider = await runSearch(ALL_AREAS_RADIUS_KM);
        if (wider.length > 0) {
          results = wider;
          expandedFromKm = ALL_AREAS_RADIUS_KM;
        } else if (fallbackCity) {
          // Nobody's own radius reaches this point even at the widest look —
          // fall all the way back to the whole city's directory rather than
          // a dead end, clearly labelled as not distance-filtered at all.
          const cityWide = await getChefsInCity(fallbackCity.slug, tagsOrNull, cuisinesOrNull);
          const filtered = verifiedOnly ? cityWide.filter((c) => c.is_verified) : cityWide;
          if (filtered.length > 0) {
            results = filtered;
            expandedToBrowseAll = true;
          }
        }
      }
    }

    // Free-text narrowing. The geo query stays the source of truth for *who*
    // can deliver here; `q` only filters that set, so a keyword can never pull
    // in a chef who doesn't serve this location.
    const term = sp.q?.trim().toLowerCase();
    if (term) {
      const matchingChefIds = await chefIdsMatchingText(term);
      results = results.filter(
        (r) =>
          matchingChefIds.has(r.id) ||
          r.kitchen_name.toLowerCase().includes(term) ||
          r.display_name.toLowerCase().includes(term) ||
          r.cuisines.some((c) => (cuisineNamesFor.get(c) ?? c).toLowerCase().includes(term)),
      );
    }
  }

  const cuisineNames = Object.fromEntries(cuisines.map((c) => [c.slug, c.name]));
  const tagNames = Object.fromEntries(dietaryTags.map((t) => [t.slug, t.name]));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-sand-900">
          {sp.q ? copy.search.headingFor(sp.q) : copy.search.heading}
        </h1>
        {/* Persistent — previously the only way to change location once
            results were showing was the browser back button, which also lost
            every filter. Rendered whether or not a location is set yet: once
            geolocation resolves (or the buyer picks manually) this is what
            they'll come back to if they want somewhere else. */}
        {fallbackCity && (
          <SearchLocationBar
            neighbourhoods={neighbourhoods}
            cityName={fallbackCity.name}
            cityLat={fallbackCity.lat}
            cityLng={fallbackCity.lng}
          />
        )}
      </div>

      {!hasLocation && (
        <div className="mt-6">
          <SearchLocationGate neighbourhoods={neighbourhoods} />
        </div>
      )}

      {hasLocation && (
        <div className="mt-6 grid gap-6 sm:grid-cols-[260px_1fr]">
          <FilterBar cuisines={cuisines} dietaryTags={dietaryTags} />

          <div>
            <p className="mb-4 text-sm text-sand-500">{copy.search.resultCount(results.length)}</p>
            {expandedToBrowseAll && (
              <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {copy.home.browseAllResultsNote}
              </p>
            )}
            {expandedFromKm && !expandedToBrowseAll && (
              <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {copy.home.expandedResultsNote(expandedFromKm)}
              </p>
            )}
            {results.length === 0 ? (
              <div className="rounded-2xl border border-sand-200 p-8 text-center text-sand-500">
                {copy.search.empty}
              </div>
            ) : (
              <div className="grid gap-4">
                {results.map((chef) => (
                  <ChefCard
                    key={chef.id}
                    chef={chef}
                    tagNames={tagNames}
                    cuisineNames={cuisineNames}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
