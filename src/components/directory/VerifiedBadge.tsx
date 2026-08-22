import { copy } from "@/lib/copy/en";

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-zuby-50 px-2.5 py-0.5 text-xs font-semibold text-zuby-600 ring-1 ring-inset ring-zuby-500/20 ${className ?? ""}`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 1.5a1 1 0 01.894.553l1.09 2.208 2.437.354a1 1 0 01.554 1.706l-1.763 1.72.416 2.427a1 1 0 01-1.451 1.054L10 10.347l-2.177 1.175a1 1 0 01-1.451-1.054l.416-2.427-1.763-1.72a1 1 0 01.554-1.706l2.437-.354L9.106 2.053A1 1 0 0110 1.5z"
          clipRule="evenodd"
        />
      </svg>
      {copy.chef.verifiedBadge}
    </span>
  );
}
