import type { ChefStatus } from "@/types/db";

const STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  pending_review: "bg-amber-100 text-amber-800",
  draft: "bg-neutral-100 text-neutral-600",
  rejected: "bg-red-100 text-red-800",
  suspended: "bg-orange-100 text-orange-800",
  delisted: "bg-neutral-200 text-neutral-700",
  new: "bg-blue-100 text-blue-800",
  needs_review: "bg-amber-100 text-amber-800",
  promoted: "bg-green-100 text-green-800",
  discarded: "bg-neutral-200 text-neutral-500",
  pending: "bg-amber-100 text-amber-800",
};

const LABELS: Record<string, string> = {
  pending_review: "pending review",
  needs_review: "needs review",
};

export function StatusBadge({ status }: { status: ChefStatus | string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status] ?? "bg-neutral-100 text-neutral-600"}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
