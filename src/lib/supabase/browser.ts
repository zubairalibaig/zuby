import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/db";
import { publicEnv } from "@/lib/supabase/env";

/** Supabase client for Client Components. Anon key only — RLS enforced. */
export function createClient() {
  const { url, anonKey } = publicEnv();
  return createBrowserClient<Database>(url, anonKey);
}
