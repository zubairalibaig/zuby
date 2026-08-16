/** Small text helpers shared by the normalisers. */

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Title-case a name that arrived in ALL CAPS or all lowercase. */
export function tidyName(input: string): string {
  const trimmed = input.replace(/\s+/g, " ").trim();
  if (!trimmed) return trimmed;
  const isShouty = trimmed === trimmed.toUpperCase();
  const isQuiet = trimmed === trimmed.toLowerCase();
  if (!isShouty && !isQuiet) return trimmed;
  return trimmed
    .toLowerCase()
    .split(" ")
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Normalised token set for fuzzy comparison.
 *
 * Trailing plurals are folded ("tiffins" → "tiffin") so that
 * "Meena Home Tiffins" and "Meena Home Tiffin Service" register as the same
 * kitchen — exactly the near-miss that shows up in real scraped data.
 */
export function tokens(input: string): Set<string> {
  return new Set(
    input
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .map((t) => (t.length > 4 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t)),
  );
}

/**
 * Jaccard similarity over word tokens, 0..1. Used for "is this the same
 * kitchen?" checks — deliberately simple and explainable; the database's
 * pg_trgm index does the heavy lifting for candidate lookup.
 */
export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / (ta.size + tb.size - shared);
}

/** Collapse whitespace; return null for blank/placeholder values. */
export function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (/^(n\/?a|none|nil|-|--|tbd|unknown)$/i.test(text)) return null;
  return text;
}
