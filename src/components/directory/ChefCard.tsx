import Image from "next/image";
import Link from "next/link";
import type { SearchChefResult } from "@/types/db";
import { TagChip } from "@/components/directory/TagChip";
import { VerifiedBadge } from "@/components/directory/VerifiedBadge";
import { copy } from "@/lib/copy/en";

interface ChefCardProps {
  chef: SearchChefResult;
  tagNames: Record<string, string>;
  cuisineNames: Record<string, string>;
}

/**
 * Deterministic warm gradient for a kitchen with no photo yet — derived from the
 * slug so a given kitchen always looks the same. Most seeded listings arrive
 * without a photo, and a wall of identical grey placeholders is what made the
 * directory look empty even when it wasn't.
 */
const PLACEHOLDER_TONES = [
  "from-orange-200 to-amber-300",
  "from-rose-200 to-orange-300",
  "from-amber-200 to-yellow-300",
  "from-emerald-200 to-teal-300",
  "from-red-200 to-rose-300",
  "from-lime-200 to-emerald-300",
];

function toneFor(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_TONES[hash % PLACEHOLDER_TONES.length]!;
}

export function ChefCard({ chef, tagNames, cuisineNames }: ChefCardProps) {
  const href = chef.neighbourhood_slug
    ? `/${chef.city_slug}/${chef.neighbourhood_slug}/${chef.slug}`
    : `/${chef.city_slug}/${chef.slug}`;

  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-2xl border border-sand-200 bg-white p-4 shadow-[0_1px_2px_rgba(33,29,24,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-zuby-300 hover:shadow-[0_10px_28px_rgba(92,34,0,0.10)]"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
        {chef.photo_url ? (
          <Image
            src={chef.photo_url}
            alt={`${chef.kitchen_name} — home chef in ${chef.neighbourhood_name ?? chef.address_area ?? chef.city_slug}`}
            fill
            sizes="112px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br text-3xl ${toneFor(chef.slug)}`}
          >
            <span aria-hidden>🍱</span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-bold text-sand-900 transition-colors group-hover:text-zuby-700">
            {chef.kitchen_name}
          </h3>
          {chef.is_verified && <VerifiedBadge className="shrink-0" />}
        </div>

        <p className="mt-0.5 truncate text-sm text-sand-500">
          {chef.neighbourhood_name ?? chef.address_area}
          {typeof chef.distance_km === "number" && (
            <span className="text-sand-400"> · {copy.chef.distanceAway(chef.distance_km)}</span>
          )}
        </p>

        {chef.cuisines.length > 0 && (
          <p className="mt-1.5 truncate text-sm font-medium text-sand-700">
            {chef.cuisines.map((slug) => cuisineNames[slug] ?? slug).join(" · ")}
          </p>
        )}

        {chef.dietary_tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {chef.dietary_tags.slice(0, 4).map((slug) => (
              <TagChip key={slug} slug={slug} name={tagNames[slug] ?? slug} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
