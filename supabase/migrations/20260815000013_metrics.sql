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
