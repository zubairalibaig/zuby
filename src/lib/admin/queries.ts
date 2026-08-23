import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminMetrics,
  AdminOverview,
  ChefStatus,
  Database,
  ListingSource,
  Json,
} from "@/types/db";
import type { CandidateChefLike } from "@/lib/admin/types";

type Client = SupabaseClient<Database>;

export async function getOverview(supabase: Client, days = 7): Promise<AdminOverview> {
  const { data, error } = await supabase.rpc("admin_overview", { p_days: days });
  if (error) throw new Error(`getOverview: ${error.message}`);
  return data as unknown as AdminOverview;
}

export interface QueueRow {
  id: string;
  kitchenName: string;
  addressArea: string | null;
  citySlug: string;
  neighbourhoodSlug: string | null;
  status: ChefStatus;
  listingSource: ListingSource;
  createdAt: string;
  hasPhoto: boolean;
  hasFssai: boolean;
  hasWhatsapp: boolean;
  menuCount: number;
  /** Approved chef whose self-serve trust-field edits are waiting on review (Phase 4). */
  hasPendingEdits: boolean;
}

/**
 * The review queue: chefs awaiting first approval, plus already-approved chefs
 * who have queued trust-field edits (Phase 4 pending-edits pattern). The latter
 * stay `approved` — their public page keeps serving last-approved values — so
 * they'd be invisible to a status-only filter.
 */
