import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/db";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Refreshes the Supabase auth session on every request and rewrites the auth
 * cookies onto the response — the standard @supabase/ssr middleware pattern.
 * Without this, a logged-in admin's token silently expires mid-session.
 *
 * This does NOT gate access — the /admin route group's layout does that (a
 * server component can call notFound(), middleware can't render a 404 body).
 * Here we only keep the session fresh.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });

  // Before env is configured (fresh preview deploy), do nothing rather than throw.
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Touch the user to trigger a token refresh when needed.
  await supabase.auth.getUser();

  return response;
}
