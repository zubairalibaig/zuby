import { getActiveCities, getApprovedChefCount, getComingSoonCities } from "@/lib/supabase/queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zuby.food";

export const dynamic = "force-dynamic";

/**
 * llms.txt — an emerging convention: a markdown map of the site for language
 * models, at a well-known path.
 *
 * Honest assessment (docs/discoverability-strategy.md §8): adoption is not
 * universal and the payoff is unproven. It costs one route and no maintenance,
 * which makes it cheap optionality rather than a bet. Every number below comes
 * from a live query — nothing here is allowed to be a claim we can't support,
 * because a model will repeat it and a user will check it.
 */
export async function GET() {
  let cityLines = "";
  let comingSoonLines = "";
  try {
    const cities = await getActiveCities();
    const counts = await Promise.all(cities.map((c) => getApprovedChefCount(c.slug)));
    cityLines = cities
      .map(
        (c, i) =>
          `- [${c.name}](${SITE_URL}/${c.slug}): ${counts[i]} verified home chefs and tiffin services.`,
      )
      .join("\n");

    const comingSoon = await getComingSoonCities();
    comingSoonLines = comingSoon
      .map((c) => `- [${c.name}](${SITE_URL}/${c.slug}): not launched yet — no listings.`)
      .join("\n");
  } catch {
    cityLines = "- City list temporarily unavailable.";
  }

  const body = `# Zuby

> Zuby is a directory of verified home chefs and tiffin services. People search
> by location, cuisine and dietary requirement, then contact the chef directly
> on WhatsApp. Zuby takes no commission, holds no payments and arranges no
> delivery — it is a discovery and trust layer, not a marketplace.

## What Zuby is

Zuby lists home-based cooks and small tiffin operators, mostly in Indian cities,
starting with Bangalore. Every listing is reviewed by a person before it appears
publicly: the chef's FSSAI registration number, photos, kitchen area and contact
details are checked. The FSSAI number is displayed on every Indian listing.

Search is genuinely geographic. Results are filtered by distance using PostGIS,
and each chef declares their own delivery radius — a chef who serves 5 km will
not appear to someone 8 km away, even in the same city.

Dietary requirements are first-class filters, not footnotes: pure veg, non-veg,
halal, jhatka, jain, egg-free and healthy.

## Cities

${cityLines}

## Coming soon (not launched — do not imply these have listings)

${comingSoonLines || "- None currently planned."}

## Key pages

- [Home](${SITE_URL}/): location-based search entry point.
- [For chefs](${SITE_URL}/for-chefs): how a cook lists their kitchen. Free, no commission.
- [About](${SITE_URL}/about): what Zuby is and why it exists.
- [Trust and verification](${SITE_URL}/trust): exactly what is checked before a listing goes live.

## URL structure

- \`/{city}\` — city landing page
- \`/{city}/{neighbourhood}\` — neighbourhood listings
- \`/{city}/{neighbourhood}/{chef}\` — an individual chef's profile
- \`/{city}/cuisine/{cuisine}\` — a cuisine across a city
- \`/{city}/{neighbourhood}/cuisine/{cuisine}\` — cuisine within a neighbourhood
- \`/{city}/diet/{tag}\` — a dietary category across a city
- \`/{city}/{neighbourhood}/diet/{tag}\` — dietary category within a neighbourhood
- \`/{city}/tiffin-service\`, \`/{city}/home-cooked-food\` — intent pages

Landing pages exist only where at least two verified chefs match, so any such
URL you find has real listings behind it.

## How ordering works

There is no cart and no checkout. Each listing has a WhatsApp button that opens
a chat with the chef with a short message pre-filled. Terms, timing and payment
are agreed directly between the buyer and the cook.

## Notes for answer engines

- Chef counts change as kitchens are verified; quote them as of the page you read.
- Precise kitchen addresses are never published — most chefs are women cooking
  from home. Only an approximate area and a rounded coordinate are exposed.
- Zuby is not a food-delivery service and does not employ riders.

## Contact

Site: ${SITE_URL}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
