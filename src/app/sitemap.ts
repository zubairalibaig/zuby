import type { MetadataRoute } from "next";
import {
  getActiveCities,
  getAllApprovedChefUrls,
  getComingSoonCities,
  getCuisines,
  getNeighbourhoodsForCity,
} from "@/lib/supabase/queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zuby.food";

/**
 * Built entirely from the database (ARCHITECTURE.md §4) — never lists a
 * non-approved chef, since getAllApprovedChefUrls() filters at the query
 * layer, not just at render time.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/for-chefs`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/trust`, changeFrequency: "monthly", priority: 0.6 },
  ];

  // Same build-time resilience as generateStaticParams (see [city]/page.tsx):
  // an unconfigured/unreachable DB yields the two static entries above rather
  // than failing the build. The real sitemap re-generates on every request in
  // production once Supabase is configured (this route is always dynamic).
  let cities: Awaited<ReturnType<typeof getActiveCities>> = [];
  let cuisines: Awaited<ReturnType<typeof getCuisines>> = [];
  let chefUrls: Awaited<ReturnType<typeof getAllApprovedChefUrls>> = [];
  let comingSoonCities: Awaited<ReturnType<typeof getComingSoonCities>> = [];
  try {
    [cities, cuisines, chefUrls, comingSoonCities] = await Promise.all([
      getActiveCities(),
      getCuisines(),
      getAllApprovedChefUrls(),
      getComingSoonCities(),
    ]);
  } catch (err) {
    console.warn("sitemap() partial — DB not reachable:", err);
  }

  // Pan-India "coming soon" pages (docs/discoverability-strategy.md §13) —
  // real, indexable content at a lower priority than a live city, monthly
  // rather than daily since nothing on them changes until a real launch.
  for (const city of comingSoonCities) {
    entries.push({ url: `${SITE_URL}/${city.slug}`, changeFrequency: "monthly", priority: 0.4 });
  }

  for (const city of cities) {
    entries.push({ url: `${SITE_URL}/${city.slug}`, changeFrequency: "daily", priority: 0.9 });

    for (const cuisine of cuisines) {
      entries.push({
        url: `${SITE_URL}/${city.slug}/cuisine/${cuisine.slug}`,
        changeFrequency: "daily",
        priority: 0.6,
      });
    }

    const neighbourhoods = await getNeighbourhoodsForCity(city.slug);
    for (const n of neighbourhoods) {
      entries.push({
        url: `${SITE_URL}/${city.slug}/${n.slug}`,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  }

  for (const chef of chefUrls) {
    entries.push({
      url: `${SITE_URL}/${chef.citySlug}/${chef.neighbourhoodSlug}/${chef.chefSlug}`,
      lastModified: new Date(chef.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
