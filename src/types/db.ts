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

/** Shape of public.admin_overview() (jsonb). */
export interface AdminOverview {
  counts: {
    chefs_approved: number;
    chefs_pending: number;
    chefs_draft: number;
    chefs_unclaimed: number;
    chefs_suspended: number;
    claims_pending: number;
    candidates_new: number;
    candidates_review: number;
  };
  events: Partial<Record<EventKind, number>>;
  top_chefs: {
    kitchen_name: string;
    slug: string;
    city_slug: string;
    neighbourhood_slug: string | null;
    wa_clicks: number;
  }[];
}

/** One row of public.search_chefs() — the geo discovery query. */
export type SearchChefResult = {
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
};

type CountryRow = {
  id: string;
  code: string;
  name: string;
  currency_code: string;
  phone_prefix: string;
  is_active: boolean;
  created_at: string;
};

type CityRow = {
  id: string;
  country_id: string;
  slug: string;
  name: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
};

type NeighbourhoodRow = {
  id: string;
  city_id: string;
  slug: string;
  name: string;
  created_at: string;
};

type CuisineRow = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
};

type DietaryTagRow = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
};

type ChefRow = {
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
  pending_edits: Json | null;
  created_at: string;
  updated_at: string;
};

type MenuItemRow = {
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
};

type ChefPhotoRow = {
  id: string;
  chef_id: string;
  url: string;
  kind: PhotoKind;
  sort_order: number;
  created_at: string;
};

type ClaimRow = {
  id: string;
  chef_id: string;
  claimant_user_id: string;
  claimant_phone: string | null;
  proof_note: string | null;
  status: ClaimStatus;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
};

type VerificationLogRow = {
  id: string;
  chef_id: string;
  admin_user_id: string | null;
  action: VerificationAction;
  note: string | null;
  created_at: string;
};

type EventRow = {
  id: number;
  kind: EventKind;
  chef_id: string | null;
  city_id: string | null;
  geohash5: string | null;
  metadata: Json | null;
  created_at: string;
};

type IngestRawRow = {
  id: string;
  source: string;
  source_url: string | null;
  raw: Json;
  dedupe_key: string;
  scraped_at: string;
};

type IngestCandidateRow = {
  id: string;
  ingest_raw_id: string | null;
  normalised: Json;
  status: IngestStatus;
  promoted_chef_id: string | null;
  created_at: string;
  updated_at: string;
};

type AdminRow = {
  user_id: string;
  email: string;
  created_at: string;
};

/**
 * Insert helper: id/created_at/updated_at, any explicitly-named DB-defaulted
 * column (`Optional`), AND every nullable column are optional on insert —
 * matching how `supabase gen types typescript` actually treats a nullable
 * column (it may always be omitted in favour of NULL).
 */
type NullableKeys<T> = { [K in keyof T]: null extends T[K] ? K : never }[keyof T];
type Insertable<T, Optional extends keyof T = never> = Omit<
  T,
  "created_at" | "updated_at" | "id" | Optional | NullableKeys<T>
> &
  Partial<
    Pick<T, Extract<"id" | "created_at" | "updated_at" | Optional, keyof T> | NullableKeys<T>>
  >;

/** Matches postgrest-js's GenericRelationship shape (kept structural — not imported). */
type Rel<
  FK extends string,
  Columns extends readonly string[],
  Referenced extends string,
  RefColumns extends readonly string[],
  OneToOne extends boolean = false,
> = {
  foreignKeyName: FK;
  columns: Columns;
  isOneToOne: OneToOne;
  referencedRelation: Referenced;
  referencedColumns: RefColumns;
};

/**
 * Row/Insert/Update as usual, plus the FK metadata postgrest-js's typed
 * query parser needs to resolve embedded selects like `cities(name)`. Every
 * FK here mirrors `supabase/migrations/*.sql` — Postgres' default
 * `<table>_<column>_fkey` naming, since none of our FKs use an explicit
 * constraint name. FKs to `auth.users` are omitted: that schema isn't
 * modelled here, so those columns are plain scalars, not embeds.
 */
interface Table<
  Row,
  Insert = Insertable<Row>,
  Update = Partial<Insert>,
  Relationships extends readonly unknown[] = [],
> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
}

