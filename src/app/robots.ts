import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zuby.food";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /search is query-string driven and duplicates the city/neighbourhood
      // pages, which are the real SEO surface; /dashboard and /admin don't
      // exist yet but are reserved for Phase 3/4; /api is never a page.
      disallow: ["/dashboard", "/admin", "/api", "/search"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
