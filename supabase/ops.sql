-- =====================================================================
-- ZUBY — OPERATIONS SNIPPETS (browser / Supabase SQL Editor)
-- =====================================================================
-- Do NOT run this whole file. Copy the one block you need, paste it into
-- the SQL Editor, edit the values, and run it.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. MAKE YOURSELF AN ADMIN
-- ---------------------------------------------------------------------
-- Required before the Phase 3 admin panel will let you in.
-- First sign in to the app at least once (or create the user in
-- Authentication -> Users) so a row exists in auth.users, then run:

insert into public.admins (user_id, email)
select id, email from auth.users where email = 'zubairalibaig@gmail.com'
on conflict (user_id) do nothing;

-- Check it worked:
-- select a.email, a.created_at from public.admins a;


-- ---------------------------------------------------------------------
-- 2. CREATE THE PHOTO STORAGE BUCKET
--    RE-RUN THIS BLOCK: the write policies were tightened in the code review
--    (Nov 2026). The old "authenticated upload chef photos" policy let any
--    signed-in user write anywhere in the bucket; the replacements below scope
--    writes, updates and deletes to the chef's own folder. Running this block
--    again is safe — every statement is drop-if-exists / on-conflict-do-nothing.
-- ---------------------------------------------------------------------
-- Needed before chef/menu photos can be uploaded (Phase 3 and 4).
-- Public read so images can be served from the CDN; writes are restricted
-- by the policies below.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chef-photos', 'chef-photos', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Anyone may view photos.
drop policy if exists "public read chef photos" on storage.objects;
create policy "public read chef photos" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'chef-photos');

-- Writes are scoped to the chef's OWN folder. The upload path is
-- "<chef_id>/<uuid>.jpg", and the first path segment is checked against the
-- caller's listing — otherwise any signed-in user could write into (or over)
-- another kitchen's folder, since the client chooses the path.
drop policy if exists "authenticated upload chef photos" on storage.objects;
drop policy if exists "chef upload own photos" on storage.objects;
create policy "chef upload own photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chef-photos'
    and (
      public.is_admin()
      or exists (
        select 1 from public.chefs c
        where c.claimed_by = auth.uid()
          and c.id::text = (storage.foldername(name))[1]
      )
    )
  );

