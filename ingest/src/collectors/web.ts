import { DEFAULT_POLICY, USER_AGENT, type SourcePolicy } from "../config.js";

/**
 * A deliberately polite fetcher for PUBLIC business directory pages.
 *
 * Rules baked in, not optional:
 *  - robots.txt is fetched and obeyed; a disallowed path is skipped.
 *  - One request at a time, with a minimum delay between them.
 *  - We identify ourselves honestly (see USER_AGENT) with a contact address.
 *  - No login-walled pages, no CAPTCHA solving, no rotating identities.
 *
 * If a site blocks us, that is its answer and we take it: the run reports the
 * block and moves on. Use the `paste` collector for those sources instead.
 */

const robotsCache = new Map<string, string[]>();

async function disallowedPaths(origin: string, policy: SourcePolicy): Promise<string[]> {
  const cached = robotsCache.get(origin);
  if (cached) return cached;

  let rules: string[] = [];
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(policy.timeoutMs),
    });
    if (response.ok) {
      const text = await response.text();
      rules = parseRobots(text);
    }
  } catch {
    // No robots.txt, or unreachable — treat as "nothing explicitly disallowed",
    // which is the standard interpretation.
    rules = [];
  }
  robotsCache.set(origin, rules);
  return rules;
}

/** Collect Disallow paths that apply to us (`*` or our bot name). */
function parseRobots(text: string): string[] {
  const disallow: string[] = [];
  let applies = false;

  for (const line of text.split("\n")) {
    const trimmed = line.split("#")[0]?.trim() ?? "";
    if (!trimmed) continue;
    const [rawKey, ...rest] = trimmed.split(":");
    const key = rawKey?.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      applies = value === "*" || value.toLowerCase().includes("zuby");
    } else if (key === "disallow" && applies && value) {
      disallow.push(value);
    }
  }
  return disallow;
}

export function isAllowed(url: string, disallow: string[]): boolean {
  const path = new URL(url).pathname;
  return !disallow.some((rule) => rule !== "" && path.startsWith(rule));
}

export interface FetchResult {
  url: string;
  status: number;
  html: string | null;
  skippedReason?: "robots" | "error" | "limit";
}

/**
 * Fetch public pages one at a time, obeying robots.txt and the delay policy.
 */
export async function fetchPages(
  urls: string[],
  policy: SourcePolicy = DEFAULT_POLICY,
): Promise<FetchResult[]> {
  const results: FetchResult[] = [];
  let lastRequestAt = 0;

  for (const url of urls.slice(0, policy.maxPages)) {
    const origin = new URL(url).origin;
    const disallow = await disallowedPaths(origin, policy);

    if (!isAllowed(url, disallow)) {
      results.push({ url, status: 0, html: null, skippedReason: "robots" });
      continue;
    }

    const waitFor = policy.minDelayMs - (Date.now() - lastRequestAt);
    if (waitFor > 0) await new Promise((resolve) => setTimeout(resolve, waitFor));
    lastRequestAt = Date.now();

    try {
      const response = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: "text/html" },
        signal: AbortSignal.timeout(policy.timeoutMs),
        redirect: "follow",
      });
      const html = response.ok ? await response.text() : null;
      results.push({
        url,
        status: response.status,
        html,
        ...(response.ok ? {} : { skippedReason: "error" as const }),
      });
    } catch {
      results.push({ url, status: 0, html: null, skippedReason: "error" });
    }
  }

  return results;
}

/**
 * Pull business details out of a public listing page using Schema.org
 * structured data, which is what directories publish for search engines.
 * Returns null when a page carries no such data — we do not scrape prose.
 */
export function extractStructuredBusiness(html: string): Record<string, unknown> | null {
  const blocks = [
    ...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi),
  ];

  for (const block of blocks) {
    const body = block[1];
    if (!body) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(body.trim());
    } catch {
      continue;
    }

    const nodes: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const record = node as Record<string, unknown>;
      const type = String(record["@type"] ?? "");
      if (!/Restaurant|FoodEstablishment|LocalBusiness|Organization/i.test(type)) continue;

      const address = record["address"] as Record<string, unknown> | undefined;
      const geo = record["geo"] as Record<string, unknown> | undefined;

      const out: Record<string, unknown> = {
        kitchen_name: record["name"],
        phone: record["telephone"],
        bio: record["description"],
        cuisines: Array.isArray(record["servesCuisine"])
          ? (record["servesCuisine"] as unknown[]).join(", ")
          : record["servesCuisine"],
        area: address?.["addressLocality"] ?? address?.["streetAddress"],
        lat: geo?.["latitude"],
        lng: geo?.["longitude"],
      };
      if (out["kitchen_name"]) return out;
    }
  }
  return null;
}
