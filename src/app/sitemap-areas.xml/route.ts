import { getActiveCities, getCuisines, getDietaryTags } from "@/lib/supabase/queries";
import {
  qualifyingCityDietary,
  qualifyingNeighbourhoodCuisines,
  qualifyingNeighbourhoodDietary,
} from "@/lib/seo/landings";
import { intentPages } from "@/lib/copy/landing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zuby.food";

export const dynamic = "force-dynamic";

interface Entry {
  loc: string;
  priority: number;
}

/**
 * Programmatic landing pages (Phase 5).
 *
 * Every URL here comes from the same `qualifying*` helpers the routes use, so
 * the sitemap cannot advertise a page that would 404 — the classic way a
 * threshold rule gets enforced in the page but forgotten in the sitemap, which
 * then teaches Google that our URLs are unreliable.
 */
export async function GET() {
  const entries: Entry[] = [];

  try {
    const cities = await getActiveCities();
    const [cuisines, tags] = await Promise.all([getCuisines(), getDietaryTags()]);
    const cuisineNames = new Set(cuisines.map((c) => c.slug));
    const tagNames = new Set(tags.map((t) => t.slug));

    for (const city of cities) {
      for (const intent of Object.values(intentPages)) {
        entries.push({ loc: `${SITE_URL}/${city.slug}/${intent.slug}`, priority: 0.8 });
      }

      const [hoodCuisine, cityDietary, hoodDietary] = await Promise.all([
        qualifyingNeighbourhoodCuisines(city.slug),
        qualifyingCityDietary(city.slug),
        qualifyingNeighbourhoodDietary(city.slug),
      ]);

      for (const c of hoodCuisine) {
        if (!cuisineNames.has(c.key)) continue;
        entries.push({
          loc: `${SITE_URL}/${c.citySlug}/${c.neighbourhoodSlug}/cuisine/${c.key}`,
          priority: 0.7,
        });
      }
      for (const c of cityDietary) {
        if (!tagNames.has(c.key)) continue;
        entries.push({ loc: `${SITE_URL}/${c.citySlug}/diet/${c.key}`, priority: 0.8 });
      }
      for (const c of hoodDietary) {
        if (!tagNames.has(c.key)) continue;
        entries.push({
          loc: `${SITE_URL}/${c.citySlug}/${c.neighbourhoodSlug}/diet/${c.key}`,
          priority: 0.7,
        });
      }
    }
  } catch (err) {
    console.warn("sitemap-areas partial — DB not reachable:", err);
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${e.loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
  });
}
