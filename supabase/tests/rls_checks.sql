-- RLS spot-checks (Phase 0 acceptance criterion 4).
-- Run in a psql session against a seeded database (local `supabase start` DB or
-- the SQL editor). Each block documents the EXPECTED outcome. These use
-- role-switching, so run as postgres.

-- ============================================================
-- 1. anon can read approved chefs only
-- ============================================================
begin;
set local role anon;
-- EXPECT: only chefs with status = 'approved' (7 seed rows), never
-- pending_review/draft rows.
select slug, status from public.chefs;
rollback;

-- ============================================================
-- 2. anon cannot read ingest staging
-- ============================================================
begin;
set local role anon;
-- EXPECT: 0 rows (RLS: no policy on ingest_raw for anon).
select count(*) from public.ingest_raw;
-- EXPECT: 0 rows.
select count(*) from public.ingest_candidates;
rollback;

-- ============================================================
-- 3. anon cannot write anything
-- ============================================================
begin;
set local role anon;
-- EXPECT: ERROR "new row violates row-level security policy" (or permission denied).
insert into public.events (kind) values ('wa_click');
rollback;

begin;
set local role anon;
-- EXPECT: ERROR — anon has no insert policy on chefs.
insert into public.chefs (city_id, slug, display_name, kitchen_name)
select id, 'hack-kitchen', 'Hack', 'Hack Kitchen' from public.cities limit 1;
rollback;

-- ============================================================
-- 4. anon cannot read events or the audit trail
-- ============================================================
begin;
set local role anon;
-- EXPECT: 0 rows each.
select count(*) from public.events;
select count(*) from public.verification_log;
rollback;

-- ============================================================
-- 5. search_chefs never leaks private columns
-- ============================================================
begin;
set local role anon;
-- EXPECT: rows returned (function is SECURITY DEFINER with an explicit column
-- allow-list). Verify by inspection: no phone_e164 / whatsapp_e164 /
-- address_text / precise location in the output; approx_lat/approx_lng are
-- rounded to 3 decimals (~100 m).
select * from public.search_chefs(12.9719, 77.6412, 5, null, null, null);
rollback;

-- ============================================================
-- 6. authenticated non-owner cannot modify someone else's chef
-- ============================================================
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
-- EXPECT: 0 rows updated (RLS: claimed_by does not match this uid).
update public.chefs set bio = 'pwned' where slug = 'demo-aishas-biryani';
rollback;

-- ============================================================
-- 7. trust fields blocked even for the owner (trigger check)
-- ============================================================
-- To exercise fully: create a test auth user, set claimed_by on a chef to that
-- user's id, then as that user run:
--   update public.chefs set status = 'approved' where claimed_by = auth.uid();
-- EXPECT: ERROR "trust fields can only be changed by an admin" (chefs_guard).
