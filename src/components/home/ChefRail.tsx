import { ChefCard } from "@/components/directory/ChefCard";
import { SectionHeading } from "@/components/home/SectionHeading";
import type { SearchChefResult } from "@/types/db";
import { copy } from "@/lib/copy/en";

/**
 * A titled row of chef cards — promoted, trending and near-you all render
 * through this so they stay visually identical. The only difference a buyer
 * should perceive is the heading and, for paid placement, the label.
 */
export function ChefRail({
  heading,
  note,
  chefs,
  tagNames,
  cuisineNames,
  seeAllHref,
  accent,
  promoted = false,
}: {
  heading: string;
  note?: string;
  chefs: SearchChefResult[];
  tagNames: Record<string, string>;
  cuisineNames: Record<string, string>;
  seeAllHref?: string;
  accent?: string;
  /** Renders the mandatory disclosure label on every card. */
  promoted?: boolean;
}) {
  if (chefs.length === 0) return null;

  return (
    <section className="mt-14">
      <SectionHeading title={heading} note={note} seeAllHref={seeAllHref} accent={accent} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {chefs.map((chef) => (
          <div key={chef.id} className="relative">
            {/* Disclosure is not decoration: India's ASCI code requires paid
                placement to be identifiable, and a trust-first directory that
                hides it has spent the only asset it has. Sits top-LEFT over the
                photo because the top-right corner belongs to the verified
                badge, and the two collided there. */}
            {promoted && (
              <span className="absolute left-3 top-3 z-10 rounded-full bg-sand-900/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
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
