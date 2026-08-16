-- Phase 0: claims, verification audit trail, first-party events, ingestion staging.

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  claimant_user_id uuid not null references auth.users (id) on delete cascade,
  claimant_phone text check (claimant_phone ~ '^\+[1-9][0-9]{6,14}$'),
  proof_note text,
  status public.claim_status not null default 'pending',
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index claims_chef_idx on public.claims (chef_id);
create index claims_status_idx on public.claims (status);

-- Append-only audit trail: who approved/rejected/edited whom, and when.
create table public.verification_log (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  admin_user_id uuid references auth.users (id),
  action public.verification_action not null,
  note text,
  created_at timestamptz not null default now()
);

create index verification_log_chef_idx on public.verification_log (chef_id);

-- First-party analytics. wa_click is THE launch KPI (CONCEPT.md).
-- geohash5 is a ~5 km cell — never a precise location.
create table public.events (
  id bigint generated always as identity primary key,
  kind public.event_kind not null,
  chef_id uuid references public.chefs (id) on delete set null,
  city_id uuid references public.cities (id),
  geohash5 text check (char_length(geohash5) = 5),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index events_kind_created_idx on public.events (kind, created_at);
create index events_chef_idx on public.events (chef_id);

-- Ingestion staging. Scraped data NEVER writes directly to chefs (ARCHITECTURE.md).
create table public.ingest_raw (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- 'sheet' | 'instagram' | 'justdial' | ...
  source_url text,
  raw jsonb not null,
  dedupe_key text not null,
  scraped_at timestamptz not null default now(),
  unique (source, dedupe_key)
);

create table public.ingest_candidates (
  id uuid primary key default gen_random_uuid(),
  ingest_raw_id uuid references public.ingest_raw (id) on delete set null,
  normalised jsonb not null,
  status public.ingest_status not null default 'new',
  promoted_chef_id uuid references public.chefs (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ingest_candidates_status_idx on public.ingest_candidates (status);
