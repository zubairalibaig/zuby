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
