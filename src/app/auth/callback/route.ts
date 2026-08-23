import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth redirect target. Exchanges the `code` for a session (which sets the
 * auth cookies via the SSR client), then sends the user on to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // `next` is attacker-controllable. Concatenating it to origin cannot escape
  // the host, but a value like "https://evil.com" produces a malformed URL and
  // a 500, so only accept a single-slash-prefixed same-site path.
  const rawNext = searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — back to login rather than a blank error.
  return NextResponse.redirect(`${origin}/admin/login?error=auth`);
}
