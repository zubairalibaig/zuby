import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/db";
import { publicEnv } from "@/lib/supabase/env";

/** Supabase client for Server Components / Route Handlers. Anon key + user cookies — RLS enforced. */
export async function createClient() {
  const { url, anonKey } = publicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — safe to ignore when middleware refreshes sessions.
        }
      },
    },
  });
}
