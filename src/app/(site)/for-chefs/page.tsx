import type { Metadata } from "next";
import Link from "next/link";
import { copy } from "@/lib/copy/en";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: copy.forChefs.metaTitle,
  description: copy.forChefs.subheading,
  alternates: { canonical: "/for-chefs" },
};

export default function ForChefsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-4xl font-bold text-sand-900">{copy.forChefs.heading}</h1>
      <p className="mt-3 text-lg text-sand-500">{copy.forChefs.subheading}</p>

      <div className="mt-10 grid gap-6 text-left sm:grid-cols-3">
        {copy.forChefs.points.map((point) => (
          <div key={point.title} className="rounded-2xl border border-sand-200 p-5">
            <h2 className="font-semibold text-sand-900">{point.title}</h2>
            <p className="mt-1.5 text-sm text-sand-500">{point.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-sand-50 p-8">
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
