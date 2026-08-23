import { cn } from "@/lib/utils";

/**
 * One visually distinct colour per dietary tag — halal, jhatka, veg and jain
 * must be tellable apart at a glance (CLAUDE.md: filterable, not footnotes).
 */
const TAG_STYLES: Record<string, string> = {
  veg: "bg-green-50 text-green-700 ring-green-600/20",
  non_veg: "bg-red-50 text-red-700 ring-red-600/20",
  halal: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  jhatka: "bg-orange-50 text-orange-700 ring-orange-600/20",
  jain: "bg-amber-50 text-amber-800 ring-amber-600/20",
  egg_free: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  healthy: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

const DEFAULT_STYLE = "bg-sand-100 text-sand-700 ring-sand-500/20";

export function TagChip({ slug, name }: { slug: string; name: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TAG_STYLES[slug] ?? DEFAULT_STYLE,
      )}
    >
      {name}
    </span>
  );
}
