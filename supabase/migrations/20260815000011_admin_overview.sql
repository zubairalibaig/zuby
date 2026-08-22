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
