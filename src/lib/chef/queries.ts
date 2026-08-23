import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, ChefStatus } from "@/types/db";

type Client = SupabaseClient<Database>;

/** The chef's own listing — all fields including private ones. */
export interface MyChefDetail {
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
  claimedBy: string | null;
  fssaiNumber: string | null;
  dietaryProfile: "veg_only" | "non_veg" | "mixed" | null;
  isVerified: boolean;
  timings: Json | null;
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
  /** Latest admin note requesting info (if status is pending_review). */
  latestAdminNote: string | null;
}

export async function getMyChef(supabase: Client, chefId: string): Promise<MyChefDetail | null> {
  const { data: chef, error } = await supabase
    .from("chefs")
    .select(
      `id, slug, display_name, kitchen_name, bio, photo_url, phone_e164, whatsapp_e164,
       instagram_handle, address_text, address_area, service_radius_km, status,
       claimed_by, fssai_number, dietary_profile, is_verified, timings, pending_edits,
       city_id, neighbourhood_id,
       cities!inner(slug, name, countries(currency_code)),
       neighbourhoods(slug)`,
    )
    .eq("id", chefId)
    .maybeSingle();
  if (error) throw new Error(`getMyChef: ${error.message}`);
  if (!chef) return null;

  const city = chef.cities as unknown as {
    slug: string;
    name: string;
    countries: { currency_code: string } | null;
  };
  const hood = chef.neighbourhoods as unknown as { slug: string } | null;

  const [cuisines, tags, photos, menu, logRes, loc] = await Promise.all([
    supabase.from("chef_cuisines").select("cuisines(slug)").eq("chef_id", chefId),
    supabase.from("chef_dietary_tags").select("dietary_tags(slug)").eq("chef_id", chefId),
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
    // The chef can't read verification_log via RLS — we use the latest note
    // pattern: if status = pending_review, the admin may have left an
    // info_requested note. We fetch via a plain select and it'll come back
    // empty for non-admins — that's fine, we surface it only when we have it.
    supabase
      .from("verification_log")
      .select("note, action")
      .eq("chef_id", chefId)
      .eq("action", "info_requested")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.rpc("chef_public_location", { p_chef_id: chefId }),
  ]);

  const location = (loc.data as { lat: number; lng: number }[] | null)?.[0] ?? null;

  // The verification_log query may return empty if RLS blocks it — that's okay.
  const latestNote = (logRes.data ?? [])[0]?.note ?? null;

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
    claimedBy: chef.claimed_by,
    fssaiNumber: chef.fssai_number,
    dietaryProfile: chef.dietary_profile,
    isVerified: chef.is_verified,
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
    latestAdminNote: latestNote,
  };
}

/** Search unclaimed chefs in a city by kitchen name (for the claim "find my kitchen" flow). */
export async function searchUnclaimedChefs(
  supabase: Client,
  query: string,
  cityId?: string,
): Promise<{ id: string; kitchenName: string; addressArea: string | null; slug: string }[]> {
  let q = supabase
    .from("chefs")
    .select("id, kitchen_name, address_area, slug")
    .is("claimed_by", null)
    .ilike("kitchen_name", `%${query}%`)
    .limit(20);

  if (cityId) q = q.eq("city_id", cityId);

  const { data, error } = await q;
  if (error) throw new Error(`searchUnclaimedChefs: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.id,
    kitchenName: c.kitchen_name,
    addressArea: c.address_area,
    slug: c.slug,
  }));
}

/** Get event stats for the dashboard "My stats" panel. */
export async function getChefStats(
  supabase: Client,
  chefId: string,
  days = 30,
): Promise<{ waClicks: number; profileViews: number }> {
  const { data, error } = await supabase.rpc("chef_event_stats", {
    p_chef_id: chefId,
    p_days: days,
  });
  if (error) return { waClicks: 0, profileViews: 0 };

  let waClicks = 0;
  let profileViews = 0;
  for (const row of data ?? []) {
    if (row.kind === "wa_click") waClicks = Number(row.cnt);
    if (row.kind === "profile_view") profileViews = Number(row.cnt);
  }
  return { waClicks, profileViews };
}

export interface PendingClaim {
  id: string;
  chefId: string;
  kitchenName: string;
  createdAt: string;
}

/**
 * Claims this user has waiting on a decision.
 *
 * A pending claim sets no `claimed_by`, so a chef who claims a kitchen and
 * comes back later has no listing attached to them and lands on the onboarding
 * chooser — as if the claim never happened. This is what the dashboard uses to
 * tell them it did.
 */
export async function getMyPendingClaims(supabase: Client): Promise<PendingClaim[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("claims")
    .select("id, chef_id, created_at, chefs(kitchen_name)")
    .eq("claimant_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("getMyPendingClaims:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const chef = row.chefs as unknown as { kitchen_name: string } | null;
    return {
      id: row.id,
      chefId: row.chef_id,
      kitchenName: chef?.kitchen_name ?? "your kitchen",
      createdAt: row.created_at,
    };
  });
}
