import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCityBySlug,
  getNeighbourhoodBySlug,
  getNeighbourhoodsForCity,
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

interface NeighbourhoodPageProps {
  params: Promise<{ city: string; neighbourhood: string }>;
}

export async function generateStaticParams({ params }: { params: { city: string } }) {
  try {
    const neighbourhoods = await getNeighbourhoodsForCity(params.city);
    return neighbourhoods.map((n) => ({ neighbourhood: n.slug }));
  } catch (err) {
    console.warn("generateStaticParams([neighbourhood]) skipped — DB not reachable:", err);
    return [];
  }
}

export async function generateMetadata({ params }: NeighbourhoodPageProps): Promise<Metadata> {
  const { city: citySlug, neighbourhood: neighbourhoodSlug } = await params;
  const [city, neighbourhood] = await Promise.all([
    getCityBySlug(citySlug),
    getNeighbourhoodBySlug(citySlug, neighbourhoodSlug),
  ]);
  if (!city || !neighbourhood) return {};

  const title = `Home chefs in ${neighbourhood.name}, ${city.name} | Zuby`;
  const description = `Verified home chefs and tiffin services in ${neighbourhood.name}, ${city.name}. Filter by halal, jain, veg, jhatka or egg-free and order on WhatsApp.`;
  return {
    title,
    description,
    alternates: { canonical: `/${city.slug}/${neighbourhood.slug}` },
    openGraph: { title, description },
  };
}

export default async function NeighbourhoodPage({ params }: NeighbourhoodPageProps) {
  const { city: citySlug, neighbourhood: neighbourhoodSlug } = await params;
  const [city, neighbourhood] = await Promise.all([
    getCityBySlug(citySlug),
    getNeighbourhoodBySlug(citySlug, neighbourhoodSlug),
  ]);
  if (!city || !neighbourhood) notFound();

  const [cuisines, dietaryTags, chefs] = await Promise.all([
    getCuisines(),
    getDietaryTags(),
    // Wide radius: a chef's OWN service_radius_km still gates whether they
    // cover this neighbourhood's centre — we just need to not clip early.
    searchChefs({ lat: neighbourhood.lat, lng: neighbourhood.lng, maxKm: 50, citySlug: city.slug }),
  ]);

  const cuisineNames = Object.fromEntries(cuisines.map((c) => [c.slug, c.name]));
  const tagNames = Object.fromEntries(dietaryTags.map((t) => [t.slug, t.name]));

  const crumbs = [
    { name: "Zuby", path: "/" },
    { name: city.name, path: `/${city.slug}` },
    { name: neighbourhood.name, path: `/${city.slug}/${neighbourhood.slug}` },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      {chefs.length > 0 && (
        <JsonLd
          data={itemListJsonLd(
            chefs.map((c) => ({
              name: c.kitchen_name,
              url: `/${city.slug}/${c.neighbourhood_slug ?? neighbourhood.slug}/${c.slug}`,
            })),
          )}
        />
      )}

      <Breadcrumbs crumbs={crumbs} />

      <h1 className="mt-4 text-3xl font-bold text-neutral-900">
        {copy.neighbourhood.heading(neighbourhood.name)}
      </h1>

      {chefs.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-neutral-200 p-8 text-center">
          <p className="text-neutral-500">{copy.neighbourhood.empty}</p>
          <Link href="/search" className="mt-3 inline-block text-sm font-medium text-zuby-600">
            {copy.neighbourhood.searchNearbyLink}
          </Link>
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
