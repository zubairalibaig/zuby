import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "About Zuby — a directory of verified home chefs",
  description:
    "Zuby is a free, zero-commission directory of verified home chefs and tiffin services. Find home-cooked food near you and order directly on WhatsApp.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-sand-900">About Zuby</h1>

      <div className="mt-6 space-y-5 text-sand-700">
        <p className="text-lg">
          Zuby is a searchable directory of verified home chefs and tiffin services. Think of it as
          a way to find the people already cooking brilliant food near you — and to contact them
          directly, without an app, an account or a commission in between.
        </p>

        <h2 className="pt-4 text-xl font-bold text-sand-900">Why it exists</h2>
        <p>
          Home-cooked food in Indian cities is enormous and almost entirely invisible. There are
          tens of thousands of home cooks — mostly women, often exceptional — running small
          businesses out of their kitchens. Their customers find them through apartment WhatsApp
          groups, Instagram DMs and notices in lift lobbies. The food is there. The way to find it
          isn&apos;t.
        </p>
        <p>
          The existing platforms solved this by becoming full marketplaces: they take the order,
          hold the payment, arrange the delivery, and charge 20 to 35 percent for it. That works,
          but it asks a cook to give up a quarter of her income before she has any reason to trust
          the platform. Most stay invisible instead.
        </p>
        <p>
          Zuby&apos;s bet is that you don&apos;t need to own the transaction to fix the discovery
          problem. A directory with real location search, real verification and a friction-free way
          to reach the cook is valuable on its own.
        </p>

        <h2 className="pt-4 text-xl font-bold text-sand-900">How it works</h2>
        <p>
          You search by where you are and what you want. Results are filtered by actual distance —
          and by each chef&apos;s own delivery radius, so a cook who serves 5 km won&apos;t show up
          if you&apos;re 8 km away. You can filter by cuisine and by dietary requirement: pure veg,
          halal, jhatka, jain, egg-free.
        </p>
        <p>
          When you find someone, you tap the WhatsApp button. It opens a chat with that cook, with a
          short message already written. You work out what you want, when, and how you&apos;ll pay —
          directly with them. Zuby doesn&apos;t take the order, hold the money or arrange delivery.
        </p>

        <h2 className="pt-4 text-xl font-bold text-sand-900">What it costs</h2>
        <p>
          Nothing, to anyone. Chefs pay no commission and no listing fee. Buyers pay the chef
          directly. Zuby makes no money on any order placed through it today. If that changes, it
          will change by adding something optional that chefs choose to pay for — not by taking a
          cut of what they already earn.
        </p>

        <h2 className="pt-4 text-xl font-bold text-sand-900">Where it runs</h2>
        <p>
          Bangalore first, and properly, before anywhere else. Zuby is built to handle multiple
          cities and countries — prices carry currency codes, cities and countries are real entities
          in the database, and the regulatory fields cover more than one jurisdiction — but a
          directory with thin coverage is worse than no directory. We open a new city when there are
          enough kitchens in it to be genuinely useful.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/trust"
          className="rounded-full border border-sand-300 px-5 py-2.5 text-sm font-semibold text-sand-700 hover:border-zuby-400 hover:text-zuby-600"
        >
          How we verify chefs
        </Link>
        <Link
          href="/for-chefs"
          className="rounded-full bg-zuby-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zuby-600"
        >
          List your kitchen
        </Link>
      </div>
    </main>
  );
}
