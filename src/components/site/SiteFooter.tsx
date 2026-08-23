import Link from "next/link";
import { Wordmark } from "@/components/site/Wordmark";
import { copy } from "@/lib/copy/en";
import type { CityRecord, CuisineRecord, DietaryTagRecord } from "@/lib/supabase/queries";

/**
 * Footer. Does double duty: it closes the page visually, and it is a real
 * internal-linking surface — every cuisine and dietary landing page reachable
 * from every page is exactly what docs/discoverability-strategy.md §5 asks for.
 */
export function SiteFooter({
  cities = [],
  cuisines = [],
  dietaryTags = [],
  primaryCitySlug = "bangalore",
}: {
  cities?: CityRecord[];
  cuisines?: CuisineRecord[];
  dietaryTags?: DietaryTagRecord[];
  primaryCitySlug?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-sand-200 bg-sand-100">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Wordmark className="text-2xl" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-sand-600">
              {copy.footer.blurb}
            </p>
          </div>

          {cuisines.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-sand-500">
                {copy.footer.cuisinesHeading}
              </h2>
              <ul className="mt-3 space-y-1.5">
                {cuisines.slice(0, 8).map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/${primaryCitySlug}/cuisine/${c.slug}`}
                      className="text-sm text-sand-600 transition hover:text-zuby-700"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dietaryTags.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-sand-500">
                {copy.footer.dietaryHeading}
              </h2>
              <ul className="mt-3 space-y-1.5">
                {dietaryTags.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/${primaryCitySlug}/diet/${t.slug}`}
                      className="text-sm text-sand-600 transition hover:text-zuby-700"
                    >
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-sand-500">
              {copy.footer.zubyHeading}
            </h2>
            <ul className="mt-3 space-y-1.5">
              <li>
                <Link href="/about" className="text-sm text-sand-600 hover:text-zuby-700">
                  {copy.nav.about}
                </Link>
              </li>
              <li>
                <Link href="/trust" className="text-sm text-sand-600 hover:text-zuby-700">
                  {copy.nav.howWeVerify}
                </Link>
              </li>
              <li>
                <Link href="/for-chefs" className="text-sm text-sand-600 hover:text-zuby-700">
                  {copy.nav.listKitchen}
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-sand-600 hover:text-zuby-700">
                  {copy.footer.chefLogin}
                </Link>
              </li>
            </ul>

            {cities.length > 0 && (
              <>
                <h2 className="mt-6 text-xs font-semibold uppercase tracking-wider text-sand-500">
                  {copy.footer.citiesHeading}
                </h2>
                <ul className="mt-3 space-y-1.5">
                  {cities.map((city) => (
                    <li key={city.slug}>
                      <Link
                        href={`/${city.slug}`}
                        className="text-sm text-sand-600 hover:text-zuby-700"
                      >
                        {city.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-sand-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-sand-500">
            © {year} Zuby · {copy.footer.legal}
          </p>
          <p className="text-xs text-sand-500">{copy.footer.madeIn}</p>
        </div>
      </div>
    </footer>
  );
}
