/**
 * Mapping free text ("Hyderabadi Dum Biryani, veg also available") onto Zuby's
 * cuisine and dietary-tag slugs.
 *
 * Anything we cannot map with confidence goes into `unmapped[]` for a human to
 * look at — we never silently drop a signal, and never guess a dietary tag,
 * because halal/jain/jhatka claims are trust claims.
 */

import { clean, tokens } from "./text.js";

/** Synonyms → cuisine slug. Keys are matched as whole words, case-insensitive. */
const CUISINE_SYNONYMS: Record<string, string[]> = {
  biryani: ["biryani", "biriyani", "briyani", "dum biryani"],
  "north-indian": ["north indian", "roti", "paratha", "chole", "rajma"],
  "south-indian": ["south indian", "idli", "dosa", "sambar", "vada", "uttapam"],
  bengali: ["bengali", "bangali", "kosha", "macher", "ilish"],
  andhra: ["andhra", "telugu", "gongura", "rayalaseema"],
  kerala: ["kerala", "malabar", "appam", "puttu", "kottayam"],
  maharashtrian: ["maharashtrian", "marathi", "puran poli", "misal"],
  gujarati: ["gujarati", "dhokla", "thepla", "undhiyu"],
  rajasthani: ["rajasthani", "marwari", "dal baati", "gatte"],
  mangalorean: ["mangalorean", "mangalore", "kori rotti", "neer dosa", "tulu", "bunt"],
  hyderabadi: ["hyderabadi", "haleem", "marag"],
  "chinese-desi": ["chinese", "indo chinese", "hakka", "manchurian", "schezwan", "szechuan"],
  "bakes-desserts": [
    "bakery",
    "bakes",
    "cake",
    "cakes",
    "dessert",
    "desserts",
    "brownie",
    "cookies",
  ],
  "healthy-meals": ["healthy", "diet", "keto", "salad", "macro", "fitness", "protein"],
  "tiffin-thali": ["tiffin", "thali", "meal box", "lunch box", "dabba", "mess"],
  // Below: added alongside the cuisine list expansion in supabase/seed.sql.
  // Punjabi and Mughlai used to fall into the "north-indian" catch-all —
  // pulled out here now that they have their own slugs, same reasoning as
  // every entry above (a synonym maps to the MOST specific slug that exists).
  punjabi: ["punjabi", "sarson da saag", "chole bhature", "amritsari", "makhani"],
  "awadhi-mughlai": [
    "awadhi",
    "mughlai",
    "lucknowi",
    "korma",
    "kebab",
    "kebabs",
    "nihari",
    "galouti",
  ],
  chettinad: ["chettinad", "tamil brahmin", "iyengar"],
  konkani: ["konkani", "gsb", "malvani"],
  goan: ["goan", "vindaloo", "xacuti", "sorpotel", "feni"],
  parsi: ["parsi", "dhansak", "sali boti", "parsi bhonu"],
  kashmiri: ["kashmiri", "wazwan", "rogan josh", "yakhni"],
  sindhi: ["sindhi", "sindhi kadhi", "sai bhaji"],
  "north-eastern": ["north east", "northeastern", "naga", "assamese", "manipuri", "khasi", "axone"],
  "bihari-purvanchali": ["bihari", "purvanchali", "litti", "chokha", "litti chokha", "thekua"],
  continental: ["continental", "pasta", "italian", "risotto", "grilled"],
  "momos-street-food": [
    "momos",
    "momo",
    "chaat",
    "street food",
    "golgappa",
    "pani puri",
    "vada pav",
  ],
  // "sweets" and "mithai" moved out of bakes-desserts — Indian sweets are a
  // distinct category from western-style bakery, and now have their own slug.
  "sweets-mithai": ["mithai", "sweets", "ladoo", "barfi", "halwa", "peda", "gulab jamun"],
  "pickles-podis": ["pickle", "pickles", "achar", "podi", "podis", "chutney powder"],
};

/**
 * Dietary tags. These are trust signals, so matching is deliberately strict:
 * only an explicit claim maps to a tag.
 */
const DIETARY_SYNONYMS: Record<string, string[]> = {
  veg: ["pure veg", "vegetarian", "veg only", "shakahari", "satvik", "sattvic"],
  non_veg: ["non veg", "nonveg", "non-vegetarian", "chicken", "mutton", "fish", "prawn", "egg"],
  halal: ["halal", "halaal"],
  jhatka: ["jhatka", "jhatak"],
  jain: ["jain", "no onion no garlic", "without onion garlic"],
  egg_free: ["egg free", "eggless", "no egg"],
  healthy: ["healthy", "low calorie", "diet food", "high protein", "macro counted"],
};

function matchSynonyms(haystack: string, table: Record<string, string[]>): Set<string> {
  const found = new Set<string>();
  const lower = ` ${haystack
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")} `;
  for (const [slug, synonyms] of Object.entries(table)) {
    for (const synonym of synonyms) {
      if (lower.includes(` ${synonym} `)) {
        found.add(slug);
        break;
      }
    }
  }
  return found;
}

