/**
 * Database types.
 *
 * Hand-maintained to match `supabase/migrations/`. Once the Supabase project is
 * linked locally you can regenerate the authoritative version with:
 *
 *   npm run db:types      # writes src/types/db.generated.ts
 *
 * and then re-export it from here. Until then this file is the contract the app
 * compiles against — keep it in step with any new migration.
 */

export type ChefStatus =
  "draft" | "pending_review" | "approved" | "rejected" | "suspended" | "delisted";

export type ListingSource = "scraped" | "self_signup" | "claimed";
export type DietaryProfile = "veg_only" | "non_veg" | "mixed";
export type ItemDietary = "veg" | "non_veg" | "egg";
export type ClaimStatus = "pending" | "approved" | "rejected";
export type EventKind = "wa_click" | "profile_view" | "search" | "claim_started";
export type IngestStatus = "new" | "needs_review" | "promoted" | "discarded";
export type PhotoKind = "kitchen" | "food" | "chef";
export type VerificationAction =
  | "approved"
  | "rejected"
  | "info_requested"
  | "suspended"
  | "delisted"
  | "claim_approved"
  | "claim_rejected"
  | "edited";

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

/** One row of public.search_chefs() — the geo discovery query. */
export interface SearchChefResult {
  id: string;
  slug: string;
  kitchen_name: string;
  display_name: string;
  bio: string | null;
  photo_url: string | null;
  city_slug: string;
  neighbourhood_slug: string | null;
  neighbourhood_name: string | null;
  address_area: string | null;
  dietary_profile: DietaryProfile | null;
  is_verified: boolean;
  fssai_number: string | null;
  service_radius_km: number;
  timings: Json | null;
  distance_km: number;
  approx_lat: number;
  approx_lng: number;
  cuisines: string[];
  dietary_tags: string[];
}

interface CountryRow {
  id: string;
  code: string;
  name: string;
  currency_code: string;
  phone_prefix: string;
  is_active: boolean;
  created_at: string;
}

interface CityRow {
  id: string;
  country_id: string;
  slug: string;
  name: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

interface NeighbourhoodRow {
  id: string;
  city_id: string;
  slug: string;
  name: string;
  created_at: string;
}

interface CuisineRow {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

interface DietaryTagRow {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

interface ChefRow {
  id: string;
  city_id: string;
  neighbourhood_id: string | null;
  slug: string;
  display_name: string;
  kitchen_name: string;
  bio: string | null;
  photo_url: string | null;
  phone_e164: string | null;
  whatsapp_e164: string | null;
  instagram_handle: string | null;
  service_radius_km: number;
  address_text: string | null;
  address_area: string | null;
  status: ChefStatus;
  listing_source: ListingSource;
  claimed_by: string | null;
  fssai_number: string | null;
  fssai_verified_at: string | null;
  fssai_verified_by: string | null;
  sfa_compliant: boolean | null;
  muis_certified: boolean | null;
  dietary_profile: DietaryProfile | null;
  is_verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  timings: Json | null;
  created_at: string;
  updated_at: string;
}

interface MenuItemRow {
  id: string;
  chef_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  price: number | null;
  currency_code: string;
  unit: string | null;
  is_best_seller: boolean;
  is_available: boolean;
  dietary: ItemDietary | null;
  nutrition: Json | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ChefPhotoRow {
  id: string;
  chef_id: string;
  url: string;
  kind: PhotoKind;
  sort_order: number;
  created_at: string;
}

interface ClaimRow {
  id: string;
  chef_id: string;
  claimant_user_id: string;
  claimant_phone: string | null;
  proof_note: string | null;
  status: ClaimStatus;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

interface VerificationLogRow {
  id: string;
  chef_id: string;
  admin_user_id: string | null;
  action: VerificationAction;
  note: string | null;
  created_at: string;
}

interface EventRow {
  id: number;
  kind: EventKind;
  chef_id: string | null;
  city_id: string | null;
  geohash5: string | null;
  metadata: Json | null;
  created_at: string;
}

interface IngestRawRow {
  id: string;
  source: string;
  source_url: string | null;
  raw: Json;
  dedupe_key: string;
  scraped_at: string;
}

interface IngestCandidateRow {
  id: string;
  ingest_raw_id: string | null;
  normalised: Json;
  status: IngestStatus;
  promoted_chef_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminRow {
  user_id: string;
  email: string;
  created_at: string;
}

/** Insert/Update helpers: id + timestamps are DB-defaulted. */
type Insertable<T, Optional extends keyof T = never> = Omit<T, "created_at" | "updated_at" | "id"> &
  Partial<Pick<T, Extract<"id" | "created_at" | "updated_at" | Optional, keyof T>>>;

interface Table<Row, Insert = Insertable<Row>, Update = Partial<Insert>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      countries: Table<CountryRow>;
      cities: Table<CityRow>;
      neighbourhoods: Table<NeighbourhoodRow>;
      cuisines: Table<CuisineRow>;
      dietary_tags: Table<DietaryTagRow>;
      chefs: Table<ChefRow>;
      chef_cuisines: Table<{ chef_id: string; cuisine_id: string }>;
      chef_dietary_tags: Table<{ chef_id: string; tag_id: string }>;
      menu_items: Table<MenuItemRow>;
      chef_photos: Table<ChefPhotoRow>;
      claims: Table<ClaimRow>;
      verification_log: Table<VerificationLogRow>;
      events: Table<EventRow>;
      ingest_raw: Table<IngestRawRow>;
      ingest_candidates: Table<IngestCandidateRow>;
      admins: Table<AdminRow>;
    };
    Views: Record<never, never>;
    Functions: {
      search_chefs: {
        Args: {
          lat: number;
          lng: number;
          max_km?: number;
          tag_slugs?: string[] | null;
          cuisine_slugs?: string[] | null;
          city?: string | null;
        };
        Returns: SearchChefResult[];
      };
      is_admin: {
        Args: Record<never, never>;
        Returns: boolean;
      };
    };
    Enums: {
      chef_status: ChefStatus;
      listing_source: ListingSource;
      dietary_profile: DietaryProfile;
      item_dietary: ItemDietary;
      claim_status: ClaimStatus;
      event_kind: EventKind;
      ingest_status: IngestStatus;
      photo_kind: PhotoKind;
      verification_action: VerificationAction;
    };
    CompositeTypes: Record<never, never>;
  };
}
