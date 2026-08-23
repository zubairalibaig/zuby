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
