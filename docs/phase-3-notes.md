# Phase 3 — completion notes

Status: **code complete; typecheck / lint / build all green; the entire SQL and
RLS layer verified directly against real PostgreSQL + PostGIS.** As with Phases
1–2, the HTTP-level path (supabase-js's PostgREST calls, Google OAuth, browser
rendering) could not be exercised from this sandbox — see "Verified vs. not".

## What was built

The internal admin tool, gated to the `admins` allow-list:

- **Auth** — Google OAuth via Supabase (`/admin/login`), an `/auth/callback`
  code-exchange route, and session-refresh middleware. The `/admin` route group
  is gated by a server layout: not signed in → redirect to login; signed in but
  not an admin → **404** (AC1, "no login hint"). `/admin/login` sits outside the
  group so it stays reachable.
- **Overview** (`/admin`) — approved/pending/unclaimed/draft/suspended counts,
  claims-pending, candidates-to-review, last-7-day WhatsApp-click & profile-view
  totals, and top-5 kitchens by clicks with simple bars. One `admin_overview()`
  RPC, all aggregation in SQL.
- **Verification queue** (`/admin/queue`) — pending listings oldest-first with
  photo/FSSAI/WhatsApp/menu completeness ticks; detail view showing every field,
  photos, menu, an OpenStreetMap pin, scrape provenance link, and the full audit
  trail. Actions: approve & publish, reject, request info, suspend, delist, and
  a manual FSSAI-verify sub-step — each writes `verification_log` and revalidates
  the affected ISR paths.
- **Listing editor** (`/admin/chefs`, `/admin/chefs/[id]`, `/admin/chefs/new`) —
  search/filter all chefs; full editor for profile, cuisines/tags, service
  radius, timings (weekly grid), location (numeric + live OSM preview), menu CRUD
  with nutrition & best-seller flags, and photo upload; plus manual chef creation.
- **Ingest review** (`/admin/ingest`) — browser UI over Phase 2's candidates:
  tabs by status, detail with normalised fields + duplicate/unmapped flags + raw
  source JSON, and promote / discard actions (replacing the SQL-editor step).
- **Claims inbox** (`/admin/claims`) — pending claims with the listing's own
  WhatsApp number beside the claimant's, ready for the Phase 4 code-match check;
  approve (links `claimed_by`) or reject, both audited.

## Trust posture (how AC7 "no client-trusted writes" is met, twice)

Every mutation is gated at **two** layers:

1. **The page/action layer** — `requireAdminPage()` / `requireAdminAction()`
   check `auth.uid()` against the DB's own `is_admin()` before anything runs.
2. **The database** — every trust-sensitive change goes through a
   `SECURITY DEFINER` function (`admin_set_chef_status`, `admin_request_info`,
   `admin_verify_fssai`, `admin_set_chef_location`, `admin_decide_claim`,
   `admin_log_edit`, plus Phase 2's `promote_ingest_candidate`) that re-checks
   `is_admin()` and writes the audit row **in the same transaction** as the
   change — so the `verification_log` can never drift from what actually
   happened. Plain-column edits go through supabase-js `.update()` under the
   Phase 0 admin RLS policies (the `chefs_guard` trigger exempts admins, so admin
   edits never flip a listing to pending), followed by one `admin_log_edit`.

Directly verified against Postgres: a **non-admin** authenticated session is
refused by both the RPC guard (raises) and RLS (`UPDATE 0` on ingest tables);
an **admin** session approves a chef (→ approved + is_verified + audit row),
sets a PostGIS location via RPC, decides a claim (→ `claimed_by` +
`listing_source='claimed'` + audit), and reads all statuses incl. private
fields; **anon** still sees nothing of the ingest tables. All 20 Phase-0
acceptance checks still pass with the new migrations applied.

## Migrations added

- `..010_admin_functions.sql` — the six admin action functions above, and admin
  RLS (`select` on `ingest_raw`, `select`+`update` on `ingest_candidates`) so
  the ingest UI works through the normal authenticated client.
- `..011_admin_overview.sql` — the `admin_overview(days)` dashboard RPC.

`supabase/setup.sql` is regenerated and back in sync (CI enforces this).

## Deviations from `prompts/phase-3-admin.md`

1. **Map picker = numeric lat/lng + live OpenStreetMap embed**, not a
   drag-and-drop tile map. Reason: a real drag map needs a tile provider/JS
   library I can't visually test here, and the numeric inputs are the reliable
   source of truth while the free OSM iframe gives the visual confirmation the
   prompt wants ("map pin of location"). No paid map service, no token — fits the
   cost posture. A draggable-marker upgrade is a low-risk future polish.
2. **"Side-by-side diff of pending edits vs last-approved"** is not built. That
   diff needs the `chef_pending_edits` column the prompt itself defers to Phase 4
   (chef self-serve edits that queue). In Phase 3 the listings in review are
   scraped/created drafts with no prior approved version to diff against, so
   there's nothing to compare yet. The full field view + audit trail cover the
   review need today; the diff arrives with the data model that requires it.
3. **Merge-into-existing for duplicate candidates** is implemented as
   discard-with-review (the duplicate flag + the existing chef are both visible),
   rather than an automatic record merge. A true merge tool is deferred — low
   volume at launch, and an over-eager merge is worse than a manual one.
4. **Unauthenticated `/admin` redirects to `/admin/login`** rather than 404-ing.
   AC1 is about the *authenticated non-admin* case (404, no hint), which is met
   exactly; sending a signed-out founder to a plain Google button reveals nothing
   sensitive and is the usable choice.

## Verified vs. not

**Verified directly** (real PostgreSQL 16 + PostGIS): every admin RPC's
behaviour and authorization, the new ingest RLS, cross-table admin reads under
RLS, the dashboard aggregation (counts/events/top-chefs all correct), and that
the 20 Phase-0 checks still pass. Full `tsc`/`eslint`/`prettier`/`next build`
green; all `/admin` routes build as dynamic; middleware registered; `/admin`
blocked in `robots.txt`.

**Not verified — no path from this sandbox:** Google OAuth round-trip and the
callback; supabase-js executing the admin queries over PostgREST (the join
shapes typecheck and the underlying SQL/RLS is proven, but the wire call isn't
run); browser photo-upload → Supabase Storage; and the actual click-through of
each screen. These need the live project.

## Pending — founder actions before Phase 3 is usable in production

1. **Apply the new schema:** re-paste `supabase/setup.sql` in the Supabase SQL
   Editor (it's idempotent; safe to re-run), then `supabase/verify.sql` → 20 PASS.
2. **Add yourself as an admin:** run block 1 of `supabase/ops.sql`.
3. **Create the photo bucket:** run block 2 of `supabase/ops.sql` (needed before
   photo upload works).
4. **Enable Google auth in Supabase:** Authentication → Providers → Google (add
   the OAuth client ID/secret from Google Cloud), and add your Vercel domain +
   `https://<domain>/auth/callback` to the allowed redirect URLs.

Once those are done, sign in at `/admin/login`, and the full loop (promote a
scraped candidate → approve in the queue → live public page) works end-to-end.

**Bangalore soft-launch is unblocked after this phase.**
