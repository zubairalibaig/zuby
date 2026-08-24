import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SearchChefResult, SearchSuggestion } from "@/types/db";
import { parseNutrition, parseTimings, type Nutrition, type Timings } from "@/types/schemas";

/**
 * Public read layer for the buyer-facing site. Every function here runs
 * server-side against the ANON key (RLS enforced — approved chefs only) and
 * selects an explicit, public-safe column list. None of these ever select
 * phone_e164 / whatsapp_e164 / address_text: the WhatsApp number only ever
 * leaves the server inside /api/wa/[chefId] (see src/app/api/wa), never as
 * page data, so it can never end up in rendered HTML or a client bundle.
 */

export interface CityRecord {
  slug: string;
  name: string;
  countryCode: string;
  timezone: string;
  lat: number;
  lng: number;
}

export interface NeighbourhoodRecord {
  slug: string;
  name: string;
  citySlug: string;
  lat: number;
  lng: number;
}

export interface CuisineRecord {
  slug: string;
  name: string;
}

export interface DietaryTagRecord {
  slug: string;
  name: string;
}

/** Active cities, with their centre point (for city-wide search calls). */
export async function getActiveCities(): Promise<CityRecord[]> {
  const supabase = await createClient();
  const [{ data: cities, error: cityError }, { data: centroids, error: centroidError }] =
    await Promise.all([
      supabase
        .from("cities")
        .select("slug, name, timezone, is_active, countries(code)")
        .eq("is_active", true),
      supabase.rpc("city_centroids"),
    ]);
  if (cityError) throw new Error(`getActiveCities: ${cityError.message}`);
  if (centroidError) throw new Error(`getActiveCities centroids: ${centroidError.message}`);

  const centroidBySlug = new Map((centroids ?? []).map((c) => [c.slug, c]));
  return (cities ?? []).flatMap((c) => {
    const centroid = centroidBySlug.get(c.slug);
    if (!centroid) return [];
    const country = c.countries as unknown as { code: string } | null;
    return [
      {
        slug: c.slug,
        name: c.name,
        countryCode: country?.code ?? "IN",
        timezone: c.timezone,
        lat: centroid.lat,
        lng: centroid.lng,
      },
    ];
  });
}

export async function getCityBySlug(slug: string): Promise<CityRecord | null> {
  const cities = await getActiveCities();
  return cities.find((c) => c.slug === slug) ?? null;
}

export interface ComingSoonCityRecord {
  slug: string;
  name: string;
}

/**
 * Cities that exist as real rows (docs/discoverability-strategy.md §13's
 * pan-India rollout targets) but aren't active yet — no chefs, no search
 * results, not returned by getActiveCities(). `/<slug>` renders an honest
 * "coming soon" page for these instead of a directory with nothing in it;
 * see src/app/(site)/[city]/page.tsx.
 */
export async function getComingSoonCities(): Promise<ComingSoonCityRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("slug, name")
    .eq("is_active", false)
    .order("name");
  if (error) throw new Error(`getComingSoonCities: ${error.message}`);
  return data ?? [];
}

export async function getComingSoonCityBySlug(slug: string): Promise<ComingSoonCityRecord | null> {
  const cities = await getComingSoonCities();
  return cities.find((c) => c.slug === slug) ?? null;
}

export async function getNeighbourhoodsForCity(citySlug: string): Promise<NeighbourhoodRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("neighbourhood_centroids");
  if (error) throw new Error(`getNeighbourhoodsForCity: ${error.message}`);
  return (data ?? [])
    .filter((n) => n.city_slug === citySlug)
    .map((n) => ({ slug: n.slug, name: n.name, citySlug: n.city_slug, lat: n.lat, lng: n.lng }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getNeighbourhoodBySlug(
  citySlug: string,
  neighbourhoodSlug: string,
): Promise<NeighbourhoodRecord | null> {
  const hoods = await getNeighbourhoodsForCity(citySlug);
  return hoods.find((n) => n.slug === neighbourhoodSlug) ?? null;
}

export async function getCuisines(): Promise<CuisineRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cuisines").select("slug, name").order("name");
  if (error) throw new Error(`getCuisines: ${error.message}`);
  return data ?? [];
}

export async function getCuisineBySlug(slug: string): Promise<CuisineRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cuisines")
    .select("slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getCuisineBySlug: ${error.message}`);
  return data;
}

export async function getDietaryTags(): Promise<DietaryTagRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("dietary_tags").select("slug, name").order("name");
  if (error) throw new Error(`getDietaryTags: ${error.message}`);
  return data ?? [];
}

