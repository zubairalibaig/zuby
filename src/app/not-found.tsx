import Link from "next/link";
import { copy } from "@/lib/copy/en";

export default function NotFound() {
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
