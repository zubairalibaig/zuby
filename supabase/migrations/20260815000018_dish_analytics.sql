-- Analytics deepening, alongside the cuisine/neighbourhood catalog expansion
-- in this same change:
--
--   1. chef_dashboard_stats() — richer version of chef_event_stats(): still
--      wa_click + profile_view totals, plus a daily trend and a per-dish
--      breakdown, for the chef-facing "My stats" panel. Per-dish counts come
--      from events.metadata->>'item_id', populated by /api/wa/[chefId] when
--      a click originates from a specific menu item's own CTA
--      (MenuItemRow) rather than the chef-level WhatsApp button.
--   2. trending_dishes() — the same per-dish signal, city-wide, for the home
--      page's "Popular dishes" rail. Both are explicitly NOT a rating —
--      CONCEPT.md rules reviews out of V1 — this is the same "observed
--      WhatsApp-click demand" signal trending_chefs() already uses, just at
--      dish granularity instead of kitchen granularity.

create or replace function public.chef_dashboard_stats(
  p_chef_id uuid,
  p_days integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  v_since timestamptz := now() - make_interval(days => p_days);
begin
  -- Same authorisation posture as chef_event_stats(): the caller must supply
  -- the chef_id, and only aggregate counts come back — no PII. Still worth
  -- gating to the owning chef or an admin, rather than any authenticated
  -- user, since the per-dish breakdown is more specific than a bare total.
  if not exists (
    select 1 from public.chefs
    where id = p_chef_id
      and (claimed_by = auth.uid() or public.is_admin())
  ) then
    raise exception 'not authorised to read stats for chef %', p_chef_id;
  end if;

  select jsonb_build_object(
    'wa_clicks', (
      select count(*) from public.events
      where chef_id = p_chef_id and kind = 'wa_click' and created_at >= v_since
    ),
    'profile_views', (
      select count(*) from public.events
      where chef_id = p_chef_id and kind = 'profile_view' and created_at >= v_since
    ),

    -- Daily trend, last p_days — days with no activity are simply absent;
    -- the UI fills the gaps rather than trusting a zero-filled series that
    -- would imply we track visits we don't.
    'daily', coalesce((
      select jsonb_agg(row_to_json(d) order by d.day)
      from (
        select
          date_trunc('day', e.created_at)::date as day,
          count(*) filter (where e.kind = 'wa_click')     as wa_clicks,
          count(*) filter (where e.kind = 'profile_view')  as profile_views
        from public.events e
        where e.chef_id = p_chef_id and e.created_at >= v_since
        group by 1
      ) d
    ), '[]'::jsonb),

    -- Per-dish clicks, from the item-aware WhatsApp CTA. Grouped by item_id
    -- (stable even if the chef later renames the dish) but displayed with
    -- the name captured at click-time, so a deleted item still shows up
    -- correctly rather than as a broken join.
    'top_dishes', coalesce((
      select jsonb_agg(row_to_json(t) order by t.clicks desc)
      from (
        select
          e.metadata->>'item_id'   as item_id,
          e.metadata->>'item_name' as item_name,
          count(*)                 as clicks
        from public.events e
        where e.chef_id = p_chef_id
          and e.kind = 'wa_click'
          and e.created_at >= v_since
          and e.metadata ? 'item_id'
        group by 1, 2
        order by count(*) desc
        limit 5
      ) t
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.chef_dashboard_stats(uuid, integer) from public, anon;
grant execute on function public.chef_dashboard_stats(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- trending_dishes(): city-wide "Popular dishes" for the home page. Only ever
-- surfaces dishes belonging to an approved chef with the item still
-- available — a click on a dish since discontinued or a kitchen since
-- suspended should not keep showing up as "popular."
-- ---------------------------------------------------------------------------
create or replace function public.trending_dishes(
  p_city uuid default null,
  p_days integer default 30,
  p_limit integer default 8
)
returns table (
  item_name text,
  kitchen_name text,
  chef_slug text,
  city_slug text,
  neighbourhood_slug text,
  clicks bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    mi.name as item_name,
    ch.kitchen_name,
    ch.slug as chef_slug,
    ci.slug as city_slug,
    n.slug as neighbourhood_slug,
    count(*) as clicks
  from public.events e
  join public.chefs ch on ch.id = e.chef_id
  join public.cities ci on ci.id = ch.city_id
  left join public.neighbourhoods n on n.id = ch.neighbourhood_id
  join public.menu_items mi
    on mi.id = (e.metadata->>'item_id')::uuid
   and mi.chef_id = ch.id
  where e.kind = 'wa_click'
    and e.metadata ? 'item_id'
    and e.created_at > now() - make_interval(days => p_days)
    and ch.status = 'approved'
    and mi.is_available
    and (p_city is null or ch.city_id = p_city)
  group by mi.id, mi.name, ch.kitchen_name, ch.slug, ci.slug, n.slug
  order by count(*) desc
  limit p_limit;
$$;

grant execute on function public.trending_dishes(uuid, integer, integer) to anon, authenticated;
