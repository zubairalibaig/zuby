-- =====================================================================
-- ZUBY — COMPLETE DATABASE SETUP (browser / Supabase SQL Editor)
-- =====================================================================
-- HOW TO USE
--   1. Supabase dashboard -> SQL Editor -> New query
--   2. Paste this ENTIRE file
--   3. Press RUN
--   4. Then run supabase/verify.sql the same way — expect 20 x PASS
--
-- WHAT IT DOES
--   * DROPS the whole `public` schema (and the leftover `drizzle` schema from
--     the previous Replit project) — every table and row in them is deleted
--   * Recreates Zuby's full V1 schema, RLS policies, triggers and functions
--   * Loads seed data (India + Singapore, Bangalore + 7 neighbourhoods,
--     15 cuisines, 7 dietary tags, 9 demo chefs with menus)
--
-- WHAT IT DOES NOT TOUCH
--   auth users, storage buckets, the extensions schema, or any other schema.
--
-- SAFE TO RE-RUN: yes. Running it again wipes and rebuilds from scratch.
--
-- GENERATED FILE — do not edit by hand. Edit supabase/migrations/*.sql or
-- supabase/seed.sql, then run: node scripts/build-setup-sql.mjs
-- =====================================================================


-- =====================================================================
-- SOURCE: scripts/reset-public-schema.sql
-- =====================================================================
-- DANGER: wipes everything in the `public` schema (tables, types, functions).
-- Used by `npm run db:reset` to clear out any previous setup (e.g. the old
-- Replit-era tables) before applying Zuby's migrations from scratch.
-- Auth users, storage buckets, and the extensions schema are NOT touched.

drop schema if exists public cascade;
-- Drizzle ORM (used by the old Replit setup) keeps its journal in its own schema.
drop schema if exists drizzle cascade;

create schema public;
comment on schema public is 'standard public schema';

-- Restore the grants Supabase expects on public (dropping the schema drops them).
grant usage on schema public to postgres, anon, authenticated, service_role;
grant create on schema public to postgres, service_role;

-- Objects created by the migration runner (postgres) stay visible to the API
-- roles; RLS — not grants — is what gates row access.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000001_extensions_and_enums.sql
-- =====================================================================
-- Phase 0: extensions and enum types.
-- PostGIS lives in the `extensions` schema (Supabase convention); all geography
-- columns and spatial calls are schema-qualified or resolved via search_path.

create schema if not exists extensions;

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Chef lifecycle. Nothing renders publicly unless status = 'approved'.
create type public.chef_status as enum (
  'draft', 'pending_review', 'approved', 'rejected', 'suspended', 'delisted'
);

-- How a listing entered the system.
create type public.listing_source as enum ('scraped', 'self_signup', 'claimed');

-- Chef-level kitchen profile.
create type public.dietary_profile as enum ('veg_only', 'non_veg', 'mixed');

-- Item-level marker (chef-level filterable tags live in dietary_tags).
create type public.item_dietary as enum ('veg', 'non_veg', 'egg');

create type public.claim_status as enum ('pending', 'approved', 'rejected');

create type public.event_kind as enum ('wa_click', 'profile_view', 'search', 'claim_started');

create type public.ingest_status as enum ('new', 'needs_review', 'promoted', 'discarded');

create type public.verification_action as enum (
  'approved', 'rejected', 'info_requested', 'suspended', 'delisted',
  'claim_approved', 'claim_rejected', 'edited'
);

create type public.photo_kind as enum ('kitchen', 'food', 'chef');


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000002_core_tables.sql
-- =====================================================================
-- Phase 0: geography reference tables and admin allow-list.
-- Multi-country from day zero: countries and cities are first-class entities.

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{2}$'),
  name text not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  phone_prefix text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries (id),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  center extensions.geography (point, 4326) not null,
  timezone text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (country_id, slug)
);

create index cities_center_gist on public.cities using gist (center);

create table public.neighbourhoods (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  center extensions.geography (point, 4326) not null,
  created_at timestamptz not null default now(),
  unique (city_id, slug)
);

create index neighbourhoods_center_gist on public.neighbourhoods using gist (center);
create index neighbourhoods_city_idx on public.neighbourhoods (city_id);

-- Admin allow-list. Rows managed via SQL / service role only.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000003_chefs_and_catalog.sql
-- =====================================================================
-- Phase 0: chefs, cuisines, dietary tags, menus, photos.

create table public.cuisines (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.dietary_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_]+$'),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.chefs (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id),
  neighbourhood_id uuid references public.neighbourhoods (id),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  display_name text not null,
  kitchen_name text not null,
  bio text,
  photo_url text,

  -- Contact. NEVER exposed to anon via RLS-safe views/functions; the WhatsApp
  -- deep link is minted server-side by /api/wa/[chefId].
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  whatsapp_e164 text check (whatsapp_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  instagram_handle text,

  -- Geo. `location` is the kitchen's exact point (private); public surfaces get
  -- a ~100 m rounded coordinate from search_chefs(). Radius is the chef's own
  -- declared service area — the search function respects it.
  location extensions.geography (point, 4326),
  service_radius_km numeric not null default 5
    check (service_radius_km > 0 and service_radius_km <= 50),
  address_text text, -- private, admin-only
  address_area text, -- public, e.g. "Indiranagar 2nd Stage"

  status public.chef_status not null default 'draft',
  listing_source public.listing_source not null default 'self_signup',
  claimed_by uuid references auth.users (id) on delete set null,

  -- Regulatory: India
  fssai_number text check (fssai_number ~ '^[0-9]{14}$'),
  fssai_verified_at timestamptz,
  fssai_verified_by uuid references auth.users (id),
  -- Regulatory: Singapore (schema-ready, functionally unused in V1)
  sfa_compliant boolean,
  muis_certified boolean,

  dietary_profile public.dietary_profile,
  is_verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references auth.users (id),

  -- Weekly schedule; shape validated by the app (src/types/schemas.ts timingsSchema).
  timings jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create index chefs_location_gist on public.chefs using gist (location);
create index chefs_status_idx on public.chefs (status);
create index chefs_city_idx on public.chefs (city_id);
create index chefs_neighbourhood_idx on public.chefs (neighbourhood_id);
create index chefs_claimed_by_idx on public.chefs (claimed_by);
create index chefs_display_name_trgm on public.chefs
  using gin (display_name extensions.gin_trgm_ops);
create index chefs_kitchen_name_trgm on public.chefs
  using gin (kitchen_name extensions.gin_trgm_ops);

create table public.chef_cuisines (
  chef_id uuid not null references public.chefs (id) on delete cascade,
  cuisine_id uuid not null references public.cuisines (id),
  primary key (chef_id, cuisine_id)
);

create table public.chef_dietary_tags (
  chef_id uuid not null references public.chefs (id) on delete cascade,
  tag_id uuid not null references public.dietary_tags (id),
  primary key (chef_id, tag_id)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  name text not null,
  description text,
  photo_url text,
  price numeric(10, 2) check (price >= 0),
  -- Denormalised so a price can never exist without a currency.
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  unit text, -- 'per plate', 'per kg', 'per tiffin'
  is_best_seller boolean not null default false,
  is_available boolean not null default true,
  dietary public.item_dietary,
  -- {calories_kcal, protein_g, carbs_g, fat_g, serving_g} — validated by nutritionSchema.
  nutrition jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_items_chef_idx on public.menu_items (chef_id);

create table public.chef_photos (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  url text not null,
  kind public.photo_kind not null default 'food',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index chef_photos_chef_idx on public.chef_photos (chef_id);


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000004_claims_events_ingest.sql
-- =====================================================================
-- Phase 0: claims, verification audit trail, first-party events, ingestion staging.

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  claimant_user_id uuid not null references auth.users (id) on delete cascade,
  claimant_phone text check (claimant_phone ~ '^\+[1-9][0-9]{6,14}$'),
  proof_note text,
  status public.claim_status not null default 'pending',
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index claims_chef_idx on public.claims (chef_id);
create index claims_status_idx on public.claims (status);

-- Append-only audit trail: who approved/rejected/edited whom, and when.
create table public.verification_log (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  admin_user_id uuid references auth.users (id),
  action public.verification_action not null,
  note text,
  created_at timestamptz not null default now()
);

create index verification_log_chef_idx on public.verification_log (chef_id);

-- First-party analytics. wa_click is THE launch KPI (CONCEPT.md).
-- geohash5 is a ~5 km cell — never a precise location.
create table public.events (
  id bigint generated always as identity primary key,
  kind public.event_kind not null,
  chef_id uuid references public.chefs (id) on delete set null,
  city_id uuid references public.cities (id),
  geohash5 text check (char_length(geohash5) = 5),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index events_kind_created_idx on public.events (kind, created_at);
create index events_chef_idx on public.events (chef_id);

-- Ingestion staging. Scraped data NEVER writes directly to chefs (ARCHITECTURE.md).
create table public.ingest_raw (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- 'sheet' | 'instagram' | 'justdial' | ...
  source_url text,
  raw jsonb not null,
  dedupe_key text not null,
  scraped_at timestamptz not null default now(),
  unique (source, dedupe_key)
);

create table public.ingest_candidates (
  id uuid primary key default gen_random_uuid(),
  ingest_raw_id uuid references public.ingest_raw (id) on delete set null,
  normalised jsonb not null,
  status public.ingest_status not null default 'new',
  promoted_chef_id uuid references public.chefs (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ingest_candidates_status_idx on public.ingest_candidates (status);


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000005_functions_and_triggers.sql
-- =====================================================================
-- Phase 0: helper functions, guard triggers, and the core geo search function.

-- True when the current authenticated user is on the admin allow-list.
-- SECURITY DEFINER so it can read public.admins regardless of the caller's RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger chefs_set_updated_at
  before update on public.chefs
  for each row execute function public.set_updated_at();

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

create trigger ingest_candidates_set_updated_at
  before update on public.ingest_candidates
  for each row execute function public.set_updated_at();

-- Chef guard:
--  * A non-admin authenticated user (i.e. a chef) can never set trust fields
--    (status, verification, FSSAI verification, claim linkage) — raises.
--  * When a chef edits trust-RELEVANT content (name, FSSAI number, address,
--    phone, WhatsApp, location), the row drops back to pending_review so an
--    admin re-checks it before it renders publicly again.
--  * Service-role / SQL sessions (auth.uid() is null) and admins are unrestricted.
create or replace function public.chefs_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_is_restricted boolean := auth.uid() is not null and not public.is_admin();
begin
  if tg_op = 'INSERT' then
    if actor_is_restricted then
      -- Chefs create their own drafts; trust fields start clean.
      new.claimed_by := auth.uid();
      new.is_verified := false;
      new.verified_at := null;
      new.verified_by := null;
      new.fssai_verified_at := null;
      new.fssai_verified_by := null;
      if new.status not in ('draft', 'pending_review') then
        new.status := 'draft';
      end if;
      new.listing_source := 'self_signup';
    end if;
    return new;
  end if;

  -- UPDATE
  if actor_is_restricted then
    if new.status is distinct from old.status
      or new.is_verified is distinct from old.is_verified
      or new.verified_at is distinct from old.verified_at
      or new.verified_by is distinct from old.verified_by
      or new.fssai_verified_at is distinct from old.fssai_verified_at
      or new.fssai_verified_by is distinct from old.fssai_verified_by
      or new.claimed_by is distinct from old.claimed_by
      or new.listing_source is distinct from old.listing_source then
      raise exception 'trust fields can only be changed by an admin';
    end if;

    if new.display_name is distinct from old.display_name
      or new.fssai_number is distinct from old.fssai_number
      or new.address_text is distinct from old.address_text
      or new.phone_e164 is distinct from old.phone_e164
      or new.whatsapp_e164 is distinct from old.whatsapp_e164
      or new.location::text is distinct from old.location::text then
      if old.status = 'approved' then
        new.status := 'pending_review';
      end if;
      -- FSSAI number changed → previous manual verification no longer applies.
      if new.fssai_number is distinct from old.fssai_number then
        new.fssai_verified_at := null;
        new.fssai_verified_by := null;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger chefs_guard
  before insert or update on public.chefs
  for each row execute function public.chefs_guard();

-- The core discovery query (ARCHITECTURE.md): approved chefs within BOTH the
-- buyer's chosen radius and each chef's own declared service radius, ordered by
-- distance. Column allow-list: never returns phone numbers, address_text, or
-- the precise location (coordinates are rounded to ~100 m for map pins).
-- Dietary tags compose with AND (veg + jain = both); cuisines with OR.
create or replace function public.search_chefs(
  lat double precision,
  lng double precision,
  max_km double precision default 10,
  tag_slugs text[] default null,
  cuisine_slugs text[] default null,
  city uuid default null
)
returns table (
  id uuid,
  slug text,
  kitchen_name text,
  display_name text,
  bio text,
  photo_url text,
  city_slug text,
  neighbourhood_slug text,
  neighbourhood_name text,
  address_area text,
  dietary_profile public.dietary_profile,
  is_verified boolean,
  fssai_number text,
  service_radius_km numeric,
  timings jsonb,
  distance_km numeric,
  approx_lat double precision,
  approx_lng double precision,
  cuisines text[],
  dietary_tags text[]
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with origin as (
    select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g
  )
  select
    c.id,
    c.slug,
    c.kitchen_name,
    c.display_name,
    c.bio,
    c.photo_url,
    ci.slug as city_slug,
    n.slug as neighbourhood_slug,
    n.name as neighbourhood_name,
    c.address_area,
    c.dietary_profile,
    c.is_verified,
    c.fssai_number,
    c.service_radius_km,
    c.timings,
    round((st_distance(c.location, o.g) / 1000.0)::numeric, 1) as distance_km,
    round(st_y(c.location::geometry)::numeric, 3)::double precision as approx_lat,
    round(st_x(c.location::geometry)::numeric, 3)::double precision as approx_lng,
    coalesce(
      (select array_agg(cu.slug order by cu.slug)
         from public.chef_cuisines cc
         join public.cuisines cu on cu.id = cc.cuisine_id
        where cc.chef_id = c.id),
      '{}'
    ) as cuisines,
    coalesce(
      (select array_agg(dt.slug order by dt.slug)
         from public.chef_dietary_tags cdt
         join public.dietary_tags dt on dt.id = cdt.tag_id
        where cdt.chef_id = c.id),
      '{}'
    ) as dietary_tags
  from public.chefs c
  cross join origin o
  join public.cities ci on ci.id = c.city_id
  left join public.neighbourhoods n on n.id = c.neighbourhood_id
  where c.status = 'approved'
    and c.location is not null
    and st_dwithin(
      c.location,
      o.g,
      least(c.service_radius_km, coalesce(max_km, c.service_radius_km)) * 1000.0
    )
    and (city is null or c.city_id = city)
    and (
      tag_slugs is null
      or not exists (
        select 1
        from unnest(tag_slugs) as wanted (slug)
        where not exists (
          select 1
          from public.chef_dietary_tags cdt
          join public.dietary_tags dt on dt.id = cdt.tag_id
          where cdt.chef_id = c.id and dt.slug = wanted.slug
        )
      )
    )
    and (
      cuisine_slugs is null
      or exists (
        select 1
        from public.chef_cuisines cc
        join public.cuisines cu on cu.id = cc.cuisine_id
        where cc.chef_id = c.id and cu.slug = any (cuisine_slugs)
      )
    )
  order by st_distance(c.location, o.g) asc;
$$;

grant execute on function public.search_chefs(
  double precision, double precision, double precision, text[], text[], uuid
) to anon, authenticated;


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000006_rls.sql
-- =====================================================================
-- Phase 0: Row Level Security on every table.
-- Posture (ARCHITECTURE.md §3):
--   * anon: read-only, approved content only; events are written via the
--     server route with the service role, never directly.
--   * chef (authenticated): CRUD on own rows; trust fields blocked by the
--     chefs_guard trigger.
--   * admin: full access (policies check public.is_admin()).
--   * ingest_* and events: service role only (no anon/authenticated policies
--     except admin reads).

alter table public.countries enable row level security;
alter table public.cities enable row level security;
alter table public.neighbourhoods enable row level security;
alter table public.admins enable row level security;
alter table public.cuisines enable row level security;
alter table public.dietary_tags enable row level security;
alter table public.chefs enable row level security;
alter table public.chef_cuisines enable row level security;
alter table public.chef_dietary_tags enable row level security;
alter table public.menu_items enable row level security;
alter table public.chef_photos enable row level security;
alter table public.claims enable row level security;
alter table public.verification_log enable row level security;
alter table public.events enable row level security;
alter table public.ingest_raw enable row level security;
alter table public.ingest_candidates enable row level security;

-- ---------- Reference data: public read, admin write ----------

create policy "public read" on public.countries
  for select to anon, authenticated using (true);
create policy "admin write" on public.countries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read" on public.cities
  for select to anon, authenticated using (true);
create policy "admin write" on public.cities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read" on public.neighbourhoods
  for select to anon, authenticated using (true);
create policy "admin write" on public.neighbourhoods
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read" on public.cuisines
  for select to anon, authenticated using (true);
create policy "admin write" on public.cuisines
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read" on public.dietary_tags
  for select to anon, authenticated using (true);
create policy "admin write" on public.dietary_tags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- admins: users may check their own membership ----------

create policy "read own membership" on public.admins
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- No insert/update/delete policies: managed via SQL / service role only.

-- ---------- chefs ----------

-- Anon sees only approved chefs. A logged-in chef also sees their own row in
-- any status. Admins see everything.
create policy "read approved or own" on public.chefs
  for select to anon, authenticated
  using (status = 'approved' or claimed_by = auth.uid() or public.is_admin());

-- Chefs create their own listing (chefs_guard normalises trust fields).
create policy "chef insert own" on public.chefs
  for insert to authenticated
  with check (claimed_by = auth.uid() or public.is_admin());

-- Chefs edit their own listing (chefs_guard blocks trust-field changes and
-- drops trust-relevant edits back to pending_review).
create policy "chef update own" on public.chefs
  for update to authenticated
  using (claimed_by = auth.uid() or public.is_admin())
  with check (claimed_by = auth.uid() or public.is_admin());

create policy "admin delete" on public.chefs
  for delete to authenticated using (public.is_admin());

-- ---------- chef-owned child tables ----------
-- Readable when the parent chef is publicly visible (or owned / admin);
-- writable by the owning chef or an admin.

create policy "read via parent chef" on public.chef_cuisines
  for select to anon, authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id
      and (c.status = 'approved' or c.claimed_by = auth.uid() or public.is_admin())
  ));
create policy "owner write" on public.chef_cuisines
  for all to authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ));

create policy "read via parent chef" on public.chef_dietary_tags
  for select to anon, authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id
      and (c.status = 'approved' or c.claimed_by = auth.uid() or public.is_admin())
  ));
create policy "owner write" on public.chef_dietary_tags
  for all to authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ));

create policy "read via parent chef" on public.menu_items
  for select to anon, authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id
      and (c.status = 'approved' or c.claimed_by = auth.uid() or public.is_admin())
  ));
create policy "owner write" on public.menu_items
  for all to authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ));

create policy "read via parent chef" on public.chef_photos
  for select to anon, authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id
      and (c.status = 'approved' or c.claimed_by = auth.uid() or public.is_admin())
  ));
create policy "owner write" on public.chef_photos
  for all to authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ));

-- ---------- claims ----------

create policy "claimant insert" on public.claims
  for insert to authenticated
  with check (claimant_user_id = auth.uid() and status = 'pending');

create policy "read own or admin" on public.claims
  for select to authenticated
  using (claimant_user_id = auth.uid() or public.is_admin());

create policy "admin decide" on public.claims
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- verification_log: append-only, admin-only ----------

create policy "admin read" on public.verification_log
  for select to authenticated using (public.is_admin());
create policy "admin append" on public.verification_log
  for insert to authenticated with check (public.is_admin());
-- No update/delete policies: the audit trail is append-only for API roles.

-- ---------- events: service-role writes only; admin reads ----------

create policy "admin read" on public.events
  for select to authenticated using (public.is_admin());
-- No anon/authenticated insert: /api/wa and page-view logging use the
-- service-role client server-side (rate-limited in the route handler).

-- ---------- ingest_*: service role only ----------
-- RLS enabled with no policies = deny for anon/authenticated; the service
-- role bypasses RLS, which is exactly the contract for the /ingest scripts.


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000007_ingest_helpers.sql
-- =====================================================================
-- Phase 2: helpers for the ingestion pipeline.
--
-- Promotion lives in SQL rather than the TypeScript CLI for two reasons:
-- it writes a PostGIS geography (awkward over PostgREST), and it means the
-- founder can promote a listing straight from the Supabase SQL Editor without
-- any local tooling.

-- Neighbourhood centroids as plain lat/lng, so the normaliser can place a
-- listing that has no address at its neighbourhood's centre.
create or replace function public.neighbourhood_centroids()
returns table (slug text, name text, city_slug text, lat double precision, lng double precision)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select n.slug,
         n.name,
         c.slug as city_slug,
         st_y(n.center::geometry) as lat,
         st_x(n.center::geometry) as lng
    from public.neighbourhoods n
    join public.cities c on c.id = n.city_id;
$$;

grant execute on function public.neighbourhood_centroids() to anon, authenticated, service_role;

-- Human-readable review queue. Read this in the SQL Editor to decide what to
-- promote. Restricted to admins / service role by the RLS on ingest_candidates.
create or replace view public.ingest_review as
select
  c.id                                            as candidate_id,
  c.status,
  c.normalised ->> 'kitchen_name'                 as kitchen_name,
  c.normalised ->> 'display_name'                 as chef_name,
  c.normalised ->> 'whatsapp_e164'                as whatsapp,
  c.normalised ->> 'address_area'                 as area,
  c.normalised ->> 'neighbourhood_slug'           as neighbourhood,
  c.normalised ->> 'geo_source'                   as geo_source,
  c.normalised -> 'cuisine_slugs'                 as cuisines,
  c.normalised -> 'dietary_tag_slugs'             as dietary_tags,
  c.normalised ->> 'fssai_number'                 as fssai,
  c.normalised -> 'unmapped'                      as unmapped,
  c.normalised -> 'duplicate_of'                  as duplicate_of,
  c.normalised ->> 'source'                       as source,
  c.normalised ->> 'source_url'                   as source_url,
  c.promoted_chef_id,
  c.created_at
from public.ingest_candidates c;

-- Promote one candidate into an unclaimed listing awaiting admin approval.
--
-- The new chef is ALWAYS created with status 'pending_review' and
-- claimed_by null: scraped data never goes public without a human approving it,
-- and the chef can claim the listing later (Phase 4).
create or replace function public.promote_ingest_candidate(candidate_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  cand        public.ingest_candidates%rowtype;
  n           jsonb;
  v_city_id   uuid;
  v_hood_id   uuid;
  v_slug      text;
  v_suffix    int := 1;
  v_chef_id   uuid;
  v_lat       double precision;
  v_lng       double precision;
  v_currency  text;
  tag_slug    text;
begin
  -- Only an admin or a service-role/SQL-editor session may promote.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'only admins can promote ingest candidates';
  end if;

  select * into cand from public.ingest_candidates where id = candidate_id;
  if not found then
    raise exception 'candidate % not found', candidate_id;
  end if;
  if cand.status = 'promoted' then
    raise exception 'candidate % was already promoted (chef %)', candidate_id, cand.promoted_chef_id;
  end if;

  n := cand.normalised;

  select id into v_city_id from public.cities where slug = n ->> 'city_slug';
  if v_city_id is null then
    raise exception 'unknown city slug: %', n ->> 'city_slug';
  end if;

  select id into v_hood_id
    from public.neighbourhoods
   where city_id = v_city_id and slug = n ->> 'neighbourhood_slug';

  -- Unique slug within the city.
  v_slug := n ->> 'suggested_slug';
  while exists (select 1 from public.chefs where city_id = v_city_id and slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := (n ->> 'suggested_slug') || '-' || v_suffix;
  end loop;

  v_lat := nullif(n ->> 'lat', '')::double precision;
  v_lng := nullif(n ->> 'lng', '')::double precision;

  insert into public.chefs (
    city_id, neighbourhood_id, slug, display_name, kitchen_name, bio,
    phone_e164, whatsapp_e164, instagram_handle,
    location, address_area,
    status, listing_source, claimed_by,
    fssai_number, dietary_profile, is_verified
  ) values (
    v_city_id,
    v_hood_id,
    v_slug,
    coalesce(nullif(n ->> 'display_name', ''), n ->> 'kitchen_name'),
    n ->> 'kitchen_name',
    nullif(n ->> 'bio', ''),
    nullif(n ->> 'phone_e164', ''),
    nullif(n ->> 'whatsapp_e164', ''),
    nullif(n ->> 'instagram_handle', ''),
    case
      when v_lat is not null and v_lng is not null
      then st_setsrid(st_makepoint(v_lng, v_lat), 4326)::geography
    end,
    nullif(n ->> 'address_area', ''),
    'pending_review',          -- never public without admin approval
    'scraped',
    null,                      -- unclaimed: the chef can claim it later
    nullif(n ->> 'fssai_number', ''),
    nullif(n ->> 'dietary_profile', '')::public.dietary_profile,
    false
  )
  returning id into v_chef_id;

  -- Cuisines
  insert into public.chef_cuisines (chef_id, cuisine_id)
  select v_chef_id, cu.id
    from jsonb_array_elements_text(coalesce(n -> 'cuisine_slugs', '[]'::jsonb)) as s(slug)
    join public.cuisines cu on cu.slug = s.slug
  on conflict do nothing;

  -- Dietary tags
  for tag_slug in
    select value from jsonb_array_elements_text(coalesce(n -> 'dietary_tag_slugs', '[]'::jsonb))
  loop
    insert into public.chef_dietary_tags (chef_id, tag_id)
    select v_chef_id, dt.id from public.dietary_tags dt where dt.slug = tag_slug
    on conflict do nothing;
  end loop;

  -- Menu items, only when the source genuinely carried them.
  select co.currency_code into v_currency
    from public.cities ci join public.countries co on co.id = ci.country_id
   where ci.id = v_city_id;

  insert into public.menu_items (chef_id, name, description, price, currency_code, is_available, sort_order)
  select
    v_chef_id,
    item ->> 'name',
    nullif(item ->> 'description', ''),
    nullif(item ->> 'price', '')::numeric,   -- null unless explicitly known
    v_currency,
    true,
    (ordinality)::int
  from jsonb_array_elements(coalesce(n -> 'menu_items', '[]'::jsonb)) with ordinality as t(item, ordinality)
  where nullif(item ->> 'name', '') is not null;

  -- Provenance and audit trail.
  update public.ingest_candidates
     set status = 'promoted', promoted_chef_id = v_chef_id
   where id = candidate_id;

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (
    v_chef_id,
    auth.uid(),
    'edited',
    format('Promoted from ingest candidate %s (source: %s)', candidate_id, coalesce(n ->> 'source', 'unknown'))
  );

  return v_chef_id;
end;
$$;

revoke all on function public.promote_ingest_candidate(uuid) from public, anon;
grant execute on function public.promote_ingest_candidate(uuid) to authenticated, service_role;

-- Promote every candidate currently marked 'new'. Returns how many were done.
create or replace function public.promote_all_clean_candidates()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rec record;
  n int := 0;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'only admins can promote ingest candidates';
  end if;

  for rec in select id from public.ingest_candidates where status = 'new' order by created_at loop
    perform public.promote_ingest_candidate(rec.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.promote_all_clean_candidates() from public, anon;
grant execute on function public.promote_all_clean_candidates() to authenticated, service_role;

-- Take a listing down immediately (takedown request, or a bad scrape).
create or replace function public.delist_chef(chef_slug text, reason text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_chef_id uuid;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'only admins can delist a chef';
  end if;

  update public.chefs set status = 'delisted' where slug = chef_slug returning id into v_chef_id;
  if v_chef_id is null then
    raise exception 'no chef with slug %', chef_slug;
  end if;

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (v_chef_id, auth.uid(), 'delisted', coalesce(reason, 'Delisted on request'));
end;
$$;

revoke all on function public.delist_chef(text, text) from public, anon;
grant execute on function public.delist_chef(text, text) to authenticated, service_role;

-- Pipeline health at a glance.
create or replace function public.ingest_stats()
returns table (metric text, value bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select 'raw records collected', count(*) from public.ingest_raw
  union all
  select 'candidates: ' || status, count(*) from public.ingest_candidates group by status
  union all
  select 'chefs: ' || status, count(*) from public.chefs group by status
  union all
  select 'chefs from scraping', count(*) from public.chefs where listing_source = 'scraped'
  union all
  select 'unclaimed listings', count(*) from public.chefs where claimed_by is null;
$$;

grant execute on function public.ingest_stats() to authenticated, service_role;


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000008_city_centroids.sql
-- =====================================================================
-- Phase 1: city centroids, the city-level counterpart to Phase 2's
-- neighbourhood_centroids(). PostGIS geography isn't directly readable through
-- PostgREST, so public pages need this the same way the ingest pipeline does.

create or replace function public.city_centroids()
returns table (slug text, name text, country_code text, lat double precision, lng double precision)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select c.slug,
         c.name,
         co.code as country_code,
         st_y(c.center::geometry) as lat,
         st_x(c.center::geometry) as lng
    from public.cities c
    join public.countries co on co.id = c.country_id
   where c.is_active = true;
$$;

grant execute on function public.city_centroids() to anon, authenticated, service_role;


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000009_chef_public_location.sql
-- =====================================================================
-- Phase 1: the ~100 m rounded point for one chef, reused for two things —
-- FoodEstablishment JSON-LD geo on the profile page, and the client-side
-- "~X km from you" distance shown when the buyer already granted location.
-- Same privacy rule as search_chefs(): never the exact kitchen location.

create or replace function public.chef_public_location(p_chef_id uuid)
returns table (lat double precision, lng double precision)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select round(st_y(c.location::geometry)::numeric, 3)::double precision,
         round(st_x(c.location::geometry)::numeric, 3)::double precision
    from public.chefs c
   where c.id = p_chef_id
     and c.status = 'approved'
     and c.location is not null;
$$;

grant execute on function public.chef_public_location(uuid) to anon, authenticated, service_role;


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000010_admin_functions.sql
-- =====================================================================
-- Phase 3: admin action functions and ingest-table admin access.
--
-- Every trust-sensitive admin mutation goes through a SECURITY DEFINER function
-- that (a) re-checks is_admin() at the database, and (b) writes verification_log
-- in the SAME transaction as the change. That means the audit trail can never
-- drift from reality, and — with the RLS policies from Phase 0 — an admin
-- mutation is verified server-side twice: middleware/layout gate, then the DB.

-- ---------------------------------------------------------------------------
-- Chef status transitions (approve / reject / suspend / delist)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_chef_status(
  p_chef_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status public.chef_status := p_status::public.chef_status;
  v_action public.verification_action;
begin
  if not public.is_admin() then
    raise exception 'only admins may change chef status';
  end if;

  if v_status = 'approved' then
    v_action := 'approved';
    update public.chefs
       set status = 'approved',
           is_verified = true,
           verified_at = now(),
           verified_by = auth.uid()
     where id = p_chef_id;
  else
    v_action := case v_status
      when 'rejected' then 'rejected'::public.verification_action
      when 'suspended' then 'suspended'::public.verification_action
      when 'delisted' then 'delisted'::public.verification_action
      else 'edited'::public.verification_action
    end;
    -- Suspending / delisting a live chef removes the public badge too.
    update public.chefs
       set status = v_status,
           is_verified = case when v_status in ('suspended','delisted','rejected') then false else is_verified end
     where id = p_chef_id;
  end if;

  if not found then
    raise exception 'chef % not found', p_chef_id;
  end if;

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (p_chef_id, auth.uid(), v_action, p_note);
end;
$$;

-- ---------------------------------------------------------------------------
-- Request more info: keep the listing in review, record what's missing.
-- ---------------------------------------------------------------------------
create or replace function public.admin_request_info(p_chef_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins may request info';
  end if;

  update public.chefs set status = 'pending_review'
   where id = p_chef_id and status <> 'approved';

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (p_chef_id, auth.uid(), 'info_requested', p_note);
end;
$$;

-- ---------------------------------------------------------------------------
-- Manual FSSAI verification (visual check, no external API in V1).
-- ---------------------------------------------------------------------------
create or replace function public.admin_verify_fssai(p_chef_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins may verify FSSAI';
  end if;

  update public.chefs
     set fssai_verified_at = now(), fssai_verified_by = auth.uid()
   where id = p_chef_id;
  if not found then
    raise exception 'chef % not found', p_chef_id;
  end if;

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (p_chef_id, auth.uid(), 'edited', coalesce(p_note, 'FSSAI number verified'));
end;
$$;

-- ---------------------------------------------------------------------------
-- Location (PostGIS geography is awkward over PostgREST — set it here).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_chef_location(
  p_chef_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins may set location';
  end if;

  update public.chefs
     set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
   where id = p_chef_id;
  if not found then
    raise exception 'chef % not found', p_chef_id;
  end if;

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (p_chef_id, auth.uid(), 'edited', coalesce(p_note, 'Location updated'));
end;
$$;

-- ---------------------------------------------------------------------------
-- Generic "an admin edited this" audit row, written after a plain-column
-- update done through the normal supabase-js client.
-- ---------------------------------------------------------------------------
create or replace function public.admin_log_edit(p_chef_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins may log edits';
  end if;
  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (p_chef_id, auth.uid(), 'edited', p_note);
end;
$$;

-- ---------------------------------------------------------------------------
-- Claim decisions (links chefs.claimed_by on approval).
-- ---------------------------------------------------------------------------
create or replace function public.admin_decide_claim(
  p_claim_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim public.claims%rowtype;
begin
  if not public.is_admin() then
    raise exception 'only admins may decide claims';
  end if;

  select * into v_claim from public.claims where id = p_claim_id;
  if not found then
    raise exception 'claim % not found', p_claim_id;
  end if;

  update public.claims
     set status = case when p_approve then 'approved' else 'rejected' end::public.claim_status,
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_claim_id;

  if p_approve then
    update public.chefs
       set claimed_by = v_claim.claimant_user_id,
           listing_source = 'claimed'
     where id = v_claim.chef_id;
  end if;

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (
    v_claim.chef_id,
    auth.uid(),
    case when p_approve then 'claim_approved' else 'claim_rejected' end::public.verification_action,
    p_note
  );
end;
$$;

-- Lock down and grant. Execute is allowed for authenticated (the is_admin()
-- check inside each function is the real gate); anon can never call them.
revoke all on function
  public.admin_set_chef_status(uuid, text, text),
  public.admin_request_info(uuid, text),
  public.admin_verify_fssai(uuid, text),
  public.admin_set_chef_location(uuid, double precision, double precision, text),
  public.admin_log_edit(uuid, text),
  public.admin_decide_claim(uuid, boolean, text)
  from public, anon;

grant execute on function
  public.admin_set_chef_status(uuid, text, text),
  public.admin_request_info(uuid, text),
  public.admin_verify_fssai(uuid, text),
  public.admin_set_chef_location(uuid, double precision, double precision, text),
  public.admin_log_edit(uuid, text),
  public.admin_decide_claim(uuid, boolean, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Ingest tables: admins may read raw + candidates and update candidate status
-- from the browser (the Phase 3 /admin/ingest UI). Scrapers still use the
-- service role; anon still sees nothing.
-- ---------------------------------------------------------------------------
create policy "admin read" on public.ingest_raw
  for select to authenticated using (public.is_admin());

create policy "admin read" on public.ingest_candidates
  for select to authenticated using (public.is_admin());

create policy "admin update" on public.ingest_candidates
  for update to authenticated using (public.is_admin()) with check (public.is_admin());


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000011_admin_overview.sql
-- =====================================================================
-- Phase 3: one round-trip for the admin dashboard. All aggregation in SQL,
-- admin-gated, returned as jsonb so the UI reads one object.
create or replace function public.admin_overview(p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;

  select jsonb_build_object(
    'counts', jsonb_build_object(
      'chefs_approved',   (select count(*) from public.chefs where status = 'approved'),
      'chefs_pending',    (select count(*) from public.chefs where status = 'pending_review'),
      'chefs_draft',      (select count(*) from public.chefs where status = 'draft'),
      'chefs_unclaimed',  (select count(*) from public.chefs where claimed_by is null and status = 'approved'),
      'chefs_suspended',  (select count(*) from public.chefs where status in ('suspended','delisted')),
      'claims_pending',   (select count(*) from public.claims where status = 'pending'),
      'candidates_new',   (select count(*) from public.ingest_candidates where status = 'new'),
      'candidates_review',(select count(*) from public.ingest_candidates where status = 'needs_review')
    ),
    'events', (
      select coalesce(jsonb_object_agg(kind, total), '{}'::jsonb)
      from (
        select kind::text as kind, count(*) as total
        from public.events
        where created_at > now() - make_interval(days => p_days)
        group by kind
      ) e
    ),
    'top_chefs', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select c.kitchen_name, c.slug, c.city_slug, c.neighbourhood_slug, t.wa_clicks
        from (
          select ev.chef_id, count(*) as wa_clicks
          from public.events ev
          where ev.kind = 'wa_click'
            and ev.created_at > now() - make_interval(days => p_days)
            and ev.chef_id is not null
          group by ev.chef_id
          order by count(*) desc
          limit 5
        ) t
        join (
          select ch.id, ch.kitchen_name, ch.slug,
                 ci.slug as city_slug, n.slug as neighbourhood_slug
          from public.chefs ch
          join public.cities ci on ci.id = ch.city_id
          left join public.neighbourhoods n on n.id = ch.neighbourhood_id
        ) c on c.id = t.chef_id
        order by t.wa_clicks desc
      ) t
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_overview(integer) from public, anon;
grant execute on function public.admin_overview(integer) to authenticated, service_role;


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000012_chef_dashboard.sql
-- =====================================================================
-- Phase 4: chef dashboard — pending-edits column, chef-facing location setter,
-- event-stats query, and the claim verification code helpers.

-- ---------------------------------------------------------------------------
-- Pending edits: trust-relevant field changes by a chef are stored here until
-- an admin approves them. The public page continues serving the existing row
-- values; the admin queue shows a diff.
-- ---------------------------------------------------------------------------
alter table public.chefs
  add column if not exists pending_edits jsonb;

comment on column public.chefs.pending_edits is
  'jsonb of trust-relevant field diffs pending admin approval (Phase 4). '
  'NULL = no pending changes. Keys match column names: display_name, fssai_number, '
  'address_text, phone_e164, whatsapp_e164, location_lat, location_lng.';

-- ---------------------------------------------------------------------------
-- Chef-facing location setter (uses the same PostGIS helper as the admin one
-- but is callable by the owning chef — SECURITY DEFINER bypasses the direct
-- geography column RLS awkwardness).
-- ---------------------------------------------------------------------------
create or replace function public.chef_set_own_location(
  p_chef_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  -- Only the owning chef or an admin may call this.
  if not exists (
    select 1 from public.chefs
    where id = p_chef_id
      and (claimed_by = auth.uid() or public.is_admin())
  ) then
    raise exception 'not authorised to set location for chef %', p_chef_id;
  end if;

  update public.chefs
     set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
   where id = p_chef_id;
end;
$$;

revoke all on function public.chef_set_own_location(uuid, double precision, double precision) from public, anon;
grant execute on function public.chef_set_own_location(uuid, double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- Event stats: per-chef wa_click + profile_view counts over last N days.
-- Called by the dashboard "My stats" panel. SECURITY DEFINER so it can read
-- the events table (which has no anon/authenticated SELECT policy).
-- ---------------------------------------------------------------------------
create or replace function public.chef_event_stats(
  p_chef_id uuid,
  p_days integer default 30
)
returns table (kind text, cnt bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.kind::text, count(*) as cnt
    from public.events e
   where e.chef_id = p_chef_id
     and e.kind in ('wa_click', 'profile_view')
     and e.created_at >= now() - make_interval(days => p_days)
   group by e.kind;
$$;

-- Only the owning chef or admin should call, but since it only returns
-- aggregate counts (not PII) and the chef_id must be supplied, granting to
-- authenticated is safe — a curious user learns "chef X got Y clicks"
-- which is public-level info anyway.
revoke all on function public.chef_event_stats(uuid, integer) from public, anon;
grant execute on function public.chef_event_stats(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: apply pending edits. Called from the admin approve flow to merge
-- pending_edits back into the actual columns, then clear the pending_edits.
-- ---------------------------------------------------------------------------
create or replace function public.admin_apply_pending_edits(p_chef_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_edits jsonb;
begin
  if not public.is_admin() then
    raise exception 'only admins may apply pending edits';
  end if;

  select pending_edits into v_edits
    from public.chefs where id = p_chef_id;

  if v_edits is null then
    return; -- nothing to apply
  end if;

  -- Apply each field if present in the edits object.
  update public.chefs set
    display_name = coalesce(v_edits->>'display_name', display_name),
    fssai_number = case when v_edits ? 'fssai_number' then v_edits->>'fssai_number' else fssai_number end,
    address_text = case when v_edits ? 'address_text' then v_edits->>'address_text' else address_text end,
    phone_e164 = case when v_edits ? 'phone_e164' then v_edits->>'phone_e164' else phone_e164 end,
    whatsapp_e164 = case when v_edits ? 'whatsapp_e164' then v_edits->>'whatsapp_e164' else whatsapp_e164 end,
    pending_edits = null
  where id = p_chef_id;

  -- If location was edited, set it via PostGIS.
  if v_edits ? 'location_lat' and v_edits ? 'location_lng' then
    update public.chefs
       set location = st_setsrid(
         st_makepoint(
           (v_edits->>'location_lng')::double precision,
           (v_edits->>'location_lat')::double precision
         ), 4326)::geography
     where id = p_chef_id;
  end if;

  -- FSSAI changed → clear previous verification
  if v_edits ? 'fssai_number' then
    update public.chefs
       set fssai_verified_at = null, fssai_verified_by = null
     where id = p_chef_id;
  end if;

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (p_chef_id, auth.uid(), 'edited', coalesce(p_note, 'Applied pending edits'));
end;
$$;

revoke all on function public.admin_apply_pending_edits(uuid, text) from public, anon;
grant execute on function public.admin_apply_pending_edits(uuid, text) to authenticated, service_role;


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000013_metrics.sql
-- =====================================================================
-- Phase 5: the launch-KPI dashboard (/admin/metrics).
--
-- The four metrics in CONCEPT.md, plus the breakdowns that tell chef outreach
-- where to go next. All aggregation in SQL, one round trip, admin-gated.
--
-- Unique-visitor counting is deliberately approximate: `events` stores a
-- 5-character geohash and no visitor identifier, because Phase 1 chose not to
-- track individuals. Distinct (geohash5, day) is a proxy, not a true unique —
-- the UI must label it as such, and Vercel Analytics is the cross-check.

-- Manual record of ranking wins, until GSC API automation post-V1 (Phase 5
-- prompt §5.4). Small enough to hand-maintain, useful enough to be worth it.
create table if not exists public.ranking_wins (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  page_path text not null,
  position numeric(4,1) not null check (position > 0),
  recorded_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists ranking_wins_recorded_idx
  on public.ranking_wins (recorded_on desc);

alter table public.ranking_wins enable row level security;

-- Admin-only in both directions: this is internal performance data.
drop policy if exists "admin read" on public.ranking_wins;
create policy "admin read" on public.ranking_wins
  for select to authenticated using (public.is_admin());

drop policy if exists "admin write" on public.ranking_wins;
create policy "admin write" on public.ranking_wins
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- admin_metrics: 8-week trend + current breakdowns.
-- ---------------------------------------------------------------------------
create or replace function public.admin_metrics(p_weeks integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  v_since timestamptz := date_trunc('week', now()) - make_interval(weeks => p_weeks - 1);
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;

  select jsonb_build_object(
    -- KPI 1: chef supply, with the pipeline behind it.
    'chefs', jsonb_build_object(
      'approved', (select count(*) from public.chefs where status = 'approved'),
      'pending',  (select count(*) from public.chefs where status = 'pending_review'),
      'draft',    (select count(*) from public.chefs where status = 'draft'),
      'claimed',  (select count(*) from public.chefs where status = 'approved' and claimed_by is not null)
    ),

    -- KPIs 2 and 3, weekly. Weeks with no activity are absent rather than
    -- zero-filled; the UI fills the gaps so the trend line doesn't lie.
    'weekly', coalesce((
      select jsonb_agg(row_to_json(w) order by w.week_start)
      from (
        select
          date_trunc('week', e.created_at)::date as week_start,
          count(*) filter (where e.kind = 'wa_click')                as wa_clicks,
          count(*) filter (where e.kind = 'profile_view')            as profile_views,
          count(distinct e.geohash5) filter (where e.geohash5 is not null) as distinct_areas,
          count(distinct (e.geohash5, date_trunc('day', e.created_at)))    as approx_visitors
        from public.events e
        where e.created_at >= v_since
        group by 1
      ) w
    ), '[]'::jsonb),

    -- Where the WhatsApp clicks are coming from. This is the supply-recruitment
    -- signal: high intent in an area with few chefs means go recruit there.
    'by_neighbourhood', coalesce((
      select jsonb_agg(row_to_json(t) order by t.wa_clicks desc)
      from (
        select
          coalesce(n.name, 'Unknown') as name,
          coalesce(n.slug, '')        as slug,
          count(*)                    as wa_clicks,
          count(distinct ch.id)       as chef_count
        from public.events e
        join public.chefs ch on ch.id = e.chef_id
        left join public.neighbourhoods n on n.id = ch.neighbourhood_id
        where e.kind = 'wa_click' and e.created_at >= v_since
        group by 1, 2
        order by count(*) desc
        limit 20
      ) t
    ), '[]'::jsonb),

    'by_cuisine', coalesce((
      select jsonb_agg(row_to_json(t) order by t.wa_clicks desc)
      from (
        select cu.name, cu.slug, count(*) as wa_clicks
        from public.events e
        join public.chefs ch on ch.id = e.chef_id
        join public.chef_cuisines cc on cc.chef_id = ch.id
        join public.cuisines cu on cu.id = cc.cuisine_id
        where e.kind = 'wa_click' and e.created_at >= v_since
        group by 1, 2
        order by count(*) desc
        limit 15
      ) t
    ), '[]'::jsonb),

    'by_dietary', coalesce((
      select jsonb_agg(row_to_json(t) order by t.wa_clicks desc)
      from (
        select dt.name, dt.slug, count(*) as wa_clicks
        from public.events e
        join public.chefs ch on ch.id = e.chef_id
        join public.chef_dietary_tags cdt on cdt.chef_id = ch.id
        join public.dietary_tags dt on dt.id = cdt.tag_id
        where e.kind = 'wa_click' and e.created_at >= v_since
        group by 1, 2
        order by count(*) desc
      ) t
    ), '[]'::jsonb),

    'top_chefs', coalesce((
      select jsonb_agg(row_to_json(t) order by t.wa_clicks desc)
      from (
        select ch.kitchen_name, ch.slug, ci.slug as city_slug,
               n.slug as neighbourhood_slug, count(*) as wa_clicks
        from public.events e
        join public.chefs ch on ch.id = e.chef_id
        join public.cities ci on ci.id = ch.city_id
        left join public.neighbourhoods n on n.id = ch.neighbourhood_id
        where e.kind = 'wa_click' and e.created_at >= v_since
        group by 1, 2, 3, 4
        order by count(*) desc
        limit 10
      ) t
    ), '[]'::jsonb),

    -- KPI 4: manually recorded until the GSC API lands post-V1.
    'ranking_wins', coalesce((
      select jsonb_agg(row_to_json(r) order by r.recorded_on desc)
      from (
        select query, page_path, position, recorded_on, note
        from public.ranking_wins
        order by recorded_on desc
        limit 50
      ) r
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_metrics(integer) from public, anon;
grant execute on function public.admin_metrics(integer) to authenticated, service_role;


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000014_home_discovery.sql
-- =====================================================================
-- Phase 5b: home-page discovery — omni-search, trending, and promoted placement.
--
-- Three additions, all serving the revamped landing page:
--   1. Promoted placement (the founder's ad revenue line) — admin-controlled,
--      time-boxed, and never able to bypass verification or dietary filters.
--   2. search_suggestions() — one query across chefs, dishes, cuisines, tags
--      and neighbourhoods, so the search box can behave like Swiggy's.
--   3. trending_chefs() / promoted_chefs() — home-page rails, returning the
--      same shape as search_chefs so the existing card component is reused.

-- ---------------------------------------------------------------------------
-- 1. Promoted placement
-- ---------------------------------------------------------------------------
alter table public.chefs
  add column if not exists promoted_until timestamptz,
  add column if not exists promoted_weight smallint not null default 0;

comment on column public.chefs.promoted_until is
  'Paid placement expiry. NULL or past = not promoted. ADMIN-ONLY: the chefs_guard '
  'trigger rejects any attempt by a chef to set this on their own listing — '
  'self-serve promotion would make the "Promoted" label meaningless.';

comment on column public.chefs.promoted_weight is
  'Ordering within the promoted rail. Higher shows first. Admin-only, same as promoted_until.';

-- Partial index: only ever queried for currently-promoted rows.
create index if not exists chefs_promoted_idx
  on public.chefs (promoted_until desc, promoted_weight desc)
  where promoted_until is not null;

-- Extend the guard so a chef cannot promote themselves. Without this, the
-- self-serve dashboard (Phase 4) would let any chef buy nothing and rank first.
create or replace function public.chefs_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_is_restricted boolean := auth.uid() is not null and not public.is_admin();
begin
  if tg_op = 'INSERT' then
    if actor_is_restricted then
      new.claimed_by := auth.uid();
      new.is_verified := false;
      new.verified_at := null;
      new.verified_by := null;
      new.fssai_verified_at := null;
      new.fssai_verified_by := null;
      -- Promotion is sold, never self-assigned.
      new.promoted_until := null;
      new.promoted_weight := 0;
      if new.status not in ('draft', 'pending_review') then
        new.status := 'draft';
      end if;
      new.listing_source := 'self_signup';
    end if;
    return new;
  end if;

  -- UPDATE
  if actor_is_restricted then
    if new.status is distinct from old.status
      or new.is_verified is distinct from old.is_verified
      or new.verified_at is distinct from old.verified_at
      or new.verified_by is distinct from old.verified_by
      or new.fssai_verified_at is distinct from old.fssai_verified_at
      or new.fssai_verified_by is distinct from old.fssai_verified_by
      or new.claimed_by is distinct from old.claimed_by
      or new.listing_source is distinct from old.listing_source
      or new.promoted_until is distinct from old.promoted_until
      or new.promoted_weight is distinct from old.promoted_weight then
      raise exception 'trust fields can only be changed by an admin';
    end if;

    if new.display_name is distinct from old.display_name
      or new.fssai_number is distinct from old.fssai_number
      or new.address_text is distinct from old.address_text
      or new.phone_e164 is distinct from old.phone_e164
      or new.whatsapp_e164 is distinct from old.whatsapp_e164
      or new.location::text is distinct from old.location::text then
      if old.status = 'approved' then
        new.status := 'pending_review';
      end if;
      if new.fssai_number is distinct from old.fssai_number then
        new.fssai_verified_at := null;
        new.fssai_verified_by := null;
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Omni-search suggestions
--
-- One trip across every noun a buyer might type: a kitchen, a dish, a cuisine,
-- a dietary need, or a place. Ranked so exact prefix matches win, then by how
-- much supply sits behind the suggestion — a cuisine with 12 chefs is a more
-- useful suggestion than one with 1.
-- ---------------------------------------------------------------------------
create or replace function public.search_suggestions(
  p_q text,
  p_city uuid default null,
  p_limit integer default 12
)
returns table (
  kind text,
  label text,
  sublabel text,
  slug text,
  city_slug text,
  neighbourhood_slug text,
  result_count bigint,
  rank real
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with q as (select trim(p_q) as term),
  -- Kitchens and chefs by name.
  chefs_match as (
    select
      'chef'::text as kind,
      ch.kitchen_name as label,
      coalesce(n.name, ch.address_area, ci.name) as sublabel,
      ch.slug,
      ci.slug as city_slug,
      n.slug as neighbourhood_slug,
      1::bigint as result_count,
      (case when ch.kitchen_name ilike (select term from q) || '%' then 3.0 else 1.5 end
        + extensions.similarity(ch.kitchen_name, (select term from q)))::real as rank
    from public.chefs ch
    join public.cities ci on ci.id = ch.city_id
    left join public.neighbourhoods n on n.id = ch.neighbourhood_id
    where ch.status = 'approved'
      and (p_city is null or ch.city_id = p_city)
      and (ch.kitchen_name ilike '%' || (select term from q) || '%'
           or ch.display_name ilike '%' || (select term from q) || '%')
  ),
  -- Dishes. A buyer searching "kori rotti" wants the kitchens that make it.
  dishes_match as (
    select
      'dish'::text as kind,
      mi.name as label,
      'Dish'::text as sublabel,
      mi.name as slug,
      null::text as city_slug,
      null::text as neighbourhood_slug,
      count(distinct ch.id) as result_count,
      (case when mi.name ilike (select term from q) || '%' then 2.6 else 1.3 end)::real as rank
    from public.menu_items mi
    join public.chefs ch on ch.id = mi.chef_id
    where ch.status = 'approved'
      and mi.is_available
      and (p_city is null or ch.city_id = p_city)
      and mi.name ilike '%' || (select term from q) || '%'
    group by mi.name
  ),
  cuisines_match as (
    select
      'cuisine'::text as kind,
      cu.name as label,
      'Cuisine'::text as sublabel,
      cu.slug,
      null::text as city_slug,
      null::text as neighbourhood_slug,
      count(distinct ch.id) as result_count,
      (case when cu.name ilike (select term from q) || '%' then 2.8 else 1.4 end)::real as rank
    from public.cuisines cu
    join public.chef_cuisines cc on cc.cuisine_id = cu.id
    join public.chefs ch on ch.id = cc.chef_id and ch.status = 'approved'
    where (p_city is null or ch.city_id = p_city)
      and cu.name ilike '%' || (select term from q) || '%'
    group by cu.name, cu.slug
  ),
  tags_match as (
    select
      'dietary'::text as kind,
      dt.name as label,
      'Dietary'::text as sublabel,
      dt.slug,
      null::text as city_slug,
      null::text as neighbourhood_slug,
      count(distinct ch.id) as result_count,
      (case when dt.name ilike (select term from q) || '%' then 2.8 else 1.4 end)::real as rank
    from public.dietary_tags dt
    join public.chef_dietary_tags cdt on cdt.tag_id = dt.id
    join public.chefs ch on ch.id = cdt.chef_id and ch.status = 'approved'
    where (p_city is null or ch.city_id = p_city)
      and dt.name ilike '%' || (select term from q) || '%'
    group by dt.name, dt.slug
  ),
  areas_match as (
    select
      'area'::text as kind,
      n.name as label,
      ci.name as sublabel,
      n.slug,
      ci.slug as city_slug,
      n.slug as neighbourhood_slug,
      count(distinct ch.id) as result_count,
      (case when n.name ilike (select term from q) || '%' then 2.7 else 1.35 end)::real as rank
    from public.neighbourhoods n
    join public.cities ci on ci.id = n.city_id
    left join public.chefs ch on ch.neighbourhood_id = n.id and ch.status = 'approved'
    where (p_city is null or n.city_id = p_city)
      and n.name ilike '%' || (select term from q) || '%'
    group by n.name, n.slug, ci.name, ci.slug
  )
  select * from (
    select * from chefs_match
    union all select * from dishes_match
    union all select * from cuisines_match
    union all select * from tags_match
    union all select * from areas_match
  ) s
  where s.result_count > 0
  order by s.rank desc, s.result_count desc, s.label
  limit p_limit;
$$;

grant execute on function public.search_suggestions(text, uuid, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Home-page rails
--
-- Both return the search_chefs column list exactly, so the existing ChefCard
-- renders them with no branching. Neither ever returns a non-approved chef.
-- ---------------------------------------------------------------------------
create or replace function public.promoted_chefs(
  p_city uuid default null,
  p_limit integer default 6
)
returns table (
  id uuid, slug text, kitchen_name text, display_name text, bio text, photo_url text,
  city_slug text, neighbourhood_slug text, neighbourhood_name text, address_area text,
  dietary_profile public.dietary_profile, is_verified boolean, fssai_number text,
  service_radius_km numeric, timings jsonb, distance_km numeric,
  approx_lat double precision, approx_lng double precision,
  cuisines text[], dietary_tags text[]
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    ch.id, ch.slug, ch.kitchen_name, ch.display_name, ch.bio, ch.photo_url,
    ci.slug, n.slug, n.name, ch.address_area,
    ch.dietary_profile, ch.is_verified, ch.fssai_number,
    ch.service_radius_km, ch.timings, null::numeric,
    round(extensions.st_y(ch.location::extensions.geometry)::numeric, 3)::double precision,
    round(extensions.st_x(ch.location::extensions.geometry)::numeric, 3)::double precision,
    coalesce(array(
      select cu.slug from public.chef_cuisines cc
      join public.cuisines cu on cu.id = cc.cuisine_id where cc.chef_id = ch.id
    ), '{}'),
    coalesce(array(
      select dt.slug from public.chef_dietary_tags cdt
      join public.dietary_tags dt on dt.id = cdt.tag_id where cdt.chef_id = ch.id
    ), '{}')
  from public.chefs ch
  join public.cities ci on ci.id = ch.city_id
  left join public.neighbourhoods n on n.id = ch.neighbourhood_id
  -- Promotion never bypasses the verification gate.
  where ch.status = 'approved'
    and ch.promoted_until is not null
    and ch.promoted_until > now()
    and (p_city is null or ch.city_id = p_city)
  order by ch.promoted_weight desc, ch.promoted_until desc
  limit p_limit;
$$;

grant execute on function public.promoted_chefs(uuid, integer) to anon, authenticated;

-- Trending: real WhatsApp-click demand over a window. Not a rating (CONCEPT.md
-- rules out reviews in V1) — this is observed intent, which we actually have.
create or replace function public.trending_chefs(
  p_city uuid default null,
  p_days integer default 30,
  p_limit integer default 8
)
returns table (
  id uuid, slug text, kitchen_name text, display_name text, bio text, photo_url text,
  city_slug text, neighbourhood_slug text, neighbourhood_name text, address_area text,
  dietary_profile public.dietary_profile, is_verified boolean, fssai_number text,
  service_radius_km numeric, timings jsonb, distance_km numeric,
  approx_lat double precision, approx_lng double precision,
  cuisines text[], dietary_tags text[]
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    ch.id, ch.slug, ch.kitchen_name, ch.display_name, ch.bio, ch.photo_url,
    ci.slug, n.slug, n.name, ch.address_area,
    ch.dietary_profile, ch.is_verified, ch.fssai_number,
    ch.service_radius_km, ch.timings, null::numeric,
    round(extensions.st_y(ch.location::extensions.geometry)::numeric, 3)::double precision,
    round(extensions.st_x(ch.location::extensions.geometry)::numeric, 3)::double precision,
    coalesce(array(
      select cu.slug from public.chef_cuisines cc
      join public.cuisines cu on cu.id = cc.cuisine_id where cc.chef_id = ch.id
    ), '{}'),
    coalesce(array(
      select dt.slug from public.chef_dietary_tags cdt
      join public.dietary_tags dt on dt.id = cdt.tag_id where cdt.chef_id = ch.id
    ), '{}')
  from public.chefs ch
  join public.cities ci on ci.id = ch.city_id
  left join public.neighbourhoods n on n.id = ch.neighbourhood_id
  join (
    select ev.chef_id, count(*) as clicks
    from public.events ev
    where ev.kind = 'wa_click'
      and ev.created_at > now() - make_interval(days => p_days)
      and ev.chef_id is not null
    group by ev.chef_id
  ) t on t.chef_id = ch.id
  where ch.status = 'approved'
    and (p_city is null or ch.city_id = p_city)
    -- A promoted chef appears in its own rail; showing it twice looks like a bug.
    and (ch.promoted_until is null or ch.promoted_until <= now())
  order by t.clicks desc, ch.is_verified desc
  limit p_limit;
$$;

grant execute on function public.trending_chefs(uuid, integer, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Admin: set or clear promotion.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_promotion(
  p_chef_id uuid,
  p_days integer,
  p_weight smallint default 0
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins may set promotion';
  end if;

  if p_days is null or p_days <= 0 then
    update public.chefs
       set promoted_until = null, promoted_weight = 0
     where id = p_chef_id;
  else
    update public.chefs
       set promoted_until = now() + make_interval(days => p_days),
           promoted_weight = coalesce(p_weight, 0)
     where id = p_chef_id;
  end if;

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (
    p_chef_id, auth.uid(), 'edited',
    case when p_days is null or p_days <= 0
      then 'Promotion cleared'
      else 'Promoted for ' || p_days || ' days (weight ' || coalesce(p_weight, 0) || ')'
    end
  );
end;
$$;

revoke all on function public.admin_set_promotion(uuid, integer, smallint) from public, anon;
grant execute on function public.admin_set_promotion(uuid, integer, smallint) to authenticated, service_role;


-- =====================================================================
-- SOURCE: supabase/migrations/20260815000015_security_hardening.sql
-- =====================================================================
-- Security hardening (code review).
--
-- 1. chef_event_stats had no ownership check. It is SECURITY DEFINER over the
--    `events` table, which deliberately has NO authenticated SELECT policy —
--    so the function was the only way to read it, and it was granted to every
--    authenticated user for any chef id. Any signed-in account could therefore
--    enumerate any kitchen's WhatsApp-click and profile-view counts.
--
--    The original comment argued this was "public-level info anyway". That was
--    written before Phase 5b made placement a paid product: which kitchens
--    convert is now commercially sensitive, and it is the exact number we would
--    price a promoted slot against. Gate it like chef_set_own_location.
create or replace function public.chef_event_stats(
  p_chef_id uuid,
  p_days integer default 30
)
returns table (kind text, cnt bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.chefs c
    where c.id = p_chef_id
      and (c.claimed_by = auth.uid() or public.is_admin())
  ) then
    raise exception 'not authorised to read stats for chef %', p_chef_id;
  end if;

  return query
    select e.kind::text, count(*) as cnt
      from public.events e
     where e.chef_id = p_chef_id
       and e.kind in ('wa_click', 'profile_view')
       and e.created_at >= now() - make_interval(days => p_days)
     group by e.kind;
end;
$$;

revoke all on function public.chef_event_stats(uuid, integer) from public, anon;
grant execute on function public.chef_event_stats(uuid, integer) to authenticated;


-- =====================================================================
-- SOURCE: supabase/seed.sql
-- =====================================================================
-- Phase 0 seed data. Idempotent (fixed UUIDs + on conflict do nothing).
-- Demo chefs are clearly-named fiction ("Demo Kitchen — …") with fake contact
-- numbers, so Phase 1 can be built against real-shaped data. Remove them
-- before public launch (delete from chefs where kitchen_name like 'Demo Kitchen%').

-- ---------- countries ----------
insert into public.countries (id, code, name, currency_code, phone_prefix, is_active) values
  ('00000000-0000-4000-8000-000000000001', 'IN', 'India', 'INR', '+91', true),
  ('00000000-0000-4000-8000-000000000002', 'SG', 'Singapore', 'SGD', '+65', false)
on conflict (id) do nothing;

-- ---------- cities ----------
insert into public.cities (id, country_id, slug, name, center, timezone, is_active) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001',
   'bangalore', 'Bangalore',
   extensions.st_setsrid(extensions.st_makepoint(77.5946, 12.9716), 4326)::extensions.geography,
   'Asia/Kolkata', true)
on conflict (id) do nothing;

-- ---------- neighbourhoods (real centroids) ----------
insert into public.neighbourhoods (id, city_id, slug, name, center) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'indiranagar', 'Indiranagar',
   extensions.st_setsrid(extensions.st_makepoint(77.6412, 12.9719), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'koramangala', 'Koramangala',
   extensions.st_setsrid(extensions.st_makepoint(77.6245, 12.9352), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000101', 'hsr-layout', 'HSR Layout',
   extensions.st_setsrid(extensions.st_makepoint(77.6474, 12.9116), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000101', 'whitefield', 'Whitefield',
   extensions.st_setsrid(extensions.st_makepoint(77.7500, 12.9698), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000101', 'jayanagar', 'Jayanagar',
   extensions.st_setsrid(extensions.st_makepoint(77.5838, 12.9308), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000101', 'marathahalli', 'Marathahalli',
   extensions.st_setsrid(extensions.st_makepoint(77.7011, 12.9569), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000207', '00000000-0000-4000-8000-000000000101', 'bellandur', 'Bellandur',
   extensions.st_setsrid(extensions.st_makepoint(77.6784, 12.9304), 4326)::extensions.geography)
on conflict (id) do nothing;

-- ---------- cuisines ----------
insert into public.cuisines (id, slug, name) values
  ('00000000-0000-4000-8000-000000000301', 'biryani', 'Biryani'),
  ('00000000-0000-4000-8000-000000000302', 'north-indian', 'North Indian'),
  ('00000000-0000-4000-8000-000000000303', 'south-indian', 'South Indian'),
  ('00000000-0000-4000-8000-000000000304', 'bengali', 'Bengali'),
  ('00000000-0000-4000-8000-000000000305', 'andhra', 'Andhra'),
  ('00000000-0000-4000-8000-000000000306', 'kerala', 'Kerala'),
  ('00000000-0000-4000-8000-000000000307', 'maharashtrian', 'Maharashtrian'),
  ('00000000-0000-4000-8000-000000000308', 'gujarati', 'Gujarati'),
  ('00000000-0000-4000-8000-000000000309', 'rajasthani', 'Rajasthani'),
  ('00000000-0000-4000-8000-000000000310', 'mangalorean', 'Mangalorean'),
  ('00000000-0000-4000-8000-000000000311', 'hyderabadi', 'Hyderabadi'),
  ('00000000-0000-4000-8000-000000000312', 'chinese-desi', 'Indo-Chinese'),
  ('00000000-0000-4000-8000-000000000313', 'bakes-desserts', 'Bakes & Desserts'),
  ('00000000-0000-4000-8000-000000000314', 'healthy-meals', 'Healthy Meals'),
  ('00000000-0000-4000-8000-000000000315', 'tiffin-thali', 'Tiffin & Thali')
on conflict (id) do nothing;

-- ---------- dietary tags ----------
insert into public.dietary_tags (id, slug, name) values
  ('00000000-0000-4000-8000-000000000401', 'veg', 'Pure Veg'),
  ('00000000-0000-4000-8000-000000000402', 'non_veg', 'Non-Veg'),
  ('00000000-0000-4000-8000-000000000403', 'halal', 'Halal'),
  ('00000000-0000-4000-8000-000000000404', 'jhatka', 'Jhatka'),
  ('00000000-0000-4000-8000-000000000405', 'jain', 'Jain'),
  ('00000000-0000-4000-8000-000000000406', 'egg_free', 'Egg-Free'),
  ('00000000-0000-4000-8000-000000000407', 'healthy', 'Healthy')
on conflict (id) do nothing;

-- ---------- demo chefs ----------
-- Standard weekly timings used by most demo chefs.
-- (Shape per src/types/schemas.ts timingsSchema.)

insert into public.chefs
  (id, city_id, neighbourhood_id, slug, display_name, kitchen_name, bio,
   phone_e164, whatsapp_e164, location, service_radius_km, address_area,
   status, listing_source, fssai_number, dietary_profile, is_verified, verified_at, timings)
values
  -- 1. Approved, halal biryani, Indiranagar
  ('00000000-0000-4000-8000-000000000501',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201',
   'demo-aishas-biryani', 'Aisha Khan', 'Demo Kitchen — Aisha''s Biryani',
   'Slow-cooked Hyderabadi biryani in small daily batches. Family recipe, three generations old.',
   '+919900000001', '+919900000001',
   extensions.st_setsrid(extensions.st_makepoint(77.6390, 12.9745), 4326)::extensions.geography,
   5, 'Indiranagar 2nd Stage', 'approved', 'scraped', '11223344556677', 'non_veg', true, now(),
   '{"vacation": false, "days": {"mon": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "tue": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "wed": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "thu": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "fri": {"open": "11:00", "close": "22:00", "order_cutoff": "21:00"}, "sat": {"open": "11:00", "close": "22:00", "order_cutoff": "21:00"}, "sun": {"closed": true}}}'),

  -- 2. Approved, pure veg thali, Koramangala
  ('00000000-0000-4000-8000-000000000502',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000202',
   'demo-shalinis-veg-thali', 'Shalini Rao', 'Demo Kitchen — Shalini''s Veg Thali',
   'Homely North Indian veg thalis and monthly tiffin plans. No onion-garlic option available.',
   '+919900000002', '+919900000002',
   extensions.st_setsrid(extensions.st_makepoint(77.6220, 12.9330), 4326)::extensions.geography,
   6, 'Koramangala 5th Block', 'approved', 'scraped', '11223344556678', 'veg_only', true, now(),
   '{"vacation": false, "days": {"mon": {"open": "10:00", "close": "20:00", "order_cutoff": "18:00"}, "tue": {"open": "10:00", "close": "20:00", "order_cutoff": "18:00"}, "wed": {"open": "10:00", "close": "20:00", "order_cutoff": "18:00"}, "thu": {"open": "10:00", "close": "20:00", "order_cutoff": "18:00"}, "fri": {"open": "10:00", "close": "20:00", "order_cutoff": "18:00"}, "sat": {"open": "10:00", "close": "20:00", "order_cutoff": "18:00"}, "sun": {"closed": true}}}'),

  -- 3. Approved, Mangalorean, HSR Layout
  ('00000000-0000-4000-8000-000000000503',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000203',
   'demo-mangalas-kori-rotti', 'Mangala Shetty', 'Demo Kitchen — Mangala''s Kori Rotti',
   'Authentic Mangalorean home food — kori rotti, neer dosa, chicken sukka. Weekend specials.',
   '+919900000003', '+919900000003',
   extensions.st_setsrid(extensions.st_makepoint(77.6500, 12.9140), 4326)::extensions.geography,
   6, 'HSR Sector 2', 'approved', 'scraped', '11223344556679', 'mixed', true, now(),
   '{"vacation": false, "days": {"mon": {"closed": true}, "tue": {"open": "11:00", "close": "21:00", "order_cutoff": "19:00"}, "wed": {"open": "11:00", "close": "21:00", "order_cutoff": "19:00"}, "thu": {"open": "11:00", "close": "21:00", "order_cutoff": "19:00"}, "fri": {"open": "11:00", "close": "21:00", "order_cutoff": "19:00"}, "sat": {"open": "09:00", "close": "21:00", "order_cutoff": "19:00"}, "sun": {"open": "09:00", "close": "15:00", "order_cutoff": "13:00"}}}'),

  -- 4. Approved, halal Hyderabadi, Whitefield
  ('00000000-0000-4000-8000-000000000504',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000204',
   'demo-fatimas-daawat', 'Fatima Begum', 'Demo Kitchen — Fatima''s Daawat',
   'Hyderabadi haleem, marag, and dum biryani. Bulk trays for small gatherings on 24h notice.',
   '+919900000004', '+919900000004',
   extensions.st_setsrid(extensions.st_makepoint(77.7470, 12.9660), 4326)::extensions.geography,
   7, 'Whitefield, Palm Meadows side', 'approved', 'scraped', '11223344556680', 'non_veg', true, now(),
   '{"vacation": false, "days": {"mon": {"open": "12:00", "close": "21:00", "order_cutoff": "20:00"}, "tue": {"open": "12:00", "close": "21:00", "order_cutoff": "20:00"}, "wed": {"open": "12:00", "close": "21:00", "order_cutoff": "20:00"}, "thu": {"open": "12:00", "close": "21:00", "order_cutoff": "20:00"}, "fri": {"open": "12:00", "close": "22:00", "order_cutoff": "21:00"}, "sat": {"open": "12:00", "close": "22:00", "order_cutoff": "21:00"}, "sun": {"open": "12:00", "close": "21:00", "order_cutoff": "20:00"}}}'),

  -- 5. Approved, Jain, Jayanagar
  ('00000000-0000-4000-8000-000000000505',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000205',
   'demo-meeras-jain-rasoi', 'Meera Jain', 'Demo Kitchen — Meera''s Jain Rasoi',
   'Strict Jain kitchen — no onion, no garlic, no root vegetables. Tiffins and festival specials.',
   '+919900000005', '+919900000005',
   extensions.st_setsrid(extensions.st_makepoint(77.5850, 12.9280), 4326)::extensions.geography,
   4, 'Jayanagar 4th Block', 'approved', 'scraped', '11223344556681', 'veg_only', true, now(),
   '{"vacation": false, "days": {"mon": {"open": "09:00", "close": "19:00", "order_cutoff": "17:00"}, "tue": {"open": "09:00", "close": "19:00", "order_cutoff": "17:00"}, "wed": {"open": "09:00", "close": "19:00", "order_cutoff": "17:00"}, "thu": {"open": "09:00", "close": "19:00", "order_cutoff": "17:00"}, "fri": {"open": "09:00", "close": "19:00", "order_cutoff": "17:00"}, "sat": {"open": "09:00", "close": "19:00", "order_cutoff": "17:00"}, "sun": {"closed": true}}}'),

  -- 6. Approved, healthy meals with nutrition data, Marathahalli
  ('00000000-0000-4000-8000-000000000506',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000206',
   'demo-ruchis-healthy-bowls', 'Ruchi Verma', 'Demo Kitchen — Ruchi''s Healthy Bowls',
   'Macro-counted meal bowls for fitness folks. Weekly subscriptions via WhatsApp.',
   '+919900000006', '+919900000006',
   extensions.st_setsrid(extensions.st_makepoint(77.6980, 12.9540), 4326)::extensions.geography,
  10, 'Marathahalli Bridge area', 'approved', 'self_signup', '11223344556682', 'mixed', true, now(),
   '{"vacation": false, "days": {"mon": {"open": "07:00", "close": "20:00", "order_cutoff": "18:00"}, "tue": {"open": "07:00", "close": "20:00", "order_cutoff": "18:00"}, "wed": {"open": "07:00", "close": "20:00", "order_cutoff": "18:00"}, "thu": {"open": "07:00", "close": "20:00", "order_cutoff": "18:00"}, "fri": {"open": "07:00", "close": "20:00", "order_cutoff": "18:00"}, "sat": {"closed": true}, "sun": {"closed": true}}}'),

  -- 7. Approved, Bengali, Bellandur
  ('00000000-0000-4000-8000-000000000507',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000207',
   'demo-bengali-ghor-ranna', 'Sutapa Ghosh', 'Demo Kitchen — Ghor Ranna',
   'Bengali home cooking — kosha mangsho, shorshe ilish (seasonal), luchi-alur dom on Sundays.',
   '+919900000007', '+919900000007',
   extensions.st_setsrid(extensions.st_makepoint(77.6750, 12.9330), 4326)::extensions.geography,
   8, 'Bellandur, Green Glen Layout', 'approved', 'scraped', '11223344556683', 'mixed', true, now(),
   '{"vacation": false, "days": {"mon": {"open": "11:00", "close": "21:00", "order_cutoff": "19:30"}, "tue": {"open": "11:00", "close": "21:00", "order_cutoff": "19:30"}, "wed": {"open": "11:00", "close": "21:00", "order_cutoff": "19:30"}, "thu": {"open": "11:00", "close": "21:00", "order_cutoff": "19:30"}, "fri": {"open": "11:00", "close": "21:00", "order_cutoff": "19:30"}, "sat": {"open": "11:00", "close": "21:00", "order_cutoff": "19:30"}, "sun": {"open": "09:00", "close": "15:00", "order_cutoff": "13:00"}}}'),

  -- 8. Pending review (must NOT appear publicly) — used to test the queue + 404
  ('00000000-0000-4000-8000-000000000508',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201',
   'demo-punjabi-tadka', 'Gurpreet Kaur', 'Demo Kitchen — Punjabi Tadka',
   'Punjabi home food — sarson da saag in winter, rajma-chawal always. Jhatka meat only.',
   '+919900000008', '+919900000008',
   extensions.st_setsrid(extensions.st_makepoint(77.6440, 12.9700), 4326)::extensions.geography,
   5, 'Indiranagar 1st Stage', 'pending_review', 'scraped', '11223344556684', 'mixed', false, null,
   '{"vacation": false, "days": {"mon": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "tue": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "wed": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "thu": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "fri": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "sat": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "sun": {"closed": true}}}'),

  -- 9. Draft (incomplete scraped listing awaiting normalisation/promotion detail)
  ('00000000-0000-4000-8000-000000000509',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000202',
   'demo-andhra-ruchulu', 'Padma Reddy', 'Demo Kitchen — Andhra Ruchulu',
   'Fiery Andhra meals — gongura pachadi, chicken fry, ragi sangati.',
   '+919900000009', '+919900000009',
   extensions.st_setsrid(extensions.st_makepoint(77.6270, 12.9380), 4326)::extensions.geography,
   3, 'Koramangala 6th Block', 'draft', 'scraped', null, 'mixed', false, null, null)
on conflict (id) do nothing;

-- ---------- chef ↔ cuisine ----------
insert into public.chef_cuisines (chef_id, cuisine_id) values
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000301'),
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000311'),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000302'),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000315'),
  ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000310'),
  ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000303'),
  ('00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000311'),
  ('00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000301'),
  ('00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000302'),
  ('00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000315'),
  ('00000000-0000-4000-8000-000000000506', '00000000-0000-4000-8000-000000000314'),
  ('00000000-0000-4000-8000-000000000507', '00000000-0000-4000-8000-000000000304'),
  ('00000000-0000-4000-8000-000000000508', '00000000-0000-4000-8000-000000000302'),
  ('00000000-0000-4000-8000-000000000509', '00000000-0000-4000-8000-000000000305')
on conflict do nothing;

-- ---------- chef ↔ dietary tags ----------
insert into public.chef_dietary_tags (chef_id, tag_id) values
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000403'), -- halal
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000402'), -- non_veg
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000401'), -- veg
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000406'), -- egg_free
  ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000402'),
  ('00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000403'),
  ('00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000402'),
  ('00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000401'),
  ('00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000405'), -- jain
  ('00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000406'),
  ('00000000-0000-4000-8000-000000000506', '00000000-0000-4000-8000-000000000407'), -- healthy
  ('00000000-0000-4000-8000-000000000507', '00000000-0000-4000-8000-000000000402'),
  ('00000000-0000-4000-8000-000000000508', '00000000-0000-4000-8000-000000000404'), -- jhatka
  ('00000000-0000-4000-8000-000000000508', '00000000-0000-4000-8000-000000000402')
on conflict do nothing;

-- ---------- menu items ----------
-- Menu rows have generated ids, so re-runs replace demo menus instead of duplicating.
delete from public.menu_items
 where chef_id in (select id from public.chefs where id::text like '00000000-0000-4000-8000-0000000005%');

insert into public.menu_items
  (chef_id, name, description, price, currency_code, unit, is_best_seller, dietary, nutrition, sort_order)
values
  ('00000000-0000-4000-8000-000000000501', 'Chicken Dum Biryani', 'With mirchi ka salan and raita.', 280, 'INR', 'per plate', true,  'non_veg', null, 1),
  ('00000000-0000-4000-8000-000000000501', 'Mutton Biryani', 'Weekend special, order by Friday 8 PM.', 380, 'INR', 'per plate', true,  'non_veg', null, 2),
  ('00000000-0000-4000-8000-000000000501', 'Veg Biryani', null, 200, 'INR', 'per plate', false, 'veg', null, 3),
  ('00000000-0000-4000-8000-000000000502', 'Full Veg Thali', 'Dal, sabzi, 4 rotis, rice, salad, sweet.', 150, 'INR', 'per thali', true, 'veg', null, 1),
  ('00000000-0000-4000-8000-000000000502', 'Monthly Lunch Tiffin', '26 days, delivered by noon.', 3200, 'INR', 'per month', false, 'veg', null, 2),
  ('00000000-0000-4000-8000-000000000503', 'Kori Rotti', 'Bunt-style chicken curry with crisp rotti.', 260, 'INR', 'per plate', true, 'non_veg', null, 1),
  ('00000000-0000-4000-8000-000000000503', 'Neer Dosa (8 pc) + Chutney', null, 120, 'INR', 'per plate', false, 'veg', null, 2),
  ('00000000-0000-4000-8000-000000000504', 'Hyderabadi Haleem', 'Ramzan-style, available year-round on weekends.', 220, 'INR', 'per bowl', true, 'non_veg', null, 1),
  ('00000000-0000-4000-8000-000000000504', 'Mutton Dum Biryani (Family Pack)', 'Serves 4.', 1400, 'INR', 'per pack', false, 'non_veg', null, 2),
  ('00000000-0000-4000-8000-000000000505', 'Jain Thali', 'No onion, no garlic, no root veg.', 160, 'INR', 'per thali', true, 'veg', null, 1),
  ('00000000-0000-4000-8000-000000000505', 'Jain Pav Bhaji', 'Made with raw banana.', 130, 'INR', 'per plate', false, 'veg', null, 2),
  ('00000000-0000-4000-8000-000000000506', 'High-Protein Chicken Bowl', 'Grilled chicken, quinoa, greens.', 240, 'INR', 'per bowl', true, 'non_veg',
   '{"calories_kcal": 520, "protein_g": 42, "carbs_g": 45, "fat_g": 16, "serving_g": 380}', 1),
  ('00000000-0000-4000-8000-000000000506', 'Paneer Power Bowl', 'Tandoori paneer, brown rice, salad.', 220, 'INR', 'per bowl', false, 'veg',
   '{"calories_kcal": 480, "protein_g": 28, "carbs_g": 52, "fat_g": 18, "serving_g": 360}', 2),
  ('00000000-0000-4000-8000-000000000507', 'Kosha Mangsho + Basanti Pulao', 'Sunday special.', 320, 'INR', 'per plate', true, 'non_veg', null, 1),
  ('00000000-0000-4000-8000-000000000507', 'Bhetki Paturi', 'Seasonal availability.', 280, 'INR', 'per piece', false, 'non_veg', null, 2),
  ('00000000-0000-4000-8000-000000000508', 'Rajma Chawal', null, 140, 'INR', 'per plate', false, 'veg', null, 1)
on conflict do nothing;


-- =====================================================================
-- DONE.
-- Next: run supabase/verify.sql to confirm everything works (20 x PASS).
-- =====================================================================
