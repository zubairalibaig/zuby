import Image from "next/image";
import Link from "next/link";
import type { SearchChefResult } from "@/types/db";
import { TagChip } from "@/components/directory/TagChip";
import { VerifiedBadge } from "@/components/directory/VerifiedBadge";
import { copy } from "@/lib/copy/en";

interface ChefCardProps {
  chef: SearchChefResult;
  /** Slug → display name for the tags/cuisines this chef carries. */
  tagNames: Record<string, string>;
  cuisineNames: Record<string, string>;
}

export function ChefCard({ chef, tagNames, cuisineNames }: ChefCardProps) {
  const href = chef.neighbourhood_slug
    ? `/${chef.city_slug}/${chef.neighbourhood_slug}/${chef.slug}`
    : `/${chef.city_slug}/${chef.slug}`;

  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-2xl border border-neutral-200 p-4 transition hover:border-zuby-500/40 hover:shadow-sm"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:h-24 sm:w-24">
        {chef.photo_url ? (
          <Image
            src={chef.photo_url}
            alt={chef.kitchen_name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-neutral-300">
            🍱
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-neutral-900 group-hover:text-zuby-600">
            {chef.kitchen_name}
          </h3>
          {chef.is_verified && <VerifiedBadge className="shrink-0" />}
        </div>

        <p className="mt-0.5 truncate text-sm text-neutral-500">
          {chef.neighbourhood_name ?? chef.address_area}
          {typeof chef.distance_km === "number" && ` · ${copy.chef.distanceAway(chef.distance_km)}`}
        </p>

        {chef.cuisines.length > 0 && (
          <p className="mt-1 truncate text-sm text-neutral-600">
            {chef.cuisines.map((slug) => cuisineNames[slug] ?? slug).join(", ")}
          </p>
        )}

        {chef.dietary_tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chef.dietary_tags.map((slug) => (
              <TagChip key={slug} slug={slug} name={tagNames[slug] ?? slug} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
