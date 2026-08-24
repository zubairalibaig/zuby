import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidGeohash5 } from "@/lib/geo/geohash";
import { copy } from "@/lib/copy/en";

export const dynamic = "force-dynamic";

/**
 * Every WhatsApp CTA on the site points here, never straight at wa.me — this
 * is the one place the chef's phone number is read and the one place a click
 * is counted (ARCHITECTURE.md §4). Uses the service-role client deliberately:
 * events has no anon/authenticated insert policy by design (Phase 0 RLS), and
 * whatsapp_e164 must never be selectable from a buyer-facing query. Both facts
 * mean this narrowly-scoped, server-only route is the intended place for it —
 * not a violation of "no service-role in buyer-facing paths", which is about
 * never shipping the key to the browser.
 */

// Basic in-memory rate limit — resets on cold start, which is an accepted
// limitation of "basic" per the phase-1 spec, not a production abuse defence.
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  hits.set(key, timestamps);
  if (hits.size > 10_000) hits.clear(); // crude bound on memory
  return timestamps.length > MAX_PER_WINDOW;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chefId: string }> },
) {
  const { chefId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(chefId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(`${chefId}:${ip}`)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: chef, error } = await admin
    .from("chefs")
    .select("id, whatsapp_e164, kitchen_name, display_name, city_id, status")
    .eq("id", chefId)
    .maybeSingle();

  if (error || !chef || chef.status !== "approved" || !chef.whatsapp_e164) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Optional: the click came from a specific menu item's own CTA rather than
  // the chef-level button (MenuItemRow). Validated against this chef's own
  // available items before trusting it — never take an item id at face value
  // for the message text, and never log one that doesn't belong to this chef.
  const itemId = request.nextUrl.searchParams.get("item");
  let item: { id: string; name: string } | null = null;
  if (itemId && /^[0-9a-f-]{36}$/i.test(itemId)) {
    const { data: menuItem } = await admin
      .from("menu_items")
      .select("id, name")
      .eq("id", itemId)
      .eq("chef_id", chef.id)
      .eq("is_available", true)
      .maybeSingle();
    if (menuItem) item = menuItem;
  }

  const geohash = request.nextUrl.searchParams.get("g");
  await admin.from("events").insert({
    kind: "wa_click",
    chef_id: chef.id,
    city_id: chef.city_id,
    geohash5: isValidGeohash5(geohash) ? geohash : null,
    metadata: item ? { item_id: item.id, item_name: item.name } : null,
  });

  const digits = chef.whatsapp_e164.replace(/\D/g, "");
  const firstName = chef.display_name?.split(" ")[0] ?? null;
  const text = encodeURIComponent(
    item
      ? copy.wa.messageTemplateForItem(firstName, chef.kitchen_name, item.name)
      : copy.wa.messageTemplate(firstName, chef.kitchen_name),
  );

  return NextResponse.redirect(`https://wa.me/${digits}?text=${text}`, { status: 302 });
}
