-- Fix: a chef could not submit their own listing for review.
--
-- chefs_guard rejected ANY status change by a non-admin, which included the
-- one transition the entire self-serve create flow ends on:
--   draft -> pending_review
-- So a chef could complete every step of the stepper, press "Submit for
-- review", and get "trust fields can only be changed by an admin". The listing
-- stayed a draft forever and never reached the admin queue.
--
-- Two transitions are now allowed to the owning chef, and only these:
--   draft    -> pending_review   (finishing the create flow)
--   rejected -> pending_review   (fixing what was wrong and trying again —
--                                 without this a rejected chef is stuck for
--                                 good, with no way back into the queue)
--
-- Everything else about the guard is unchanged: a chef still cannot approve
-- themselves, verify themselves, promote themselves, change claimed_by, or
-- edit a trust field without dropping back into review.
create or replace function public.chefs_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_is_restricted boolean := auth.uid() is not null and not public.is_admin();
  self_submit boolean := false;
begin
  if tg_op = 'INSERT' then
    if actor_is_restricted then
      new.claimed_by := auth.uid();
      new.is_verified := false;
      new.verified_at := null;
      new.verified_by := null;
      new.fssai_verified_at := null;
      new.fssai_verified_by := null;
      -- Promotion is sold, never self-assigned.
      new.promoted_until := null;
      new.promoted_weight := 0;
      if new.status not in ('draft', 'pending_review') then
        new.status := 'draft';
      end if;
      new.listing_source := 'self_signup';
    end if;
    return new;
  end if;

  -- UPDATE
  if actor_is_restricted then
    self_submit :=
      new.status is distinct from old.status
      and old.status in ('draft', 'rejected')
      and new.status = 'pending_review';

    if (new.status is distinct from old.status and not self_submit)
      or new.is_verified is distinct from old.is_verified
      or new.verified_at is distinct from old.verified_at
      or new.verified_by is distinct from old.verified_by
      or new.fssai_verified_at is distinct from old.fssai_verified_at
      or new.fssai_verified_by is distinct from old.fssai_verified_by
      or new.claimed_by is distinct from old.claimed_by
      or new.listing_source is distinct from old.listing_source
      or new.promoted_until is distinct from old.promoted_until
      or new.promoted_weight is distinct from old.promoted_weight then
      raise exception 'trust fields can only be changed by an admin';
    end if;

    if new.display_name is distinct from old.display_name
      or new.fssai_number is distinct from old.fssai_number
      or new.address_text is distinct from old.address_text
      or new.phone_e164 is distinct from old.phone_e164
      or new.whatsapp_e164 is distinct from old.whatsapp_e164
      or new.location::text is distinct from old.location::text then
      if old.status = 'approved' then
        new.status := 'pending_review';
      end if;
      if new.fssai_number is distinct from old.fssai_number then
        new.fssai_verified_at := null;
        new.fssai_verified_by := null;
      end if;
    end if;
  end if;

  return new;
end;
$$;
