import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCityBySlug,
  getCuisines,
  getDietaryTags,
  getNeighbourhoodBySlug,
} from "@/lib/supabase/queries";
import {
  chefsForAreaDietary,
  qualifies,
  qualifyingNeighbourhoodDietary,
  safeParams,
} from "@/lib/seo/landings";
import { LandingPage, type RelatedLink } from "@/components/directory/LandingPage";
import { dietaryBlurbs, landingCopy, neighbourhoodBlurbs } from "@/lib/copy/landing";

export const revalidate = 3600;

interface Props {
  params: Promise<{ city: string; neighbourhood: string; dietary: string }>;
}

export async function generateStaticParams({ params }: { params: { city: string } }) {
  const combos = await safeParams("neighbourhood-dietary", () =>
    qualifyingNeighbourhoodDietary(params.city),
  );
  return combos.map((c) => ({ neighbourhood: c.neighbourhoodSlug!, dietary: c.key }));
}

async function load(citySlug: string, hoodSlug: string, tagSlug: string) {
  const [city, hood, tags] = await Promise.all([
    getCityBySlug(citySlug),
    getNeighbourhoodBySlug(citySlug, hoodSlug),
    getDietaryTags(),
  ]);
  const tag = tags.find((t) => t.slug === tagSlug);
  if (!city || !hood || !tag) return null;
  const chefs = await chefsForAreaDietary(citySlug, hood, tagSlug);
  return { city, hood, tag, tags, chefs };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, neighbourhood: hoodSlug, dietary: tagSlug } = await params;
  const data = await load(citySlug, hoodSlug, tagSlug);
  if (!data || !qualifies(data.chefs.length)) return { robots: { index: false, follow: false } };

  const { city, hood, tag, chefs } = data;
  const title = landingCopy.neighbourhoodDietary.metaTitle(
    chefs.length,
    tag.name,
    hood.name,
    city.name,
  );
  const description = landingCopy.neighbourhoodDietary.metaDescription(
    chefs.length,
    tag.name,
    hood.name,
  );
  return {
    title,
    description,
    alternates: { canonical: `/${city.slug}/${hood.slug}/diet/${tag.slug}` },
    openGraph: { title, description },
  };
}

export default async function NeighbourhoodDietaryPage({ params }: Props) {
  const { city: citySlug, neighbourhood: hoodSlug, dietary: tagSlug } = await params;
  const data = await load(citySlug, hoodSlug, tagSlug);
  if (!data) notFound();

  const { city, hood, tag, tags, chefs } = data;
  if (!qualifies(chefs.length)) notFound();

  const cuisines = await getCuisines();

  const related: RelatedLink[] = [];
  for (const other of tags) {
    if (other.slug === tag.slug) continue;
    const otherChefs = await chefsForAreaDietary(citySlug, hood, other.slug);
    if (qualifies(otherChefs.length)) {
      related.push({
        label: `${other.name} in ${hood.name}`,
        href: `/${city.slug}/${hood.slug}/diet/${other.slug}`,
      });
    }
  }
  related.push({
    label: `${tag.name} across ${city.name}`,
    href: `/${city.slug}/diet/${tag.slug}`,
  });
  related.push({ label: `All chefs in ${hood.name}`, href: `/${city.slug}/${hood.slug}` });

  const intro = [dietaryBlurbs[tag.slug], neighbourhoodBlurbs[`${city.slug}/${hood.slug}`]].filter(
    (s): s is string => Boolean(s),
  );

  return (
    <LandingPage
      h1={landingCopy.neighbourhoodDietary.h1(chefs.length, tag.name, hood.name)}
      intro={intro}
      crumbs={[
        { name: "Zuby", path: "/" },
        { name: city.name, path: `/${city.slug}` },
        { name: hood.name, path: `/${city.slug}/${hood.slug}` },
        { name: tag.name, path: `/${city.slug}/${hood.slug}/diet/${tag.slug}` },
      ]}
      chefs={chefs}
      tagNames={Object.fromEntries(tags.map((t) => [t.slug, t.name]))}
      cuisineNames={Object.fromEntries(cuisines.map((c) => [c.slug, c.name]))}
      related={related.slice(0, 12)}
      neighbourhoodFallback={hood.slug}
      citySlug={city.slug}
    />
  );
}
