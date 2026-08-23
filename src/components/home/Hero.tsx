import { HomeHeader } from "@/components/home/HomeHeader";
import type { NeighbourhoodRecord } from "@/lib/supabase/queries";
import { copy } from "@/lib/copy/en";

/**
 * The hero. Three jobs, in order: say what this is, let someone search, and
 * look like food.
 *
 * The decoration is soft CSS gradient orbs, not emoji. Emoji at low opacity
 * lose their shape and read as artefacts someone forgot to delete; abstract
 * warm shapes read as a deliberate design language. They also cost nothing —
 * no image request on a 4G phone, which is the device the budget is written for.
 */
export function Hero({
  citySlug,
  neighbourhoods,
  chefCount,
  cityName,
}: {
  citySlug: string;
  neighbourhoods: NeighbourhoodRecord[];
  chefCount: number;
  cityName: string;
}) {
  return (
    <section className="hero-warm relative overflow-hidden border-b border-sand-200">
      {/* Texture. Kept clear of the search card, and out of the way entirely on
          small screens where there is no room to spare. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden select-none overflow-hidden lg:block"
      >
        <span className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gradient-to-br from-zuby-300/45 to-zuby-500/25 blur-2xl" />
        <span className="absolute right-40 top-24 h-40 w-40 rounded-full bg-gradient-to-br from-saffron-300/40 to-zuby-400/20 blur-xl" />
        <span className="absolute -right-4 top-60 h-24 w-24 rounded-full bg-leaf-200/35 blur-lg" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-12 sm:pt-16">
        {chefCount > 0 && (
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-zuby-200 bg-white/70 px-3.5 py-1.5 text-sm font-medium text-zuby-800 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf-500" />
            </span>
            {copy.home.liveBadge(chefCount, cityName)}
          </p>
        )}

        <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-zuby-950 sm:text-5xl lg:text-6xl">
          {copy.home.heroLine1}
          <br className="hidden sm:block" />
          <span className="text-zuby-600"> {copy.home.heroLine2}</span>
        </h1>

        <p className="mt-4 max-w-xl text-lg leading-relaxed text-sand-600">{copy.home.heroSub}</p>

        {/* The search card is the hero's real subject — elevated so it reads as
            the thing to do, not as a field in a form. */}
        <div className="mt-8 rounded-3xl border border-sand-200 bg-white/90 p-4 shadow-[0_8px_30px_rgba(92,34,0,0.07)] backdrop-blur sm:p-5">
          <HomeHeader citySlug={citySlug} neighbourhoods={neighbourhoods} />
        </div>
      </div>
    </section>
  );
}
