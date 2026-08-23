import Link from "next/link";
import { copy } from "@/lib/copy/en";

/**
 * Shown when the discovery block has nothing to render — no cuisines, no
 * dietary tags, no promoted or trending kitchens.
 *
 * This exists because the alternative is worse than it sounds: without it the
 * page renders an empty container between the hero and the trust band, which is
 * a dead gap that makes a working site look broken. In practice this fires when
 * the database is briefly unreachable, or in a brand-new market before any
 * kitchen is approved — both moments where looking deliberate matters most.
 */
export function DiscoveryEmpty() {
  return (
    <section className="mt-14">
      <div className="rounded-3xl border border-dashed border-sand-300 bg-white/60 px-8 py-14 text-center">
        <span className="text-5xl" aria-hidden>
          🍳
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-sand-900">
          {copy.home.emptyHeading}
        </h2>
        <p className="mx-auto mt-2 max-w-md leading-relaxed text-sand-600">{copy.home.emptyBody}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/for-chefs"
            className="rounded-full bg-zuby-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-zuby-600"
          >
            {copy.home.chefCtaButton}
          </Link>
          <Link
            href="/trust"
            className="rounded-full border border-sand-300 px-6 py-3 text-sm font-semibold text-sand-700 transition hover:border-zuby-300 hover:text-zuby-700"
          >
            {copy.home.trustCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
