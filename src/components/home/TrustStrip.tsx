import Link from "next/link";
import { copy } from "@/lib/copy/en";

/**
 * The trust stack, stated on the home page rather than hidden on /trust.
 * It is the actual reason to use Zuby instead of an apartment WhatsApp group,
 * so it earns a full-width band rather than a footnote.
 */
export function TrustStrip() {
  return (
    <section className="band-warm">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          {copy.home.trustPoints.map((point) => (
            <div key={point.title}>
              <span className="text-2xl" aria-hidden>
                {point.icon}
              </span>
              <h3 className="mt-2 font-semibold text-white">{point.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zuby-100/85">{point.body}</p>
            </div>
          ))}
        </div>
        <Link
          href="/trust"
          className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/20"
        >
          {copy.home.trustCta} →
        </Link>
      </div>
    </section>
  );
}
