import Link from "next/link";
import { Breadcrumbs } from "@/components/directory/Breadcrumbs";
import { JsonLd } from "@/components/directory/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { comingSoonCityBlurbs } from "@/lib/copy/landing";
import { copy } from "@/lib/copy/en";
import type { ComingSoonCityRecord } from "@/lib/supabase/queries";

/**
 * The honest pan-India page (docs/discoverability-strategy.md §13). Rendered
 * at the SAME url a real directory will eventually live at — /<slug> — for a
 * city that exists as a real row but has zero chefs yet. Deliberately does
 * NOT emit FoodEstablishment/ItemList JSON-LD or claim any listings exist;
 * only a breadcrumb, real per-city editorial, and two working WhatsApp CTAs
 * that actually do something (chef interest, buyer demand). When the city
 * later flips to is_active, this component stops rendering and the same URL
 * becomes the real directory page — no link equity lost.
 */
export function ComingSoonCity({ city }: { city: ComingSoonCityRecord }) {
  const c = copy.comingSoon;
  const blurb = comingSoonCityBlurbs[city.slug];
  const founderWa = process.env.NEXT_PUBLIC_FOUNDER_WHATSAPP_E164?.replace(/\D/g, "") ?? "";
  const chefWaHref = founderWa
    ? `https://wa.me/${founderWa}?text=${encodeURIComponent(c.chefWaMessage(city.name))}`
    : null;
  const buyerWaHref = founderWa
    ? `https://wa.me/${founderWa}?text=${encodeURIComponent(c.buyerWaMessage(city.name))}`
    : null;

  const crumbs = [
    { name: "Zuby", path: "/" },
    { name: city.name, path: `/${city.slug}` },
  ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs crumbs={crumbs} />

      <h1 className="mt-4 text-3xl font-bold text-sand-900">{c.heading(city.name)}</h1>
      <p className="mt-3 text-lg text-sand-500">{c.subheading}</p>
      {blurb && <p className="mt-4 leading-relaxed text-sand-600">{blurb}</p>}

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-sand-200 bg-white p-5">
          <h2 className="font-semibold text-sand-900">{c.chefHeading}</h2>
          <p className="mt-1.5 text-sm text-sand-500">{c.chefBody(city.name)}</p>
          {chefWaHref ? (
            <a
              href={chefWaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-zuby-500 px-4 py-2 text-sm font-semibold text-white hover:bg-zuby-600"
            >
              {c.chefCta}
            </a>
          ) : (
            <Link
              href="/for-chefs"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-zuby-500 px-4 py-2 text-sm font-semibold text-white hover:bg-zuby-600"
            >
              {c.chefCta}
            </Link>
          )}
        </div>

        {buyerWaHref && (
          <div className="rounded-2xl border border-sand-200 bg-white p-5">
            <h2 className="font-semibold text-sand-900">{c.buyerHeading}</h2>
            <p className="mt-1.5 text-sm text-sand-500">{c.buyerBody(city.name)}</p>
            <a
              href={buyerWaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center rounded-full border border-zuby-300 px-4 py-2 text-sm font-semibold text-zuby-700 hover:bg-zuby-50"
            >
              {c.buyerCta}
            </a>
          </div>
        )}
      </div>

      <p className="mt-10 text-sm text-sand-500">
        {c.liveElsewhere}{" "}
        <Link href="/bangalore" className="text-zuby-600 hover:underline">
          Bangalore
        </Link>
        .
      </p>
    </main>
  );
}