export interface SearchParams {
  lat: number;
  lng: number;
  /** How far the BUYER is willing to travel. Each chef's own service_radius_km still gates them. */
  maxKm?: number;
  tagSlugs?: string[] | null;
  cuisineSlugs?: string[] | null;
  citySlug?: string | null;
}

/**
 * The one live geo query in the app (ARCHITECTURE.md §2). Wraps the
 * `search_chefs` PostGIS function, which already returns only public-safe
 * columns and rounds coordinates to ~100 m.
 */
export async function searchChefs(params: SearchParams): Promise<SearchChefResult[]> {
  const supabase = await createClient();

  let cityId: string | null = null;
  if (params.citySlug) {
    const { data, error } = await supabase
      .from("cities")
      .select("id")
      .eq("slug", params.citySlug)
      .maybeSingle();
    if (error) throw new Error(`searchChefs city lookup: ${error.message}`);
    cityId = data?.id ?? null;
    if (!cityId) return []; // unknown city slug: nothing to search
  }

  const { data, error } = await supabase.rpc("search_chefs", {
    lat: params.lat,
    lng: params.lng,
    max_km: params.maxKm ?? 50,
    tag_slugs: params.tagSlugs && params.tagSlugs.length > 0 ? params.tagSlugs : null,
    cuisine_slugs:
      params.cuisineSlugs && params.cuisineSlugs.length > 0 ? params.cuisineSlugs : null,
    city: cityId,
  });
  if (error) throw new Error(`searchChefs: ${error.message}`);
  return data ?? [];
}

export interface ChefMenuItem {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  price: number | null;
  currencyCode: string;
  unit: string | null;
  isBestSeller: boolean;
  isAvailable: boolean;
  dietary: "veg" | "non_veg" | "egg" | null;
  nutrition: Nutrition | null;
}

export interface ChefPhoto {
  url: string;
  kind: "kitchen" | "food" | "chef";
}

export interface ChefDetail {
  id: string;
  slug: string;
  displayName: string;
  kitchenName: string;
  bio: string | null;
  photoUrl: string | null;
  citySlug: string;
  cityName: string;
  cityTimezone: string;
  neighbourhoodSlug: string | null;
  neighbourhoodName: string | null;
  addressArea: string | null;
  dietaryProfile: "veg_only" | "non_veg" | "mixed" | null;
  isVerified: boolean;
  fssaiNumber: string | null;
  serviceRadiusKm: number;
  timings: Timings | null;
  isUnclaimed: boolean;
  approxLat: number | null;
  approxLng: number | null;
  cuisines: CuisineRecord[];
  dietaryTags: DietaryTagRecord[];
  photos: ChefPhoto[];
  menuItems: ChefMenuItem[];
}

/**
 * Full chef profile for the "money page". Deliberately selects an explicit
 * column list — phone_e164, whatsapp_e164 and address_text are never
 * included, so they can never leak into this page's HTML.
 */
