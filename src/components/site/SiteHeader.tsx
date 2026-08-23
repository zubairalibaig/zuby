import Link from "next/link";
import { Wordmark } from "@/components/site/Wordmark";
import { copy } from "@/lib/copy/en";

/**
 * Public site header. Until now the public pages had no chrome at all, which is
 * most of why they read as unfinished — a page with no header looks like a
 * fragment, however well the content inside it is laid out.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-sand-200/80 bg-sand-50/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Wordmark className="text-2xl" />

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/trust"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-sand-700 transition hover:bg-sand-100 hover:text-zuby-700 sm:block"
          >
            {copy.nav.howWeVerify}
          </Link>
          <Link
            href="/about"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-sand-700 transition hover:bg-sand-100 hover:text-zuby-700 sm:block"
          >
            {copy.nav.about}
          </Link>
          <Link
            href="/for-chefs"
            className="rounded-full bg-zuby-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zuby-600"
          >
            {copy.nav.listKitchen}
          </Link>
        </nav>
      </div>
    </header>
  );
}
