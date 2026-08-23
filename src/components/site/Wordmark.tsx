import Link from "next/link";

/**
 * The Zuby wordmark. Drawn in type rather than shipped as an image so it stays
 * crisp at any size, costs no request, and can't be the thing that blocks LCP.
 * The dot is the brand's one piece of personality — a plate.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-baseline gap-0.5 font-bold tracking-tight ${className}`}
      aria-label="Zuby — home"
    >
      <span className="text-zuby-900 transition-colors group-hover:text-zuby-700">zuby</span>
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full bg-zuby-500 transition-transform group-hover:scale-125"
      />
    </Link>
  );
}
