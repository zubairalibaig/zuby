# Phase 1 — Public directory (the buyer-facing site)

## Context

Zuby (zuby.food) is a trust-first directory of home chefs — read `CONCEPT.md`, `ARCHITECTURE.md`, `CLAUDE.md` first. Phase 0 delivered the schema, seed data, and deploy pipeline. This phase builds everything a **buyer** sees: browse, geo-search, chef profiles, and the WhatsApp order CTA. Buyers never log in. This is the SEO surface — every decision here compounds into organic traffic, so server rendering, clean URLs, and structured data are core requirements, not polish.

## Prerequisites
Phase 0 merged and deployed; seed chefs visible via `search_chefs`.

## Scope

### 1. Routes (all ISR unless noted, per `ARCHITECTURE.md` §2 & §4)
- `/` — landing: hero + "Use my location" CTA, active-city links, value props (verified chefs, dietary filters, order on WhatsApp), how-it-works, `/for-chefs` teaser. Auto-suggest city via IP geo when possible.
- `/bangalore` (dynamic `[city]`) — city landing: neighbourhood grid, cuisine chips, featured verified chefs, chef count.
- `/bangalore/[neighbourhood]` — chefs whose service area covers the neighbourhood center (via `search_chefs` at the neighbourhood's center point), cuisine/dietary filter chips.
- `/bangalore/cuisine/[cuisine]` — city × cuisine listing.
- `/bangalore/[neighbourhood]/[chef-slug]` — **chef profile**, the money page: photo(s), kitchen name, verification badge, FSSAI number, dietary tags (veg/non-veg/halal/jhatka/jain/egg-free), cuisines, area + "~X km from you" (client-side if location granted), timings ("Order by 9 PM for tomorrow"), menu grouped with best-seller badges, prices with currency, nutrition per item where present, photo gallery, WhatsApp CTA (sticky on mobile). Unclaimed listings (`claimed_by IS NULL`) show a subtle "Is this your kitchen? Claim this listing" banner → `/for-chefs` (real claim flow arrives in Phase 4).
- `/search?lat&lng&radius&tags&cuisines` — SSR live geo-search: list cards sorted by distance, filter bar (radius 2/5/10 km, dietary tags, cuisines, "verified only" default ON). Browser geolocation with a graceful neighbourhood-picker fallback when denied.
- `/for-chefs` — static acquisition page: value pitch (free, keep 100%, you control orders), "listing chefs now — WhatsApp us to get listed" interim CTA.
- 404 + city-not-live pages ("Zuby isn't in {city} yet — we're starting in Bangalore").

### 2. WhatsApp CTA + first-party analytics
- Button hits `/api/wa/[chefId]`: inserts `events` row (`wa_click`, chef_id, city_id, optional geohash5 passed from client geolocation — 5-char geohash, never precise), then 302 → `https://wa.me/<whatsapp_e164>?text=<encoded>` with message: "Hi {chef first name}! I found {kitchen name} on Zuby (zuby.food) and would like to order. 🍱".
- `profile_view` event on chef pages (server-side, sampled/deduped, ignore known bots).
- Basic in-memory rate limiting on the events path.

### 3. SEO machinery
- `generateMetadata` on every route from templates, e.g. chef: "{Kitchen Name} — Home Chef in {Neighbourhood}, {City} | Zuby"; description from bio + cuisines + tags.
- JSON-LD: `FoodEstablishment` on chef pages (name, `servesCuisine`, approximate geo, area, opening hours, price range, url); `ItemList` on listing pages; `BreadcrumbList` everywhere.
- `sitemap.xml` generated from DB (all active cities/neighbourhoods/cuisine pages/approved chefs), `robots.txt` (block `/dashboard`, `/admin`, `/api`, `/search`).
- OpenGraph images (template with kitchen name + area; `next/og`).
- Canonicals; only approved chefs render — pending/rejected/suspended slugs return 404 (not a teaser page).
- ISR revalidation: on-demand hook (`revalidatePath`) exported for Phase 3/4 to call on approval/edit; hourly fallback via `revalidate`.

### 4. UI system
- Mobile-first (most Indian traffic is mobile). `ChefCard`, `TagChip` (distinct color per dietary tag; halal/jhatka/veg/jain visually distinct), `VerifiedBadge`, `MenuItemRow`, `FilterBar`, `WhatsAppButton` as reusable components in `src/components/directory/`.
- All user-facing strings in `src/lib/copy/en.ts` (future i18n).
- Images via `next/image` with Supabase Storage transform URLs; explicit dimensions to avoid CLS.

## Non-goals (do NOT build)
No auth, no dashboard, no admin, no claim flow (banner links only), no map view (list + distance is V1; map is post-launch polish), no reviews, no cart/checkout, no scraping.

## Acceptance criteria
1. Every route above renders with seed data; chef pages are fully server-rendered (view-source shows content + JSON-LD validating in Google's Rich Results test).
2. Search from Indiranagar coords returns correct chefs/distances; each chef's own `service_radius_km` is respected; dietary + cuisine filters compose correctly (e.g. halal + biryani).
3. WhatsApp button on a real phone opens WhatsApp with the pre-filled message, and a `wa_click` row with geohash5 lands in `events`.
4. Location-denied flow works end-to-end via neighbourhood picker.
5. Lighthouse (mobile, throttled) on chef page and city page: Performance ≥ 90, SEO ≥ 95; `sitemap.xml` lists all approved-chef URLs and no non-approved ones.
6. A `pending_review` chef's URL 404s; flipping to `approved` + revalidate makes it live without redeploy.
7. Typecheck/lint/build green; no service-role usage in any buyer-facing path.

## Definition of done
Criteria pass on the production domain with seed data; `docs/phase-1-notes.md` records deviations; founder walkthrough on mobile.
