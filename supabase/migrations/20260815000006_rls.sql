-- Phase 0: Row Level Security on every table.
-- Posture (ARCHITECTURE.md §3):
--   * anon: read-only, approved content only; events are written via the
--     server route with the service role, never directly.
--   * chef (authenticated): CRUD on own rows; trust fields blocked by the
--     chefs_guard trigger.
--   * admin: full access (policies check public.is_admin()).
--   * ingest_* and events: service role only (no anon/authenticated policies
--     except admin reads).

alter table public.countries enable row level security;
alter table public.cities enable row level security;
alter table public.neighbourhoods enable row level security;
alter table public.admins enable row level security;
alter table public.cuisines enable row level security;
alter table public.dietary_tags enable row level security;
alter table public.chefs enable row level security;
alter table public.chef_cuisines enable row level security;
alter table public.chef_dietary_tags enable row level security;
alter table public.menu_items enable row level security;
alter table public.chef_photos enable row level security;
alter table public.claims enable row level security;
alter table public.verification_log enable row level security;
alter table public.events enable row level security;
alter table public.ingest_raw enable row level security;
alter table public.ingest_candidates enable row level security;

-- ---------- Reference data: public read, admin write ----------

create policy "public read" on public.countries
  for select to anon, authenticated using (true);
create policy "admin write" on public.countries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read" on public.cities
  for select to anon, authenticated using (true);
create policy "admin write" on public.cities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read" on public.neighbourhoods
  for select to anon, authenticated using (true);
create policy "admin write" on public.neighbourhoods
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read" on public.cuisines
  for select to anon, authenticated using (true);
create policy "admin write" on public.cuisines
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read" on public.dietary_tags
  for select to anon, authenticated using (true);
create policy "admin write" on public.dietary_tags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- admins: users may check their own membership ----------

create policy "read own membership" on public.admins
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- No insert/update/delete policies: managed via SQL / service role only.

-- ---------- chefs ----------

-- Anon sees only approved chefs. A logged-in chef also sees their own row in
-- any status. Admins see everything.
create policy "read approved or own" on public.chefs
  for select to anon, authenticated
  using (status = 'approved' or claimed_by = auth.uid() or public.is_admin());

-- Chefs create their own listing (chefs_guard normalises trust fields).
create policy "chef insert own" on public.chefs
  for insert to authenticated
  with check (claimed_by = auth.uid() or public.is_admin());

-- Chefs edit their own listing (chefs_guard blocks trust-field changes and
-- drops trust-relevant edits back to pending_review).
create policy "chef update own" on public.chefs
  for update to authenticated
  using (claimed_by = auth.uid() or public.is_admin())
  with check (claimed_by = auth.uid() or public.is_admin());

create policy "admin delete" on public.chefs
  for delete to authenticated using (public.is_admin());

-- ---------- chef-owned child tables ----------
-- Readable when the parent chef is publicly visible (or owned / admin);
-- writable by the owning chef or an admin.

create policy "read via parent chef" on public.chef_cuisines
  for select to anon, authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id
      and (c.status = 'approved' or c.claimed_by = auth.uid() or public.is_admin())
  ));
create policy "owner write" on public.chef_cuisines
  for all to authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ));

create policy "read via parent chef" on public.chef_dietary_tags
  for select to anon, authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id
      and (c.status = 'approved' or c.claimed_by = auth.uid() or public.is_admin())
  ));
create policy "owner write" on public.chef_dietary_tags
  for all to authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ));

create policy "read via parent chef" on public.menu_items
  for select to anon, authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id
      and (c.status = 'approved' or c.claimed_by = auth.uid() or public.is_admin())
  ));
create policy "owner write" on public.menu_items
  for all to authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ));

create policy "read via parent chef" on public.chef_photos
  for select to anon, authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id
      and (c.status = 'approved' or c.claimed_by = auth.uid() or public.is_admin())
  ));
create policy "owner write" on public.chef_photos
  for all to authenticated
  using (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.chefs c
    where c.id = chef_id and (c.claimed_by = auth.uid() or public.is_admin())
  ));

-- ---------- claims ----------

create policy "claimant insert" on public.claims
  for insert to authenticated
  with check (claimant_user_id = auth.uid() and status = 'pending');

create policy "read own or admin" on public.claims
  for select to authenticated
  using (claimant_user_id = auth.uid() or public.is_admin());

create policy "admin decide" on public.claims
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- verification_log: append-only, admin-only ----------

create policy "admin read" on public.verification_log
  for select to authenticated using (public.is_admin());
create policy "admin append" on public.verification_log
  for insert to authenticated with check (public.is_admin());
-- No update/delete policies: the audit trail is append-only for API roles.

-- ---------- events: service-role writes only; admin reads ----------

create policy "admin read" on public.events
  for select to authenticated using (public.is_admin());
-- No anon/authenticated insert: /api/wa and page-view logging use the
-- service-role client server-side (rate-limited in the route handler).

-- ---------- ingest_*: service role only ----------
-- RLS enabled with no policies = deny for anon/authenticated; the service
-- role bypasses RLS, which is exactly the contract for the /ingest scripts.
