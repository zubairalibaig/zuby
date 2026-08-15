# Phase 2 — Ingestion pipeline (scrape → stage → promote)

## Context

Zuby (zuby.food) seeds its directory by collecting **publicly available** home-chef information (Instagram pages, public directories like Justdial/IndiaMART, apartment-group flyers the founder photographs, founder-maintained Google Sheets) and promoting it into **unclaimed listings** that chefs later claim. Read `CONCEPT.md`, `ARCHITECTURE.md`, `CLAUDE.md` first. This phase runs **parallel to Phase 1** — it is a standalone `/ingest` package of Node scripts, never part of the web app. Scraped data NEVER writes directly to `chefs`; everything flows through staging tables and human review.

## Prerequisites
Phase 0 merged (`ingest_raw` / `ingest_candidates` tables exist). Runs with the service-role key from local machine or GitHub Actions.

## Scope

### 1. Package setup
- `ingest/` with own `package.json` (TypeScript, tsx runner), sharing `src/types/db.ts` via path alias. CLI entry: `npm run ingest -- <command>`.
- Config file listing sources with per-source politeness settings (rate limits, user agent honesty).

### 2. Collectors (`ingest collect <source>`)
Each collector writes raw payloads to `ingest_raw` (source, source_url, raw jsonb, dedupe_key) and must be independently runnable and idempotent (re-runs update, not duplicate, via dedupe_key):
- **`sheet`** — the workhorse: imports a founder-maintained Google Sheet/CSV (columns documented in `ingest/README.md`: kitchen name, chef name, phone, whatsapp, instagram, area, address hint, cuisines, dietary tags, veg profile, notes, source). Most early supply comes from founder legwork; this collector makes that scalable.
- **`instagram`** — given a founder-curated list of public profile handles, fetch public bio/contact/link data. Respect robots/ToS; degrade to manual-paste mode (founder pastes bio text, script parses) where automated fetch is blocked. No login-walled scraping, no evasion.
- **`justdial`** (and similar public directories) — parse public listing pages for home tiffin/food services in Bangalore, extracting name/phone/area. Throttled, cached responses, resumable.
- Collector contract documented so future sources are drop-in.

### 3. Normaliser (`ingest normalise`)
`ingest_raw` → `ingest_candidates.normalised` jsonb matching a `CandidateChef` Zod schema mirroring the `chefs` shape: cleaned kitchen/display names, **E.164 phone/whatsapp**, cuisine slugs mapped to seed cuisines (fuzzy match + `unmapped[]` for review), dietary tag slugs (veg/non_veg/halal/jhatka/jain/egg_free), neighbourhood matched to seed list, **approximate geocoded point** (neighbourhood centroid when no address — never fabricate precision), suggested unique slug, per-field `confidence` map, source attribution.

### 4. Dedupe
Before staging a candidate: match against existing candidates AND live chefs by normalised phone (strongest), then trigram name similarity within same neighbourhood. Matches mark candidate `needs_review` with `duplicate_of` in metadata rather than auto-discarding.

### 5. Promoter (`ingest promote`)
- `ingest promote --dry-run` prints a review table; `ingest promote --id <candidate>` (or `--all-clean`) inserts into `chefs` with `listing_source='scraped'`, `claimed_by=NULL`, **`status='pending_review'`** (admin approval in Phase 3 makes them public — never auto-approve), plus related `chef_cuisines`/`chef_dietary_tags`, marking the candidate `promoted` with `promoted_chef_id`.
- Menu data, when present in source, lands as `menu_items` marked `is_available=true` with prices only when explicitly known (never guessed).

### 6. Data ethics & hygiene (binding)
- Only public business information; we list businesses, not private persons. Phone numbers only when publicly advertised for taking orders.
- `source` + `source_url` retained end-to-end for provenance; unclaimed listing pages (Phase 1) already show the claim banner, and Phase 4's claim flow is the consent mechanism. A documented takedown path: `ingest delist <chef-id>` sets status `delisted` immediately.
- No scraping behind logins, no CAPTCHA evasion, no bulk personal-data harvesting.

### 7. Ops
- Optional GitHub Actions cron (weekly) for `collect` + `normalise` with summary output; `promote` stays human-triggered.
- `ingest stats` command: counts by source/status, unmapped cuisines, dedupe hits.

## Non-goals (do NOT build)
No admin UI (Phase 3 gets a candidate-review screen; this phase is CLI-only). No auto-approval to public. No photo scraping from Instagram (rights unclear — photos come from chefs at claim time). No WhatsApp-group scraping.

## Acceptance criteria
1. `sheet` collector: a 25-row founder CSV lands as 25 `ingest_raw` rows; re-run creates zero duplicates.
2. `normalise` produces schema-valid candidates: E.164 phones, mapped cuisine/tag slugs, neighbourhood + centroid geocode, no fabricated addresses/prices.
3. Dedupe: same phone in two sources → one `new` candidate + one `needs_review` with `duplicate_of`; a candidate matching a live chef's phone is flagged, not promoted.
4. `promote` creates a complete unclaimed chef that (after manual status flip to `approved`) renders correctly on its Phase 1 public page with claim banner.
5. Provenance query works: for any promoted chef, join back to exact `ingest_raw` source rows.
6. `delist` removes a chef from public rendering and sitemap within one revalidation.
7. All commands idempotent and re-runnable; README documents each command + the sheet column contract.

## Definition of done
Criteria pass; founder has run the sheet→promote flow themselves end-to-end on real Bangalore data; `docs/phase-2-notes.md` records deviations and lists sources actually used.