export interface TaxonomyResult {
  cuisine_slugs: string[];
  dietary_tag_slugs: string[];
  unmapped: string[];
}

/**
 * @param explicit  values from a structured column (e.g. the sheet's "cuisines"
 *                  cell), which we hold to a higher standard: anything that
 *                  does not map is reported as unmapped.
 * @param freeText  bio/description text, mined opportunistically. Non-matches
 *                  here are NOT reported — prose is not a taxonomy.
 * @param knownCuisineSlugs  the slugs that actually exist in the database.
 */
export function mapTaxonomy(
  explicit: { cuisines?: string | null; dietary?: string | null },
  freeText: string | null,
  knownCuisineSlugs: string[],
  knownTagSlugs: string[],
): TaxonomyResult {
  const cuisines = new Set<string>();
  const tags = new Set<string>();
  const unmapped: string[] = [];

  const knownCuisines = new Set(knownCuisineSlugs);
  const knownTags = new Set(knownTagSlugs);

  // Structured cuisine column: split on separators, map each entry.
  const explicitCuisines = clean(explicit.cuisines);
  if (explicitCuisines) {
    for (const piece of explicitCuisines.split(/[,;/|]+/)) {
      const value = clean(piece);
      if (!value) continue;
      const direct = value.toLowerCase().trim().replace(/\s+/g, "-");
      if (knownCuisines.has(direct)) {
        cuisines.add(direct);
        continue;
      }
      const matched = matchSynonyms(value, CUISINE_SYNONYMS);
      const usable = [...matched].filter((s) => knownCuisines.has(s));
      if (usable.length > 0) {
        usable.forEach((s) => cuisines.add(s));
      } else {
        unmapped.push(value);
      }
    }
  }

  // Structured dietary column: same treatment.
  const explicitDietary = clean(explicit.dietary);
  if (explicitDietary) {
    for (const piece of explicitDietary.split(/[,;/|]+/)) {
      const value = clean(piece);
      if (!value) continue;
      const direct = value
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, "_");
      if (knownTags.has(direct)) {
        tags.add(direct);
        continue;
      }
      const matched = matchSynonyms(value, DIETARY_SYNONYMS);
      const usable = [...matched].filter((s) => knownTags.has(s));
      if (usable.length > 0) {
        usable.forEach((s) => tags.add(s));
      } else {
        unmapped.push(value);
      }
    }
  }

  // Free text: opportunistic only.
  if (freeText) {
    for (const slug of matchSynonyms(freeText, CUISINE_SYNONYMS)) {
      if (knownCuisines.has(slug)) cuisines.add(slug);
    }
    for (const slug of matchSynonyms(freeText, DIETARY_SYNONYMS)) {
      // Never infer a halal / jhatka / jain claim from prose alone: those are
      // regulatory-adjacent trust claims and must come from the chef or an
      // explicit source field.
      if (["halal", "jhatka", "jain"].includes(slug)) continue;
      if (knownTags.has(slug)) tags.add(slug);
    }
  }

  return {
    cuisine_slugs: [...cuisines].sort(),
    dietary_tag_slugs: [...tags].sort(),
    unmapped: [...new Set(unmapped)],
  };
}

/** Derive the kitchen-level veg/non-veg profile from the mapped tags. */
export function deriveDietaryProfile(tagSlugs: string[]): "veg_only" | "non_veg" | "mixed" | null {
  const hasVeg = tagSlugs.includes("veg");
  const hasNonVeg = tagSlugs.includes("non_veg");
  if (hasVeg && !hasNonVeg) return "veg_only";
  if (hasNonVeg && !hasVeg) return "non_veg";
  if (hasVeg && hasNonVeg) return "mixed";
  return null;
}

/** Best-effort neighbourhood match by name, then by token overlap. */
export function matchNeighbourhood(
  areaText: string | null,
  neighbourhoods: { slug: string; name: string; lat: number; lng: number }[],
): { slug: string; lat: number; lng: number } | null {
  if (!areaText) return null;
  const lower = areaText.toLowerCase();

  // Longest name first so "HSR Layout" beats a stray "HSR".
  const byLength = [...neighbourhoods].sort((a, b) => b.name.length - a.name.length);
  for (const n of byLength) {
    if (lower.includes(n.name.toLowerCase()) || lower.includes(n.slug.replace(/-/g, " "))) {
      return { slug: n.slug, lat: n.lat, lng: n.lng };
    }
  }

  const areaTokens = tokens(areaText);
  for (const n of byLength) {
    const nameTokens = tokens(n.name);
    for (const t of nameTokens) {
      if (areaTokens.has(t)) return { slug: n.slug, lat: n.lat, lng: n.lng };
    }
  }
  return null;
}