export type Database = {
  public: {
    Tables: {
      countries: Table<CountryRow>;
      cities: Table<
        CityRow,
        Insertable<CityRow>,
        Partial<Insertable<CityRow>>,
        [Rel<"cities_country_id_fkey", ["country_id"], "countries", ["id"]>]
      >;
      neighbourhoods: Table<
        NeighbourhoodRow,
        Insertable<NeighbourhoodRow>,
        Partial<Insertable<NeighbourhoodRow>>,
        [Rel<"neighbourhoods_city_id_fkey", ["city_id"], "cities", ["id"]>]
      >;
      cuisines: Table<CuisineRow>;
      dietary_tags: Table<DietaryTagRow>;
      chefs: Table<
        ChefRow,
        // These NOT NULL columns carry DB defaults, so they're optional on insert.
        Insertable<ChefRow, "service_radius_km" | "is_verified" | "status" | "listing_source">,
        Partial<
          Insertable<ChefRow, "service_radius_km" | "is_verified" | "status" | "listing_source">
        >,
        [
          Rel<"chefs_city_id_fkey", ["city_id"], "cities", ["id"]>,
          Rel<"chefs_neighbourhood_id_fkey", ["neighbourhood_id"], "neighbourhoods", ["id"]>,
        ]
      >;
      chef_cuisines: Table<
        { chef_id: string; cuisine_id: string },
        { chef_id: string; cuisine_id: string },
        Partial<{ chef_id: string; cuisine_id: string }>,
        [
          Rel<"chef_cuisines_chef_id_fkey", ["chef_id"], "chefs", ["id"]>,
          Rel<"chef_cuisines_cuisine_id_fkey", ["cuisine_id"], "cuisines", ["id"]>,
        ]
      >;
      chef_dietary_tags: Table<
        { chef_id: string; tag_id: string },
        { chef_id: string; tag_id: string },
        Partial<{ chef_id: string; tag_id: string }>,
        [
          Rel<"chef_dietary_tags_chef_id_fkey", ["chef_id"], "chefs", ["id"]>,
          Rel<"chef_dietary_tags_tag_id_fkey", ["tag_id"], "dietary_tags", ["id"]>,
        ]
      >;
      menu_items: Table<
        MenuItemRow,
        Insertable<MenuItemRow, "is_best_seller" | "is_available" | "sort_order">,
        Partial<Insertable<MenuItemRow, "is_best_seller" | "is_available" | "sort_order">>,
        [Rel<"menu_items_chef_id_fkey", ["chef_id"], "chefs", ["id"]>]
      >;
      chef_photos: Table<
        ChefPhotoRow,
        Insertable<ChefPhotoRow, "kind" | "sort_order">,
        Partial<Insertable<ChefPhotoRow, "kind" | "sort_order">>,
        [Rel<"chef_photos_chef_id_fkey", ["chef_id"], "chefs", ["id"]>]
      >;
      claims: Table<
        ClaimRow,
        Insertable<ClaimRow>,
        Partial<Insertable<ClaimRow>>,
        [Rel<"claims_chef_id_fkey", ["chef_id"], "chefs", ["id"]>]
      >;
      verification_log: Table<
        VerificationLogRow,
        Insertable<VerificationLogRow>,
        Partial<Insertable<VerificationLogRow>>,
        [Rel<"verification_log_chef_id_fkey", ["chef_id"], "chefs", ["id"]>]
      >;
      events: Table<
        EventRow,
        Insertable<EventRow>,
        Partial<Insertable<EventRow>>,
        [
          Rel<"events_chef_id_fkey", ["chef_id"], "chefs", ["id"]>,
          Rel<"events_city_id_fkey", ["city_id"], "cities", ["id"]>,
        ]
      >;
      ingest_raw: Table<IngestRawRow>;
      ingest_candidates: Table<
        IngestCandidateRow,
        Insertable<IngestCandidateRow>,
        Partial<Insertable<IngestCandidateRow>>,
        [
          Rel<"ingest_candidates_ingest_raw_id_fkey", ["ingest_raw_id"], "ingest_raw", ["id"]>,
          Rel<"ingest_candidates_promoted_chef_id_fkey", ["promoted_chef_id"], "chefs", ["id"]>,
        ]
      >;
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
      neighbourhood_centroids: {
        Args: Record<never, never>;
        Returns: { slug: string; name: string; city_slug: string; lat: number; lng: number }[];
      };
      city_centroids: {
        Args: Record<never, never>;
        Returns: { slug: string; name: string; country_code: string; lat: number; lng: number }[];
      };
      chef_public_location: {
        Args: { p_chef_id: string };
        Returns: { lat: number; lng: number }[];
      };
      admin_set_chef_status: {
        Args: { p_chef_id: string; p_status: string; p_note?: string | null };
        Returns: undefined;
      };
      admin_request_info: {
        Args: { p_chef_id: string; p_note: string };
        Returns: undefined;
      };
      admin_verify_fssai: {
        Args: { p_chef_id: string; p_note?: string | null };
        Returns: undefined;
      };
      admin_set_chef_location: {
        Args: { p_chef_id: string; p_lat: number; p_lng: number; p_note?: string | null };
        Returns: undefined;
      };
      admin_log_edit: {
        Args: { p_chef_id: string; p_note: string };
        Returns: undefined;
      };
      admin_decide_claim: {
        Args: { p_claim_id: string; p_approve: boolean; p_note?: string | null };
        Returns: undefined;
      };
      promote_ingest_candidate: {
        Args: { candidate_id: string };
        Returns: string;
      };
      ingest_stats: {
        Args: Record<never, never>;
        Returns: { metric: string; value: number }[];
      };
      admin_overview: {
        Args: { p_days?: number };
        Returns: AdminOverview;
      };
      chef_set_own_location: {
        Args: { p_chef_id: string; p_lat: number; p_lng: number };
        Returns: undefined;
      };
      chef_event_stats: {
        Args: { p_chef_id: string; p_days?: number };
        Returns: { kind: string; cnt: number }[];
      };
      admin_apply_pending_edits: {
        Args: { p_chef_id: string; p_note?: string | null };
        Returns: undefined;
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
};
