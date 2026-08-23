import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getActiveCities, getCuisines, getDietaryTags } from "@/lib/supabase/queries";

/**
 * Chrome for the public directory. A route group, so it wraps every buyer-facing
 * page without changing a single URL — and without touching /admin or
 * /dashboard, which have their own headers.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Footer links are real internal-linking surface, but they must never be the
  // reason a page fails to render.
  let cities: Awaited<ReturnType<typeof getActiveCities>> = [];
  let cuisines: Awaited<ReturnType<typeof getCuisines>> = [];
  let dietaryTags: Awaited<ReturnType<typeof getDietaryTags>> = [];
  try {
    [cities, cuisines, dietaryTags] = await Promise.all([
      getActiveCities(),
      getCuisines(),
      getDietaryTags(),
    ]);
  } catch {
    /* DB unreachable — the footer degrades to brand + Zuby links */
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter
        cities={cities}
        cuisines={cuisines}
        dietaryTags={dietaryTags}
        primaryCitySlug={cities[0]?.slug ?? "bangalore"}
      />
    </div>
  );
}
