import type { ChefDetail } from "@/lib/supabase/queries";
import type { Timings } from "@/types/schemas";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zuby.food";

/** Schema.org day-of-week tokens, in the order our timings schema uses. */
const DAY_TO_SCHEMA: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function openingHoursSpecification(timings: Timings | null) {
  if (!timings || timings.vacation) return undefined;
  const specs: { "@type": string; dayOfWeek: string; opens: string; closes: string }[] = [];
  for (const [day, schedule] of Object.entries(timings.days)) {
    if (!schedule || "closed" in schedule) continue;
    specs.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_TO_SCHEMA[day] ?? day,
      opens: schedule.open,
      closes: schedule.close,
    });
  }
  return specs.length > 0 ? specs : undefined;
}

/**
 * FoodEstablishment structured data for a chef profile. Geo is the ~100 m
 * rounded point returned by search_chefs — never the chef's exact kitchen
 * location — and no phone/contact field is emitted (ordering happens via the
 * WhatsApp button, not a published number).
 */
export function chefJsonLd(
  chef: ChefDetail,
  url: string,
  approxGeo: { lat: number; lng: number } | null,
) {
  const priceValues = chef.menuItems
    .map((m) => m.price)
    .filter((p): p is number => typeof p === "number");
  const currency = chef.menuItems.find((m) => m.currencyCode)?.currencyCode;

  return {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: chef.kitchenName,
    description: chef.bio ?? undefined,
    url,
    image: chef.photoUrl ?? undefined,
    servesCuisine: chef.cuisines.map((c) => c.name),
    address: {
      "@type": "PostalAddress",
      addressLocality: chef.neighbourhoodName ?? chef.cityName,
      addressRegion: chef.cityName,
      addressCountry: "IN",
    },
    ...(approxGeo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: approxGeo.lat,
            longitude: approxGeo.lng,
          },
        }
      : {}),
    ...(priceValues.length > 0 && currency
      ? {
          priceRange: `${currency} ${Math.min(...priceValues)}–${Math.max(...priceValues)}`,
        }
      : {}),
    ...(openingHoursSpecification(chef.timings)
      ? { openingHoursSpecification: openingHoursSpecification(chef.timings) }
      : {}),
    ...(menuJsonLd(chef.menuItems) ? { hasMenu: menuJsonLd(chef.menuItems) } : {}),
  };
}

/**
 * Menu/MenuItem structured data. Google retired the standalone menu rich
 * result in 2020, so this earns its place on entity understanding and AEO
 * (an answer engine reading "what does this kitchen serve, and at what
 * price" straight from structured data) rather than a SERP snippet — the
 * same reasoning as openingHoursSpecification above. Unavailable items are
 * left out entirely rather than marked out-of-stock: Zuby has no live
 * inventory concept, "unavailable" here usually means "off the current
 * rotation," not "sold out today."
 */
function menuJsonLd(menuItems: ChefDetail["menuItems"]) {
  const items = menuItems.filter((m) => m.isAvailable);
  if (items.length === 0) return undefined;

  return {
    "@type": "Menu",
    hasMenuItem: items.map((item) => ({
      "@type": "MenuItem",
      name: item.name,
      description: item.description ?? undefined,
      ...(typeof item.price === "number"
        ? {
            offers: {
              "@type": "Offer",
              price: item.price,
              priceCurrency: item.currencyCode,
            },
          }
        : {}),
    })),
  };
}

export interface ListedItem {
  name: string;
  url: string;
}

export function itemListJsonLd(items: ListedItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

/** Renders a JSON-LD object as a script tag's text content. Server Components only. */
export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * FAQPage — rendered alongside the visible FAQ, never instead of it. The
 * question/answer shape is the format answer engines lift most reliably
 * (docs/discoverability-strategy.md §8), so this earns its place even where
 * rich-result eligibility has narrowed.
 */
export function faqJsonLd(items: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/**
 * Organization — emitted once, site-wide, from the root layout. `sameAs` is the
 * mechanism that consolidates scattered brand mentions into a single
 * knowledge-graph entity (docs/discoverability-strategy.md §7), so profiles are
 * listed here as they come into existence rather than left to be inferred.
 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Zuby",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description:
      "Zuby is a directory of verified home chefs and tiffin services. Find home-cooked food near you and order directly on WhatsApp — no commission, no app.",
    sameAs: ["https://www.instagram.com/zuby.food"],
  };
}

/**
 * WebSite node with SearchAction — declares the site's own search endpoint so
 * engines can surface a sitelinks searchbox and so answer engines have a
 * canonical way to reference querying us.
 */
export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Zuby",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}
