import Link from "next/link";
import { ChefCard } from "@/components/directory/ChefCard";
import type { SearchChefResult } from "@/types/db";
import { copy } from "@/lib/copy/en";

/**
 * A titled row of chef cards. Used for the promoted, trending and near-you
 * sections so they stay visually identical — the only difference a buyer should
 * perceive between them is the heading and, for paid placement, the label.
 */
export function ChefRail({
  heading,
  note,
  chefs,
  tagNames,
  cuisineNames,
  seeAllHref,
  promoted = false,
}: {
  heading: string;
  note?: string;
  chefs: SearchChefResult[];
  tagNames: Record<string, string>;
  cuisineNames: Record<string, string>;
  seeAllHref?: string;
  /** Renders the mandatory disclosure label on every card. */
  promoted?: boolean;
}) {
  if (chefs.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">{heading}</h2>
          {note && <p className="mt-0.5 text-sm text-neutral-500">{note}</p>}
        </div>
        {seeAllHref && (
          <Link href={seeAllHref} className="text-sm font-medium text-zuby-600 hover:text-zuby-700">
            {copy.home.seeAll} →
          </Link>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {chefs.map((chef) => (
          <div key={chef.id} className="relative">
            {promoted && (
              // Disclosure is not decoration. India's ASCI code requires paid
              // placement to be identifiable, and a trust-first directory that
              // hides it has spent the only asset it has.
              <span className="absolute right-3 top-3 z-10 rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {copy.home.promotedBadge}
              </span>
            )}
            <ChefCard chef={chef} tagNames={tagNames} cuisineNames={cuisineNames} />
          </div>
        ))}
      </div>
    </section>
  );
}
