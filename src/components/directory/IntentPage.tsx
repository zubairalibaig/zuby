import { notFound } from "next/navigation";
import {
  getActiveCities,
  getCityBySlug,
  getCuisines,
  getDietaryTags,
  getNeighbourhoodsForCity,
} from "@/lib/supabase/queries";
import { chefsForArea, chefsForAreaDietary, qualifies } from "@/lib/seo/landings";
import { LandingPage, type RelatedLink } from "@/components/directory/LandingPage";
import { cityFaq, intentPages, type IntentSlug } from "@/lib/copy/landing";

/**
 * Intent pages (`/bangalore/tiffin-service`, `/bangalore/home-cooked-food`).
 *
 * These live at literal route segments rather than being resolved through the
 * `[neighbourhood]` slot. Next.js matches static segments before dynamic ones,
 * so there is no way for an intent page to shadow a real neighbourhood — or for
 * a neighbourhood named "tiffin-service" to shadow this.
 */
export async function renderIntentPage(citySlug: string, intent: IntentSlug) {
  const [city, cities] = await Promise.all([getCityBySlug(citySlug), getActiveCities()]);
  const centre = cities.find((c) => c.slug === citySlug);
  if (!city || !centre) notFound();

  const [chefs, cuisines, tags, hoods] = await Promise.all([
    chefsForArea(citySlug, centre),
    getCuisines(),
    getDietaryTags(),
    getNeighbourhoodsForCity(citySlug),
  ]);

  // An intent page with nothing behind it is worse than no page at all.
  if (!qualifies(chefs.length)) notFound();

  const page = intentPages[intent];

  const related: RelatedLink[] = [];
  for (const tag of tags) {
    const tagChefs = await chefsForAreaDietary(citySlug, centre, tag.slug);
    if (qualifies(tagChefs.length)) {
      related.push({
        label: `${tag.name} in ${city.name}`,
        href: `/${city.slug}/diet/${tag.slug}`,
      });
    }
  }
  for (const hood of hoods.slice(0, 8)) {
    related.push({ label: hood.name, href: `/${city.slug}/${hood.slug}` });
  }

  return (
    <LandingPage
      h1={page.title(city.name)}
      intro={[...page.intro]}
      crumbs={[
        { name: "Zuby", path: "/" },
        { name: city.name, path: `/${city.slug}` },
        { name: page.title(city.name), path: `/${city.slug}/${page.slug}` },
      ]}
      chefs={chefs}
      tagNames={Object.fromEntries(tags.map((t) => [t.slug, t.name]))}
      cuisineNames={Object.fromEntries(cuisines.map((c) => [c.slug, c.name]))}
      related={related.slice(0, 14)}
      faq={cityFaq(city.name)}
      neighbourhoodFallback={hoods[0]?.slug ?? ""}
      citySlug={city.slug}
    />
  );
}

/** Shared metadata builder for the intent routes. */
export async function intentMetadata(citySlug: string, intent: IntentSlug) {
  const [city, cities] = await Promise.all([getCityBySlug(citySlug), getActiveCities()]);
  const centre = cities.find((c) => c.slug === citySlug);
  if (!city || !centre) return {};

  const chefs = await chefsForArea(citySlug, centre);
  if (!qualifies(chefs.length)) return { robots: { index: false, follow: false } };

  const page = intentPages[intent];
  const title = page.metaTitle(city.name, chefs.length);
  const description = page.metaDescription(city.name, chefs.length);
  return {
    title,
    description,
    alternates: { canonical: `/${city.slug}/${page.slug}` },
    openGraph: { title, description },
  };
}
