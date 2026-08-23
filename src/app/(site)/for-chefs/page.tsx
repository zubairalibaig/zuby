import type { Metadata } from "next";
import Link from "next/link";
import { copy } from "@/lib/copy/en";
import { JsonLd } from "@/components/directory/JsonLd";
import { Breadcrumbs } from "@/components/directory/Breadcrumbs";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: copy.forChefs.metaTitle,
  description: copy.forChefs.metaDescription,
  alternates: { canonical: "/for-chefs" },
};

const crumbs = [
  { name: "Zuby", path: "/" },
  { name: "For chefs", path: "/for-chefs" },
];

/**
 * The recruitment page — the supply side of the same two-sided problem the
 * buyer-facing pages solve. Home chefs searching "sell home cooked food
 * online" or "FSSAI license home kitchen" should land here and get a direct,
 * specific answer, the same discipline docs/discoverability-strategy.md §8
 * asks of every page, just aimed at a different persona.
 */
export default function ForChefsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={faqJsonLd(copy.forChefs.faq)} />

      <Breadcrumbs crumbs={crumbs} />

      <div className="mt-4 text-center">
        <h1 className="text-4xl font-bold text-sand-900">{copy.forChefs.heading}</h1>
        <p className="mt-3 text-lg text-sand-500">{copy.forChefs.subheading}</p>
        {/* The header's "List your kitchen" button lands here, not on a sign-in
            form — the only actual sign-in link used to be a block after the
            hero, points, how-it-works and FAQ, so a chef had to scroll past
            four sections before finding anything clickable. Put the same CTA
            here too, above the fold, and leave the bottom one as a second
            chance after they've read the detail. */}
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-zuby-500 px-6 py-3 text-base font-semibold text-white hover:bg-zuby-600"
        >
          Sign in & list your kitchen
        </Link>
      </div>

      <div className="mt-10 grid gap-6 text-left sm:grid-cols-3">
        {copy.forChefs.points.map((point) => (
          <div key={point.title} className="rounded-2xl border border-sand-200 p-5">
            <h2 className="font-semibold text-sand-900">{point.title}</h2>
            <p className="mt-1.5 text-sm text-sand-500">{point.body}</p>
          </div>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-bold text-sand-900">{copy.forChefs.howHeading}</h2>
        <ol className="mt-6 grid gap-5 sm:grid-cols-3">
          {copy.forChefs.howSteps.map((step) => (
            <li
              key={step.n}
              className="relative rounded-2xl border border-sand-200 bg-white p-5 text-left shadow-sm"
            >
              <span className="absolute -top-4 left-5 flex h-9 w-9 items-center justify-center rounded-full bg-zuby-500 text-sm font-bold text-white shadow-md">
                {step.n}
              </span>
              <h3 className="mt-3 font-bold text-sand-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-sand-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 border-t border-sand-200 pt-8">
        <h2 className="text-xl font-bold text-sand-900">{copy.forChefs.faqHeading}</h2>
        <dl className="mt-5 space-y-5 text-left">
          {copy.forChefs.faq.map((item) => (
            <div key={item.q}>
              <dt className="font-semibold text-sand-900">{item.q}</dt>
              <dd className="mt-1 text-sand-600">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-14 rounded-2xl bg-sand-50 p-8 text-center">
        <h2 className="font-semibold text-sand-900">Get started in minutes</h2>
        <p className="mt-2 text-sand-500">
          Sign in, create your listing, and be live on Zuby within a day.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-zuby-500 px-6 py-3 text-base font-semibold text-white hover:bg-zuby-600"
        >
          Sign in & list your kitchen
        </Link>
      </div>
    </main>
  );
}
