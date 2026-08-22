# Zuby — Technical Architecture

> Read `CONCEPT.md` first. This document translates the concept into technical decisions.
> Guiding constraints, in priority order: **(1) near-zero cost, (2) speed (both page speed and build speed), (3) scale without rewrite.**

## 1. Stack at a glance

| Layer | Choice | Why | Monthly cost at launch |
|---|---|---|---|
| Framework | **Next.js (App Router, TypeScript)** | Server rendering for SEO, ISR for near-static speed, one codebase for buyer site + chef dashboard + admin | $0 |
| Hosting | **Vercel Hobby** | Zero-config Next.js hosting, global CDN, free SSL for zuby.food | $0 |
| Database | **Supabase Free (Postgres 15 + PostGIS)** | Real geo-indexed radius queries, generous free tier, managed backups | $0 |
| Auth | **Supabase Auth** | Email OTP (no password) + Google login for chefs/admins; buyers never log in in V1. No phone-based login — India's DLT template registration + a paid SMS provider (Twilio/MSG91) is real recurring cost for a pre-revenue product | $0 |
| File storage | **Supabase Storage** | Chef photos, menu photos; served via CDN with image transforms | $0 (1 GB) |
| DNS / edge | **Cloudflare (free)** | DNS for zuby.food, caching, basic WAF/bot protection | $0 |
| Styling | **Tailwind CSS + shadcn/ui** | Fast to build, small CSS output, no design-system bikeshedding | $0 |
| Analytics | **Own `events` table + Vercel Web Analytics (free)** | WhatsApp-click tracking must be first-party (it's a KPI); page analytics free | $0 |
| Email | **Resend free tier** (claim/verification notifications) | 100 emails/day free, trivial API | $0 |
| Scraping | **Standalone Node scripts in `/ingest`, run locally/GitHub Actions** | Not part of the web app; writes to staging tables | $0 |

**Total: $0/month** until real traffic. First forced upgrade is likely Supabase Pro ($25/mo) at ~500 MB DB or when we need >1 GB storage for photos — months away.

### Why not X?

- **Not a separate backend (Express/Nest/FastAPI):** Next.js server components + route handlers cover 100% of V1 needs. A second service doubles deploy/ops surface for zero benefit at this scale.
- **Not Prisma/Drizzle-managed schema against Supabase:** we use **plain SQL migrations** (`supabase/migrations/`) because PostGIS types, RLS policies, and triggers are first-class in SQL and awkward in ORMs. App code uses the typed Supabase client + a thin query layer. (Generated types via `supabase gen types typescript`.)
- **Not Algolia/Meilisearch:** Postgres `pg_trgm` + PostGIS covers search at directory scale (thousands of chefs). Revisit only if search latency demonstrably hurts.
- **Not microservices, queues, Redis:** nothing in V1 needs them. ISR is our cache.
- **Not Firebase:** no PostGIS, weak relational modelling for a directory with joins (chefs ⋈ menus ⋈ tags ⋈ cities).

## 2. System shape

```
                        ┌─────────────────────────────────────────┐
                        │              Vercel (CDN + SSR)          │
  Buyer (no login) ───▶ │  Next.js app                             │
  Chef  (login)    ───▶ │   /            buyer-facing directory    │
  Admin (login)    ───▶ │   /dashboard   chef self-serve           │
                        │   /admin       verification & ops        │
                        │   /api/*       route handlers (wa redirect,│
                        │                claim, events)             │
                        └───────┬─────────────────────┬───────────┘
                                │ supabase-js (RLS)    │ service-role (server only)
                        ┌───────▼─────────────────────▼───────────┐
                        │  Supabase: Postgres + PostGIS + Auth +   │
                        │  Storage (photos) + RLS policies         │
                        └───────▲──────────────────────────────────┘
                                │ staging writes
                        ┌───────┴───────────┐
                        │ /ingest scrapers   │  (local / GitHub Actions cron)
                        └────────────────────┘
```

One Next.js app, three surfaces (public, `/dashboard`, `/admin`), one database. The scrapers are deliberately **outside** the web app: plain scripts that write to staging tables, so scraper churn never destabilises the site.

### Rendering strategy (this is the speed + cost story)

- **Public pages are ISR (Incremental Static Regeneration).** City pages, neighbourhood pages, cuisine pages, and chef profiles are statically generated and revalidated on-demand (when an admin approves a change) plus a periodic fallback (e.g. hourly). Result: CDN-served HTML, ~0 server compute for the long tail, and perfect SEO.
- **The one truly dynamic query — "chefs near me"** — is a server-rendered search route (`/search?lat=…&lng=…`) hitting one PostGIS RPC. Everything else on the page stays static.
- **Dashboard and admin are plain SSR** — low traffic, no caching needed.

## 3. Data model (core schema)

Multi-country from day zero. Names below are the contract; exact DDL lives in `supabase/migrations/`.

```
countries        id, code ('IN','SG'), name, currency_code ('INR','SGD'),
                 phone_prefix, is_active            -- SG row exists, is_active=false in V1

cities           id, country_id FK, slug ('bangalore'), name, center geography(Point),
                 timezone, is_active

neighbourhoods   id, city_id FK, slug ('indiranagar'), name, center geography(Point)
                 -- SEO landing pages + chef addressing; NOT used for search (PostGIS is)

chefs            id, city_id FK, neighbourhood_id FK, slug (unique per city),
                 display_name, kitchen_name, bio, photo_url,
                 phone_e164, whatsapp_e164, instagram_handle,
                 location geography(Point)  -- kitchen location (never shown precisely)
                 service_radius_km numeric,
                 address_text (private), address_area (public, e.g. "Indiranagar 2nd Stage"),
                 status: draft | pending_review | approved | rejected | suspended | delisted
                 listing_source: scraped | self_signup | claimed
                 claimed_by uuid FK -> auth.users NULL,  -- NULL = unclaimed seeded listing
                 fssai_number, fssai_verified_at, fssai_verified_by,
                 sfa_compliant bool, muis_certified bool,   -- Singapore fields, unused in V1
                 dietary_profile: veg_only | non_veg | mixed,
                 is_verified bool (badge), verified_at, verified_by,
                 timings jsonb  -- weekly schedule: open/close/order-cutoff per day
                 created_at, updated_at

cuisines         id, slug ('biryani','north-indian','bengali',…), name
chef_cuisines    chef_id, cuisine_id

dietary_tags     id, slug: veg | non_veg | halal | jhatka | jain | egg_free | healthy
chef_dietary_tags chef_id, tag_id          -- chef-level, filterable in search

menu_items       id, chef_id FK, name, description, photo_url,
                 price numeric, currency_code (denormalised from country for safety),
                 unit ('per plate','per kg','per tiffin'),
                 is_best_seller bool, is_available bool,
                 dietary: veg | non_veg | egg,           -- item-level tag
                 nutrition jsonb NULL,  -- {calories_kcal, protein_g, carbs_g, fat_g, serving_g}
                 sort_order, created_at, updated_at

chef_photos      id, chef_id FK, url, kind: kitchen | food | chef, sort_order

claims           id, chef_id FK, claimant_user_id FK, claimant_phone,
                 proof_note, status: pending | approved | rejected,
                 decided_by, decided_at, created_at

verification_log id, chef_id FK, admin_user_id FK,
                 action: approved | rejected | info_requested | suspended | claim_approved | claim_rejected,
                 note, created_at         -- append-only audit trail

events           id, kind: wa_click | profile_view | search | claim_started,
                 chef_id NULL, city_id NULL, geohash5 text NULL,
                 metadata jsonb, created_at
                 -- first-party analytics; wa_click is THE KPI

ingest_raw       id, source ('instagram','justdial','flyer','sheet',…), source_url,
                 raw jsonb, scraped_at, dedupe_key
ingest_candidates id, ingest_raw_id FK, normalised jsonb,
                 status: new | needs_review | promoted | discarded,
                 promoted_chef_id FK NULL
                 -- staging: scraped data NEVER writes directly to chefs
```

**Key modelling decisions**

- `geography(Point)` + GiST indexes. The core search query:
  `ST_DWithin(chef.location, buyer_point, chef.service_radius_km * 1000)` — chefs appear only within **their own declared radius**, ordered by distance. Exposed as one Postgres function (`search_chefs(lat, lng, filters…)`) so the app never assembles geo SQL.
- **Privacy:** exact `location` and `address_text` are never exposed to buyers. Public pages show `address_area` + approximate distance ("~2.3 km away").
- **Unclaimed listings** are real `chefs` rows with `claimed_by NULL` and `listing_source='scraped'`. Claiming links an auth user via the `claims` flow. Same table, same pages — no parallel "scraped listing" model to reconcile later.
- **Dietary tags include `jhatka`** alongside halal/veg/jain/egg-free — chef-level for filtering, plus a simple item-level veg/non-veg/egg marker.
- **Currency on every price row.** Nothing assumes INR.
- **Timings as jsonb** (validated by Zod schema in app code) rather than a table — flexible for "orders close 9pm previous day" patterns, no joins on the hot path.

### Row Level Security (RLS) posture

- Anonymous role: `SELECT` only on **approved** chefs and their related rows; `INSERT` on `events` via a rate-limited route handler (not direct).
- Chef role: full CRUD on rows where `chefs.claimed_by = auth.uid()` — except trust fields (`status`, `is_verified`, `fssai_verified_*`), which only admins may change. Any chef edit to public content flips status back to `pending_review` if it touches trust-relevant fields (name, FSSAI, address, phone).
- Admin role (allow-listed emails in an `admins` table): full access; every status change also writes `verification_log`.
- Scrapers use the service-role key, writing **only** to `ingest_*` tables.

## 4. URL & SEO architecture

```
zuby.food/                                  → country/city chooser (auto-geo)
zuby.food/bangalore                         → city landing (ISR)
zuby.food/bangalore/indiranagar             → neighbourhood landing (ISR)
zuby.food/bangalore/cuisine/biryani         → city × cuisine landing (ISR)
zuby.food/bangalore/indiranagar/aishas-biryani-kitchen  → chef profile (ISR)
zuby.food/search?lat=&lng=&radius=&tags=    → live geo search (SSR)
zuby.food/for-chefs                         → chef acquisition landing
zuby.food/dashboard/**                      → chef self-serve (auth)
zuby.food/admin/**                          → admin (auth, allow-list)
zuby.food/api/wa/[chefId]                   → logs wa_click event → 302 to wa.me deep link
zuby.food/sitemap.xml, robots.txt           → generated from DB
```

- Chef pages emit **Schema.org `FoodEstablishment`/`LocalBusiness` JSON-LD** (name, area, geo (approximate), cuisines, price range, opening hours).
- City/neighbourhood/cuisine pages emit `ItemList` JSON-LD.
- Every page: unique title/description templates, OpenGraph images.
- The WhatsApp button never links wa.me directly — always via `/api/wa/[chefId]` so every click is counted (with optional geohash5 from browser geolocation, never precise location).
- Singapore later = new `countries`/`cities` rows + the same routes (`zuby.food/singapore/...`). Zero code fork.

## 5. Repository layout

```
/                       Next.js app (single deployable)
├── CONCEPT.md ARCHITECTURE.md ROADMAP.md CLAUDE.md
├── prompts/            phase build prompts (the plan of record)
├── src/
│   ├── app/            routes: (public)/, dashboard/, admin/, api/
│   ├── components/     ui/ (shadcn), directory/, forms/
│   ├── lib/            supabase clients, queries/, seo/, geo/, copy/
│   └── types/          generated DB types + Zod schemas
├── supabase/
│   ├── migrations/     numbered SQL migrations (source of truth for schema)
│   └── seed.sql        cities, neighbourhoods, cuisines, dietary tags
├── ingest/             scrapers + normaliser + promoter CLI (own package.json)
└── .github/workflows/  CI: typecheck, lint, build; optional ingest cron
```

One deployable. The `ingest/` package shares types via the generated DB types, nothing else.

## 6. Environments & ops

- **Environments:** local (`supabase start` – local Postgres+PostGIS in Docker) → preview (Vercel preview deploys per PR, pointing at a Supabase branch/staging project) → production. Two Supabase projects max (staging, prod) to stay in free tier.
- **CI (GitHub Actions):** typecheck + lint + build on every PR. Migrations applied via `supabase db push` from CI on merge to main.
- **Backups:** Supabase daily backups (built-in); weekly `pg_dump` artifact via Actions for belt-and-braces.
- **Monitoring:** Vercel logs + a dead-simple `/api/health` checked by a free uptime monitor (e.g. UptimeRobot).
- **Secrets:** Vercel/Supabase env vars; never in repo. `SUPABASE_SERVICE_ROLE_KEY` server-only.

## 7. Scale path (what changes when we grow — and what doesn't)

| Trigger | Change | What survives untouched |
|---|---|---|
| DB > free tier | Supabase Pro ($25/mo) | schema, code |
| Traffic > Hobby limits / need team | Vercel Pro ($20/mo) | everything |
| Photos > 1 GB | Storage add-on or move originals to Cloudflare R2 (free egress) | URLs abstracted behind one helper |
| Search latency at ~10k+ chefs | Read replica; then Meilisearch fed from Postgres | Search API contract |
| Singapore launch | Flip `countries.is_active`, seed SG cities/neighbourhoods, SGD prices, SFA/MUIS fields already exist | all routes, all components |
| Payments/ordering (post-V1) | New `orders` domain beside the directory; directory pages untouched | directory, SEO, trust stack |

The architecture is boring on purpose. Postgres + one Next.js app on CDNs is the highest-leverage, lowest-cost shape for a directory, and every future layer (payments, reviews, delivery) attaches to it without a rewrite.
