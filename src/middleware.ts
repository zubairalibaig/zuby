import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on the auth-bearing surfaces: admin, chef dashboard, claim flow, and
  // the OAuth callback. Public directory pages carry no session.
  matcher: ["/admin/:path*", "/dashboard/:path*", "/claim/:path*", "/login", "/auth/:path*"],
};
