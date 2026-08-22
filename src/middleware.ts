import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on the auth-bearing surfaces only: the admin area and the OAuth
  // callback. Public directory pages carry no session and don't need this.
  matcher: ["/admin/:path*", "/auth/:path*"],
};
