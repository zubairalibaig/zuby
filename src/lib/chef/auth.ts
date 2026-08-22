import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

export interface ChefSession {
  supabase: SupabaseClient<Database>;
  user: User;
  /** The chef row this user owns (claimed_by = uid). Null when the user hasn't claimed/created yet. */
  chefId: string | null;
}

/**
 * Gate for chef dashboard pages:
 *   - not signed in → redirect to /login
 *   - signed in     → returns the client, user, and their chef id (if any)
 */
export async function requireChefPage(): Promise<ChefSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: chef } = await supabase
    .from("chefs")
    .select("id")
    .eq("claimed_by", user.id)
    .maybeSingle();

  return { supabase, user, chefId: chef?.id ?? null };
}

/**
 * Gate for chef server actions. Throws on unauthenticated.
 */
export async function requireChefAction(): Promise<
  ChefSession & { chefId: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: chef } = await supabase
    .from("chefs")
    .select("id")
    .eq("claimed_by", user.id)
    .maybeSingle();

  if (!chef) throw new Error("No chef listing found");

  return { supabase, user, chefId: chef.id };
}

/**
 * Lighter auth check — returns user if signed in, null otherwise.
 * For pages like /claim/[chefId] that work both ways.
 */
export async function getAuthUser(): Promise<{
  supabase: SupabaseClient<Database>;
  user: User | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user: user ?? null };
}
