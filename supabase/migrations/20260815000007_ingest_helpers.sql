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
