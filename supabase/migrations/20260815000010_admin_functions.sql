-- Phase 3: admin action functions and ingest-table admin access.
--
-- Every trust-sensitive admin mutation goes through a SECURITY DEFINER function
-- that (a) re-checks is_admin() at the database, and (b) writes verification_log
-- in the SAME transaction as the change. That means the audit trail can never
-- drift from reality, and — with the RLS policies from Phase 0 — an admin
-- mutation is verified server-side twice: middleware/layout gate, then the DB.

-- ---------------------------------------------------------------------------
-- Chef status transitions (approve / reject / suspend / delist)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_chef_status(
  p_chef_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status public.chef_status := p_status::public.chef_status;
  v_action public.verification_action;
begin
  if not public.is_admin() then
    raise exception 'only admins may change chef status';
  end if;

  if v_status = 'approved' then
    v_action := 'approved';
    update public.chefs
       set status = 'approved',
           is_verified = true,
           verified_at = now(),
           verified_by = auth.uid()
     where id = p_chef_id;
  else
    v_action := case v_status
      when 'rejected' then 'rejected'::public.verification_action
      when 'suspended' then 'suspended'::public.verification_action
      when 'delisted' then 'delisted'::public.verification_action
      else 'edited'::public.verification_action
    end;
    -- Suspending / delisting a live chef removes the public badge too.
    update public.chefs
       set status = v_status,
           is_verified = case when v_status in ('suspended','delisted','rejected') then false else is_verified end
     where id = p_chef_id;
  end if;

  if not found then
    raise exception 'chef % not found', p_chef_id;
  end if;

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (p_chef_id, auth.uid(), v_action, p_note);
end;
$$;

-- ---------------------------------------------------------------------------
-- Request more info: keep the listing in review, record what's missing.
-- ---------------------------------------------------------------------------
create or replace function public.admin_request_info(p_chef_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins may request info';
  end if;

  update public.chefs set status = 'pending_review'
   where id = p_chef_id and status <> 'approved';

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (p_chef_id, auth.uid(), 'info_requested', p_note);
end;
$$;

-- ---------------------------------------------------------------------------
-- Manual FSSAI verification (visual check, no external API in V1).
-- ---------------------------------------------------------------------------
create or replace function public.admin_verify_fssai(p_chef_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins may verify FSSAI';
  end if;

  update public.chefs
     set fssai_verified_at = now(), fssai_verified_by = auth.uid()
   where id = p_chef_id;
  if not found then
    raise exception 'chef % not found', p_chef_id;
  end if;

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (p_chef_id, auth.uid(), 'edited', coalesce(p_note, 'FSSAI number verified'));
end;
$$;

-- ---------------------------------------------------------------------------
-- Location (PostGIS geography is awkward over PostgREST — set it here).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_chef_location(
  p_chef_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins may set location';
  end if;

  update public.chefs
     set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
   where id = p_chef_id;
  if not found then
    raise exception 'chef % not found', p_chef_id;
  end if;

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (p_chef_id, auth.uid(), 'edited', coalesce(p_note, 'Location updated'));
end;
$$;

-- ---------------------------------------------------------------------------
-- Generic "an admin edited this" audit row, written after a plain-column
-- update done through the normal supabase-js client.
-- ---------------------------------------------------------------------------
create or replace function public.admin_log_edit(p_chef_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins may log edits';
  end if;
  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (p_chef_id, auth.uid(), 'edited', p_note);
end;
$$;

-- ---------------------------------------------------------------------------
-- Claim decisions (links chefs.claimed_by on approval).
-- ---------------------------------------------------------------------------
create or replace function public.admin_decide_claim(
  p_claim_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim public.claims%rowtype;
begin
  if not public.is_admin() then
    raise exception 'only admins may decide claims';
  end if;

  select * into v_claim from public.claims where id = p_claim_id;
  if not found then
    raise exception 'claim % not found', p_claim_id;
  end if;

  update public.claims
     set status = case when p_approve then 'approved' else 'rejected' end::public.claim_status,
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_claim_id;

  if p_approve then
    update public.chefs
       set claimed_by = v_claim.claimant_user_id,
           listing_source = 'claimed'
     where id = v_claim.chef_id;
  end if;

  insert into public.verification_log (chef_id, admin_user_id, action, note)
  values (
    v_claim.chef_id,
    auth.uid(),
    case when p_approve then 'claim_approved' else 'claim_rejected' end::public.verification_action,
    p_note
  );
end;
$$;

-- Lock down and grant. Execute is allowed for authenticated (the is_admin()
-- check inside each function is the real gate); anon can never call them.
revoke all on function
  public.admin_set_chef_status(uuid, text, text),
  public.admin_request_info(uuid, text),
  public.admin_verify_fssai(uuid, text),
  public.admin_set_chef_location(uuid, double precision, double precision, text),
  public.admin_log_edit(uuid, text),
  public.admin_decide_claim(uuid, boolean, text)
  from public, anon;

grant execute on function
  public.admin_set_chef_status(uuid, text, text),
  public.admin_request_info(uuid, text),
  public.admin_verify_fssai(uuid, text),
  public.admin_set_chef_location(uuid, double precision, double precision, text),
  public.admin_log_edit(uuid, text),
  public.admin_decide_claim(uuid, boolean, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Ingest tables: admins may read raw + candidates and update candidate status
-- from the browser (the Phase 3 /admin/ingest UI). Scrapers still use the
-- service role; anon still sees nothing.
-- ---------------------------------------------------------------------------
create policy "admin read" on public.ingest_raw
  for select to authenticated using (public.is_admin());

create policy "admin read" on public.ingest_candidates
  for select to authenticated using (public.is_admin());

create policy "admin update" on public.ingest_candidates
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
