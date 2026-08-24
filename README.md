# Zuby

The trust-first, geo-native directory of home chefs. [zuby.food](https://zuby.food)

**Read first:** [`CONCEPT.md`](CONCEPT.md) (what Zuby is) → [`ARCHITECTURE.md`](ARCHITECTURE.md) (how it's built) → [`ROADMAP.md`](ROADMAP.md) (the phased plan). AI assistants and contributors: [`CLAUDE.md`](CLAUDE.md) is binding.

Current status: **Phase 0 complete** (foundation). Phase 1 (public directory) is next — see [`prompts/phase-1-public-directory.md`](prompts/phase-1-public-directory.md).

## Stack

Next.js (App Router, TypeScript strict) · Tailwind CSS · Supabase (Postgres 15 + PostGIS + Auth + Storage) · Vercel · Cloudflare DNS. Target cost at launch: **$0/month**.

## Setup — browser only (no terminal needed)

This is the founder's path: everything happens in the Supabase, Vercel and
GitHub web UIs. No Node, no CLI, no local install.

### 1. Build the database

Supabase dashboard → **SQL Editor** → **New query** → paste the whole of
[`supabase/setup.sql`](supabase/setup.sql) → **Run**.

> **This drops the entire `public` schema**, including the tables from the
> earlier Replit project and its `drizzle` schema. Auth users, storage buckets
> and extensions are not touched. Safe to re-run — it rebuilds from scratch.

### 2. Check it worked

Same SQL Editor → new query → paste [`supabase/verify.sql`](supabase/verify.sql)
→ **Run**. You should get a table of 20 rows, all ✅ PASS, covering the schema,
seed data, geo search, privacy (no phone/address leaks), RLS, and the trust
guard that stops a chef approving themselves.

### 3. Set the Vercel environment variables

Vercel → Project → Settings → Environment Variables (values from Supabase →
Settings → API):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` key — server-side only |
| `NEXT_PUBLIC_SITE_URL` | `https://zuby.food` |

Redeploy, then open `/api/health` — it should return `{"ok":true,"db":"ok"}`.

### 4. Day-to-day admin

[`supabase/ops.sql`](supabase/ops.sql) holds copy-paste blocks for: making
yourself an admin, creating the photo storage bucket, approving a chef by hand,
taking a listing down, and removing the demo data before launch.

**Editing code without a terminal:** use the GitHub web editor (press `.` in any
repo view, or *Edit this file*). Every push runs CI — typecheck, lint, build,
plus applying `setup.sql` to a throwaway PostGIS database and running the same
20 acceptance checks. Vercel deploys `main` automatically.

---

## Setup for contributors with a local toolchain

### 1. Install

```bash
git clone https://github.com/zubairalibaig/zuby.git
cd zuby
npm install
cp .env.example .env.local     # then fill in the values below
```

### 2. Get your Supabase keys

Supabase dashboard → **Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` — the Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the `anon` / public key
- `SUPABASE_SERVICE_ROLE_KEY` — the `service_role` key (server-side only, bypasses RLS)

Supabase dashboard → **Project Settings → Database → Connection string (URI)**:

- `DATABASE_URL` — used only by the migration scripts, not at runtime

### 3. Create the database schema

> **Warning — `--reset` drops the entire `public` schema**, including any tables
> from a previous project on the same Supabase instance. Auth users, storage
> buckets and extensions are not touched. Use it on a project you're happy to wipe.

```bash
# Wipe public schema, apply all migrations, load seed data:
npm run db:reset

# Or, on a genuinely empty database, just apply migrations (no wipe, no seed):
npm run db:apply
```

Both commands run inside a single transaction — if anything fails, nothing changes.

The seed loads: India + Singapore (inactive), Bangalore with 108 neighbourhoods, 29 cuisines, 7 dietary tags, and 9 demo chefs (7 approved, 1 pending, 1 draft) with menus. Demo chefs are clearly named `Demo Kitchen — …`; delete them before public launch:

```sql
delete from chefs where kitchen_name like 'Demo Kitchen%';
```

### 4. Run it

```bash
npm run dev            # http://localhost:3000
curl localhost:3000/api/health   # {"ok":true,"db":"ok"}
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, strict, no emit |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write (`format:check` to verify) |
| `npm run db:reset` | **Destructive.** Wipe `public`, apply migrations, seed |
| `npm run db:apply` | Apply migrations only |
| `npm run db:types` | Regenerate DB types from the linked Supabase project |

## Database

Schema lives in `supabase/migrations/` as numbered SQL files — **never edit the
database by hand**; add a migration (`CLAUDE.md` convention).

Key pieces:

- **`search_chefs(lat, lng, max_km, tag_slugs, cuisine_slugs, city)`** — the core discovery query. Returns approved chefs within *both* the buyer's radius and each chef's own declared `service_radius_km`, ordered by distance. `SECURITY DEFINER` with an explicit column allow-list: it never returns phone numbers, `address_text`, or precise coordinates (map pins get ~100 m rounded values).
- **RLS on every table.** Anonymous visitors read approved content only. Chefs CRUD their own rows. `ingest_*` and `events` are service-role only. Admins are an allow-list in `admins` (checked via `is_admin()`).
- **`chefs_guard` trigger.** A chef can never set `status`, `is_verified`, `fssai_verified_*`, `claimed_by` or `listing_source` — the database raises. Editing a trust-relevant field (name, FSSAI, address, phone, WhatsApp, location) drops an approved listing back to `pending_review` automatically.

Verify the security posture at any time with `supabase/tests/rls_checks.sql`.

### Adding an admin

```sql
insert into admins (user_id, email)
select id, email from auth.users where email = 'you@example.com';
```

## Deployment

Vercel is connected to this repo and deploys `main` automatically. Set the same
env vars from `.env.example` in **Vercel → Project → Settings → Environment
Variables** (all except `DATABASE_URL`, which is only needed locally).

CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check and build on
every PR, plus a job that applies all migrations to a throwaway PostGIS database
and asserts the geo search and RLS rules still hold.
