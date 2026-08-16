import { copy } from "@/lib/copy/en";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mb-6 rounded-full bg-zuby-100 px-4 py-1 text-sm font-medium text-zuby-600">
        {copy.landing.launchNote}
      </p>
      <h1 className="text-5xl font-bold tracking-tight text-zuby-900 sm:text-6xl">
        {copy.siteName}
      </h1>
      <p className="mt-4 max-w-xl text-xl text-neutral-600">{copy.landing.heading}</p>
      <p className="mt-2 max-w-xl text-base text-neutral-500">{copy.landing.subheading}</p>
      <p className="mt-10 max-w-md text-sm text-neutral-400">{copy.landing.chefCta}</p>
    </main>
  );
}
