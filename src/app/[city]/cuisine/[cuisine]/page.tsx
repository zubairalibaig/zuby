import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCityBySlug,
  getCuisineBySlug,
  getCuisines,
  getDietaryTags,
  searchChefs,
} from "@/lib/supabase/queries";
import { ChefCard } from "@/components/directory/ChefCard";
import { Breadcrumbs } from "@/components/directory/Breadcrumbs";
import { JsonLd } from "@/components/directory/JsonLd";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/jsonld";
import { copy } from "@/lib/copy/en";

export const revalidate = 3600;

interface CuisinePageProps {
  params: Promise<{ city: string; cuisine: string }>;
}

export async function generateStaticParams({ params }: { params: { city: string } }) {
  try {
    const city = await getCityBySlug(params.city);
    if (!city) return [];
    const cuisines = await getCuisines();
    return cuisines.map((c) => ({ cuisine: c.slug }));
  } catch (err) {
    console.warn("generateStaticParams(cuisine) skipped — DB not reachable:", err);
    return [];
  }
}

export async function generateMetadata({ params }: CuisinePageProps): Promise<Metadata> {
  const { city: citySlug, cuisine: cuisineSlug } = await params;
  const [city, cuisine] = await Promise.all([
    getCityBySlug(citySlug),
    getCuisineBySlug(cuisineSlug),
  ]);
  if (!city || !cuisine) return {};

  const title = `${cuisine.name} home chefs in ${city.name} | Zuby`;
  const description = `Verified ${cuisine.name} home chefs and tiffin services in ${city.name}. Order directly on WhatsApp.`;
  return {
    title,
    description,
    alternates: { canonical: `/${city.slug}/cuisine/${cuisine.slug}` },
    openGraph: { title, description },
  };
}

export default async function CuisinePage({ params }: CuisinePageProps) {
  const { city: citySlug, cuisine: cuisineSlug } = await params;
  const [city, cuisine] = await Promise.all([
    getCityBySlug(citySlug),
    getCuisineBySlug(cuisineSlug),
  ]);
  if (!city || !cuisine) notFound();

  const [cuisines, dietaryTags, chefs] = await Promise.all([
    getCuisines(),
    getDietaryTags(),
    searchChefs({
      lat: city.lat,
      lng: city.lng,
      maxKm: 50,
      citySlug: city.slug,
      cuisineSlugs: [cuisine.slug],
    }),
  ]);

  const cuisineNames = Object.fromEntries(cuisines.map((c) => [c.slug, c.name]));
  const tagNames = Object.fromEntries(dietaryTags.map((t) => [t.slug, t.name]));

  const crumbs = [
    { name: "Zuby", path: "/" },
    { name: city.name, path: `/${city.slug}` },
    { name: cuisine.name, path: `/${city.slug}/cuisine/${cuisine.slug}` },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      {chefs.length > 0 && (
        <JsonLd
          data={itemListJsonLd(
            chefs
              .filter((c) => c.neighbourhood_slug)
              .map((c) => ({
                name: c.kitchen_name,
                url: `/${city.slug}/${c.neighbourhood_slug}/${c.slug}`,
              })),
          )}
        />
      )}

      <Breadcrumbs crumbs={crumbs} />

      <h1 className="mt-4 text-3xl font-bold text-neutral-900">
        {copy.cuisine.heading(cuisine.name, city.name)}
      </h1>

      {chefs.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-neutral-200 p-8 text-center text-neutral-500">
          {copy.cuisine.empty}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {chefs.map((chef) => (
            <ChefCard key={chef.id} chef={chef} tagNames={tagNames} cuisineNames={cuisineNames} />
          ))}
        </div>
      )}
    </main>
  );
}
