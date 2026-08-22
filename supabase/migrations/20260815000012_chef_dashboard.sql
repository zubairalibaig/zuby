-- Phase 4: chef dashboard — pending-edits column, chef-facing location setter,
-- event-stats query, and the claim verification code helpers.

-- ---------------------------------------------------------------------------
-- Pending edits: trust-relevant field changes by a chef are stored here until
-- an admin approves them. The public page continues serving the existing row
-- values; the admin queue shows a diff.
-- ---------------------------------------------------------------------------
alter table public.chefs
  add column if not exists pending_edits jsonb;

comment on column public.chefs.pending_edits is
  'jsonb of trust-relevant field diffs pending admin approval (Phase 4). '
  'NULL = no pending changes. Keys match column names: display_name, fssai_number, '
  'address_text, phone_e164, whatsapp_e164, location_lat, location_lng.';

-- ---------------------------------------------------------------------------
-- Chef-facing location setter (uses the same PostGIS helper as the admin one
-- but is callable by the owning chef — SECURITY DEFINER bypasses the direct
-- geography column RLS awkwardness).
-- ---------------------------------------------------------------------------
create or replace function public.chef_set_own_location(
  p_chef_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  -- Only the owning chef or an admin may call this.
  if not exists (
    select 1 from public.chefs
    where id = p_chef_id
      and (claimed_by = auth.uid() or public.is_admin())
  ) then
    raise exception 'not authorised to set location for chef %', p_chef_id;
  end if;

  update public.chefs
     set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
   where id = p_chef_id;
end;
$$;

revoke all on function public.chef_set_own_location(uuid, double precision, double precision) from public, anon;
grant execute on function public.chef_set_own_location(uuid, double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- Event stats: per-chef wa_click + profile_view counts over last N days.
-- Called by the dashboard "My stats" panel. SECURITY DEFINER so it can read
-- the events table (which has no anon/authenticated SELECT policy).
-- ---------------------------------------------------------------------------
create or replace function public.chef_event_stats(
  p_chef_id uuid,
  p_days integer default 30
)
returns table (kind text, cnt bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.kind::text, count(*) as cnt
    from public.events e
   where e.chef_id = p_chef_id
     and e.kind in ('wa_click', 'profile_view')
     and e.created_at >= now() - make_interval(days => p_days)
   group by e.kind;
$$;

-- Only the owning chef or admin should call, but since it only returns
-- aggregate counts (not PII) and the chef_id must be supplied, granting to
-- authenticated is safe — a curious user learns "chef X got Y clicks"
-- which is public-level info anyway.
revoke all on function public.chef_event_stats(uuid, integer) from public, anon;
grant execute on function public.chef_event_stats(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: apply pending edits. Called from the admin approve flow to merge
-- pending_edits back into the actual columns, then clear the pending_edits.
-- ---------------------------------------------------------------------------
create or replace function public.admin_apply_pending_edits(p_chef_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_edits jsonb;
begin
  if not public.is_admin() then
    raise exception 'only admins may apply pending edits';
  end if;

  select pending_edits into v_edits
    from public.chefs where id = p_chef_id;

  if v_edits is null then
    return; -- nothing to apply
  end if;

  -- Apply each field if present in the edits object.
  update public.chefs set
    display_name = coalesce(v_edits->>'display_name', display_name),
    fssai_number = case when v_edits ? 'fssai_number' then v_edits->>'fssai_number' else fssai_number end,
    address_text = case when v_edits ? 'address_text' then v_edits->>'address_text' else address_text end,
    phone_e164 = case when v_edits ? 'phone_e164' then v_edits->>'phone_e164' else phone_e164 end,
    whatsapp_e164 = case when v_edits ? 'whatsapp_e164' then v_edits->>'whatsapp_e164' else whatsapp_e164 end,
    pending_edits = null
  where id = p_chef_id;

  -- If location was edited, set it via PostGIS.
  if v_edits ? 'location_lat' and v_edits ? 'location_lng' then
    update public.chefs
       set location = st_setsrid(
         st_makepoint(
           (v_edits->>'location_lng')::double precision,
           (v_edits->>'location_lat')::double precision
         ), 4326)::geography
     where id = p_chef_id;
  end if;

  -- FSSAI changed → clear previous verification
  if v_edits ? 'fssai_number' then
    update public.chefs
       set fssai_verified_at = null, fssai_verified_by = null
     where id = p_chef_id;
  end if;

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (p_chef_id, auth.uid(), 'edited', coalesce(p_note, 'Applied pending edits'));
end;
$$;

revoke all on function public.admin_apply_pending_edits(uuid, text) from public, anon;
grant execute on function public.admin_apply_pending_edits(uuid, text) to authenticated, service_role;
