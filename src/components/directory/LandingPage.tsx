import Link from "next/link";
import { ChefCard } from "@/components/directory/ChefCard";
import { Breadcrumbs } from "@/components/directory/Breadcrumbs";
import { JsonLd } from "@/components/directory/JsonLd";
import { breadcrumbJsonLd, itemListJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { landingCopy } from "@/lib/copy/landing";
import type { Crumb } from "@/lib/seo/jsonld";
import type { SearchChefResult } from "@/types/db";

export interface RelatedLink {
  label: string;
  href: string;
}

interface Props {
  h1: string;
  /** Editorial paragraphs, composed from the copy module — never generated. */
  intro: string[];
  crumbs: Crumb[];
  chefs: SearchChefResult[];
  tagNames: Record<string, string>;
  cuisineNames: Record<string, string>;
  related?: RelatedLink[];
  faq?: { q: string; a: string }[];
  /** Fallback path used for a chef whose own neighbourhood slug is missing. */
  neighbourhoodFallback: string;
  citySlug: string;
}

/**
 * The shared shell for every programmatic landing page (Phase 5).
 *
 * One component so the H1/editorial/listing/cross-link/JSON-LD structure can't
 * drift between page types — drift is how one page type quietly loses its
 * structured data or its internal links and nobody notices for two months.
 *
 * Callers are responsible for enforcing the threshold before rendering this;
 * see lib/seo/landings.ts.
 */
export function LandingPage({
  h1,
  intro,
  crumbs,
  chefs,
  tagNames,
  cuisineNames,
  related = [],
  faq,
  neighbourhoodFallback,
  citySlug,
}: Props) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd
        data={itemListJsonLd(
          chefs.map((c) => ({
            name: c.kitchen_name,
            url: `/${citySlug}/${c.neighbourhood_slug ?? neighbourhoodFallback}/${c.slug}`,
          })),
        )}
      />
      {faq && faq.length > 0 && <JsonLd data={faqJsonLd(faq)} />}

      <Breadcrumbs crumbs={crumbs} />

      <h1 className="mt-4 text-3xl font-bold text-neutral-900">{h1}</h1>

      {intro.length > 0 && (
        <div className="mt-4 max-w-3xl space-y-3">
          {intro.map((para) => (
            <p key={para.slice(0, 40)} className="text-neutral-600">
              {para}
            </p>
          ))}
        </div>
      )}

      <p className="mt-4 max-w-3xl text-sm text-neutral-500">{landingCopy.verifiedNote}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {chefs.map((chef) => (
          <ChefCard key={chef.id} chef={chef} tagNames={tagNames} cuisineNames={cuisineNames} />
        ))}
      </div>

      {related.length > 0 && (
        <section className="mt-12 border-t border-neutral-200 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {landingCopy.relatedHeading}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {related.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:border-zuby-400 hover:text-zuby-600"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {faq && faq.length > 0 && (
        <section className="mt-12 border-t border-neutral-200 pt-6">
          <h2 className="text-xl font-bold text-neutral-900">{landingCopy.faqHeading}</h2>
          <dl className="mt-4 max-w-3xl space-y-5">
            {faq.map((item) => (
              <div key={item.q}>
                <dt className="font-semibold text-neutral-900">{item.q}</dt>
                <dd className="mt-1 text-neutral-600">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </main>
  );
}
