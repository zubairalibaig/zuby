import Link from "next/link";
import { copy } from "@/lib/copy/en";

/**
 * Segment-level not-found for an unknown or inactive city slug. Distinct from
 * the generic 404 (root not-found.tsx) — this one explains we're Bangalore-only
 * for now rather than implying the whole page is missing.
 */
export default function CityNotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-neutral-900">
        {copy.city.notLiveHeading("this city")}
      </h1>
      <p className="mt-2 text-neutral-500">{copy.city.notLiveBody}</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-zuby-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zuby-600"
      >
        {copy.city.backHome}
      </Link>
    </main>
  );
}
