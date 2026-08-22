import Link from "next/link";
import type { Metadata } from "next";
import { copy } from "@/lib/copy/en";
import { getActiveCities } from "@/lib/supabase/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDescription,
  alternates: { canonical: "/" },
};

export default async function Home() {
  // Same build-time resilience as the dynamic routes (see [city]/page.tsx):
  // an empty list here just means the "Cities" section doesn't render —
  // the page already handles zero cities gracefully.
  let cities: Awaited<ReturnType<typeof getActiveCities>> = [];
  try {
    cities = await getActiveCities();
  } catch (err) {
    console.warn("Home page cities lookup skipped — DB not reachable:", err);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <section className="text-center">
        <p className="mb-6 inline-block rounded-full bg-zuby-100 px-4 py-1 text-sm font-medium text-zuby-600">
          {copy.landing.launchNote}
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-zuby-900 sm:text-6xl">
          {copy.siteName}
        </h1>
        <p className="mt-4 text-xl text-neutral-600">{copy.landing.heading}</p>
        <p className="mt-2 text-base text-neutral-500">{copy.landing.subheading}</p>

        <div className="mt-8 flex flex-col items-center gap-2">
          <Link
            href="/search"
            className="inline-flex items-center justify-center rounded-full bg-zuby-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-zuby-600"
          >
            {copy.landing.useLocationCta}
          </Link>
          <p className="text-xs text-neutral-400">{copy.landing.locationHelp}</p>
        </div>
      </section>

      {cities.length > 0 && (
        <section className="mt-16">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {copy.landing.citiesHeading}
          </h2>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={`/${city.slug}`}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-zuby-500/50 hover:text-zuby-600"
              >
                {city.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        {copy.landing.valueProps.map((prop) => (
          <div key={prop.title} className="rounded-2xl border border-neutral-200 p-5">
            <h3 className="font-semibold text-neutral-900">{prop.title}</h3>
            <p className="mt-1.5 text-sm text-neutral-500">{prop.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-center text-lg font-semibold text-neutral-900">
          {copy.landing.howItWorksHeading}
        </h2>
        <ol className="mt-6 space-y-4">
          {copy.landing.howItWorks.map((item) => (
            <li key={item.step} className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zuby-500 text-sm font-bold text-white">
                {item.step}
              </span>
              <p className="pt-1 text-neutral-600">{item.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 rounded-2xl bg-neutral-50 p-8 text-center">
        <p className="text-neutral-700">{copy.landing.forChefsTeaser}</p>
        <Link
          href="/for-chefs"
          className="mt-4 inline-flex items-center justify-center rounded-full border border-zuby-500 px-5 py-2.5 text-sm font-semibold text-zuby-600 hover:bg-zuby-50"
        >
          {copy.landing.forChefsCta}
        </Link>
      </section>
    </main>
  );
}
