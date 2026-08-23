import { NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

/**
 * Typeahead for the home-page search box. Public and unauthenticated — it only
 * ever returns data already visible on public pages (approved chefs, their
 * dishes, and reference vocabulary).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const city = searchParams.get("city");

  if (q.length < 2) return NextResponse.json([]);

  try {
    const suggestions = await getSearchSuggestions(q, city, 12);
    return NextResponse.json(suggestions, {
      // Short cache: suggestions change only when supply changes.
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.warn("suggest route failed:", err);
    return NextResponse.json([]);
  }
}
