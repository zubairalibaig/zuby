# Phase 1 — completion notes

Status: **code complete, typechecked, linted, and built successfully.** The SQL/RPC
layer every page depends on was verified directly against a real PostgreSQL +
PostGIS database. Full browser/HTTP-level verification against a live Supabase
project was **not possible from this sandbox** (no network path to the live
project or to Vercel) — see "What's verified vs. what isn't" below.

## What was built

All routes and mechanics from `prompts/phase-1-public-directory.md`:

- `/` — hero, "show chefs near me" CTA, active-city links, value props, how-it-works, for-chefs teaser
- `/[city]` — neighbourhood grid, cuisine chips, featured verified chefs, chef count
- `/[city]/[neighbourhood]` — chefs covering that neighbourhood's centre, via `search_chefs`
- `/[city]/cuisine/[cuisine]` — city × cuisine listing
- `/[city]/[neighbourhood]/[chef]` — full profile: photos, verified badge, FSSAI, dietary tags, cuisines, timings, best-seller-grouped menu with nutrition, client-side "~X km away," sticky WhatsApp CTA, unclaimed-listing banner
- `/search` — SSR geo search with radius/dietary/cuisine/verified-only filters (URL-driven), neighbourhood-picker fallback on location denial
- `/for-chefs` — static acquisition page
- `/api/wa/[chefId]` — the only place a chef's WhatsApp number is read; logs `wa_click` with optional geohash5, redirects to `wa.me`, rate-limited
- `/api/revalidate` — secret-guarded on-demand ISR hook for Phase 3/4 to call
- `sitemap.xml`, `robots.ts`, dynamic per-chef OG images + a default brand OG image
- Root and segment-level 404s: unknown city → "we're not there yet"; unknown neighbourhood/chef/pending chef → generic 404

## Two structural bugs found and fixed (matter for every future phase, not just this one)

These were found only through direct, empirical TypeScript compilation against the
real installed library versions — not by inspection. Both are now fixed in
`src/types/db.ts` and `package.json`, so every later phase inherits the fix:

1. **Every hand-written row type used `interface`, and that silently broke
   Supabase's typed query engine.** `@supabase/postgrest-js` 2.112's typed
   `.select()` parser cannot see through row types declared as `interface X {...}`
   nested inside the `Database` type — every single query, even a plain
   `.select("id")` with no joins, resolved to `never` at compile time. Converting
   every row type to `type X = {...}` (16 declarations) fixed it completely. This
   is a genuine, reproducible TypeScript/postgrest-js interaction, isolated with
   a minimal repro before touching the real file.
2. **`@supabase/ssr@0.6.1` (the version Phase 0 pinned) predates postgrest-js
   2.112's typed-select engine and doesn't forward schema types correctly through
   `createServerClient`** — every *embedded* select (`countries(code)`,
   `neighbourhoods(slug,name)`, etc.) resolved to `never` even after fix #1.
   Upgrading to `@supabase/ssr@0.12.4` resolved it. `db.ts`'s `Table<>` helper was
   also extended with real FK `Relationships` metadata (matching Postgres' default
   `<table>_<column>_fkey` naming from the actual migrations) — this is what
   `supabase gen types typescript` would have produced automatically; here it's
   accurate but hand-maintained, so **keep it in sync when adding a migration with
   new foreign keys**, the same caveat Phase 0 already flagged for this file.

A smaller, general fix while here: `Insertable<T>` now also auto-marks every
*nullable* column optional on insert (previously only `id`/`created_at`/`updated_at`
were optional), matching real Supabase-generated types and real DB behaviour —
confirmed against the actual `events` table, which accepts an insert omitting
`geohash5`/`metadata`.

## Three small schema additions (new migrations, not a rewrite of Phase 0's)

Needed so the public pages never touch raw PostGIS geography through PostgREST
(the same pattern Phase 2's `neighbourhood_centroids()` already established):

- `city_centroids()` — city-wide search origin + the home page's city list
- `chef_public_location(chef_id)` — the ~100 m rounded point for one chef, reused
  for both the profile page's `FoodEstablishment` JSON-LD `geo` field and the
  client-side "~X km away" display; returns nothing for a non-approved chef

Both are `SECURITY DEFINER`, granted to `anon`, and were verified directly via
`psql`: correct values for Bangalore's real centroid, correct rounding, and the
non-approved-chef case returns zero rows as required.

## What's verified vs. what isn't

**Verified directly** (real PostgreSQL 16 + PostGIS, the same harness used for
Phases 0 and 2):
- All 20 Phase-0 acceptance checks still pass with the new migrations included
- `search_chefs`, `city_centroids`, `neighbourhood_centroids`, `chef_public_location`
  all return exactly the shapes the query layer expects, with correct values
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`
  all pass — including the fixed embedded-select and RPC typing described above
- Build-time resilience: `generateStaticParams` and `sitemap.ts` degrade to
  empty output (not a crash) when Supabase isn't configured, so CI and a fresh
  Vercel preview build succeed before secrets exist — verified by running the
  actual production build with no credentials set

**Not verified — no path to it from this sandbox:**
- No outbound network access to the live Supabase project or to Vercel from this
  environment (confirmed: direct connection attempts to both timed out at the
  network layer). This means the HTTP-level path — supabase-js's actual PostgREST
  requests, real RLS enforcement over the wire, real page rendering — was not
  exercised end-to-end, only its SQL foundation and its TypeScript contracts.
- No browser in this sandbox: the WhatsApp button's click behaviour, the
  geolocation-prompt/neighbourhood-picker flow, and Lighthouse performance/SEO
  scores (acceptance criterion 5) are implemented per spec but not run.
- JSON-LD output was written against Schema.org's `FoodEstablishment`/`ItemList`/
  `BreadcrumbList` shapes but not run through Google's Rich Results test.

**Recommended before calling Phase 1 done:** once `supabase/setup.sql` is applied
and DNS points at Vercel, click through the site once for real — search from a
real location, open a chef page, tap the WhatsApp button, confirm a `wa_click`
row lands in `events`. That closes the one gap this sandbox couldn't.

## Deviations from `prompts/phase-1-public-directory.md`

- **`/api/wa` uses the service-role client, by design** — clarifying acceptance
  criterion 7's intent, not violating it. `events` has no anon/authenticated
  insert policy and `whatsapp_e164` must never be selectable from a buyer-facing
  query; both are satisfied by keeping the service-role key server-only inside
  this one narrowly-scoped, rate-limited route. "No service-role in buyer-facing
  paths" means never shipping the key to the browser, not never using it
  server-side. Phase 0's own migration comments already specified this route
  would work this way.
- **Client-side "~X km away" on the chef page** wasn't in the original acceptance
  criteria but was cheap to add correctly (see `chef_public_location` above), so
  it's included.
- **`next/server`'s `after()`** is used for profile-view logging so analytics
  insert happens after the response is sent rather than blocking the page or
  risking an unawaited promise being killed mid-flight on a serverless runtime.
