-- Phase 0: geography reference tables and admin allow-list.
-- Multi-country from day zero: countries and cities are first-class entities.

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{2}$'),
  name text not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  phone_prefix text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries (id),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  center extensions.geography (point, 4326) not null,
  timezone text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (country_id, slug)
);

create index cities_center_gist on public.cities using gist (center);

create table public.neighbourhoods (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  center extensions.geography (point, 4326) not null,
  created_at timestamptz not null default now(),
  unique (city_id, slug)
);

create index neighbourhoods_center_gist on public.neighbourhoods using gist (center);
create index neighbourhoods_city_idx on public.neighbourhoods (city_id);

-- Admin allow-list. Rows managed via SQL / service role only.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);
