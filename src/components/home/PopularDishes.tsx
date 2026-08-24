import Link from "next/link";
import type { TrendingDish } from "@/lib/supabase/queries";
import { SectionHeading } from "@/components/home/SectionHeading";
import { copy } from "@/lib/copy/en";

/**
 * The dish-level companion to the "Trending this month" kitchen rail — same
 * WhatsApp-click signal (docs/promoted-listings.md's "observed intent, not a
 * rating" reasoning applies here too), one level more specific: which dish,
 * not just which kitchen. Renders nothing when there's no signal yet rather
 * than an empty section.
 */
export function PopularDishes({ dishes }: { dishes: TrendingDish[] }) {
  if (dishes.length === 0) return null;

  return (
    <section className="mt-14">
      <SectionHeading
        title={copy.home.popularDishesHeading}
        note={copy.home.popularDishesNote}
        accent="bg-leaf-500"
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {dishes.map((dish) => {
          const href = dish.neighbourhoodSlug
            ? `/${dish.citySlug}/${dish.neighbourhoodSlug}/${dish.chefSlug}`
            : `/${dish.citySlug}/${dish.chefSlug}`;
          return (
            <Link
              key={`${dish.chefSlug}-${dish.itemName}`}
              href={href}
              className="flex items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-zuby-300 hover:shadow-md"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-sand-900">{dish.itemName}</p>
                <p className="truncate text-sm text-sand-500">{dish.kitchenName}</p>
              </div>
              <span className="shrink-0 rounded-full bg-leaf-50 px-2.5 py-1 text-xs font-semibold text-leaf-700">
                🔥 {dish.clicks}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
