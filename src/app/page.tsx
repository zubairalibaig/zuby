import Link from "next/link";
import type { Metadata } from "next";
import { copy } from "@/lib/copy/en";
import {
  getActiveCities,
  getCuisines,
  getDietaryTags,
  getNeighbourhoodsForCity,
  getPromotedChefs,
  getTrendingChefs,
} from "@/lib/supabase/queries";
import { HomeHeader } from "@/components/home/HomeHeader";
import { CategoryTiles, type Tile } from "@/components/home/CategoryTiles";
import { ChefRail } from "@/components/home/ChefRail";

export const revalidate = 600;

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDescription,
  alternates: { canonical: "/" },
};

/** Cuisine slug → tile emoji. Falls back to a plate for anything unmapped. */
const CUISINE_EMOJI: Record<string, string> = {
  biryani: "🍛",
  "north-indian": "🫓",
  "south-indian": "🥞",
  bengali: "🐟",
  andhra: "🌶️",
  kerala: "🥥",
  maharashtrian: "🫓",
  gujarati: "🍲",
  rajasthani: "🥘",
  mangalorean: "🦐",
  hyderabadi: "🍚",
  "chinese-desi": "🍜",
  "bakes-desserts": "🧁",
  "healthy-meals": "🥗",
  "tiffin-thali": "🍱",
};

const DIETARY_EMOJI: Record<string, string> = {
  veg: "🟢",
  non_veg: "🔴",
  halal: "🌙",
  jhatka: "🗡️",
  jain: "🪷",
  egg_free: "🚫",
  healthy: "💪",
};

export default async function Home() {
  // The whole page degrades to the static shell if the DB is unreachable —
  // same posture as the other public routes, so a bad deploy never blanks it.
  let cities: Awaited<ReturnType<typeof getActiveCities>> = [];
  let cuisines: Awaited<ReturnType<typeof getCuisines>> = [];
  let dietaryTags: Awaited<ReturnType<typeof getDietaryTags>> = [];
  let neighbourhoods: Awaited<ReturnType<typeof getNeighbourhoodsForCity>> = [];
  let promoted: Awaited<ReturnType<typeof getPromotedChefs>> = [];
  let trending: Awaited<ReturnType<typeof getTrendingChefs>> = [];

  // Bangalore is the launch city; when more cities are live this becomes the
  // buyer's chosen city. It is read from data, never hardcoded as a string.
  const primaryCity = (await getActiveCities().catch(() => []))[0];
  const citySlug = primaryCity?.slug ?? "bangalore";

  try {
    [cities, cuisines, dietaryTags, neighbourhoods, promoted, trending] = await Promise.all([
      getActiveCities(),
      getCuisines(),
      getDietaryTags(),
      getNeighbourhoodsForCity(citySlug),
      getPromotedChefs(citySlug, 4),
      getTrendingChefs(citySlug, 6),
    ]);
  } catch (err) {
    console.warn("Home page data skipped — DB not reachable:", err);
  }

  const tagNames = Object.fromEntries(dietaryTags.map((t) => [t.slug, t.name]));
  const cuisineNames = Object.fromEntries(cuisines.map((c) => [c.slug, c.name]));

  const cuisineTiles: Tile[] = cuisines.map((c) => ({
    label: c.name,
    href: `/${citySlug}/cuisine/${c.slug}`,
    emoji: CUISINE_EMOJI[c.slug] ?? "🍽️",
  }));

  const dietaryTiles: Tile[] = dietaryTags.map((t) => ({
    label: t.name,
    href: `/${citySlug}/diet/${t.slug}`,
    emoji: DIETARY_EMOJI[t.slug] ?? "🍽️",
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 pb-20 pt-8">
      {/* Hero: location + search first, the way a food app opens. */}
      <section>
        <h1 className="text-3xl font-bold tracking-tight text-zuby-900 sm:text-4xl">
          {copy.home.heroHeading}
        </h1>
        <p className="mt-2 max-w-2xl text-lg text-neutral-600">{copy.home.heroSub}</p>

        <div className="mt-6">
          <HomeHeader citySlug={citySlug} neighbourhoods={neighbourhoods} />
        </div>
      </section>

      {/* Craving-first browsing */}
      {cuisineTiles.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-neutral-900">{copy.home.cravingHeading}</h2>
          <div className="mt-4">
            <CategoryTiles tiles={cuisineTiles} />
          </div>
        </section>
      )}

      {/* Dietary is Zuby's differentiator, so it gets its own row rather than
          being buried in a filter drawer. */}
      {dietaryTiles.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-neutral-900">{copy.home.dietaryHeading}</h2>
          <div className="mt-4">
            <CategoryTiles tiles={dietaryTiles} />
          </div>
        </section>
      )}

      <ChefRail
        heading={copy.home.promotedHeading}
        note={copy.home.promotedNote}
        chefs={promoted}
        tagNames={tagNames}
        cuisineNames={cuisineNames}
        promoted
      />

      <ChefRail
        heading={copy.home.trendingHeading}
        note={copy.home.trendingNote}
        chefs={trending}
        tagNames={tagNames}
        cuisineNames={cuisineNames}
        seeAllHref={`/${citySlug}`}
      />

      {neighbourhoods.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-neutral-900">{copy.home.areasHeading}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {neighbourhoods.map((n) => (
              <Link
                key={n.slug}
                href={`/${citySlug}/${n.slug}`}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-zuby-400 hover:text-zuby-600"
              >
                {n.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {cities.length > 1 && (
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {copy.home.citiesHeading}
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={`/${city.slug}`}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-zuby-500/50 hover:text-zuby-600"
              >
                {city.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Trust story stays on the page — it is the reason to use Zuby over a
          WhatsApp group, and it is what the SEO copy leans on. */}
      <section className="mt-14 grid gap-6 sm:grid-cols-3">
        {copy.landing.valueProps.map((prop) => (
          <div key={prop.title} className="rounded-2xl border border-neutral-200 p-5">
            <h3 className="font-semibold text-neutral-900">{prop.title}</h3>
            <p className="mt-1.5 text-sm text-neutral-500">{prop.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 rounded-2xl bg-neutral-50 p-8 text-center">
        <p className="text-neutral-700">{copy.landing.forChefsTeaser}</p>
        <Link
          href="/for-chefs"
          className="mt-4 inline-flex items-center justify-center rounded-full border border-zuby-500 px-5 py-2.5 text-sm font-semibold text-zuby-600 hover:bg-zuby-50"
        >
          {copy.landing.forChefsCta}
        </Link>
      </section>
    </main>
  );
}
