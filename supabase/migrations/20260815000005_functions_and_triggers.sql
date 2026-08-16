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
