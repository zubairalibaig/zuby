import Link from "next/link";
import { copy } from "@/lib/copy/en";

/**
 * Covers both an unknown neighbourhood slug and an unknown/non-approved chef
 * slug (Next.js walks up to the nearest not-found.tsx when notFound() is
 * called from the [chef] page, and there's no deeper one) — a genuine 404,
 * distinct from the parent [city]/not-found.tsx's "we're not in that city yet"
 * messaging, since here the city itself is perfectly valid.
 */
export default function NeighbourhoodOrChefNotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-neutral-900">{copy.notFound.heading}</h1>
      <p className="mt-2 text-neutral-500">{copy.notFound.body}</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-zuby-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zuby-600"
      >
        {copy.notFound.cta}
      </Link>
    </main>
  );
}
