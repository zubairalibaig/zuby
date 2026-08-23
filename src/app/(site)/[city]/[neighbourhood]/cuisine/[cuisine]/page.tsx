import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCityBySlug,
  getCuisineBySlug,
  getCuisines,
  getDietaryTags,
  getNeighbourhoodBySlug,
} from "@/lib/supabase/queries";
import {
  chefsForNeighbourhoodCuisine,
  qualifies,
  qualifyingNeighbourhoodCuisines,
  safeParams,
} from "@/lib/seo/landings";
import { LandingPage, type RelatedLink } from "@/components/directory/LandingPage";
import { cuisineBlurbs, landingCopy, neighbourhoodBlurbs } from "@/lib/copy/landing";

export const revalidate = 3600;

interface Props {
  params: Promise<{ city: string; neighbourhood: string; cuisine: string }>;
}

export async function generateStaticParams({ params }: { params: { city: string } }) {
  const combos = await safeParams("neighbourhood-cuisine", () =>
    qualifyingNeighbourhoodCuisines(params.city),
  );
  return combos.map((c) => ({ neighbourhood: c.neighbourhoodSlug!, cuisine: c.key }));
}

/** Resolve everything both metadata and the page body need, once. */
async function load(citySlug: string, hoodSlug: string, cuisineSlug: string) {
  const [city, hood, cuisine] = await Promise.all([
    getCityBySlug(citySlug),
    getNeighbourhoodBySlug(citySlug, hoodSlug),
    getCuisineBySlug(cuisineSlug),
  ]);
  if (!city || !hood || !cuisine) return null;
  const chefs = await chefsForNeighbourhoodCuisine(citySlug, hood, cuisineSlug);
  return { city, hood, cuisine, chefs };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, neighbourhood: hoodSlug, cuisine: cuisineSlug } = await params;
  const data = await load(citySlug, hoodSlug, cuisineSlug);
  // Below threshold this page 404s, so it must not advertise itself either.
  if (!data || !qualifies(data.chefs.length)) return { robots: { index: false, follow: false } };

  const { city, hood, cuisine, chefs } = data;
  const title = landingCopy.neighbourhoodCuisine.metaTitle(
    chefs.length,
    cuisine.name,
    hood.name,
    city.name,
  );
  const description = landingCopy.neighbourhoodCuisine.metaDescription(
    chefs.length,
    cuisine.name,
    hood.name,
  );
  return {
    title,
    description,
    alternates: { canonical: `/${city.slug}/${hood.slug}/cuisine/${cuisine.slug}` },
    openGraph: { title, description },
  };
}

export default async function NeighbourhoodCuisinePage({ params }: Props) {
  const { city: citySlug, neighbourhood: hoodSlug, cuisine: cuisineSlug } = await params;
  const data = await load(citySlug, hoodSlug, cuisineSlug);
  if (!data) notFound();

  const { city, hood, cuisine, chefs } = data;
  // The threshold rule: a one-chef page duplicates that chef's own profile and
  // is exactly the doorway pattern we must not create. 404, never a thin page.
  if (!qualifies(chefs.length)) notFound();

  const [cuisines, dietaryTags] = await Promise.all([getCuisines(), getDietaryTags()]);

  // Cross-links: other cuisines that also qualify in this neighbourhood, plus
  // the same cuisine's city-wide page. Equity flows and crawlers find siblings.
  const related: RelatedLink[] = [];
  for (const other of cuisines) {
    if (other.slug === cuisine.slug) continue;
    const otherChefs = await chefsForNeighbourhoodCuisine(citySlug, hood, other.slug);
    if (qualifies(otherChefs.length)) {
      related.push({
        label: `${other.name} in ${hood.name}`,
        href: `/${city.slug}/${hood.slug}/cuisine/${other.slug}`,
      });
    }
  }
  related.push({
    label: `${cuisine.name} across ${city.name}`,
    href: `/${city.slug}/cuisine/${cuisine.slug}`,
  });
  related.push({ label: `All chefs in ${hood.name}`, href: `/${city.slug}/${hood.slug}` });

  const intro = [
    cuisineBlurbs[cuisine.slug],
    neighbourhoodBlurbs[`${city.slug}/${hood.slug}`],
  ].filter((s): s is string => Boolean(s));

  return (
    <LandingPage
      h1={landingCopy.neighbourhoodCuisine.h1(chefs.length, cuisine.name, hood.name)}
      intro={intro}
      crumbs={[
        { name: "Zuby", path: "/" },
        { name: city.name, path: `/${city.slug}` },
        { name: hood.name, path: `/${city.slug}/${hood.slug}` },
        { name: cuisine.name, path: `/${city.slug}/${hood.slug}/cuisine/${cuisine.slug}` },
      ]}
      chefs={chefs}
      tagNames={Object.fromEntries(dietaryTags.map((t) => [t.slug, t.name]))}
      cuisineNames={Object.fromEntries(cuisines.map((c) => [c.slug, c.name]))}
      related={related.slice(0, 12)}
      neighbourhoodFallback={hood.slug}
      citySlug={city.slug}
    />
  );
}
