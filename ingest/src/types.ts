import { z } from "zod";

/**
 * The normalised shape of a scraped listing, mirroring the `chefs` table.
 * Everything is optional except the kitchen name and the source, because real
 * scraped data is patchy — the normaliser records what it found and reports
 * confidence rather than inventing values.
 */
export const candidateChefSchema = z.object({
  kitchen_name: z.string().min(2),
  display_name: z.string().min(2).nullable(),
  bio: z.string().nullable(),

  /** Always E.164, or null when nothing parseable was published. */
  phone_e164: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/)
    .nullable(),
  whatsapp_e164: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/)
    .nullable(),
  instagram_handle: z.string().nullable(),

  city_slug: z.string(),
  neighbourhood_slug: z.string().nullable(),
  /** Public-facing area text, e.g. "Indiranagar 2nd Stage". Never a full address. */
  address_area: z.string().nullable(),
  /**
   * Approximate coordinates only. When no address is published this is the
   * neighbourhood centroid — never a fabricated precise location.
   */
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  geo_source: z.enum(["neighbourhood_centroid", "city_centroid", "provided", "none"]),

  cuisine_slugs: z.array(z.string()),
  dietary_tag_slugs: z.array(z.string()),
  dietary_profile: z.enum(["veg_only", "non_veg", "mixed"]).nullable(),

  fssai_number: z
    .string()
    .regex(/^\d{14}$/)
    .nullable(),

  suggested_slug: z.string().regex(/^[a-z0-9-]+$/),

  /** Cuisine/tag strings we could not map — an admin decides what to do. */
  unmapped: z.array(z.string()),

  /** Per-field confidence, 0..1. Drives whether a candidate needs review. */
  confidence: z.record(z.string(), z.number().min(0).max(1)),

  source: z.string(),
  source_url: z.string().nullable(),

  /** Set by the dedupe pass when this looks like an existing chef/candidate. */
  duplicate_of: z
    .object({
      kind: z.enum(["chef", "candidate"]),
      id: z.string(),
      reason: z.enum(["phone", "name_similarity"]),
      detail: z.string(),
    })
    .nullable()
    .default(null),
});

export type CandidateChef = z.infer<typeof candidateChefSchema>;

/** A row as it arrives from a collector, before normalisation. */
export interface RawRecord {
  source: string;
  source_url: string | null;
  /** Whatever the collector found, verbatim — kept for provenance. */
  raw: Record<string, unknown>;
  /** Stable key so re-running a collector updates instead of duplicating. */
  dedupe_key: string;
}

/** Reference data loaded once from the database and passed to the normaliser. */
export interface RefData {
  cities: { id: string; slug: string; name: string; country_code: string }[];
  neighbourhoods: {
    id: string;
    city_slug: string;
    slug: string;
    name: string;
    lat: number;
    lng: number;
  }[];
  cuisines: { id: string; slug: string; name: string }[];
  dietaryTags: { id: string; slug: string; name: string }[];
}
