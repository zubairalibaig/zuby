-- Bug fix, found during a chef/buyer-persona validation pass: nothing stopped
-- an admin approving a chef whose neighbourhood_id is null.
--
-- That state is reachable in practice, not just in theory: promote_ingest_candidate()
-- (20260815000007_ingest_helpers.sql) looks up the neighbourhood by matching
-- the scraped area text against public.neighbourhoods and simply leaves
-- neighbourhood_id NULL when nothing matches — it does not block promotion to
-- ingest_candidates, and admin_set_chef_status() did not block approval
-- either. The result is a chef that is 'approved', is_verified, and shows up
-- in search_chefs()/trending_chefs()/promoted_chefs() (all LEFT JOIN
-- neighbourhoods) — but has no working URL, because the only chef-profile
-- route is /[city]/[neighbourhood]/[chef] (ARCHITECTURE.md §4). Concretely:
--   * ChefCard's href falls back to `/${city_slug}/${slug}` when
--     neighbourhood_slug is null, which actually resolves to the
--     /[city]/[neighbourhood] LISTING route with the chef's own slug read as
--     a neighbourhood slug — silently the wrong page, not even a clean 404.
--   * getAllApprovedChefUrls() inner-joins neighbourhoods, so the chef is
--     simultaneously live and missing from the sitemap.
-- The self-signup path (CreateListingStepper) already guards against this
-- client-side ("neighbourhoodRequired" — a public chef page needs a
-- neighbourhood to have a URL at all); this closes the same gap for admins
-- approving a scraped/ingested listing, at the one place that actually
-- enforces it server-side.
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
  v_has_neighbourhood boolean;
begin
  if not public.is_admin() then
    raise exception 'only admins may change chef status';
  end if;

  if v_status = 'approved' then
    select (neighbourhood_id is not null) into v_has_neighbourhood
      from public.chefs where id = p_chef_id;

    if v_has_neighbourhood is null then
      raise exception 'chef % not found', p_chef_id;
    end if;

    if not v_has_neighbourhood then
      raise exception
        'cannot approve % — it has no neighbourhood assigned, so it has no public URL '
        '(chef pages are /<city>/<neighbourhood>/<chef>). Assign one in the editor first.',
        p_chef_id;
    end if;

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
