-- Phase 0: chefs, cuisines, dietary tags, menus, photos.

create table public.cuisines (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.dietary_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_]+$'),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.chefs (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id),
  neighbourhood_id uuid references public.neighbourhoods (id),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  display_name text not null,
  kitchen_name text not null,
  bio text,
  photo_url text,

  -- Contact. NEVER exposed to anon via RLS-safe views/functions; the WhatsApp
  -- deep link is minted server-side by /api/wa/[chefId].
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  whatsapp_e164 text check (whatsapp_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  instagram_handle text,

  -- Geo. `location` is the kitchen's exact point (private); public surfaces get
  -- a ~100 m rounded coordinate from search_chefs(). Radius is the chef's own
  -- declared service area — the search function respects it.
  location extensions.geography (point, 4326),
  service_radius_km numeric not null default 5
    check (service_radius_km > 0 and service_radius_km <= 50),
  address_text text, -- private, admin-only
  address_area text, -- public, e.g. "Indiranagar 2nd Stage"

  status public.chef_status not null default 'draft',
  listing_source public.listing_source not null default 'self_signup',
  claimed_by uuid references auth.users (id) on delete set null,

  -- Regulatory: India
  fssai_number text check (fssai_number ~ '^[0-9]{14}$'),
  fssai_verified_at timestamptz,
  fssai_verified_by uuid references auth.users (id),
  -- Regulatory: Singapore (schema-ready, functionally unused in V1)
  sfa_compliant boolean,
  muis_certified boolean,

  dietary_profile public.dietary_profile,
  is_verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references auth.users (id),

  -- Weekly schedule; shape validated by the app (src/types/schemas.ts timingsSchema).
  timings jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create index chefs_location_gist on public.chefs using gist (location);
create index chefs_status_idx on public.chefs (status);
create index chefs_city_idx on public.chefs (city_id);
create index chefs_neighbourhood_idx on public.chefs (neighbourhood_id);
create index chefs_claimed_by_idx on public.chefs (claimed_by);
create index chefs_display_name_trgm on public.chefs
  using gin (display_name extensions.gin_trgm_ops);
create index chefs_kitchen_name_trgm on public.chefs
  using gin (kitchen_name extensions.gin_trgm_ops);

create table public.chef_cuisines (
  chef_id uuid not null references public.chefs (id) on delete cascade,
  cuisine_id uuid not null references public.cuisines (id),
  primary key (chef_id, cuisine_id)
);

create table public.chef_dietary_tags (
  chef_id uuid not null references public.chefs (id) on delete cascade,
  tag_id uuid not null references public.dietary_tags (id),
  primary key (chef_id, tag_id)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  name text not null,
  description text,
  photo_url text,
  price numeric(10, 2) check (price >= 0),
  -- Denormalised so a price can never exist without a currency.
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  unit text, -- 'per plate', 'per kg', 'per tiffin'
  is_best_seller boolean not null default false,
  is_available boolean not null default true,
  dietary public.item_dietary,
  -- {calories_kcal, protein_g, carbs_g, fat_g, serving_g} — validated by nutritionSchema.
  nutrition jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_items_chef_idx on public.menu_items (chef_id);

create table public.chef_photos (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  url text not null,
  kind public.photo_kind not null default 'food',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index chef_photos_chef_idx on public.chef_photos (chef_id);
