import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getActiveCities,
  getCityBySlug,
  getCuisines,
  getNeighbourhoodsForCity,
  getApprovedChefCount,
  searchChefs,
} from "@/lib/supabase/queries";
import { ChefCard } from "@/components/directory/ChefCard";
import { Breadcrumbs } from "@/components/directory/Breadcrumbs";
import { JsonLd } from "@/components/directory/JsonLd";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/jsonld";
import { copy } from "@/lib/copy/en";

export const revalidate = 3600;

interface CityPageProps {
  params: Promise<{ city: string }>;
}

export async function generateStaticParams() {
  // Build environments without DB access yet (a fresh CI run, a first preview
  // deploy before secrets are set) must not fail the whole build — an empty
  // list here just means zero pages are pre-rendered; each still renders on
  // first request and is cached from then on (dynamicParams defaults true).
  try {
    const cities = await getActiveCities();
    return cities.map((c) => ({ city: c.slug }));
  } catch (err) {
    console.warn("generateStaticParams([city]) skipped — DB not reachable at build time:", err);
    return [];
  }
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = await getCityBySlug(citySlug);
  if (!city) return {};

  const title = `Home chefs in ${city.name} | Zuby`;
  const description = `Verified home chefs and tiffin services in ${city.name} — browse by neighbourhood and cuisine, filter by dietary need, and order on WhatsApp.`;
  return {
    title,
    description,
    alternates: { canonical: `/${city.slug}` },
    openGraph: { title, description },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { city: citySlug } = await params;
  const city = await getCityBySlug(citySlug);
  if (!city) notFound();

  const [neighbourhoods, cuisines, chefCount, featured] = await Promise.all([
    getNeighbourhoodsForCity(city.slug),
    getCuisines(),
    getApprovedChefCount(city.slug),
    searchChefs({ lat: city.lat, lng: city.lng, maxKm: 50, citySlug: city.slug }),
  ]);

  const tagNames: Record<string, string> = {};
  const cuisineNames: Record<string, string> = Object.fromEntries(
    cuisines.map((c) => [c.slug, c.name]),
  );
  for (const chef of featured) {
    for (const slug of chef.dietary_tags) tagNames[slug] = tagNames[slug] ?? slug;
  }

  const featuredVerified = featured.filter((c) => c.is_verified).slice(0, 6);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Zuby", path: "/" },
          { name: city.name, path: `/${city.slug}` },
        ])}
      />
      {featuredVerified.length > 0 && (
        <JsonLd
          data={itemListJsonLd(
            featuredVerified.map((c) => ({
              name: c.kitchen_name,
              url: `/${city.slug}/${c.neighbourhood_slug}/${c.slug}`,
            })),
          )}
        />
      )}

      <Breadcrumbs
        crumbs={[
          { name: "Zuby", path: "/" },
          { name: city.name, path: `/${city.slug}` },
        ]}
      />

      <h1 className="mt-4 text-3xl font-bold text-sand-900">
        {copy.city.featuredHeading} {city.name}
      </h1>
      <p className="mt-1 text-sand-500">{copy.city.chefCountSuffix(chefCount)}</p>

      <div className="mt-6">
        <Link
          href="/search"
          className="inline-flex items-center justify-center rounded-full bg-zuby-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zuby-600"
        >
          {copy.landing.useLocationCta}
        </Link>
      </div>

      {neighbourhoods.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sand-500">
            {copy.city.neighbourhoodsHeading}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {neighbourhoods.map((n) => (
              <Link
                key={n.slug}
                href={`/${city.slug}/${n.slug}`}
                className="rounded-full border border-sand-200 px-4 py-2 text-sm font-medium text-sand-700 hover:border-zuby-500/50 hover:text-zuby-600"
              >
                {n.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {cuisines.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sand-500">
            {copy.city.cuisinesHeading}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {cuisines.map((cuisine) => (
              <Link
                key={cuisine.slug}
                href={`/${city.slug}/cuisine/${cuisine.slug}`}
                className="rounded-full border border-sand-200 px-4 py-2 text-sm font-medium text-sand-700 hover:border-zuby-500/50 hover:text-zuby-600"
              >
                {cuisine.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {featuredVerified.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-sand-900">
            {copy.city.featuredHeading} {city.name}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {featuredVerified.map((chef) => (
              <ChefCard key={chef.id} chef={chef} tagNames={tagNames} cuisineNames={cuisineNames} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
