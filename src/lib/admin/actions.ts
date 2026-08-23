"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { revalidateChefPaths } from "@/lib/revalidate";
import { timingsSchema, nutritionSchema } from "@/types/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/db";

type Client = SupabaseClient<Database>;

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Look up the slugs a chef page lives at, so we can revalidate the right ISR paths. */
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
// Verification queue actions
// ---------------------------------------------------------------------------

export async function setChefStatus(
  chefId: string,
  status: "approved" | "rejected" | "suspended" | "delisted",
  note: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.rpc("admin_set_chef_status", {
      p_chef_id: chefId,
      p_status: status,
      p_note: note || null,
    });
    if (error) throw new Error(error.message);
    await revalidateChef(supabase, chefId);

    // Tell the chef their listing went live, with the URL to share (Phase 4 §5).
    if (status === "approved") {
      const paths = await chefPaths(supabase, chefId);
      const { data: chef } = await supabase
        .from("chefs")
        .select("kitchen_name")
        .eq("id", chefId)
        .maybeSingle();
      if (paths?.neighbourhoodSlug && chef) {
        const { emailListingApproved } = await import("@/lib/email/send");
        await emailListingApproved(
          chefId,
          chef.kitchen_name,
          `/${paths.citySlug}/${paths.neighbourhoodSlug}/${paths.chefSlug}`,
        );
      }
    }

    revalidatePath("/admin/queue");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

/**
 * Apply a chef's queued trust-field edits (Phase 4 pending-edits pattern).
 * The RPC merges `pending_edits` into the real columns, re-runs the FSSAI
 * verification reset if the number changed, clears the column and writes the
 * audit row. The public page only changes at this point.
 */
export async function applyPendingEdits(chefId: string, note: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.rpc("admin_apply_pending_edits", {
      p_chef_id: chefId,
      p_note: note || null,
    });
    if (error) throw new Error(error.message);
    await revalidateChef(supabase, chefId);
    revalidatePath("/admin/queue");
    revalidatePath(`/admin/queue/${chefId}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Reject queued trust-field edits: clear them, leave the live row untouched. */
export async function discardPendingEdits(chefId: string, note: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdminAction();
    const { error } = await supabase
      .from("chefs")
      .update({ pending_edits: null })
      .eq("id", chefId);
    if (error) throw new Error(error.message);

    const { error: logErr } = await supabase.from("verification_log").insert({
      chef_id: chefId,
      admin_user_id: user.id,
      action: "info_requested",
      note: note || "Pending edits rejected",
    });
    if (logErr) throw new Error(logErr.message);

    revalidatePath("/admin/queue");
    revalidatePath(`/admin/queue/${chefId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function requestInfo(chefId: string, note: string): Promise<ActionResult> {
  try {
    if (!note.trim()) return { ok: false, error: "A note is required." };
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.rpc("admin_request_info", { p_chef_id: chefId, p_note: note });
    if (error) throw new Error(error.message);

    const { data: chef } = await supabase
      .from("chefs")
      .select("kitchen_name")
      .eq("id", chefId)
      .maybeSingle();
    if (chef) {
      const { emailChangesRequested } = await import("@/lib/email/send");
      await emailChangesRequested(chefId, chef.kitchen_name, note);
    }

    revalidatePath("/admin/queue");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function verifyFssai(chefId: string, note: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.rpc("admin_verify_fssai", {
      p_chef_id: chefId,
      p_note: note || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export async function decideClaim(
  claimId: string,
  approve: boolean,
  note: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();

    // Read the claim before deciding: on a rejection nothing links the claimant
    // to the listing afterwards, so this is the last chance to learn who to write to.
    const { data: claim } = await supabase
      .from("claims")
      .select("chef_id, claimant_user_id, chefs(kitchen_name, slug, cities(slug), neighbourhoods(slug))")
      .eq("id", claimId)
      .maybeSingle();

    const { error } = await supabase.rpc("admin_decide_claim", {
      p_claim_id: claimId,
      p_approve: approve,
      p_note: note || null,
    });
    if (error) throw new Error(error.message);

    if (claim) {
      const chef = claim.chefs as unknown as {
        kitchen_name: string;
        slug: string;
        cities: { slug: string } | null;
        neighbourhoods: { slug: string } | null;
      } | null;
      const path =
        chef?.cities && chef.neighbourhoods
          ? `/${chef.cities.slug}/${chef.neighbourhoods.slug}/${chef.slug}`
          : null;
      const { emailClaimDecision } = await import("@/lib/email/send");
      await emailClaimDecision(
        claim.claimant_user_id,
        chef?.kitchen_name ?? "your kitchen",
        approve,
        path,
      );
      if (approve) await revalidateChef(supabase, claim.chef_id);
    }

    revalidatePath("/admin/claims");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Ingest
// ---------------------------------------------------------------------------

export async function promoteCandidate(
  candidateId: string,
): Promise<ActionResult & { chefId?: string }> {
  try {
    const { supabase } = await requireAdminAction();
    const { data, error } = await supabase.rpc("promote_ingest_candidate", {
      candidate_id: candidateId,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/ingest");
    revalidatePath("/admin/queue");
    revalidatePath("/admin");
    return { ok: true, chefId: data as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function discardCandidate(candidateId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const { error } = await supabase
      .from("ingest_candidates")
      .update({ status: "discarded" })
      .eq("id", candidateId);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/ingest");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Edit a candidate's normalised fields before promoting (fix an area, a cuisine, etc.). */
export async function updateCandidate(
  candidateId: string,
  patch: Record<string, Json>,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const { data: current, error: readErr } = await supabase
      .from("ingest_candidates")
      .select("normalised")
      .eq("id", candidateId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current) throw new Error("Candidate not found");

    const merged = { ...(current.normalised as Record<string, Json>), ...patch };
    const { error } = await supabase
      .from("ingest_candidates")
      .update({ normalised: merged })
      .eq("id", candidateId);
    if (error) throw new Error(error.message);
    revalidatePath(`/admin/ingest/${candidateId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Listing editor
// ---------------------------------------------------------------------------

export interface ChefProfileInput {
  displayName: string;
  kitchenName: string;
  bio: string | null;
  phoneE164: string | null;
  whatsappE164: string | null;
  instagramHandle: string | null;
  addressText: string | null;
  addressArea: string | null;
  serviceRadiusKm: number;
  fssaiNumber: string | null;
  dietaryProfile: "veg_only" | "non_veg" | "mixed" | null;
  neighbourhoodId: string | null;
  cuisineSlugs: string[];
  dietaryTagSlugs: string[];
  timings: unknown;
  lat: number | null;
  lng: number | null;
}

/**
 * Update a chef's editable profile fields. Admin edits never flip status to
 * pending (the chefs_guard trigger already exempts admins); we still write one
 * 'edited' audit row, and set the location via its dedicated RPC (geography).
 */
export async function saveChefProfile(
  chefId: string,
  input: ChefProfileInput,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();

    let timings: Json | null = null;
    if (input.timings) {
      const parsed = timingsSchema.safeParse(input.timings);
      if (!parsed.success) return { ok: false, error: "Timings are invalid." };
      timings = parsed.data as unknown as Json;
    }

    const { error: updErr } = await supabase
      .from("chefs")
      .update({
        display_name: input.displayName,
        kitchen_name: input.kitchenName,
        bio: input.bio,
        phone_e164: input.phoneE164,
        whatsapp_e164: input.whatsappE164,
        instagram_handle: input.instagramHandle,
        address_text: input.addressText,
        address_area: input.addressArea,
        service_radius_km: input.serviceRadiusKm,
        fssai_number: input.fssaiNumber,
        dietary_profile: input.dietaryProfile,
        neighbourhood_id: input.neighbourhoodId,
        timings,
      })
      .eq("id", chefId);
    if (updErr) throw new Error(updErr.message);

    if (input.lat !== null && input.lng !== null) {
      const { error: locErr } = await supabase.rpc("admin_set_chef_location", {
        p_chef_id: chefId,
        p_lat: input.lat,
        p_lng: input.lng,
      });
      if (locErr) throw new Error(locErr.message);
    }

    await syncJoin(supabase, "chef_cuisines", "cuisine_id", chefId, input.cuisineSlugs, "cuisines");
    await syncJoin(
      supabase,
      "chef_dietary_tags",
      "tag_id",
      chefId,
      input.dietaryTagSlugs,
      "dietary_tags",
    );

    const { error: logErr } = await supabase.rpc("admin_log_edit", {
      p_chef_id: chefId,
      p_note: "Profile edited by admin",
    });
    if (logErr) throw new Error(logErr.message);

    await revalidateChef(supabase, chefId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Replace a chef's cuisine/tag join rows to match the given slug list. */
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

// ---------------------------------------------------------------------------
// Menu items
// ---------------------------------------------------------------------------

export interface MenuItemInput {
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
}

export async function saveMenuItem(
  chefId: string,
  currencyCode: string,
  item: MenuItemInput,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();

    let nutrition: Json | null = null;
    if (item.nutrition && Object.keys(item.nutrition).length > 0) {
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

    if (item.id) {
      const { error } = await supabase.from("menu_items").update(row).eq("id", item.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("menu_items").insert(row);
      if (error) throw new Error(error.message);
    }

    await revalidateChef(supabase, chefId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function deleteMenuItem(chefId: string, itemId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.from("menu_items").delete().eq("id", itemId);
    if (error) throw new Error(error.message);
    await revalidateChef(supabase, chefId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export async function addPhoto(
  chefId: string,
  url: string,
  kind: "kitchen" | "food" | "chef",
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const { count } = await supabase
      .from("chef_photos")
      .select("id", { count: "exact", head: true })
      .eq("chef_id", chefId);
    const { error } = await supabase
      .from("chef_photos")
      .insert({ chef_id: chefId, url, kind, sort_order: count ?? 0 });
    if (error) throw new Error(error.message);
    await revalidateChef(supabase, chefId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function deletePhoto(chefId: string, photoId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.from("chef_photos").delete().eq("id", photoId);
    if (error) throw new Error(error.message);
    await revalidateChef(supabase, chefId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Set the chef's cover photo (photo_url) from an existing uploaded photo. */
export async function setCoverPhoto(chefId: string, url: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.from("chefs").update({ photo_url: url }).eq("id", chefId);
    if (error) throw new Error(error.message);
    await revalidateChef(supabase, chefId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Create chef manually
// ---------------------------------------------------------------------------

export async function createChef(input: {
  kitchenName: string;
  displayName: string;
  citySlug: string;
  neighbourhoodSlug: string | null;
  whatsappE164: string | null;
  slug: string;
}): Promise<ActionResult & { chefId?: string }> {
  try {
    const { supabase } = await requireAdminAction();

    const { data: city, error: cityErr } = await supabase
      .from("cities")
      .select("id")
      .eq("slug", input.citySlug)
      .maybeSingle();
    if (cityErr) throw new Error(cityErr.message);
    if (!city) return { ok: false, error: "Unknown city." };

    let neighbourhoodId: string | null = null;
    if (input.neighbourhoodSlug) {
      const { data: hood } = await supabase
        .from("neighbourhoods")
        .select("id")
        .eq("city_id", city.id)
        .eq("slug", input.neighbourhoodSlug)
        .maybeSingle();
      neighbourhoodId = hood?.id ?? null;
    }

    const { data: created, error } = await supabase
      .from("chefs")
      .insert({
        city_id: city.id,
        neighbourhood_id: neighbourhoodId,
        slug: input.slug,
        kitchen_name: input.kitchenName,
        display_name: input.displayName,
        whatsapp_e164: input.whatsappE164,
        phone_e164: input.whatsappE164,
        status: "draft",
        listing_source: "self_signup",
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);

    revalidatePath("/admin/chefs");
    return { ok: true, chefId: created?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/** Send a test email to the signed-in admin, to verify Resend setup. */
export async function sendTestEmail(): Promise<ActionResult & { detail?: string }> {
  try {
    const { user } = await requireAdminAction();
    if (!user.email) return { ok: false, error: "Your admin account has no email address." };

    const { emailTestSend } = await import("@/lib/email/send");
    const result = await emailTestSend(user.email);
    if (!result.sent) {
      return { ok: false, error: result.reason ?? "Send failed" };
    }
    return { ok: true, detail: `Sent to ${user.email}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