export async function getChefBySlug(
  citySlug: string,
  neighbourhoodSlug: string,
  chefSlug: string,
): Promise<ChefDetail | null> {
  const supabase = await createClient();

  // Resolve the city first rather than filtering on a dotted embedded-resource
  // path — one unambiguous foreign-key filter, no reliance on PostgREST's
  // embedded-filter syntax lining up with the hand-maintained Database type.
  const { data: city, error: cityError } = await supabase
    .from("cities")
    .select("id, slug, name, timezone")
    .eq("slug", citySlug)
    .maybeSingle();
  if (cityError) throw new Error(`getChefBySlug city lookup: ${cityError.message}`);
  if (!city) return null;

  const { data: chef, error } = await supabase
    .from("chefs")
    .select(
      `
      id, slug, display_name, kitchen_name, bio, photo_url,
      address_area, dietary_profile, is_verified, fssai_number,
      service_radius_km, timings, status, claimed_by,
      neighbourhoods ( slug, name )
    `,
    )
    .eq("slug", chefSlug)
    .eq("city_id", city.id)
    .maybeSingle();

  if (error) throw new Error(`getChefBySlug: ${error.message}`);
  if (!chef || chef.status !== "approved") return null;

  const neighbourhood = chef.neighbourhoods as unknown as { slug: string; name: string } | null;

  // The chef's neighbourhood must match the URL — a stale/guessed URL 404s
  // rather than silently serving the profile under the wrong path.
  if (neighbourhood?.slug !== neighbourhoodSlug) return null;

  const [{ data: cuisineRows }, { data: tagRows }, { data: photoRows }, { data: menuRows }] =
    await Promise.all([
      supabase.from("chef_cuisines").select("cuisines(slug, name)").eq("chef_id", chef.id),
      supabase.from("chef_dietary_tags").select("dietary_tags(slug, name)").eq("chef_id", chef.id),
      supabase.from("chef_photos").select("url, kind").eq("chef_id", chef.id).order("sort_order"),
      supabase
        .from("menu_items")
        .select(
          "id, name, description, photo_url, price, currency_code, unit, is_best_seller, is_available, dietary, nutrition",
        )
        .eq("chef_id", chef.id)
        .order("sort_order"),
    ]);

  const cuisines = (cuisineRows ?? [])
    .map((r) => r.cuisines as unknown as CuisineRecord | null)
    .filter((c): c is CuisineRecord => c !== null);
  const dietaryTags = (tagRows ?? [])
    .map((r) => r.dietary_tags as unknown as DietaryTagRecord | null)
    .filter((t): t is DietaryTagRecord => t !== null);

  const { data: locationRows } = await supabase.rpc("chef_public_location", { p_chef_id: chef.id });
  const location = locationRows?.[0] ?? null;

  return {
    id: chef.id,
    slug: chef.slug,
    displayName: chef.display_name,
    kitchenName: chef.kitchen_name,
    bio: chef.bio,
    photoUrl: chef.photo_url,
    citySlug: city.slug,
    cityName: city.name,
    cityTimezone: city.timezone,
    neighbourhoodSlug: neighbourhood?.slug ?? null,
    neighbourhoodName: neighbourhood?.name ?? null,
    addressArea: chef.address_area,
    dietaryProfile: chef.dietary_profile,
    isVerified: chef.is_verified,
    fssaiNumber: chef.fssai_number,
    serviceRadiusKm: chef.service_radius_km,
    timings: parseTimings(chef.timings),
    isUnclaimed: chef.claimed_by === null,
    approxLat: location?.lat ?? null,
    approxLng: location?.lng ?? null,
    cuisines,
    dietaryTags,
    photos: (photoRows ?? []).map((p) => ({ url: p.url, kind: p.kind })),
    menuItems: (menuRows ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      photoUrl: m.photo_url,
      price: m.price,
      currencyCode: m.currency_code,
      unit: m.unit,
      isBestSeller: m.is_best_seller,
      isAvailable: m.is_available,
      dietary: m.dietary,
      nutrition: parseNutrition(m.nutrition),
    })),
  };
}

/** All approved chef URLs, for the sitemap. */
export async function getAllApprovedChefUrls(): Promise<
  { citySlug: string; neighbourhoodSlug: string; chefSlug: string; updatedAt: string }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chefs")
    .select("slug, updated_at, cities!inner(slug), neighbourhoods!inner(slug)")
    .eq("status", "approved");
  if (error) throw new Error(`getAllApprovedChefUrls: ${error.message}`);
  return (data ?? []).flatMap((row) => {
    const city = row.cities as unknown as { slug: string } | null;
    const hood = row.neighbourhoods as unknown as { slug: string } | null;
    if (!city || !hood) return [];
    return [
      {
        citySlug: city.slug,
        neighbourhoodSlug: hood.slug,
        chefSlug: row.slug,
        updatedAt: row.updated_at,
      },
    ];
  });
}

