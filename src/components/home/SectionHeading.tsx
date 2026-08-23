import Link from "next/link";
import { copy } from "@/lib/copy/en";

/**
 * One heading treatment for every home-page section, so the page reads as a
 * rhythm rather than a stack of unrelated blocks. The short accent rule under
 * the title is the whole device — cheap, consistent, and enough to give the
 * page structure without borders everywhere.
 */
export function SectionHeading({
  title,
  note,
  seeAllHref,
  accent = "bg-zuby-500",
}: {
  title: string;
  note?: string;
  seeAllHref?: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-sand-900">{title}</h2>
        <span className={`mt-2 block h-1 w-10 rounded-full ${accent}`} aria-hidden />
        {note && <p className="mt-2 max-w-xl text-sm text-sand-600">{note}</p>}
      </div>
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="rounded-full border border-sand-300 px-4 py-2 text-sm font-semibold text-sand-700 transition hover:border-zuby-400 hover:text-zuby-700"
        >
          {copy.home.seeAll} →
        </Link>
      )}
    </div>
  );
}
