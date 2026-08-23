import { getAllApprovedChefUrls } from "@/lib/supabase/queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zuby.food";

export const dynamic = "force-dynamic";

/**
 * Chef profiles, split out from the main sitemap (Phase 5).
 *
 * Splitting by type is what makes Search Console's coverage report legible: a
 * drop in indexed chef pages is a different problem from a drop in indexed
 * landing pages, and one combined sitemap hides which is which.
 *
 * `lastmod` comes from the row's real `updated_at`. Never `now()` — a sitemap
 * that claims everything changed today teaches Google to ignore the field.
 */
export async function GET() {
  let urls: Awaited<ReturnType<typeof getAllApprovedChefUrls>> = [];
  try {
    urls = await getAllApprovedChefUrls();
  } catch (err) {
    console.warn("sitemap-chefs partial — DB not reachable:", err);
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE_URL}/${u.citySlug}/${u.neighbourhoodSlug}/${u.chefSlug}</loc>
    <lastmod>${new Date(u.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
  });
}
