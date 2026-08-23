"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { revalidateChefPaths } from "@/lib/revalidate";
import { timingsSchema, nutritionSchema, e164Schema, fssaiSchema } from "@/types/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/db";

type Client = SupabaseClient<Database>;

export interface ActionResult {
  ok: boolean;
  error?: string;
  chefId?: string;
  /** Id of the row this action created, when it created one. */
  id?: string;
}

/** Verify the caller owns this chef. */
async function requireOwnership(supabase: Client, chefId: string): Promise<{ userId: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data } = await supabase.from("chefs").select("claimed_by").eq("id", chefId).maybeSingle();
  if (!data || data.claimed_by !== user.id) throw new Error("Not your listing");
  return { userId: user.id };
}

/** Look up slugs for ISR revalidation. */
async function chefPaths(supabase: Client, chefId: string) {
  const { data } = await supabase
    .from("chefs")
    .select("slug, cities!inner(slug), neighbourhoods(slug), chef_cuisines(cuisines(slug))")
    .eq("id", chefId)
    .maybeSingle();
  if (!data) return null;
  const city = data.cities as unknown as { slug: string };
  const hood = data.neighbourhoods as unknown as { slug: string } | null;
  const cuisineRows = (data.chef_cuisines ?? []) as unknown as {
    cuisines: { slug: string } | null;
  }[];
  return {
    citySlug: city.slug,
    neighbourhoodSlug: hood?.slug ?? null,
    chefSlug: data.slug,
    cuisineSlugs: cuisineRows.map((r) => r.cuisines?.slug).filter((s): s is string => Boolean(s)),
  };
}

async function revalidateChef(supabase: Client, chefId: string) {
  const paths = await chefPaths(supabase, chefId);
  if (paths) revalidateChefPaths(paths);
}

// ---------------------------------------------------------------------------
// Create listing (stepper)
// ---------------------------------------------------------------------------

