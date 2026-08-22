import { NextResponse, type NextRequest } from "next/server";
import { revalidateChefPaths } from "@/lib/revalidate";

/**
 * On-demand ISR revalidation over HTTP (ARCHITECTURE.md §4), for callers
 * outside this codebase — the intended use is Phase 3's admin approve/edit
 * action and Phase 4's chef self-serve edits, which can call this instead of
 * (or in addition to) importing revalidateChefPaths() directly server-side.
 * Guarded by a shared secret; never exposed to the browser.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.citySlug !== "string" ||
    (body.neighbourhoodSlug !== null && typeof body.neighbourhoodSlug !== "string") ||
    typeof body.chefSlug !== "string"
  ) {
    return NextResponse.json(
      { error: "expected { citySlug, neighbourhoodSlug, chefSlug, cuisineSlugs? }" },
      { status: 400 },
    );
  }

  revalidateChefPaths({
    citySlug: body.citySlug,
    neighbourhoodSlug: body.neighbourhoodSlug,
    chefSlug: body.chefSlug,
    cuisineSlugs: Array.isArray(body.cuisineSlugs) ? body.cuisineSlugs : [],
  });

  return NextResponse.json({ revalidated: true });
}
