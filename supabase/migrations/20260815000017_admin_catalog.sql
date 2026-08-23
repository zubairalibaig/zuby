-- Admin catalog management: add a cuisine or a neighbourhood from the admin
-- panel instead of a hand-run SQL Editor snippet (supabase/ops.sql §8).
--
-- Cuisines have no geography column, so the existing "admin write" RLS policy
-- on public.cuisines (20260815000006_rls.sql) already lets an admin insert one
-- with a plain PostgREST call — no function needed there.
--
-- Neighbourhoods carry a `center geography` column, and PostgREST cannot write
-- a geography value directly (the same limitation admin_set_chef_location
-- works around for chefs.location). This function is that same pattern,
-- applied to neighbourhoods: SECURITY DEFINER, re-checks is_admin() at the
-- database, resolves the city by slug, and builds the point server-side.
create or replace function public.admin_add_neighbourhood(
  p_city_slug text,
  p_slug text,
  p_name text,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_city_id uuid;
begin
  if not public.is_admin() then
    raise exception 'only admins may add a neighbourhood';
  end if;

  select id into v_city_id from public.cities where slug = p_city_slug;
  if v_city_id is null then
    raise exception 'unknown city %', p_city_slug;
  end if;

  insert into public.neighbourhoods (city_id, slug, name, center)
  values (
    v_city_id,
    p_slug,
    p_name,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  )
  on conflict (city_id, slug) do nothing;

  if not found then
    raise exception 'neighbourhood % already exists in %', p_slug, p_city_slug;
  end if;
end;
$$;

revoke all on function public.admin_add_neighbourhood(text, text, text, double precision, double precision)
  from public, anon;

grant execute on function public.admin_add_neighbourhood(text, text, text, double precision, double precision)
  to authenticated, service_role;
