# Phase 5 — SEO & growth hardening

## Context

Zuby's growth engine is organic search, not paid ads — the 60-day goal is first-page Google rankings for long-tail queries like "biryani home chef Koramangala" and "jain tiffin service HSR Layout" (`CONCEPT.md` → success metrics). Phases 1–4 are live with real chefs. This phase scales the SEO surface programmatically, hardens performance, ships the PWA, and gives the founder visibility into the four launch KPIs. No new product features — this is compounding-traffic work.

## Prerequisites
Phases 0–4 live in production with ≥ 15 approved chefs (enough real content that programmatic pages aren't thin).

## Scope

### 1. Programmatic landing pages at scale
- **Neighbourhood × cuisine:** `/bangalore/[neighbourhood]/cuisine/[cuisine]` — generated ONLY where ≥ 2 approved chefs match (thin/empty combinatorial pages hurt rankings; enforce the threshold in `generateStaticParams` and sitemap).
- **Dietary landings:** `/bangalore/halal`, `/bangalore/veg`, `/bangalore/jain`, `/bangalore/jhatka`, `/bangalore/egg-free` and neighbourhood variants (same ≥ 2-chef threshold) — these serve Zuby's underserved-audience thesis directly.
- **Intent pages:** `/bangalore/tiffin-service`, `/bangalore/home-cooked-food` — editorial intro + live listings.
- Each page: unique H1/title/description from templates with real variables (chef count, cuisine, area), 2–3 sentences of genuinely informative editorial copy per cuisine and per dietary tag (written once in the copy module, composed per page — no AI-fluff paragraphs), `ItemList` + `BreadcrumbList` JSON-LD, cross-links (neighbourhood ↔ cuisine ↔ dietary) so link equity flows.
- FAQ blocks with `FAQPage` JSON-LD on city + intent pages ("How do I order?", "Is the food safe?" — answers reflect the trust stack).

### 2. Technical SEO hardening
- Google Search Console + Bing Webmaster verification; submit sitemaps; document the weekly GSC review ritual in `docs/seo-playbook.md` (queries, coverage errors, what to do).
- Sitemap split by type (chefs/areas/cuisines) with `lastmod` from `updated_at`; auto-ping on revalidation.
- Audit: every page has exactly one H1, canonical, no orphan pages (every chef reachable ≤ 3 clicks from home), internal 404 sweep, redirect map for any changed URLs (301s in `next.config`).
- Structured-data validation in CI: a build step that renders key page types and validates JSON-LD against schema.org (fail build on invalid).

### 3. Performance budget
- Targets (mobile, throttled): LCP < 2.0 s, CLS < 0.05, INP < 200 ms on home/city/chef/search. Enforce via Lighthouse CI in GitHub Actions with budgets file — regressions fail the PR.
- Image audit: all photos through transform pipeline with correct sizes/srcset; fonts self-hosted + `font-display: swap`; JS budget — no new dependency > 20 kB gzipped on public routes without founder sign-off.

### 4. PWA
- Manifest (name, icons, theme), installability on Android, service worker with conservative caching (static assets + app shell only — NEVER cache chef data or search results stale). "Add Zuby to your home screen" prompt after second visit.

### 5. KPI dashboard — `/admin/metrics`
The four launch metrics from `CONCEPT.md`, from the `events` table + chef counts, weekly granularity with 8-week trend:
1. Verified chef count (+ pending pipeline)
2. Unique weekly visitors (approximate: distinct daily visitor-hash in events, plus Vercel Analytics for cross-check)
3. Weekly `wa_click` count — with breakdowns by neighbourhood, cuisine, dietary tag, and top chefs (this tells outreach where to recruit supply)
4. Manual-entry table for GSC ranking wins (query, page, position, date) until API automation post-V1.

### 6. Launch-support odds & ends
- `/about` and `/trust` pages (the trust story, verification process — link targets for outreach and press).
- WhatsApp share button on chef pages ("Share this kitchen") with UTM-tagged URL; `wa_click` message template A/B hook (config-switchable template, event-tagged) — build the switch, run tests post-launch.

## Non-goals (do NOT build)
No paid ads integration, no blog/CMS (post-V1 — editorial copy lives in the copy module), no multi-language, no reviews, no email marketing, no GSC API automation, no A/B framework beyond the single template switch.

## Acceptance criteria
1. Programmatic pages generate only above the 2-chef threshold; sitemap contains no thin/empty pages; spot-check 5 pages in Rich Results test — all valid.
2. Lighthouse CI enforcing budgets is green on home/city/chef/search; failing budget demonstrably fails a test PR.
3. PWA installs on a real Android device; offline visit shows app shell + friendly offline note, never stale chef data.
4. GSC verified, sitemaps submitted, zero coverage errors on indexed pages after first crawl cycle.
5. `/admin/metrics` shows all four KPIs with correct numbers (validated against raw SQL), weekly trend, and wa_click breakdowns.
6. Internal-link audit passes: no orphan chef pages; crawl (e.g. `linkinator`) reports zero broken internal links.
7. `docs/seo-playbook.md` exists with the weekly ritual + query targets per neighbourhood/cuisine.

## Definition of done
Criteria pass in production; founder completes one weekly GSC ritual using the playbook; `docs/phase-5-notes.md` records deviations. Post-launch growth iteration proceeds on data, not new features.
