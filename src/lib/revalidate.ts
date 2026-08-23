import "server-only";
import { revalidatePath } from "next/cache";
import { intentPages } from "@/lib/copy/landing";

/**
 * On-demand ISR revalidation, called whenever a chef's public content changes
 * (an admin approval in Phase 3, a self-serve edit in Phase 4, a promotion in
 * Phase 5b).
 *
 * This must cover every page a chef can appear on. It is easy to under-cover
 * and the failure is invisible: a suspended chef keeps showing for up to an
 * hour, and — worse — a landing page that has dropped below the two-chef
 * threshold keeps serving as a thin page, which is exactly what
 * docs/discoverability-strategy.md §18 calls the biggest risk in the plan.
 *
 * Also reachable over HTTP via POST /api/revalidate, guarded by
 * REVALIDATE_SECRET.
 */
export function revalidateChefPaths(chef: {
  citySlug: string;
  neighbourhoodSlug: string | null;
  chefSlug: string;
  cuisineSlugs?: string[];
  dietaryTagSlugs?: string[];
}): void {
  // Home: the promoted and trending rails, and the live chef count.
  revalidatePath("/");

  revalidatePath(`/${chef.citySlug}`);

  // Intent pages list every chef in the city.
  for (const intent of Object.values(intentPages)) {
    revalidatePath(`/${chef.citySlug}/${intent.slug}`);
  }

  if (chef.neighbourhoodSlug) {
    revalidatePath(`/${chef.citySlug}/${chef.neighbourhoodSlug}`);
    revalidatePath(`/${chef.citySlug}/${chef.neighbourhoodSlug}/${chef.chefSlug}`);
  }

  for (const cuisine of chef.cuisineSlugs ?? []) {
    revalidatePath(`/${chef.citySlug}/cuisine/${cuisine}`);
    if (chef.neighbourhoodSlug) {
      revalidatePath(`/${chef.citySlug}/${chef.neighbourhoodSlug}/cuisine/${cuisine}`);
    }
  }

  for (const tag of chef.dietaryTagSlugs ?? []) {
    revalidatePath(`/${chef.citySlug}/diet/${tag}`);
    if (chef.neighbourhoodSlug) {
      revalidatePath(`/${chef.citySlug}/${chef.neighbourhoodSlug}/diet/${tag}`);
    }
  }

  // All three sitemaps, since chef and landing URLs both move.
  revalidatePath("/sitemap.xml");
  revalidatePath("/sitemap-chefs.xml");
  revalidatePath("/sitemap-areas.xml");
}