-- Owners may also replace and remove their own objects. Without a delete
-- policy, chefDeletePhoto() removed the database row and orphaned the file.
drop policy if exists "chef modify own photos" on storage.objects;
create policy "chef modify own photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'chef-photos'
    and exists (
      select 1 from public.chefs c
      where c.claimed_by = auth.uid() and c.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "chef delete own photos" on storage.objects;
create policy "chef delete own photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chef-photos'
    and exists (
      select 1 from public.chefs c
      where c.claimed_by = auth.uid() and c.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "admin manage chef photos" on storage.objects;
create policy "admin manage chef photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'chef-photos' and public.is_admin())
  with check (bucket_id = 'chef-photos' and public.is_admin());


-- ---------------------------------------------------------------------
-- 3. REMOVE THE DEMO CHEFS (do this before public launch)
-- ---------------------------------------------------------------------
-- Menus, photos and tags are removed automatically (on delete cascade).

-- Preview what will go:
-- select slug, kitchen_name, status from public.chefs
--  where kitchen_name like 'Demo Kitchen%';

delete from public.chefs where kitchen_name like 'Demo Kitchen%';


-- ---------------------------------------------------------------------
-- 4. APPROVE A CHEF BY HAND (until the Phase 3 admin panel exists)
-- ---------------------------------------------------------------------
-- Approval is what makes a listing publicly visible. Replace the slug.

update public.chefs
   set status = 'approved',
       is_verified = true,
       verified_at = now()
 where slug = 'replace-with-chef-slug';

-- Record who approved it and why (the audit trail):
insert into public.verification_log (chef_id, admin_user_id, action, note)
select c.id,
       (select user_id from public.admins limit 1),
       'approved',
       'Approved manually via SQL editor'
  from public.chefs c
 where c.slug = 'replace-with-chef-slug';


-- ---------------------------------------------------------------------
-- 5. TAKE A LISTING DOWN
-- ---------------------------------------------------------------------
-- 'delisted' removes it from the public site permanently;
-- 'suspended' is a temporary hold.

update public.chefs set status = 'delisted' where slug = 'replace-with-chef-slug';


-- ---------------------------------------------------------------------
-- 6. INGESTION (Phase 2) — review and promote scraped listings
-- ---------------------------------------------------------------------
-- Collection and normalisation run from GitHub -> Actions -> "Ingest chefs".
-- Review and promotion happen here.

-- What is waiting to be reviewed:
-- select * from public.ingest_review order by created_at desc;

-- Only the ones that need a human decision:
-- select candidate_id, kitchen_name, area, duplicate_of, unmapped
--   from public.ingest_review where status = 'needs_review';

-- Promote a single candidate (creates a pending_review, unclaimed listing):
-- select public.promote_ingest_candidate('paste-candidate_id-here');

-- Promote everything marked clean:
-- select public.promote_all_clean_candidates();

-- Discard a candidate you do not want:
-- update public.ingest_candidates set status = 'discarded' where id = '...';

-- Pipeline health:
-- select * from public.ingest_stats();

-- Trace a listing back to its source (provenance):
-- select c.kitchen_name, ic.normalised ->> 'source' as source,
--        ir.source_url, ir.raw, ir.scraped_at
--   from public.chefs c
--   join public.ingest_candidates ic on ic.promoted_chef_id = c.id
--   left join public.ingest_raw ir on ir.id = ic.ingest_raw_id
--  where c.slug = 'replace-with-chef-slug';

-- TAKEDOWN — remove a listing immediately on request:
-- select public.delist_chef('replace-with-chef-slug', 'Removal requested by owner');


-- ---------------------------------------------------------------------
-- 7. USEFUL LOOKUPS
-- ---------------------------------------------------------------------

-- Everything waiting for review:
-- select slug, kitchen_name, address_area, listing_source, created_at
--   from public.chefs where status = 'pending_review' order by created_at;

-- WhatsApp clicks in the last 7 days, by chef (the launch KPI):
-- select c.kitchen_name, count(*) as clicks
--   from public.events e join public.chefs c on c.id = e.chef_id
--  where e.kind = 'wa_click' and e.created_at > now() - interval '7 days'
--  group by 1 order by clicks desc;

-- Chefs who cover a given point (Indiranagar here), nearest first:
-- select kitchen_name, distance_km from public.search_chefs(12.9719, 77.6412, 10);


-- ---------------------------------------------------------------------
-- 8. ADD A NEW CUISINE OR NEIGHBOURHOOD
-- ---------------------------------------------------------------------
-- Both are already their own tables (public.cuisines, public.neighbourhoods)
-- — never per-city tables, which would mean a schema migration for every
-- new market. One neighbourhoods table with a city_id column already
-- supports any number of cities; adding one is new ROWS, never a new
-- TABLE (CLAUDE.md: "Countries and cities are first-class DB entities").
--
-- Add these when a home chef signs up cooking something not yet listed, or
-- their area isn't in the picker yet. Slugs are lowercase-hyphenated.

-- New cuisine:
insert into public.cuisines (slug, name) values
  ('replace-with-slug', 'Replace With Display Name')
on conflict (slug) do nothing;

-- Two small editorial follow-ups are optional, not required — the cuisine
-- works immediately for search/filtering without them, just with less
-- polish (CLAUDE.md: no AI-generated filler, so these stay hand-written):
--  - CUISINE_EMOJI in src/app/(site)/page.tsx (falls back to a generic 🍽️)
--  - cuisineBlurbs in src/lib/copy/landing.ts (two honest sentences; the
--    cuisine's SEO landing pages render fine without one, just plainer)

-- New neighbourhood (Bangalore shown — swap the slug for another city):
insert into public.neighbourhoods (city_id, slug, name, center) values
  (
    (select id from public.cities where slug = 'bangalore'),
    'replace-with-slug',
    'Replace With Display Name',
    extensions.st_setsrid(
      extensions.st_makepoint(77.0000, 12.0000), -- lng, lat — note the order
      4326
    )::extensions.geography
  )
on conflict (city_id, slug) do nothing;

-- Coordinates don't need to be survey-precise — see the sourcing note at
-- the top of the neighbourhoods insert in supabase/seed.sql. A locality
-- centroid off Google Maps (right-click a point -> the lat/lng shown) is
-- plenty; a chef's own service_radius_km is what actually gates who shows
-- up in search, not the neighbourhood point.

-- Sanity check after adding either:
-- select slug, name from public.cuisines order by name;
-- select n.slug, n.name, c.slug as city from public.neighbourhoods n
--   join public.cities c on c.id = n.city_id order by c.slug, n.name;
