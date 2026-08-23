import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getActiveCities,
  getCityBySlug,
  getCuisines,
  getDietaryTags,
  getNeighbourhoodsForCity,
} from "@/lib/supabase/queries";
import {
  chefsForAreaDietary,
  qualifies,
  qualifyingCityDietary,
  safeParams,
} from "@/lib/seo/landings";
import { LandingPage, type RelatedLink } from "@/components/directory/LandingPage";
import { cityFaq, dietaryBlurbs, landingCopy } from "@/lib/copy/landing";

export const revalidate = 3600;

interface Props {
  params: Promise<{ city: string; dietary: string }>;
}

export async function generateStaticParams({ params }: { params: { city: string } }) {
  const combos = await safeParams("city-dietary", () => qualifyingCityDietary(params.city));
  return combos.map((c) => ({ dietary: c.key }));
}

async function load(citySlug: string, tagSlug: string) {
  const [city, tags] = await Promise.all([getCityBySlug(citySlug), getDietaryTags()]);
  const tag = tags.find((t) => t.slug === tagSlug);
  if (!city || !tag) return null;

  // getCityBySlug returns the record without coordinates in some shapes; the
  // active-cities list is the one carrying the centre point.
  const cities = await getActiveCities();
  const centre = cities.find((c) => c.slug === citySlug);
  if (!centre) return null;

  const chefs = await chefsForAreaDietary(citySlug, centre, tagSlug);
  return { city, tag, tags, chefs };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, dietary: tagSlug } = await params;
  const data = await load(citySlug, tagSlug);
  if (!data || !qualifies(data.chefs.length)) return { robots: { index: false, follow: false } };

  const { city, tag, chefs } = data;
  const title = landingCopy.cityDietary.metaTitle(chefs.length, tag.name, city.name);
  const description = landingCopy.cityDietary.metaDescription(chefs.length, tag.name, city.name);
  return {
    title,
    description,
    alternates: { canonical: `/${city.slug}/diet/${tag.slug}` },
    openGraph: { title, description },
  };
}

export default async function CityDietaryPage({ params }: Props) {
  const { city: citySlug, dietary: tagSlug } = await params;
  const data = await load(citySlug, tagSlug);
  if (!data) notFound();

  const { city, tag, tags, chefs } = data;
  if (!qualifies(chefs.length)) notFound();

  const [cuisines, hoods] = await Promise.all([getCuisines(), getNeighbourhoodsForCity(citySlug)]);

  // Cross-links: the same tag at neighbourhood level where it qualifies, plus
  // the other dietary tags that qualify city-wide.
  const related: RelatedLink[] = [];
  for (const hood of hoods) {
    const hoodChefs = await chefsForAreaDietary(citySlug, hood, tag.slug);
    if (qualifies(hoodChefs.length)) {
      related.push({
        label: `${tag.name} in ${hood.name}`,
        href: `/${city.slug}/${hood.slug}/diet/${tag.slug}`,
      });
    }
  }
  for (const other of tags) {
    if (other.slug === tag.slug) continue;
    const otherChefs = await chefsForAreaDietary(citySlug, data.city, other.slug);
    if (qualifies(otherChefs.length)) {
      related.push({
        label: `${other.name} in ${city.name}`,
        href: `/${city.slug}/diet/${other.slug}`,
      });
    }
  }

  const intro = [dietaryBlurbs[tag.slug]].filter((s): s is string => Boolean(s));

  return (
    <LandingPage
      h1={landingCopy.cityDietary.h1(chefs.length, tag.name, city.name)}
      intro={intro}
      crumbs={[
        { name: "Zuby", path: "/" },
        { name: city.name, path: `/${city.slug}` },
        { name: tag.name, path: `/${city.slug}/diet/${tag.slug}` },
      ]}
      chefs={chefs}
      tagNames={Object.fromEntries(tags.map((t) => [t.slug, t.name]))}
      cuisineNames={Object.fromEntries(cuisines.map((c) => [c.slug, c.name]))}
      related={related.slice(0, 12)}
      faq={cityFaq(city.name)}
      neighbourhoodFallback={hoods[0]?.slug ?? ""}
      citySlug={city.slug}
    />
  );
}
