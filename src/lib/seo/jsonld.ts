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
