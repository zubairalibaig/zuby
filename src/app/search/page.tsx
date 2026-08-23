import type { Metadata } from "next";
import {
  getActiveCities,
  getCuisines,
  getDietaryTags,
  getNeighbourhoodsForCity,
  searchChefs,
} from "@/lib/supabase/queries";
import { ChefCard } from "@/components/directory/ChefCard";
import { FilterBar } from "@/components/directory/FilterBar";
import { SearchLocationGate } from "@/components/directory/SearchLocationGate";
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
  if (hasLocation) {
    const radius = Number(sp.radius ?? "5");
    const tagSlugs = (sp.tags ?? "").split(",").filter(Boolean);
    const cuisineSlugs = (sp.cuisines ?? "").split(",").filter(Boolean);
    const verifiedOnly = sp.verified !== "0";

    results = await searchChefs({
      lat: lat as number,
      lng: lng as number,
      maxKm: Number.isFinite(radius) ? radius : 5,
      tagSlugs: tagSlugs.length > 0 ? tagSlugs : null,
      cuisineSlugs: cuisineSlugs.length > 0 ? cuisineSlugs : null,
    });
    if (verifiedOnly) results = results.filter((r) => r.is_verified);

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
      <h1 className="text-2xl font-bold text-neutral-900">
        {sp.q ? copy.search.headingFor(sp.q) : copy.search.heading}
      </h1>

      {!hasLocation && (
        <div className="mt-6">
          <SearchLocationGate neighbourhoods={neighbourhoods} />
        </div>
      )}

      {hasLocation && (
        <div className="mt-6 grid gap-6 sm:grid-cols-[260px_1fr]">
          <FilterBar cuisines={cuisines} dietaryTags={dietaryTags} />

          <div>
            <p className="mb-4 text-sm text-neutral-500">
              {copy.search.resultCount(results.length)}
            </p>
            {results.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 p-8 text-center text-neutral-500">
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
