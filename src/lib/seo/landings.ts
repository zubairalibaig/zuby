import "server-only";
import {
  getActiveCities,
  getCuisines,
  getDietaryTags,
  getNeighbourhoodsForCity,
  searchChefs,
} from "@/lib/supabase/queries";
import type { SearchChefResult } from "@/types/db";

/**
 * Programmatic landing pages — generation rules and data access (Phase 5).
 *
 * The threshold below is the single most important line in the SEO surface.
 * See docs/discoverability-strategy.md §5 and §18: combinatorial pages with one
 * or zero results are the "doorway page" pattern Google's spam policy names,
 * and a site-wide quality demotion is the failure mode. Below the threshold a
 * page is not generated, not linked, not in the sitemap, and 404s — so the
 * pattern is never indexed at all.
 *
 * It is defined once and imported by generateStaticParams, the page components
 * and the sitemap. Do not re-implement it: enforced in three places means
 * eventually enforced in two.
 */
export const MIN_CHEFS_FOR_LANDING = 2;

export function qualifies(chefCount: number): boolean {
  return chefCount >= MIN_CHEFS_FOR_LANDING;
}

/**
 * Wide radius on purpose. Each chef's own service_radius_km still gates whether
 * they cover this point — search_chefs enforces that — so a large max_km means
 * "don't clip early", not "ignore distance".
 */
const AREA_RADIUS_KM = 50;

/** Chefs matching a neighbourhood + cuisine. */
export async function chefsForNeighbourhoodCuisine(
  citySlug: string,
  hood: { lat: number; lng: number },
  cuisineSlug: string,
): Promise<SearchChefResult[]> {
  return searchChefs({
    lat: hood.lat,
    lng: hood.lng,
    maxKm: AREA_RADIUS_KM,
    citySlug,
    cuisineSlugs: [cuisineSlug],
  });
}

/** Chefs matching an area (city centre or neighbourhood) + dietary tag. */
export async function chefsForAreaDietary(
  citySlug: string,
  area: { lat: number; lng: number },
  tagSlug: string,
): Promise<SearchChefResult[]> {
  return searchChefs({
    lat: area.lat,
    lng: area.lng,
    maxKm: AREA_RADIUS_KM,
    citySlug,
    tagSlugs: [tagSlug],
  });
}

/** All chefs in an area, unfiltered — used by the intent pages. */
export async function chefsForArea(
  citySlug: string,
  area: { lat: number; lng: number },
): Promise<SearchChefResult[]> {
  return searchChefs({ lat: area.lat, lng: area.lng, maxKm: AREA_RADIUS_KM, citySlug });
}

// ---------------------------------------------------------------------------
// Combination discovery — used by generateStaticParams and the sitemap so both
// see exactly the same set of qualifying pages.
// ---------------------------------------------------------------------------

export interface QualifyingCombo {
  citySlug: string;
  neighbourhoodSlug: string | null;
  /** cuisine slug or dietary tag slug, depending on which list this came from */
  key: string;
  count: number;
}

/**
 * Every neighbourhood × cuisine combination that clears the threshold.
 *
 * This is O(neighbourhoods × cuisines) queries and is deliberately only called
 * at build time and from the sitemap (which is cached). It is never on a user's
 * critical path.
 */
export async function qualifyingNeighbourhoodCuisines(
  citySlug: string,
): Promise<QualifyingCombo[]> {
  const [hoods, cuisines] = await Promise.all([getNeighbourhoodsForCity(citySlug), getCuisines()]);

  const out: QualifyingCombo[] = [];
  for (const hood of hoods) {
    for (const cuisine of cuisines) {
      const chefs = await chefsForNeighbourhoodCuisine(citySlug, hood, cuisine.slug);
      if (qualifies(chefs.length)) {
        out.push({
          citySlug,
          neighbourhoodSlug: hood.slug,
          key: cuisine.slug,
          count: chefs.length,
        });
      }
    }
  }
  return out;
}

/** Every city × dietary-tag combination that clears the threshold. */
export async function qualifyingCityDietary(citySlug: string): Promise<QualifyingCombo[]> {
  const [cities, tags] = await Promise.all([getActiveCities(), getDietaryTags()]);
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) return [];

  const out: QualifyingCombo[] = [];
  for (const tag of tags) {
    const chefs = await chefsForAreaDietary(citySlug, city, tag.slug);
    if (qualifies(chefs.length)) {
      out.push({ citySlug, neighbourhoodSlug: null, key: tag.slug, count: chefs.length });
    }
  }
  return out;
}

/** Every neighbourhood × dietary-tag combination that clears the threshold. */
export async function qualifyingNeighbourhoodDietary(citySlug: string): Promise<QualifyingCombo[]> {
  const [hoods, tags] = await Promise.all([getNeighbourhoodsForCity(citySlug), getDietaryTags()]);

  const out: QualifyingCombo[] = [];
  for (const hood of hoods) {
    for (const tag of tags) {
      const chefs = await chefsForAreaDietary(citySlug, hood, tag.slug);
      if (qualifies(chefs.length)) {
        out.push({ citySlug, neighbourhoodSlug: hood.slug, key: tag.slug, count: chefs.length });
      }
    }
  }
  return out;
}

/**
 * Build-time param generation must never fail a build because the database
 * isn't reachable — same posture as the Phase 1 routes. An empty list means
 * "render on demand", not "these pages don't exist".
 */
export async function safeParams<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`generateStaticParams(${label}) skipped — DB not reachable:`, err);
    return [];
  }
}