export async function createChefListing(input: {
  kitchenName: string;
  displayName: string;
  cityId: string;
  neighbourhoodId: string | null;
  slug: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    // Check if user already has a listing.
    const { data: existing } = await supabase
      .from("chefs")
      .select("id")
      .eq("claimed_by", user.id)
      .maybeSingle();
    if (existing) return { ok: false, error: "You already have a listing.", chefId: existing.id };

    const { data: created, error } = await supabase
      .from("chefs")
      .insert({
        city_id: input.cityId,
        neighbourhood_id: input.neighbourhoodId,
        slug: input.slug,
        kitchen_name: input.kitchenName,
        display_name: input.displayName,
        // chefs_guard trigger sets claimed_by = auth.uid(), listing_source = self_signup,
        // status = draft for non-admin inserts.
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);

    return { ok: true, chefId: created?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Save draft fields (stepper steps, doesn't change status)
// ---------------------------------------------------------------------------

export async function saveChefDraft(
  chefId: string,
  fields: {
    bio?: string | null;
    whatsappE164?: string | null;
    phoneE164?: string | null;
    addressArea?: string | null;
    addressText?: string | null;
    serviceRadiusKm?: number;
    fssaiNumber?: string | null;
    dietaryProfile?: "veg_only" | "non_veg" | "mixed" | null;
    neighbourhoodId?: string | null;
    cuisineSlugs?: string[];
    dietaryTagSlugs?: string[];
    timings?: unknown;
    lat?: number | null;
    lng?: number | null;
  },
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    await requireOwnership(supabase, chefId);

    // Validate what's provided.
    if (fields.whatsappE164) {
      const parsed = e164Schema.safeParse(fields.whatsappE164);
      if (!parsed.success)
        return { ok: false, error: "WhatsApp number must be E.164 format (e.g. +919900000001)" };
    }
    if (fields.fssaiNumber) {
      const parsed = fssaiSchema.safeParse(fields.fssaiNumber);
      if (!parsed.success) return { ok: false, error: "FSSAI number must be exactly 14 digits" };
    }

    // Build update object.
    const update: Record<string, unknown> = {};
    if (fields.bio !== undefined) update.bio = fields.bio;
    if (fields.whatsappE164 !== undefined) update.whatsapp_e164 = fields.whatsappE164;
    if (fields.phoneE164 !== undefined) update.phone_e164 = fields.phoneE164;
    if (fields.addressArea !== undefined) update.address_area = fields.addressArea;
    if (fields.addressText !== undefined) update.address_text = fields.addressText;
    if (fields.serviceRadiusKm !== undefined) update.service_radius_km = fields.serviceRadiusKm;
    if (fields.fssaiNumber !== undefined) update.fssai_number = fields.fssaiNumber;
    if (fields.dietaryProfile !== undefined) update.dietary_profile = fields.dietaryProfile;
    if (fields.neighbourhoodId !== undefined) update.neighbourhood_id = fields.neighbourhoodId;

    if (fields.timings !== undefined) {
      if (fields.timings) {
        const parsed = timingsSchema.safeParse(fields.timings);
        if (!parsed.success) return { ok: false, error: "Timings are invalid." };
        update.timings = parsed.data as unknown as Json;
      } else {
        update.timings = null;
      }
    }

    if (Object.keys(update).length > 0) {
      const { error } = await supabase
        .from("chefs")
        .update(update as never)
        .eq("id", chefId);
      if (error) throw new Error(error.message);
    }

    // Location via RPC (geography column can't be set directly through PostgREST).
    if (fields.lat != null && fields.lng != null) {
      const { error } = await supabase.rpc("chef_set_own_location", {
        p_chef_id: chefId,
        p_lat: fields.lat,
        p_lng: fields.lng,
      });
      if (error) throw new Error(error.message);
    }

    // Sync cuisines + dietary tags.
    if (fields.cuisineSlugs !== undefined) {
      await syncJoin(
        supabase,
        "chef_cuisines",
        "cuisine_id",
        chefId,
        fields.cuisineSlugs,
        "cuisines",
      );
    }
    if (fields.dietaryTagSlugs !== undefined) {
      await syncJoin(
        supabase,
        "chef_dietary_tags",
        "tag_id",
        chefId,
        fields.dietaryTagSlugs,
        "dietary_tags",
      );
    }

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Submit draft for review
// ---------------------------------------------------------------------------

export async function submitForReview(chefId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    await requireOwnership(supabase, chefId);

    const { error } = await supabase
      .from("chefs")
      .update({ status: "pending_review" as const })
      .eq("id", chefId)
      .eq("status", "draft");
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Menu item CRUD (non-trust fields — apply immediately for approved chefs)
// ---------------------------------------------------------------------------

export async function chefSaveMenuItem(
  chefId: string,
  currencyCode: string,
  item: {
    id?: string;
    name: string;
    description: string | null;
    price: number | null;
    unit: string | null;
    dietary: "veg" | "non_veg" | "egg" | null;
    isBestSeller: boolean;
    isAvailable: boolean;
    nutrition: unknown;
    sortOrder: number;
  },
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    await requireOwnership(supabase, chefId);

    // Enforce best-seller cap of 3.
    if (item.isBestSeller) {
      const { count } = await supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("chef_id", chefId)
        .eq("is_best_seller", true)
        .neq("id", item.id ?? "00000000-0000-0000-0000-000000000000");
      if ((count ?? 0) >= 3)
        return { ok: false, error: "You can mark up to 3 items as best sellers." };
    }

    let nutrition: Json | null = null;
    if (
      item.nutrition &&
      typeof item.nutrition === "object" &&
      Object.keys(item.nutrition).length > 0
    ) {
      const parsed = nutritionSchema.safeParse(item.nutrition);
      if (!parsed.success) return { ok: false, error: "Nutrition values are invalid." };
      nutrition = parsed.data as unknown as Json;
    }

    const row = {
      chef_id: chefId,
      name: item.name,
      description: item.description,
      price: item.price,
      currency_code: currencyCode,
      unit: item.unit,
      dietary: item.dietary,
      is_best_seller: item.isBestSeller,
      is_available: item.isAvailable,
      nutrition,
      sort_order: item.sortOrder,
    };

    let savedId = item.id;
    if (item.id) {
      const { error } = await supabase.from("menu_items").update(row).eq("id", item.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await supabase
        .from("menu_items")
        .insert(row)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      savedId = created?.id;
    }

    // Menu changes on an approved chef revalidate ISR immediately.
    await revalidateChef(supabase, chefId);
    revalidatePath("/dashboard");
    return { ok: true, id: savedId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function chefDeleteMenuItem(chefId: string, itemId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    await requireOwnership(supabase, chefId);

    const { error } = await supabase.from("menu_items").delete().eq("id", itemId);
    if (error) throw new Error(error.message);

    await revalidateChef(supabase, chefId);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Timings + vacation mode (non-trust field — immediate)
// ---------------------------------------------------------------------------

export async function chefSaveTimings(
  chefId: string,
  timingsInput: unknown,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    await requireOwnership(supabase, chefId);

    const parsed = timingsSchema.safeParse(timingsInput);
    if (!parsed.success) return { ok: false, error: "Timings are invalid." };

    const { error } = await supabase
      .from("chefs")
      .update({ timings: parsed.data as unknown as Json })
      .eq("id", chefId);
    if (error) throw new Error(error.message);

    await revalidateChef(supabase, chefId);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export async function chefAddPhoto(
  chefId: string,
  url: string,
  kind: "kitchen" | "food" | "chef",
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    await requireOwnership(supabase, chefId);

    const { count } = await supabase
      .from("chef_photos")
      .select("id", { count: "exact", head: true })
      .eq("chef_id", chefId);
    if ((count ?? 0) >= 8) return { ok: false, error: "Maximum 8 photos allowed." };

    const { data: created, error } = await supabase
      .from("chef_photos")
      .insert({ chef_id: chefId, url, kind, sort_order: count ?? 0 })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);

    await revalidateChef(supabase, chefId);
    revalidatePath("/dashboard");
    return { ok: true, id: created?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function chefDeletePhoto(chefId: string, photoId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    await requireOwnership(supabase, chefId);

    const { error } = await supabase.from("chef_photos").delete().eq("id", photoId);
    if (error) throw new Error(error.message);

    await revalidateChef(supabase, chefId);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function chefSetCoverPhoto(chefId: string, url: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    await requireOwnership(supabase, chefId);

    const { error } = await supabase.from("chefs").update({ photo_url: url }).eq("id", chefId);
    if (error) throw new Error(error.message);

    await revalidateChef(supabase, chefId);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Profile (trust-relevant edits → pending_edits; non-trust → immediate)
// ---------------------------------------------------------------------------

/** Trust-relevant fields that flip an approved chef to pending_review. */
const TRUST_FIELDS = new Set([
  "displayName",
  "fssaiNumber",
  "addressText",
  "phoneE164",
  "whatsappE164",
  "lat",
  "lng",
]);

export async function chefSaveProfile(
  chefId: string,
  input: {
    displayName?: string;
    bio?: string | null;
    addressArea?: string | null;
    addressText?: string | null;
    phoneE164?: string | null;
    whatsappE164?: string | null;
    instagramHandle?: string | null;
    serviceRadiusKm?: number;
    fssaiNumber?: string | null;
    dietaryProfile?: "veg_only" | "non_veg" | "mixed" | null;
    cuisineSlugs?: string[];
    dietaryTagSlugs?: string[];
    lat?: number | null;
    lng?: number | null;
  },
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    await requireOwnership(supabase, chefId);

    // Validate inputs.
    if (input.whatsappE164) {
      const parsed = e164Schema.safeParse(input.whatsappE164);
      if (!parsed.success)
        return { ok: false, error: "WhatsApp number must be E.164 format (e.g. +919900000001)" };
    }
    if (input.fssaiNumber) {
      const parsed = fssaiSchema.safeParse(input.fssaiNumber);
      if (!parsed.success) return { ok: false, error: "FSSAI number must be exactly 14 digits" };
    }

    // Check chef's current status.
    const { data: current } = await supabase
      .from("chefs")
      .select("status")
      .eq("id", chefId)
      .maybeSingle();
    const isApproved = current?.status === "approved";

    // Separate trust-relevant changes from safe ones.
    const hasTrustChanges = Object.keys(input).some((k) => TRUST_FIELDS.has(k));

    if (isApproved && hasTrustChanges) {
      // Store trust-field changes as pending_edits; don't write them to the main row.
      const pendingEdits: Record<string, string | null> = {};
      if (input.displayName !== undefined) pendingEdits.display_name = input.displayName ?? null;
      if (input.fssaiNumber !== undefined) pendingEdits.fssai_number = input.fssaiNumber ?? null;
      if (input.addressText !== undefined) pendingEdits.address_text = input.addressText ?? null;
      if (input.phoneE164 !== undefined) pendingEdits.phone_e164 = input.phoneE164 ?? null;
      if (input.whatsappE164 !== undefined) pendingEdits.whatsapp_e164 = input.whatsappE164 ?? null;
      if (input.lat != null) pendingEdits.location_lat = String(input.lat);
      if (input.lng != null) pendingEdits.location_lng = String(input.lng);

      // Set pending_edits and flip to pending_review.
      const { error } = await supabase
        .from("chefs")
        .update({ pending_edits: pendingEdits as unknown as Json })
        .eq("id", chefId);
      if (error) throw new Error(error.message);
      // The chefs_guard trigger will flip status → pending_review if we touch trust fields.
      // Since we're NOT touching them directly, we keep the chef approved — the pending_edits
      // sit alongside. The admin_apply_pending_edits function merges them.
    }

    // Apply non-trust fields directly (bio, addressArea, instagram, radius, dietary, cuisines, tags).
    const safeUpdate: Record<string, unknown> = {};
    if (input.bio !== undefined) safeUpdate.bio = input.bio;
    if (input.addressArea !== undefined) safeUpdate.address_area = input.addressArea;
    if (input.instagramHandle !== undefined) safeUpdate.instagram_handle = input.instagramHandle;
    if (input.serviceRadiusKm !== undefined) safeUpdate.service_radius_km = input.serviceRadiusKm;
    if (input.dietaryProfile !== undefined) safeUpdate.dietary_profile = input.dietaryProfile;

    // For non-approved chefs, all fields go directly (no pending-edits pattern).
    if (!isApproved) {
      if (input.displayName !== undefined) safeUpdate.display_name = input.displayName;
      if (input.fssaiNumber !== undefined) safeUpdate.fssai_number = input.fssaiNumber;
      if (input.addressText !== undefined) safeUpdate.address_text = input.addressText;
      if (input.phoneE164 !== undefined) safeUpdate.phone_e164 = input.phoneE164;
      if (input.whatsappE164 !== undefined) safeUpdate.whatsapp_e164 = input.whatsappE164;
    }

    if (Object.keys(safeUpdate).length > 0) {
      const { error } = await supabase
        .from("chefs")
        .update(safeUpdate as never)
        .eq("id", chefId);
      if (error) throw new Error(error.message);
    }

    // Location — only direct-write for non-approved chefs.
    if (!isApproved && input.lat != null && input.lng != null) {
      const { error } = await supabase.rpc("chef_set_own_location", {
        p_chef_id: chefId,
        p_lat: input.lat,
        p_lng: input.lng,
      });
      if (error) throw new Error(error.message);
    }

    // Sync cuisines + tags.
    if (input.cuisineSlugs !== undefined) {
      await syncJoin(
        supabase,
        "chef_cuisines",
        "cuisine_id",
        chefId,
        input.cuisineSlugs,
        "cuisines",
      );
    }
    if (input.dietaryTagSlugs !== undefined) {
      await syncJoin(
        supabase,
        "chef_dietary_tags",
        "tag_id",
        chefId,
        input.dietaryTagSlugs,
        "dietary_tags",
      );
    }

    await revalidateChef(supabase, chefId);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

/**
 * WhatsApp self-verification claim. The chef sends a pre-filled message from the
 * kitchen's own phone; the admin matches the sender's number against
 * `chefs.whatsapp_e164`. We record the claim (with the code) up front so the
 * admin has something to match the incoming message against — the wa.me link
 * only opens after this succeeds.
 */
export async function submitWhatsAppClaim(chefId: string, code: string): Promise<ActionResult> {
  const result = await submitClaim(chefId, {
    proofNote:
      `WhatsApp self-verification. Code: ${code}. ` +
      `Check that a WhatsApp message quoting this code arrived from the number on this listing.`,
    claimantPhone: null,
  });
  // Re-tapping "Verify with WhatsApp" must still open the link — an existing
  // pending claim from this user is the desired end state, not a failure.
  if (!result.ok && result.error?.includes("already have a pending claim")) {
    return { ok: true };
  }
  return result;
}

export async function submitClaim(
  chefId: string,
  input: { proofNote: string; claimantPhone?: string | null },
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    // Check not already claimed.
    const { data: chef } = await supabase
      .from("chefs")
      .select("claimed_by")
      .eq("id", chefId)
      .maybeSingle();
    if (!chef) return { ok: false, error: "Chef not found" };
    if (chef.claimed_by) return { ok: false, error: "This listing has already been claimed." };

    // Check no existing pending claim by this user.
    const { data: existingClaim } = await supabase
      .from("claims")
      .select("id")
      .eq("chef_id", chefId)
      .eq("claimant_user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();
    if (existingClaim)
      return { ok: false, error: "You already have a pending claim for this listing." };

    const { error } = await supabase.from("claims").insert({
      chef_id: chefId,
      claimant_user_id: user.id,
      claimant_phone: input.claimantPhone ?? null,
      proof_note: input.proofNote,
      status: "pending",
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Join sync helper (same pattern as admin actions)
// ---------------------------------------------------------------------------

async function syncJoin(
  supabase: Client,
  table: "chef_cuisines" | "chef_dietary_tags",
  fkColumn: "cuisine_id" | "tag_id",
  chefId: string,
  slugs: string[],
  refTable: "cuisines" | "dietary_tags",
) {
  const { data: refs, error } = await supabase.from(refTable).select("id, slug").in("slug", slugs);
  if (error) throw new Error(error.message);
  const ids = (refs ?? []).map((r) => r.id);

  await supabase.from(table).delete().eq("chef_id", chefId);
  if (ids.length > 0) {
    const rows = ids.map((id) => ({ chef_id: chefId, [fkColumn]: id }));
    const { error: insErr } = await supabase.from(table).insert(rows as never);
    if (insErr) throw new Error(insErr.message);
  }
}
