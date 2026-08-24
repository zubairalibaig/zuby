import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getActiveCities,
  getCityBySlug,
  getCuisineBySlug,
  getCuisines,
  getDietaryTags,
  getNeighbourhoodsForCity,
} from "@/lib/supabase/queries";
import {
  chefsForAreaDietary,
  chefsForCityCuisine,
  chefsForNeighbourhoodCuisine,
  qualifies,
  qualifyingCityCuisines,
  safeParams,
} from "@/lib/seo/landings";
import { LandingPage, type RelatedLink } from "@/components/directory/LandingPage";
import { cityFaq, cuisineBlurbs, landingCopy } from "@/lib/copy/landing";

export const revalidate = 3600;

interface Props {
  params: Promise<{ city: string; cuisine: string }>;
}

export async function generateStaticParams({ params }: { params: { city: string } }) {
  const combos = await safeParams("city-cuisine", () => qualifyingCityCuisines(params.city));
  return combos.map((c) => ({ cuisine: c.key }));
}

/** Resolve everything both metadata and the page body need, once. */
async function load(citySlug: string, cuisineSlug: string) {
  const [city, cuisine] = await Promise.all([
    getCityBySlug(citySlug),
    getCuisineBySlug(cuisineSlug),
  ]);
  if (!city || !cuisine) return null;

  // getCityBySlug's shape doesn't carry the centre point in every call site;
  // the active-cities list is the one that does (same pattern as the city ×
  // dietary page).
  const cities = await getActiveCities();
  const centre = cities.find((c) => c.slug === citySlug);
  if (!centre) return null;

  const chefs = await chefsForCityCuisine(citySlug, centre, cuisineSlug);
  return { city, cuisine, chefs };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, cuisine: cuisineSlug } = await params;
  const data = await load(citySlug, cuisineSlug);
  // Below threshold this page 404s, so it must not advertise itself either.
  if (!data || !qualifies(data.chefs.length)) return { robots: { index: false, follow: false } };

  const { city, cuisine, chefs } = data;
  const title = landingCopy.cityCuisine.metaTitle(chefs.length, cuisine.name, city.name);
  const description = landingCopy.cityCuisine.metaDescription(
    chefs.length,
    cuisine.name,
    city.name,
  );
  return {
    title,
    description,
    alternates: { canonical: `/${city.slug}/cuisine/${cuisine.slug}` },
    openGraph: { title, description },
  };
}

export default async function CuisinePage({ params }: Props) {
  const { city: citySlug, cuisine: cuisineSlug } = await params;
  const data = await load(citySlug, cuisineSlug);
  if (!data) notFound();

  const { city, cuisine, chefs } = data;
  // The threshold rule: a one-chef page duplicates that chef's own profile
  // and is exactly the doorway pattern we must not create. 404, never a thin
  // page (docs/discoverability-strategy.md §5).
  if (!qualifies(chefs.length)) notFound();

  const [cuisines, dietaryTags, hoods] = await Promise.all([
    getCuisines(),
    getDietaryTags(),
    getNeighbourhoodsForCity(citySlug),
  ]);

  // Cross-links: the same cuisine at neighbourhood level where it qualifies,
  // plus the other cuisines that qualify city-wide, plus this cuisine
  // crossed with dietary tags that also qualify. Equity flows and crawlers
  // find siblings.
  const related: RelatedLink[] = [];
  for (const hood of hoods) {
    const hoodChefs = await chefsForNeighbourhoodCuisine(citySlug, hood, cuisine.slug);
    if (qualifies(hoodChefs.length)) {
      related.push({
        label: `${cuisine.name} in ${hood.name}`,
        href: `/${city.slug}/${hood.slug}/cuisine/${cuisine.slug}`,
      });
    }
  }
  for (const other of cuisines) {
    if (other.slug === cuisine.slug) continue;
    const otherChefs = await chefsForCityCuisine(citySlug, city, other.slug);
    if (qualifies(otherChefs.length)) {
      related.push({
        label: `${other.name} in ${city.name}`,
        href: `/${city.slug}/cuisine/${other.slug}`,
      });
    }
  }
  for (const tag of dietaryTags) {
    const tagChefs = await chefsForAreaDietary(citySlug, city, tag.slug);
    if (qualifies(tagChefs.length)) {
      related.push({
        label: `${tag.name} in ${city.name}`,
        href: `/${city.slug}/diet/${tag.slug}`,
      });
    }
  }

  const intro = [cuisineBlurbs[cuisine.slug]].filter((s): s is string => Boolean(s));

  return (
    <LandingPage
      h1={landingCopy.cityCuisine.h1(chefs.length, cuisine.name, city.name)}
      intro={intro}
      crumbs={[
        { name: "Zuby", path: "/" },
        { name: city.name, path: `/${city.slug}` },
        { name: cuisine.name, path: `/${city.slug}/cuisine/${cuisine.slug}` },
      ]}
      chefs={chefs}
      tagNames={Object.fromEntries(dietaryTags.map((t) => [t.slug, t.name]))}
      cuisineNames={Object.fromEntries(cuisines.map((c) => [c.slug, c.name]))}
      related={related.slice(0, 12)}
      faq={cityFaq(city.name)}
      neighbourhoodFallback={hoods[0]?.slug ?? ""}
      citySlug={city.slug}
    />
  );
}
