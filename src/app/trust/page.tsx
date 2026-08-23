import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/directory/JsonLd";
import { faqJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "How Zuby verifies home chefs — trust and food safety",
  description:
    "Every Zuby listing is reviewed by a person before it appears: FSSAI registration, photos, kitchen area and contact details. Here is exactly what we check, and what we don't.",
  alternates: { canonical: "/trust" },
};

const FAQ = [
  {
    q: "What does Zuby check before a listing goes live?",
    a: "A person reviews every listing: the chef's FSSAI registration number, their photos, the kitchen's area, and their contact details. Nothing appears in search results until that review is done and approved. The reviewer's decision and identity are recorded in an audit trail.",
  },
  {
    q: "What is an FSSAI number?",
    a: "FSSAI is India's food safety regulator. Any home food business turning over under ₹12 lakh a year needs a Basic Registration, which produces a 14-digit number. Zuby captures that number at signup, displays it publicly on the listing, and an admin checks it before approval. A chef who changes their FSSAI number loses their verified status until it's checked again.",
  },
  {
    q: "Does Zuby inspect kitchens?",
    a: "No, and we won't claim otherwise. We verify documentation and identity, not hygiene in person. Physical inspection of home kitchens is the regulator's job and we are not equipped to do it. What we can promise is that a real person checked a real FSSAI registration against a real listing.",
  },
  {
    q: "How does Zuby verify halal, jain or jhatka claims?",
    a: "These are the chef's declaration, confirmed during review. In India there is no single certifying body for a home kitchen the way MUIS certifies in Singapore, so we verify that the chef is who they say they are and that the declaration is deliberate — not that the supply chain is audited. If certification matters to you, ask the chef directly; most can tell you which butcher or supplier they use by name.",
  },
  {
    q: "Are chefs' home addresses published?",
    a: "No. Most chefs on Zuby are women cooking from home. We publish only an approximate area — like 'Indiranagar 2nd Stage' — and a coordinate rounded to roughly 100 metres, which is enough for distance search and not enough to find someone's front door. Full addresses are collected for verification and never exposed publicly.",
  },
  {
    q: "What happens if something goes wrong with an order?",
    a: "The order is between you and the chef — Zuby doesn't hold the money or arrange delivery, so we can't refund you. What we can do is act on the listing: a chef who repeatedly misrepresents what they sell can be suspended or removed. Tell us and we'll look at it.",
  },
  {
    q: "Can chefs edit their listing after approval?",
    a: "Yes, but not everything freely. Menus, prices, photos, timings and availability update immediately — those are the chef's business to run. Changes to identity or trust details — their name, FSSAI number, address, phone or WhatsApp number — go back into the review queue, and the public page keeps showing the previously approved details until an admin approves the change.",
  },
];

export default function TrustPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <JsonLd data={faqJsonLd(FAQ)} />

      <h1 className="text-3xl font-bold text-neutral-900">How we verify chefs</h1>
      <p className="mt-4 text-lg text-neutral-700">
        Inviting a stranger&apos;s cooking into your home requires believing two things: that the
        food is safe, and that the cook is who they say they are. Here is exactly what Zuby does
        about that — and, just as importantly, what it doesn&apos;t.
      </p>

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-neutral-200 p-6">
          <h2 className="text-lg font-bold text-neutral-900">1. Regulatory</h2>
          <p className="mt-2 text-neutral-600">
            Every India-based chef displays their FSSAI registration number — the 14-digit number
            India requires for home food businesses. It&apos;s captured at signup, shown publicly on
            the listing, and checked by an admin before the chef goes live. Change the number and
            the verification resets.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 p-6">
          <h2 className="text-lg font-bold text-neutral-900">2. Human review</h2>
          <p className="mt-2 text-neutral-600">
            No listing is published automatically. Each one sits in a queue until a person has
            looked at the photos, the area, the contact details and the FSSAI number, and either
            approved it, rejected it, or asked the chef for more. Who approved which listing, and
            when, is recorded permanently.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 p-6">
          <h2 className="text-lg font-bold text-neutral-900">3. Ongoing</h2>
          <p className="mt-2 text-neutral-600">
            Verification isn&apos;t a one-time gate. A chef who changes their name, address, FSSAI
            number or phone number goes back through review, and their public page keeps showing the
            last approved details until the change is cleared. Listings can be suspended if what
            they claim stops matching what they do.
          </p>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-bold text-amber-900">What we don&apos;t do</h2>
          <p className="mt-2 text-amber-800">
            We don&apos;t inspect kitchens in person, and we don&apos;t audit anyone&apos;s supply
            chain. We verify documents and identity. Saying so plainly matters more to us than
            sounding more thorough than we are.
          </p>
        </section>
      </div>

      <section className="mt-12 border-t border-neutral-200 pt-6">
        <h2 className="text-xl font-bold text-neutral-900">Common questions</h2>
        <dl className="mt-4 space-y-5">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className="font-semibold text-neutral-900">{item.q}</dt>
              <dd className="mt-1 text-neutral-600">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10">
        <Link href="/about" className="text-sm font-medium text-zuby-600 hover:text-zuby-700">
          More about Zuby →
        </Link>
      </div>
    </main>
  );
}
