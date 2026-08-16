# Phase 0 — completion notes

Status: **code complete and verified.** Two setup actions remain that only the
founder can do (they need dashboard access) — see "Pending" below.

## What was verified, and how

The schema was applied to a real PostgreSQL 16 + PostGIS database (not merely
reviewed), pre-polluted with fake Replit-era tables and a `drizzle` schema to
prove the reset path. All 20 checks in `supabase/verify.sql` pass:

| Area | Verified |
|---|---|
| Schema | All 16 tables, enums, indexes, triggers and functions create cleanly |
| Seed | 9 demo chefs, 16 menu items, 15 cuisines, 7 dietary tags (incl. jhatka), Bangalore + 7 neighbourhoods, Singapore seeded inactive |
| Geo | `search_chefs` returns chefs by distance; each chef's own `service_radius_km` gates them even when the buyer asks for a wider radius; dietary filters compose with AND, cuisines with OR |
| Privacy | `search_chefs` never returns phone, WhatsApp, or `address_text`; coordinates rounded to ~100 m |
| RLS | Enabled on every table; anon sees approved chefs only, cannot read `ingest_*`, `events` or the audit log, and cannot write anything |
| Trust | A chef cannot change `status`, `is_verified`, `verified_*`, `fssai_verified_*`, `claimed_by` or `listing_source` (the database raises); editing FSSAI/name/address/phone/location drops an approved listing back to `pending_review` and clears stale FSSAI verification |

`setup.sql` was additionally verified to run as a **single paste**, on a dirty
database, and to be safely re-runnable.

## Deviations from `prompts/phase-0-foundation.md`

1. **Browser-only operation (founder constraint).** The founder builds from an
   office laptop with no local Node/CLI. Consequences:
   - `supabase/setup.sql` was added: reset + all migrations + seed concatenated
     into one file to paste into the Supabase SQL Editor. It is generated from
     the migrations by `scripts/build-setup-sql.mjs` — **edit the migrations,
     never `setup.sql` directly**, then regenerate.
   - `supabase/verify.sql` was added so the acceptance criteria can be checked
     from the browser (prints a PASS/FAIL table).
   - `supabase/ops.sql` was added for routine dashboard tasks (add an admin,
     create the photo bucket, approve a chef, remove the demo data).
   - Acceptance criterion 1 (*fresh clone → local app runs*) is **not
     applicable** to the founder's workflow. The equivalent guarantee comes from
     CI, which installs from a clean checkout, typechecks, lints, builds, and
     applies every migration to a throwaway PostGIS database on each push.
   - `npm run db:reset` / `db:apply` still exist and work — they are for
     contributors with a local toolchain, not the founder's path.

2. **`src/types/db.ts` is hand-maintained**, matching the migrations, because
   generating it needs a linked Supabase CLI. Regenerate with `npm run db:types`
   once the CLI is linked; until then it must be updated alongside any new
   migration.

3. **Demo chef service radii widened** (4–5 km → 6–10 km for three chefs).
   With the original values only one chef was reachable from Indiranagar, too
   thin to build Phase 1 against. Three chefs deliberately keep narrow radii so
   radius-gating stays exercised in tests.

4. **`is_admin()` and `search_chefs()` are `SECURITY DEFINER`** with
   `search_path` pinned — required so RLS policies can consult the admin
   allow-list, and so the search function can enforce its column allow-list.

## Pending — founder actions (nothing else blocks Phase 1 or 2)

1. **Apply the schema.** Supabase dashboard → SQL Editor → paste
   `supabase/setup.sql` → Run. Then paste `supabase/verify.sql` → Run and
   confirm 20 × PASS. *(Destructive: drops the `public` schema, including the
   old Replit tables. Auth users and storage buckets are untouched.)*

2. **Connect the domain.** `zuby.food` currently resolves to registrar parking
   IPs (`15.197.148.33`, `3.33.130.190`), not Vercel. Add the domain in Vercel →
   Project → Settings → Domains and follow its DNS instructions. Until then the
   site is only reachable at its `*.vercel.app` URL.

3. *(When convenient)* Run block 1 of `supabase/ops.sql` to add yourself to the
   `admins` table, and block 2 to create the `chef-photos` storage bucket.
   Neither blocks Phase 1 or 2; both are needed before Phase 3/4.

## Known gaps, deliberately not addressed in Phase 0

- `/api/health` has not been exercised against the live Supabase project (it
  needs the schema applied first). It returns `{"ok":true,"db":"not-configured"}`
  without env vars and is covered by the build.
- The storage-bucket SQL in `ops.sql` could not be tested locally (no
  `storage` schema in a plain PostGIS container); it is standard Supabase SQL.
- No local `supabase start` workflow is documented beyond the CLI commands,
  since the founder does not use one.
