import Link from "next/link";
import type { Metadata } from "next";
import { copy } from "@/lib/copy/en";
import {
  getActiveCities,
  getApprovedChefCount,
  getCuisines,
  getDietaryTags,
  getNeighbourhoodsForCity,
  getPromotedChefs,
  getTrendingChefs,
  getTrendingDishes,
} from "@/lib/supabase/queries";
import { qualifyingCityCuisines, qualifyingCityDietary } from "@/lib/seo/landings";
import { Hero } from "@/components/home/Hero";
import { TrustStrip } from "@/components/home/TrustStrip";
import { CategoryTiles, type Tile } from "@/components/home/CategoryTiles";
import { ChefRail } from "@/components/home/ChefRail";
import { PopularDishes } from "@/components/home/PopularDishes";
import { SectionHeading } from "@/components/home/SectionHeading";
import { DiscoveryEmpty } from "@/components/home/DiscoveryEmpty";
import { JsonLd } from "@/components/directory/JsonLd";
import { faqJsonLd } from "@/lib/seo/jsonld";
import { cityFaq } from "@/lib/copy/landing";

export const revalidate = 600;

/**
 * Dynamic, not the static fallback in the root layout — the title and
 * description lead with the exact phrases we most want to rank for (home
 * chef, home tiffin, tiffin service, home-cooked food) anchored to whichever
 * city is actually live, pulled from data rather than hardcoded (CLAUDE.md).
 * Falls back to the generic copy only if the DB is unreachable at request
 * time, same defensive pattern the page body already uses below.
 */
export async function generateMetadata(): Promise<Metadata> {
  const primaryCity = (await getActiveCities().catch(() => []))[0];
  if (!primaryCity) {
    return {
      title: copy.metaTitle,
      description: copy.metaDescription,
      alternates: { canonical: "/" },
    };
  }
  return {
    title: copy.homeMetaTitle(primaryCity.name),
    description: copy.homeMetaDescription(primaryCity.name),
    alternates: { canonical: "/" },
  };
}

const CUISINE_EMOJI: Record<string, string> = {
  biryani: "🍛",
  "north-indian": "🫓",
  "south-indian": "🥞",
  bengali: "🐟",
  andhra: "🌶️",
  kerala: "🥥",
  maharashtrian: "🍢",
  gujarati: "🍲",
  rajasthani: "🥘",
  mangalorean: "🦐",
  hyderabadi: "🍚",
  "chinese-desi": "🍜",
  "bakes-desserts": "🧁",
  "healthy-meals": "🥗",
  "tiffin-thali": "🍱",
  punjabi: "🧈",
  "awadhi-mughlai": "🍢",
  chettinad: "🌿",
  konkani: "🐠",
  goan: "🍤",
  parsi: "🥚",
  kashmiri: "🍲",
  sindhi: "🍛",
  "north-eastern": "🎋",
  "bihari-purvanchali": "🍥",
  continental: "🍝",
  "momos-street-food": "🥟",
  "sweets-mithai": "🍬",
  "pickles-podis": "🫙",
};

/** Dietary tones are fixed, not cycled — these carry meaning, so the colour
 *  should be stable everywhere the tag appears. */
const DIETARY_TILES: Record<string, { emoji: string; tone: string }> = {
  veg: { emoji: "🟢", tone: "from-lime-100 to-emerald-200" },
  non_veg: { emoji: "🍗", tone: "from-red-100 to-rose-200" },
  halal: { emoji: "🌙", tone: "from-emerald-100 to-teal-200" },
  jhatka: { emoji: "🔻", tone: "from-orange-100 to-red-200" },
  jain: { emoji: "🪷", tone: "from-fuchsia-100 to-purple-200" },
  egg_free: { emoji: "🚫", tone: "from-amber-100 to-orange-200" },
  healthy: { emoji: "💪", tone: "from-sky-100 to-cyan-200" },
};

