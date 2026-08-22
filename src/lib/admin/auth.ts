import "server-only";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

export interface AdminSession {
  supabase: SupabaseClient<Database>;
  user: User;
}

/**
 * True when the signed-in user is on the admins allow-list. Uses the DB's own
 * is_admin() so there's a single source of truth (the same function RLS uses).
 */
async function currentUserIsAdmin(supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return data === true;
}

/**
 * Gate for admin PAGES (server components / layouts):
 *   - not signed in        → redirect to /admin/login
 *   - signed in, not admin → 404 (no hint the admin area exists; AC1)
 * Returns the authenticated client + user for an admin.
 */
export async function requireAdminPage(): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");
  if (!(await currentUserIsAdmin(supabase))) notFound();

  return { supabase, user };
}

/**
 * Gate for admin SERVER ACTIONS. Throws rather than redirecting/404-ing, so a
 * forged POST from a non-admin fails loudly (and the DB functions reject it
 * again anyway — defence in depth).
 */
export async function requireAdminAction(): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await currentUserIsAdmin(supabase))) {
    throw new Error("Not authorized");
  }
  return { supabase, user };
}