export async function getQueue(supabase: Client): Promise<QueueRow[]> {
  const { data, error } = await supabase
    .from("chefs")
    .select(
      `id, kitchen_name, address_area, photo_url, fssai_number, whatsapp_e164,
       status, listing_source, created_at, pending_edits,
       cities!inner(slug), neighbourhoods(slug),
       menu_items(count)`,
    )
    .or("status.eq.pending_review,pending_edits.not.is.null")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getQueue: ${error.message}`);

  return (data ?? []).map((c) => {
    const city = c.cities as unknown as { slug: string };
    const hood = c.neighbourhoods as unknown as { slug: string } | null;
    const menu = c.menu_items as unknown as { count: number }[];
    return {
      id: c.id,
      kitchenName: c.kitchen_name,
      addressArea: c.address_area,
      citySlug: city.slug,
      neighbourhoodSlug: hood?.slug ?? null,
      status: c.status,
      listingSource: c.listing_source,
      createdAt: c.created_at,
      hasPhoto: Boolean(c.photo_url),
      hasFssai: Boolean(c.fssai_number),
      hasWhatsapp: Boolean(c.whatsapp_e164),
      menuCount: menu?.[0]?.count ?? 0,
      hasPendingEdits: c.pending_edits !== null,
    };
  });
}

export interface AdminChefDetail {
  id: string;
  slug: string;
  displayName: string;
  kitchenName: string;
  bio: string | null;
  photoUrl: string | null;
  phoneE164: string | null;
  whatsappE164: string | null;
  instagramHandle: string | null;
  addressText: string | null;
  addressArea: string | null;
  serviceRadiusKm: number;
  status: ChefStatus;
  listingSource: ListingSource;
  claimedBy: string | null;
  fssaiNumber: string | null;
  fssaiVerifiedAt: string | null;
  isVerified: boolean;
  dietaryProfile: "veg_only" | "non_veg" | "mixed" | null;
  timings: Json | null;
  /** Queued trust-field edits awaiting admin approval (Phase 4). */
  pendingEdits: Json | null;
  cityId: string;
  citySlug: string;
  cityName: string;
  currencyCode: string;
  neighbourhoodId: string | null;
  neighbourhoodSlug: string | null;
  lat: number | null;
  lng: number | null;
  cuisineSlugs: string[];
  dietaryTagSlugs: string[];
  photos: { id: string; url: string; kind: "kitchen" | "food" | "chef"; sortOrder: number }[];
  menuItems: {
    id: string;
    name: string;
    description: string | null;
    photoUrl: string | null;
    price: number | null;
    currencyCode: string;
    unit: string | null;
    isBestSeller: boolean;
    isAvailable: boolean;
    dietary: "veg" | "non_veg" | "egg" | null;
    nutrition: Json | null;
    sortOrder: number;
  }[];
  auditLog: {
    action: string;
    note: string | null;
    createdAt: string;
    adminUserId: string | null;
  }[];
}

/** Full chef record for the review/edit screens — includes private fields. */
export async function getAdminChef(
  supabase: Client,
  chefId: string,
): Promise<AdminChefDetail | null> {
  const { data: chef, error } = await supabase
    .from("chefs")
    .select(
      `id, slug, display_name, kitchen_name, bio, photo_url, phone_e164, whatsapp_e164,
       instagram_handle, address_text, address_area, service_radius_km, status, listing_source,
       claimed_by, fssai_number, fssai_verified_at, is_verified, dietary_profile, timings,
       pending_edits, city_id, neighbourhood_id,
       cities!inner(slug, name, countries(currency_code)),
       neighbourhoods(slug)`,
    )
    .eq("id", chefId)
    .maybeSingle();
  if (error) throw new Error(`getAdminChef: ${error.message}`);
  if (!chef) return null;

  const city = chef.cities as unknown as {
    slug: string;
    name: string;
    countries: { currency_code: string } | null;
  };
  const hood = chef.neighbourhoods as unknown as { slug: string } | null;

  const [cuisines, tags, photos, menu, log, loc] = await Promise.all([
    supabase.from("chef_cuisines").select("cuisine_id, cuisines(slug)").eq("chef_id", chefId),
    supabase.from("chef_dietary_tags").select("tag_id, dietary_tags(slug)").eq("chef_id", chefId),
    supabase
      .from("chef_photos")
      .select("id, url, kind, sort_order")
      .eq("chef_id", chefId)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id, name, description, photo_url, price, currency_code, unit, is_best_seller, is_available, dietary, nutrition, sort_order",
      )
      .eq("chef_id", chefId)
      .order("sort_order"),
    supabase
      .from("verification_log")
      .select("action, note, created_at, admin_user_id")
      .eq("chef_id", chefId)
      .order("created_at", { ascending: false }),
    supabase.rpc("chef_public_location", { p_chef_id: chefId }),
  ]);

  const location = (loc.data as { lat: number; lng: number }[] | null)?.[0] ?? null;

  return {
    id: chef.id,
    slug: chef.slug,
    displayName: chef.display_name,
    kitchenName: chef.kitchen_name,
    bio: chef.bio,
    photoUrl: chef.photo_url,
    phoneE164: chef.phone_e164,
    whatsappE164: chef.whatsapp_e164,
    instagramHandle: chef.instagram_handle,
    addressText: chef.address_text,
    addressArea: chef.address_area,
    serviceRadiusKm: chef.service_radius_km,
    status: chef.status,
    listingSource: chef.listing_source,
    claimedBy: chef.claimed_by,
    fssaiNumber: chef.fssai_number,
    fssaiVerifiedAt: chef.fssai_verified_at,
    isVerified: chef.is_verified,
    dietaryProfile: chef.dietary_profile,
    timings: chef.timings,
    pendingEdits: chef.pending_edits,
    cityId: chef.city_id,
    citySlug: city.slug,
    cityName: city.name,
    currencyCode: city.countries?.currency_code ?? "INR",
    neighbourhoodId: chef.neighbourhood_id,
    neighbourhoodSlug: hood?.slug ?? null,
    lat: location?.lat ?? null,
    lng: location?.lng ?? null,
    cuisineSlugs: (cuisines.data ?? [])
      .map((r) => (r.cuisines as unknown as { slug: string } | null)?.slug)
      .filter((s): s is string => Boolean(s)),
    dietaryTagSlugs: (tags.data ?? [])
      .map((r) => (r.dietary_tags as unknown as { slug: string } | null)?.slug)
      .filter((s): s is string => Boolean(s)),
    photos: (photos.data ?? []).map((p) => ({
      id: p.id,
      url: p.url,
      kind: p.kind,
      sortOrder: p.sort_order,
    })),
    menuItems: (menu.data ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      photoUrl: m.photo_url,
      price: m.price,
      currencyCode: m.currency_code,
      unit: m.unit,
      isBestSeller: m.is_best_seller,
      isAvailable: m.is_available,
      dietary: m.dietary,
      nutrition: m.nutrition,
      sortOrder: m.sort_order,
    })),
    auditLog: (log.data ?? []).map((l) => ({
      action: l.action,
      note: l.note,
      createdAt: l.created_at,
      adminUserId: l.admin_user_id,
    })),
  };
}

export interface ChefListRow {
  id: string;
  kitchenName: string;
  addressArea: string | null;
  status: ChefStatus;
  listingSource: ListingSource;
  claimed: boolean;
  citySlug: string;
  neighbourhoodSlug: string | null;
}

export interface ChefListFilters {
  status?: ChefStatus;
  source?: ListingSource;
  claimed?: "claimed" | "unclaimed";
  search?: string;
}

export async function listChefs(
  supabase: Client,
  filters: ChefListFilters,
): Promise<ChefListRow[]> {
  let query = supabase
    .from("chefs")
    .select(
      `id, kitchen_name, address_area, status, listing_source, claimed_by,
       cities!inner(slug), neighbourhoods(slug)`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.source) query = query.eq("listing_source", filters.source);
  if (filters.claimed === "claimed") query = query.not("claimed_by", "is", null);
  if (filters.claimed === "unclaimed") query = query.is("claimed_by", null);
  if (filters.search) query = query.ilike("kitchen_name", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw new Error(`listChefs: ${error.message}`);

  return (data ?? []).map((c) => {
    const city = c.cities as unknown as { slug: string };
    const hood = c.neighbourhoods as unknown as { slug: string } | null;
    return {
      id: c.id,
      kitchenName: c.kitchen_name,
      addressArea: c.address_area,
      status: c.status,
      listingSource: c.listing_source,
      claimed: c.claimed_by !== null,
      citySlug: city.slug,
      neighbourhoodSlug: hood?.slug ?? null,
    };
  });
}

export interface RefData {
  cities: { id: string; slug: string; name: string; currencyCode: string }[];
  neighbourhoods: {
    id: string;
    slug: string;
    name: string;
    citySlug: string;
    lat: number;
    lng: number;
  }[];
  cuisines: { slug: string; name: string }[];
  dietaryTags: { slug: string; name: string }[];
}

/** Dropdown/reference data for the editor forms. */
export async function getRefData(supabase: Client): Promise<RefData> {
  const [cities, hoods, centroids, cuisines, tags] = await Promise.all([
    supabase.from("cities").select("id, slug, name, countries(currency_code)"),
    supabase.from("neighbourhoods").select("id, slug, name, cities!inner(slug)"),
    supabase.rpc("neighbourhood_centroids"),
    supabase.from("cuisines").select("slug, name").order("name"),
    supabase.from("dietary_tags").select("slug, name").order("name"),
  ]);
  if (cities.error) throw new Error(cities.error.message);
  if (hoods.error) throw new Error(hoods.error.message);
  if (centroids.error) throw new Error(centroids.error.message);

  const cityList = (cities.data ?? []).map((c) => {
    const country = c.countries as unknown as { currency_code: string } | null;
    return { id: c.id, slug: c.slug, name: c.name, currencyCode: country?.currency_code ?? "INR" };
  });

  const centroidBySlug = new Map((centroids.data ?? []).map((n) => [n.slug, n]));

  return {
    cities: cityList,
    neighbourhoods: (hoods.data ?? [])
      .map((n) => {
        const city = n.cities as unknown as { slug: string };
        const centroid = centroidBySlug.get(n.slug);
        return {
          id: n.id,
          slug: n.slug,
          name: n.name,
          citySlug: city.slug,
          lat: centroid?.lat ?? 0,
          lng: centroid?.lng ?? 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    cuisines: cuisines.data ?? [],
    dietaryTags: tags.data ?? [],
  };
}

export interface IngestCandidateRow {
  id: string;
  status: string;
  kitchenName: string | null;
  area: string | null;
  neighbourhood: string | null;
  whatsapp: string | null;
  source: string | null;
  hasDuplicate: boolean;
  hasUnmapped: boolean;
  createdAt: string;
  promotedChefId: string | null;
}

export async function listIngestCandidates(
  supabase: Client,
  status?: string,
): Promise<IngestCandidateRow[]> {
  let query = supabase
    .from("ingest_candidates")
    .select("id, status, normalised, promoted_chef_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status as never);

  const { data, error } = await query;
  if (error) throw new Error(`listIngestCandidates: ${error.message}`);

  return (data ?? []).map((c) => {
    const n = (c.normalised ?? {}) as CandidateChefLike;
    return {
      id: c.id,
      status: c.status,
      kitchenName: n.kitchen_name ?? null,
      area: n.address_area ?? null,
      neighbourhood: n.neighbourhood_slug ?? null,
      whatsapp: n.whatsapp_e164 ?? null,
      source: n.source ?? null,
      hasDuplicate: n.duplicate_of != null,
      hasUnmapped: Array.isArray(n.unmapped) && n.unmapped.length > 0,
      createdAt: c.created_at,
      promotedChefId: c.promoted_chef_id,
    };
  });
}

export async function getIngestCandidate(
  supabase: Client,
  id: string,
): Promise<{ id: string; status: string; normalised: CandidateChefLike; raw: Json | null } | null> {
  const { data, error } = await supabase
    .from("ingest_candidates")
    .select("id, status, normalised, ingest_raw(raw, source, source_url)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getIngestCandidate: ${error.message}`);
  if (!data) return null;
  const raw = data.ingest_raw as unknown as { raw: Json } | null;
  return {
    id: data.id,
    status: data.status,
    normalised: (data.normalised ?? {}) as CandidateChefLike,
    raw: raw?.raw ?? null,
  };
}

