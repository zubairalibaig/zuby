-- =====================================================================
-- ZUBY — VERIFY THE DATABASE (browser / Supabase SQL Editor)
-- =====================================================================
-- Run this AFTER setup.sql. Paste the whole file, press RUN, and read the
-- result table: every row should say PASS.
--
-- These are the Phase 0 acceptance criteria, checked against your real
-- database: schema present, geo search correct, private data not leaking,
-- RLS enforced, and chefs unable to approve themselves.
-- =====================================================================

create temp table if not exists zuby_checks (
  ord int, area text, check_name text, result text, detail text
) on commit preserve rows;
truncate zuby_checks;

do $$
declare
  n int;
  txt text;
  ok boolean;
begin
  -- 1. Schema present -------------------------------------------------
  select count(*) into n from information_schema.tables
   where table_schema = 'public'
     and table_name in ('countries','cities','neighbourhoods','chefs','cuisines',
                        'dietary_tags','chef_cuisines','chef_dietary_tags','menu_items',
                        'chef_photos','claims','verification_log','events',
                        'ingest_raw','ingest_candidates','admins');
  insert into zuby_checks values (1, 'schema', 'all 16 tables exist',
    case when n = 16 then 'PASS' else 'FAIL' end, n || ' of 16 found');

  -- 2. Seed data ------------------------------------------------------
  select count(*) into n from public.chefs;
  insert into zuby_checks values (2, 'seed', 'demo chefs loaded',
    case when n >= 9 then 'PASS' else 'FAIL' end, n || ' chefs');

  select count(*) into n from public.menu_items;
  insert into zuby_checks values (3, 'seed', 'menu items loaded',
    case when n >= 16 then 'PASS' else 'FAIL' end, n || ' items');

  select count(*) into n from public.dietary_tags
   where slug in ('veg','non_veg','halal','jhatka','jain','egg_free','healthy');
  insert into zuby_checks values (4, 'seed', 'all 7 dietary tags (incl. jhatka)',
    case when n = 7 then 'PASS' else 'FAIL' end, n || ' of 7');

  select count(*) into n from public.countries where code = 'SG' and is_active = false;
  insert into zuby_checks values (5, 'seed', 'Singapore present but inactive',
    case when n = 1 then 'PASS' else 'FAIL' end, 'multi-country ready');

  -- 3. Geo search -----------------------------------------------------
  select count(*) into n from public.search_chefs(12.9719, 77.6412, 5);
  insert into zuby_checks values (6, 'geo', 'search near Indiranagar returns chefs',
    case when n >= 1 then 'PASS' else 'FAIL' end, n || ' chefs within 5 km');

  -- Each chef's OWN radius must gate them, even when the buyer asks for 50 km.
  select count(*) into n
    from public.search_chefs(12.9719, 77.6412, 50) s
   where s.distance_km > s.service_radius_km;
  insert into zuby_checks values (7, 'geo', 'chef service radius is respected',
    case when n = 0 then 'PASS' else 'FAIL' end,
    case when n = 0 then 'no chef returned beyond own radius' else n || ' leaked' end);

  -- Dietary filters compose (AND across tags).
  select count(*) into n from public.search_chefs(12.9352, 77.6245, 50, array['veg','egg_free']);
  insert into zuby_checks values (8, 'geo', 'dietary filter (veg AND egg_free)',
    case when n >= 1 then 'PASS' else 'FAIL' end, n || ' chefs');

  select count(*) into n from public.search_chefs(12.9719, 77.6412, 50, array['halal']);
  insert into zuby_checks values (9, 'geo', 'dietary filter (halal)',
    case when n >= 1 then 'PASS' else 'FAIL' end, n || ' chefs');

  -- 4. Privacy: the search function must not expose contact/address/exact geo.
  select string_agg(a.attname, ',') into txt
    from pg_proc p
    cross join lateral unnest(p.proargnames) a(attname)
   where p.proname = 'search_chefs';
  ok := txt not like '%phone%' and txt not like '%whatsapp%' and txt not like '%address_text%';
  insert into zuby_checks values (10, 'privacy', 'search never returns phone/address',
    case when ok then 'PASS' else 'FAIL' end, 'column allow-list enforced');

  -- Approximate coordinates only (rounded to ~100 m).
  select count(*) into n from public.search_chefs(12.9719, 77.6412, 50) s
   where s.approx_lat::text like '%.____%';
  insert into zuby_checks values (11, 'privacy', 'map coords rounded (~100 m)',
    case when n = 0 then 'PASS' else 'FAIL' end, 'no precise kitchen location');

  -- 5. RLS is switched on everywhere.
  select count(*) into n from pg_tables t
    join pg_class c on c.relname = t.tablename
   where t.schemaname = 'public' and not c.relrowsecurity;
  insert into zuby_checks values (12, 'rls', 'RLS enabled on every table',
    case when n = 0 then 'PASS' else 'FAIL' end,
    case when n = 0 then 'all tables protected' else n || ' unprotected' end);

  -- 6. RLS behaviour, as an anonymous visitor.
  -- Results are gathered into variables first: the `anon` role has no rights
  -- on the temp table, so every insert happens after `reset role`.
  declare
    anon_unapproved int;
    anon_approved   int;
    anon_ingest     int;
    anon_events     int;
    anon_write_ok   boolean := false;
  begin
    set local role anon;
      select count(*) into anon_unapproved from public.chefs where status <> 'approved';
      select count(*) into anon_approved   from public.chefs;
      select count(*) into anon_ingest     from public.ingest_raw;
      select count(*) into anon_events     from public.events;
      begin
        insert into public.events (kind) values ('wa_click');
        anon_write_ok := true;
      exception when others then
        anon_write_ok := false;
      end;
    reset role;

    insert into zuby_checks values (13, 'rls', 'anon cannot see unapproved chefs',
      case when anon_unapproved = 0 then 'PASS' else 'FAIL' end, anon_unapproved || ' leaked');
    insert into zuby_checks values (14, 'rls', 'anon CAN see approved chefs',
      case when anon_approved >= 1 then 'PASS' else 'FAIL' end, anon_approved || ' visible');
    insert into zuby_checks values (15, 'rls', 'anon cannot read scraping tables',
      case when anon_ingest = 0 then 'PASS' else 'FAIL' end, anon_ingest || ' rows visible');
    insert into zuby_checks values (16, 'rls', 'anon cannot read analytics events',
      case when anon_events = 0 then 'PASS' else 'FAIL' end, anon_events || ' rows visible');
    insert into zuby_checks values (17, 'rls', 'anon cannot WRITE events',
      case when anon_write_ok then 'FAIL' else 'PASS' end,
      case when anon_write_ok then 'insert succeeded' else 'blocked by RLS' end);
  end;

  -- 7. Trust guard: a chef must not be able to approve or verify themselves.
  insert into auth.users (id) values ('11111111-1111-4111-8111-111111111111')
    on conflict do nothing;
  update public.chefs set claimed_by = '11111111-1111-4111-8111-111111111111'
   where slug = 'demo-aishas-biryani';

  declare
    status_blocked   boolean := false;
    verified_blocked boolean := false;
    requeued         int := 0;
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims',
      '{"sub":"11111111-1111-4111-8111-111111111111"}', true);

      begin
        update public.chefs set status = 'suspended'
         where claimed_by = '11111111-1111-4111-8111-111111111111';
      exception when others then
        status_blocked := true;
      end;

      begin
        update public.chefs set is_verified = false
         where claimed_by = '11111111-1111-4111-8111-111111111111';
      exception when others then
        verified_blocked := true;
      end;

      -- Editing a trust-relevant field must send the listing back for review.
      update public.chefs set fssai_number = '99999999999999'
       where claimed_by = '11111111-1111-4111-8111-111111111111';
      select count(*) into requeued from public.chefs
       where claimed_by = '11111111-1111-4111-8111-111111111111'
         and status = 'pending_review' and fssai_verified_at is null;
    reset role;
    -- Clear the simulated JWT: it is transaction-local, so without this the
    -- cleanup below would still run as the test chef and hit the trust guard.
    perform set_config('request.jwt.claims', '{}', true);

    insert into zuby_checks values (18, 'trust', 'chef cannot change own status',
      case when status_blocked then 'PASS' else 'FAIL' end,
      case when status_blocked then 'blocked by trigger' else 'update succeeded' end);
    insert into zuby_checks values (19, 'trust', 'chef cannot change verified badge',
      case when verified_blocked then 'PASS' else 'FAIL' end,
      case when verified_blocked then 'blocked by trigger' else 'update succeeded' end);
    insert into zuby_checks values (20, 'trust', 'FSSAI edit re-queues for review',
      case when requeued = 1 then 'PASS' else 'FAIL' end, 'status -> pending_review');
  end;

  -- Undo the test mutations.
  update public.chefs
     set claimed_by = null, status = 'approved',
         fssai_number = '11223344556677', fssai_verified_at = null
   where slug = 'demo-aishas-biryani';
  delete from auth.users where id = '11111111-1111-4111-8111-111111111111';
end $$;

select
  case when result = 'PASS' then '✅' else '❌' end as "Status",
  area as "Area",
  check_name as "Check",
  result as "Result",
  detail as "Detail"
from zuby_checks
order by ord;
