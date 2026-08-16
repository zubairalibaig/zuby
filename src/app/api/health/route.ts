import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/db";
import { isSupabaseConfigured, publicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, db: "not-configured" });
  }

  try {
    const { url, anonKey } = publicEnv();
    const supabase = createServerClient<Database>(url, anonKey, {
      cookies: { getAll: () => [], setAll: () => undefined },
    });
    const { error } = await supabase.from("countries").select("id", { count: "exact", head: true });
    return NextResponse.json({ ok: !error, db: error ? `error: ${error.message}` : "ok" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, db: `error: ${message}` }, { status: 500 });
  }
}