export interface ClaimRow {
  id: string;
  status: string;
  proofNote: string | null;
  claimantPhone: string | null;
  createdAt: string;
  chefId: string;
  chefKitchenName: string;
  chefWhatsapp: string | null;
  chefSlug: string;
  citySlug: string;
  neighbourhoodSlug: string | null;
}

export async function listClaims(supabase: Client, status = "pending"): Promise<ClaimRow[]> {
  const { data, error } = await supabase
    .from("claims")
    .select(
      `id, status, proof_note, claimant_phone, created_at, chef_id,
       chefs!inner(kitchen_name, whatsapp_e164, slug, cities!inner(slug), neighbourhoods(slug))`,
    )
    .eq("status", status as never)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listClaims: ${error.message}`);

  return (data ?? []).map((c) => {
    const chef = c.chefs as unknown as {
      kitchen_name: string;
      whatsapp_e164: string | null;
      slug: string;
      cities: { slug: string };
      neighbourhoods: { slug: string } | null;
    };
    return {
      id: c.id,
      status: c.status,
      proofNote: c.proof_note,
      claimantPhone: c.claimant_phone,
      createdAt: c.created_at,
      chefId: c.chef_id,
      chefKitchenName: chef.kitchen_name,
      chefWhatsapp: chef.whatsapp_e164,
      chefSlug: chef.slug,
      citySlug: chef.cities.slug,
      neighbourhoodSlug: chef.neighbourhoods?.slug ?? null,
    };
  });
}

/** Where a scraped/promoted chef originally came from (Phase 2 provenance). */
export async function getChefProvenance(
  supabase: Client,
  chefId: string,
): Promise<{ source: string | null; sourceUrl: string | null } | null> {
  const { data, error } = await supabase
    .from("ingest_candidates")
    .select("ingest_raw(source, source_url)")
    .eq("promoted_chef_id", chefId)
    .maybeSingle();
  if (error || !data) return null;
  const raw = data.ingest_raw as unknown as { source: string; source_url: string | null } | null;
  return raw ? { source: raw.source, sourceUrl: raw.source_url } : null;
}

/** The Phase 5 launch-KPI dashboard. One round trip; all aggregation in SQL. */
export async function getMetrics(supabase: Client, weeks = 8): Promise<AdminMetrics> {
  const { data, error } = await supabase.rpc("admin_metrics", { p_weeks: weeks });
  if (error) throw new Error(`getMetrics: ${error.message}`);
  return data as unknown as AdminMetrics;
}
