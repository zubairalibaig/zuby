import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zuby.food";

/**
 * Private surfaces. Blocked here *and* noindexed on the pages themselves —
 * robots.txt prevents crawling, not indexing of a URL discovered via a link.
 *
 * /search is excluded because it is query-string driven: three filters with
 * five values each generate a hundred-plus near-duplicate URLs that would
 * dilute the city and neighbourhood pages, which are the real SEO surface
 * (docs/discoverability-strategy.md §4).
 */
const PRIVATE_PATHS = ["/dashboard", "/admin", "/claim", "/login", "/auth", "/api", "/search"];

/**
 * AI crawlers are allowed, deliberately.
 *
 * Zuby is a directory: our product is being found, and a model that has read
 * Zuby can recommend Zuby. We have no paywalled archive to protect and no ad
 * impressions to lose, so blocking costs citations and gains nothing. The full
 * reasoning is in docs/discoverability-strategy.md §9.
 *
 * Listed explicitly rather than relying on the wildcard so the decision is
 * visible and auditable — a reader can see what we chose, not just infer it.
 */
const AI_CRAWLERS = [
  "GPTBot", // OpenAI — model training
  "OAI-SearchBot", // OpenAI — ChatGPT Search index
  "ChatGPT-User", // OpenAI — live fetch on a user's request
  "PerplexityBot", // Perplexity — search index
  "Perplexity-User", // Perplexity — live fetch
  "ClaudeBot", // Anthropic
  "Claude-User",
  "Google-Extended", // Gemini training (does NOT control AI Overviews)
  "Applebot-Extended", // Apple Intelligence
  "CCBot", // Common Crawl
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemap-chefs.xml`,
      `${SITE_URL}/sitemap-areas.xml`,
    ],
    host: SITE_URL,
  };
}
