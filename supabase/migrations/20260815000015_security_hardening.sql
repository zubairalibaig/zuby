-- Security hardening (code review).
--
-- 1. chef_event_stats had no ownership check. It is SECURITY DEFINER over the
--    `events` table, which deliberately has NO authenticated SELECT policy —
--    so the function was the only way to read it, and it was granted to every
--    authenticated user for any chef id. Any signed-in account could therefore
--    enumerate any kitchen's WhatsApp-click and profile-view counts.
--
--    The original comment argued this was "public-level info anyway". That was
--    written before Phase 5b made placement a paid product: which kitchens
--    convert is now commercially sensitive, and it is the exact number we would
--    price a promoted slot against. Gate it like chef_set_own_location.
create or replace function public.chef_event_stats(
  p_chef_id uuid,
  p_days integer default 30
)
returns table (kind text, cnt bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.chefs c
    where c.id = p_chef_id
      and (c.claimed_by = auth.uid() or public.is_admin())
  ) then
    raise exception 'not authorised to read stats for chef %', p_chef_id;
  end if;

  return query
    select e.kind::text, count(*) as cnt
      from public.events e
     where e.chef_id = p_chef_id
       and e.kind in ('wa_click', 'profile_view')
       and e.created_at >= now() - make_interval(days => p_days)
     group by e.kind;
end;
$$;

revoke all on function public.chef_event_stats(uuid, integer) from public, anon;
grant execute on function public.chef_event_stats(uuid, integer) to authenticated;
