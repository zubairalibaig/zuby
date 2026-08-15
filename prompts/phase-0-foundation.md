# Phase 0 — Foundation (scaffold, database, CI, deploy)

## Context

You are building Zuby (zuby.food), a trust-first directory of home chefs. Read `CONCEPT.md`, `ARCHITECTURE.md`, and `CLAUDE.md` in the repo root before writing any code — they are binding. This phase lays every foundation the later phases build on. **No user-visible features ship in this phase.** Getting the schema and conventions right here is what prevents re-coding later.

## Prerequisites

- Supabase project created (founder provides `SUPABASE_URL`, anon + service-role keys).
- Vercel project linked to the GitHub repo; `zuby.food` DNS on Cloudflare pointed at Vercel.

## Scope

### 1. App scaffold
- Next.js (latest stable, App Router) + TypeScript **strict** + Tailwind CSS + shadcn/ui, ESLint + Prettier.
- Repo layout exactly as `ARCHITECTURE.md` §5 (`src/app`, `src/lib`, `src/components`, `supabase/`, `ingest/` placeholder, `prompts/` untouched).
- `src/lib/supabase/`: three clients — browser (anon), server (anon + cookies for auth later), admin (service-role, server-only, never imported into client code; add an ESLint rule or `server-only` import guard).
- Placeholder home page ("Zuby — home-cooked food near you. Launching soon in Bangalore.") so the deploy is verifiable.
- `/api/health` route returning `{ ok: true, db: <ping result> }`.

### 2. Database — the complete V1 schema
Implement **all** tables from `ARCHITECTURE.md` §3 as numbered SQL migrations in `supabase/migrations/`, even ones later phases fill (claims, events, ingest_*). Include:
- `postgis` and `pg_trgm` extensions.
- All enums as Postgres enum types (`chef_status`, `listing_source`, `dietary_profile`, item `dietary`, `claim_status`, `event_kind`, `ingest_status`, `verification_action`, `photo_kind`).
- GiST indexes on every `geography` column; `pg_trgm` GIN index on `chefs.display_name` and `kitchen_name`; unique `(city_id, slug)` on chefs; sensible FKs and `NOT NULL`s throughout.
- `search_chefs(lat float8, lng float8, max_km float8, tag_slugs text[], cuisine_slugs text[], city uuid)` SQL function: returns approved chefs where `ST_DWithin(location, point, LEAST(service_radius_km, max_km) * 1000)` respecting each chef's own radius, filtered by tags/cuisines when given, ordered by distance, with `distance_km` in the result. `SECURITY DEFINER` with an explicit column allow-list (never returns `address_text`, `phone_e164`, or precise `location` — return a ~100 m rounded lat/lng for map pins).
- `admins` table (user_id, email) + `is_admin()` helper function.
- **RLS enabled on every table** with the posture in `ARCHITECTURE.md` §3: anon reads approved-only; chef CRUD on own rows minus trust fields; admin full; `ingest_*` service-role only. Write RLS tests as SQL comments/scripts in `supabase/tests/` documenting each expected allow/deny.
- Trigger: any UPDATE by a non-admin touching trust-relevant chef fields (`display_name`, `fssai_number`, `address_text`, `phone_e164`, `whatsapp_e164`, `location`) sets `status = 'pending_review'`.
- `updated_at` triggers.

### 3. Seed data (`supabase/seed.sql`)
- Countries: India (`IN`, INR, active), Singapore (`SG`, SGD, **inactive**).
- City: Bangalore with center point + timezone `Asia/Kolkata`.
- Neighbourhoods with real center coordinates: Indiranagar, Koramangala, HSR Layout, Whitefield, Jayanagar, Marathahalli, Bellandur.
- Cuisines (~15: biryani, north-indian, south-indian, bengali, andhra, kerala, maharashtrian, gujarati, rajasthani, mangalorean, hyderabadi, chinese-desi, bakes-desserts, healthy-meals, tiffin-thali).
- Dietary tags: veg, non_veg, halal, jhatka, jain, egg_free, healthy.
- **8–10 fictional but realistic demo chefs** (clearly named e.g. "Demo Kitchen — …") across neighbourhoods, with menu items, prices in INR, tags, timings jsonb, mixed statuses (mostly approved) — enough to build Phase 1 against real-shaped data.

### 4. Types & validation
- Generated DB types via `supabase gen types typescript` → `src/types/db.ts`, with an npm script to regenerate.
- Zod schemas in `src/types/schemas.ts` for `timings` jsonb (weekly schedule with open/close/order-cutoff per day) and `nutrition` jsonb (`calories_kcal, protein_g, carbs_g, fat_g, serving_g` — all optional numbers).

### 5. CI/CD
- GitHub Actions: on PR → typecheck, lint, build. On merge to main → apply migrations to prod (`supabase db push`) then Vercel deploys.
- `.env.example` documenting every env var.
- `README.md`: 10-minute local setup (`supabase start`, seed, `npm run dev`).

## Non-goals (do NOT build)
No real pages beyond the placeholder, no auth UI, no admin UI, no scrapers, no search UI. No ORM. No Docker for the app itself.

## Acceptance criteria
1. Fresh clone + README steps → local app runs against local Supabase with seed data; `/api/health` returns ok.
2. `supabase db reset` applies all migrations + seed with zero errors.
3. `select * from search_chefs(12.9716, 77.6412, 5, null, null, null)` (Indiranagar coords) returns seeded approved chefs with correct distances, excludes chefs whose own radius doesn't reach, and never leaks private columns.
4. RLS spot-checks pass: anon client cannot read a `pending_review` chef or any `ingest_*` row; anon cannot write anything.
5. CI green; production deploy at zuby.food serves the placeholder over HTTPS.
6. Typecheck passes with `strict: true`, zero `any` in `src/`.

## Definition of done
All acceptance criteria pass, PR merged to main, prod deployed, and a short `docs/phase-0-notes.md` recording any deviations from `ARCHITECTURE.md` (deviations require founder sign-off).
