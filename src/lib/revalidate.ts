import "server-only";
import { revalidatePath } from "next/cache";

/**
 * On-demand ISR revalidation, called whenever a chef's public content changes
 * (an admin approval in Phase 3, a self-serve edit in Phase 4). Exported now so
 * those phases have a stable function to call rather than reinventing this.
 *
 * Also reachable over HTTP via POST /api/revalidate (see that route) for
 * callers outside this codebase (e.g. a Supabase webhook), guarded by
 * REVALIDATE_SECRET.
 */
export function revalidateChefPaths(chef: {
  citySlug: string;
  neighbourhoodSlug: string | null;
  chefSlug: string;
  cuisineSlugs?: string[];
}): void {
  revalidatePath(`/${chef.citySlug}`);
  if (chef.neighbourhoodSlug) {
    revalidatePath(`/${chef.citySlug}/${chef.neighbourhoodSlug}`);
    revalidatePath(`/${chef.citySlug}/${chef.neighbourhoodSlug}/${chef.chefSlug}`);
  }
  for (const cuisine of chef.cuisineSlugs ?? []) {
    revalidatePath(`/${chef.citySlug}/cuisine/${cuisine}`);
  }
  revalidatePath("/sitemap.xml");
}