/** Approved chef count for a city — used on the city landing page. */
export async function getApprovedChefCount(citySlug: string): Promise<number> {
  const supabase = await createClient();
  const { data: city, error: cityError } = await supabase
    .from("cities")
    .select("id")
    .eq("slug", citySlug)
    .maybeSingle();
  if (cityError) throw new Error(`getApprovedChefCount city lookup: ${cityError.message}`);
  if (!city) return 0;

  const { count, error } = await supabase
    .from("chefs")
    .select("id", { count: "exact", head: true })
    .eq("city_id", city.id)
    .eq("status", "approved");
  if (error) throw new Error(`getApprovedChefCount: ${error.message}`);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Home-page discovery (Phase 5b)
// ---------------------------------------------------------------------------

/** Resolve a city slug to its id. Null slug means "everywhere". */
async function cityIdFor(slug: string | null | undefined): Promise<string | null> {
  if (!slug) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("cities").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

/**
 * Omni-search across kitchens, dishes, cuisines, dietary tags and areas —
 * one round trip, so the search box can suggest anything a buyer might type.
 */
export async function getSearchSuggestions(
  term: string,
  citySlug?: string | null,
  limit = 12,
): Promise<SearchSuggestion[]> {
  if (term.trim().length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_suggestions", {
    p_q: term.trim(),
    p_city: await cityIdFor(citySlug),
    p_limit: limit,
  });
  if (error) throw new Error(`getSearchSuggestions: ${error.message}`);
  return data ?? [];
}

/**
 * Paid placement. Always rendered with a visible "Promoted" label — see
 * docs/promoted-listings.md for why that is not optional.
 */
export async function getPromotedChefs(
  citySlug?: string | null,
  limit = 6,
): Promise<SearchChefResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("promoted_chefs", {
    p_city: await cityIdFor(citySlug),
    p_limit: limit,
  });
  if (error) throw new Error(`getPromotedChefs: ${error.message}`);
  return data ?? [];
}

/**
 * Trending = observed WhatsApp-click demand over the last 30 days. Not a
 * rating: CONCEPT.md rules out reviews in V1, and this is a signal we actually
 * have rather than one we'd have to invent.
 */
export async function getTrendingChefs(
  citySlug?: string | null,
  limit = 8,
): Promise<SearchChefResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trending_chefs", {
    p_city: await cityIdFor(citySlug),
    p_days: 30,
    p_limit: limit,
  });
  if (error) throw new Error(`getTrendingChefs: ${error.message}`);
  return data ?? [];
}

export interface TrendingDish {
  itemName: string;
  kitchenName: string;
  chefSlug: string;
  citySlug: string;
  neighbourhoodSlug: string | null;
  clicks: number;
}

/**
 * Dish-level equivalent of getTrendingChefs — which specific items buyers
 * tapped "Order this" for most on WhatsApp, city-wide. Same signal, one
 * level more specific. Not a rating (CONCEPT.md rules those out for V1).
 */
export async function getTrendingDishes(
  citySlug?: string | null,
  limit = 8,
): Promise<TrendingDish[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trending_dishes", {
    p_city: await cityIdFor(citySlug),
    p_days: 30,
    p_limit: limit,
  });
  if (error) throw new Error(`getTrendingDishes: ${error.message}`);
  return (data ?? []).map((row) => ({
    itemName: row.item_name,
    kitchenName: row.kitchen_name,
    chefSlug: row.chef_slug,
    citySlug: row.city_slug,
    neighbourhoodSlug: row.neighbourhood_slug,
    clicks: Number(row.clicks),
  }));
}

/**
 * Chef ids whose menu contains a dish matching free text. Used to narrow geo
 * results by keyword — a buyer searching "kori rotti" should find the kitchen
 * that cooks it even though the words appear nowhere in its name.
 */
export async function chefIdsMatchingText(term: string): Promise<Set<string>> {
  if (term.trim().length < 2) return new Set();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("chef_id")
    .ilike("name", `%${term.trim()}%`)
    .eq("is_available", true)
    .limit(500);
  if (error) {
    console.warn("chefIdsMatchingText:", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.chef_id));
}
