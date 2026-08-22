/**
 * Loose read-side shape of an ingest candidate's `normalised` jsonb (produced
 * by the Phase 2 pipeline). Kept separate from the ingest package's authored
 * CandidateChef so the web app doesn't import across package boundaries — the
 * two are intentionally coupled only by this documented contract.
 */
export interface CandidateChefLike {
  kitchen_name?: string;
  display_name?: string | null;
  bio?: string | null;
  phone_e164?: string | null;
  whatsapp_e164?: string | null;
  instagram_handle?: string | null;
  city_slug?: string;
  neighbourhood_slug?: string | null;
  address_area?: string | null;
  lat?: number | null;
  lng?: number | null;
  geo_source?: string;
  cuisine_slugs?: string[];
  dietary_tag_slugs?: string[];
  dietary_profile?: "veg_only" | "non_veg" | "mixed" | null;
  fssai_number?: string | null;
  suggested_slug?: string;
  unmapped?: string[];
  confidence?: Record<string, number>;
  source?: string;
  source_url?: string | null;
  duplicate_of?: {
    kind: "chef" | "candidate";
    id: string;
    reason: string;
    detail: string;
  } | null;
}
