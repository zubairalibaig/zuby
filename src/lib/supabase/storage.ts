import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

type Client = SupabaseClient<Database>;

const CHEF_PHOTOS_MARKER = "/object/public/chef-photos/";

/**
 * Extracts the storage path (relative to the `chef-photos` bucket) from one
 * of our own public Storage URLs. Returns null for anything else — callers
 * skip deletion rather than guess, since acting on a malformed path could
 * remove an unrelated object.
 */
export function chefPhotoPath(url: string): string | null {
  const i = url.indexOf(CHEF_PHOTOS_MARKER);
  if (i === -1) return null;
  const path = url.slice(i + CHEF_PHOTOS_MARKER.length);
  return path.length > 0 ? path : null;
}

/**
 * Deletes the underlying Storage object for a chef/dish photo URL, best
 * effort. Every place a photo row or `photo_url` field is deleted or
 * replaced should call this — without it, Storage silently keeps every
 * blob forever (a `chef_photos` or `menu_items` row disappearing does
 * nothing to the file it pointed at), which is exactly the kind of leak
 * that quietly exhausts a free-tier storage quota over a year of chefs
 * iterating on their listings. See docs/cost-controls.md.
 *
 * Never throws: a failed cleanup is a cost-hygiene issue, not a reason to
 * fail the user-facing delete/replace action that's already succeeded.
 */
export async function deleteChefPhotoObject(
  supabase: Client,
  url: string | null | undefined,
): Promise<void> {
  if (!url) return;
  const path = chefPhotoPath(url);
  if (!path) return;
  try {
    const { error } = await supabase.storage.from("chef-photos").remove([path]);
    if (error) console.warn("deleteChefPhotoObject: cleanup failed (non-fatal):", error.message);
  } catch (err) {
    console.warn("deleteChefPhotoObject: cleanup failed (non-fatal):", err);
  }
}
