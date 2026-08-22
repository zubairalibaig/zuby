import type { Metadata } from "next";
import { copy } from "@/lib/copy/en";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: copy.forChefs.metaTitle,
  description: copy.forChefs.subheading,
  alternates: { canonical: "/for-chefs" },
};

// Interim onboarding channel until Phase 4 ships self-serve claim/create.
// Not a chef's real WhatsApp — this opens the founder's own number.
const FOUNDER_WHATSAPP = process.env.NEXT_PUBLIC_FOUNDER_WHATSAPP_E164 ?? "";

export default function ForChefsPage() {
  const waHref = FOUNDER_WHATSAPP
    ? `https://wa.me/${FOUNDER_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(
        "Hi! I'd like to list my kitchen on Zuby.",
      )}`
    : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-4xl font-bold text-neutral-900">{copy.forChefs.heading}</h1>
      <p className="mt-3 text-lg text-neutral-500">{copy.forChefs.subheading}</p>

      <div className="mt-10 grid gap-6 text-left sm:grid-cols-3">
        {copy.forChefs.points.map((point) => (
          <div key={point.title} className="rounded-2xl border border-neutral-200 p-5">
            <h2 className="font-semibold text-neutral-900">{point.title}</h2>
            <p className="mt-1.5 text-sm text-neutral-500">{point.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-neutral-50 p-8">
        <h2 className="font-semibold text-neutral-900">{copy.forChefs.interimHeading}</h2>
        <p className="mt-2 text-neutral-500">{copy.forChefs.interimBody}</p>
        {waHref && (
          <a
            href={waHref}
            className="mt-5 inline-flex items-center justify-center rounded-full bg-[#25D366] px-6 py-3 text-base font-semibold text-white hover:bg-[#1fb958]"
          >
            {copy.forChefs.interimCta}
          </a>
        )}
      </div>
    </main>
  );
}