export default async function Home() {
  // Every section degrades independently — a page that half-renders beats a
  // page that 500s, and the shell alone still says what Zuby is.
  let cities: Awaited<ReturnType<typeof getActiveCities>> = [];
  let cuisines: Awaited<ReturnType<typeof getCuisines>> = [];
  let dietaryTags: Awaited<ReturnType<typeof getDietaryTags>> = [];
  let neighbourhoods: Awaited<ReturnType<typeof getNeighbourhoodsForCity>> = [];
  let promoted: Awaited<ReturnType<typeof getPromotedChefs>> = [];
  let trending: Awaited<ReturnType<typeof getTrendingChefs>> = [];
  let trendingDishes: Awaited<ReturnType<typeof getTrendingDishes>> = [];
  let qualifyingCuisineSlugs = new Set<string>();
  let qualifyingDietarySlugs = new Set<string>();
  let chefCount = 0;

  const primaryCity = (await getActiveCities().catch(() => []))[0];
  const citySlug = primaryCity?.slug ?? "bangalore";
  const homeFaq = cityFaq(primaryCity?.name ?? "your city");

  try {
    let cityCuisineCombos: Awaited<ReturnType<typeof qualifyingCityCuisines>>;
    let cityDietaryCombos: Awaited<ReturnType<typeof qualifyingCityDietary>>;
    [
      cities,
      cuisines,
      dietaryTags,
      neighbourhoods,
      promoted,
      trending,
      trendingDishes,
      chefCount,
      cityCuisineCombos,
      cityDietaryCombos,
    ] = await Promise.all([
      getActiveCities(),
      getCuisines(),
      getDietaryTags(),
      getNeighbourhoodsForCity(citySlug),
      getPromotedChefs(citySlug, 4),
      getTrendingChefs(citySlug, 6),
      getTrendingDishes(citySlug, 6),
      getApprovedChefCount(citySlug),
      // Both feed the tile filters below — a tile that links to a page
      // below the 2-chef threshold would be a dead-end 404 on the home
      // page itself (that page correctly 404s below threshold; the fix
      // here is to not link to it in the first place).
      qualifyingCityCuisines(citySlug),
      qualifyingCityDietary(citySlug),
    ]);
    qualifyingCuisineSlugs = new Set(cityCuisineCombos.map((c) => c.key));
    qualifyingDietarySlugs = new Set(cityDietaryCombos.map((c) => c.key));
  } catch (err) {
    console.warn("Home page data skipped — DB not reachable:", err);
  }

  const tagNames = Object.fromEntries(dietaryTags.map((t) => [t.slug, t.name]));
  const cuisineNames = Object.fromEntries(cuisines.map((c) => [c.slug, c.name]));

  const cuisineTiles: Tile[] = cuisines
    .filter((c) => qualifyingCuisineSlugs.has(c.slug))
    .map((c) => ({
      label: c.name,
      href: `/${citySlug}/cuisine/${c.slug}`,
      emoji: CUISINE_EMOJI[c.slug] ?? "🍽️",
    }));

  const dietaryTiles: Tile[] = dietaryTags
    .filter((t) => qualifyingDietarySlugs.has(t.slug))
    .map((t) => ({
      label: t.name,
      href: `/${citySlug}/diet/${t.slug}`,
      emoji: DIETARY_TILES[t.slug]?.emoji ?? "🍽️",
      tone: DIETARY_TILES[t.slug]?.tone,
    }));

  // If every discovery section would render nothing, show one deliberate empty
  // state instead of a dead gap between the hero and the trust band.
  const hasDiscovery =
    cuisineTiles.length > 0 ||
    dietaryTiles.length > 0 ||
    promoted.length > 0 ||
    trending.length > 0 ||
    neighbourhoods.length > 0;

  return (
    <main>
      <Hero
        citySlug={citySlug}
        neighbourhoods={neighbourhoods}
        chefCount={chefCount}
        cityName={primaryCity?.name ?? "your city"}
        cityLat={primaryCity?.lat}
        cityLng={primaryCity?.lng}
      />

      <div className="mx-auto max-w-6xl px-5">
        {!hasDiscovery && <DiscoveryEmpty />}

        {cuisineTiles.length > 0 && (
          <section className="mt-14">
            <SectionHeading title={copy.home.cravingHeading} />
            <div className="mt-6">
              <CategoryTiles tiles={cuisineTiles} />
            </div>
          </section>
        )}

        {/* Dietary gets its own row, not a filter drawer — it's the thing Zuby
            does that a WhatsApp group can't. */}
        {dietaryTiles.length > 0 && (
          <section className="mt-14">
            <SectionHeading title={copy.home.dietaryHeading} accent="bg-leaf-500" />
            <div className="mt-6">
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
          accent="bg-saffron-500"
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

        <PopularDishes dishes={trendingDishes} />

        {neighbourhoods.length > 0 && (
          <section className="mt-14">
            <SectionHeading title={copy.home.areasHeading} accent="bg-sand-400" />
            <div className="mt-6 flex flex-wrap gap-2.5">
              {neighbourhoods.map((n) => (
                <Link
                  key={n.slug}
                  href={`/${citySlug}/${n.slug}`}
                  className="rounded-full border border-sand-200 bg-white px-4 py-2.5 text-sm font-semibold text-sand-700 shadow-sm transition hover:-translate-y-0.5 hover:border-zuby-300 hover:text-zuby-700 hover:shadow-md"
                >
                  {n.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="mt-16">
        <TrustStrip />
      </div>

      <div className="mx-auto max-w-6xl px-5">
        <section className="mt-16">
          <SectionHeading title={copy.home.howHeading} />
          <ol className="mt-8 grid gap-5 sm:grid-cols-3">
            {copy.home.howSteps.map((step) => (
              <li
                key={step.n}
                className="relative rounded-2xl border border-sand-200 bg-white p-6 shadow-sm"
              >
                <span className="absolute -top-4 left-6 flex h-9 w-9 items-center justify-center rounded-full bg-zuby-500 text-sm font-bold text-white shadow-md">
                  {step.n}
                </span>
                <h3 className="mt-3 font-bold text-sand-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-sand-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Rendered as FAQPage JSON-LD too — the direct-answer, one-question-
            per-heading shape is what answer engines lift most reliably
            (docs/discoverability-strategy.md §8), and the home page is the
            highest-traffic surface with none of this before now. */}
        <section className="mt-14">
          <JsonLd data={faqJsonLd(homeFaq)} />
          <SectionHeading title={copy.home.faqHeading} accent="bg-sand-400" />
          <dl className="mt-6 grid gap-6 sm:grid-cols-2">
            {homeFaq.map((item) => (
              <div key={item.q}>
                <dt className="font-semibold text-sand-900">{item.q}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-sand-600">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {cities.length > 1 && (
          <section className="mt-14">
            <SectionHeading title={copy.home.citiesHeading} accent="bg-sand-400" />
            <div className="mt-6 flex flex-wrap gap-2.5">
              {cities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/${city.slug}`}
                  className="rounded-full border border-sand-200 bg-white px-4 py-2.5 text-sm font-semibold text-sand-700 shadow-sm transition hover:border-zuby-300 hover:text-zuby-700"
                >
                  {city.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Supply-side CTA. The directory only works if chefs join, so this is a
            real block rather than a grey footnote. */}
        <section className="mt-16 overflow-hidden rounded-3xl bg-gradient-to-br from-zuby-500 via-zuby-600 to-zuby-800 shadow-lg">
          <div className="relative px-7 py-12 sm:px-12 sm:py-14">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-8 select-none text-[10rem] opacity-15"
            >
              👩‍🍳
            </span>
            <div className="relative max-w-xl">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {copy.home.chefCtaTitle}
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-zuby-50/90">
                {copy.home.chefCtaBody}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/for-chefs"
                  className="rounded-full bg-white px-6 py-3 text-base font-bold text-zuby-700 shadow-sm transition hover:bg-zuby-50"
                >
                  {copy.home.chefCtaButton}
                </Link>
                <Link
                  href="/login"
                  className="rounded-full px-6 py-3 text-base font-semibold text-white ring-1 ring-inset ring-white/40 transition hover:bg-white/10"
                >
                  {copy.home.chefCtaSecondary}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
