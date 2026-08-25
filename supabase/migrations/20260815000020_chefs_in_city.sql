-- Bug fix, found chasing a real report: two admin-approved chefs weren't
-- showing up "searching for home chefs across Bangalore."
--
-- Root cause: "All of <city>" (LocationPicker's pinned option, added last
-- session) searches from the CITY'S OWN CENTROID with a big radius — but
-- search_chefs() gates eligibility on
--   st_dwithin(chef.location, origin, least(chef.service_radius_km, max_km) * 1000)
-- which is `least()`, not `greatest()` or an override: a large buyer-side
-- max_km can only ever match or narrow a chef's own declared radius, never
-- widen it. A chef in Whitefield with a 5 km radius is ~17 km from
-- Bangalore's centroid (MG Road / Majestic area) — no radius the buyer picks
-- changes that distance, so that chef can never appear in a "centre point +
-- big radius" search no matter how big the radius is. That's the CORRECT
-- behaviour for "does this chef deliver to this exact point" (a 5 km-radius
-- kitchen genuinely can't reach 17 km), but it's the wrong behaviour for
-- "show me the whole city's directory" — a fundamentally different browsing
-- mode that "All of <city>" was supposed to be, and wasn't.
--
-- This function is that actual mode: every approved chef in a city, full
-- stop, no geo gate at all. distance_km is null (there's no anchor point to
-- measure from) — callers/ChefCard already handle that.
create or replace function public.chefs_in_city(
  p_city uuid,
  p_tag_slugs text[] default null,
  p_cuisine_slugs text[] default null
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
  select
    c.id, c.slug, c.kitchen_name, c.display_name, c.bio, c.photo_url,
    ci.slug, n.slug, n.name, c.address_area,
    c.dietary_profile, c.is_verified, c.fssai_number,
    c.service_radius_km, c.timings, null::numeric,
    round(st_y(c.location::geometry)::numeric, 3)::double precision,
    round(st_x(c.location::geometry)::numeric, 3)::double precision,
    coalesce(array(
      select cu.slug from public.chef_cuisines cc
      join public.cuisines cu on cu.id = cc.cuisine_id where cc.chef_id = c.id
    ), '{}'),
    coalesce(array(
      select dt.slug from public.chef_dietary_tags cdt
      join public.dietary_tags dt on dt.id = cdt.tag_id where cdt.chef_id = c.id
    ), '{}')
  from public.chefs c
  join public.cities ci on ci.id = c.city_id
  left join public.neighbourhoods n on n.id = c.neighbourhood_id
  where c.status = 'approved'
    and c.city_id = p_city
    and (
      p_tag_slugs is null
      or not exists (
        select 1 from unnest(p_tag_slugs) as wanted(slug)
        where not exists (
          select 1 from public.chef_dietary_tags cdt
          join public.dietary_tags dt on dt.id = cdt.tag_id
          where cdt.chef_id = c.id and dt.slug = wanted.slug
        )
      )
    )
    and (
      p_cuisine_slugs is null
      or exists (
        select 1 from public.chef_cuisines cc
        join public.cuisines cu on cu.id = cc.cuisine_id
        where cc.chef_id = c.id and cu.slug = any (p_cuisine_slugs)
      )
    )
  order by c.is_verified desc, c.kitchen_name asc;
$$;

grant execute on function public.chefs_in_city(uuid, text[], text[]) to anon, authenticated;
