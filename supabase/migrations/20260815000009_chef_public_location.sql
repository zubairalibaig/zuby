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
