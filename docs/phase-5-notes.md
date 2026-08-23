# Phase 5 — SEO & growth hardening

Built against `prompts/phase-5-seo-growth.md`, inside the frame set by
`docs/discoverability-strategy.md` (written first, as the long-horizon plan).

## What shipped

### Programmatic landing pages

| Route | Threshold | Notes |
|---|---|---|
| `/[city]/[neighbourhood]/cuisine/[cuisine]` | ≥2 chefs | Cuisine within a neighbourhood |
| `/[city]/diet/[dietary]` | ≥2 chefs | Dietary category city-wide, with FAQ |
| `/[city]/[neighbourhood]/diet/[dietary]` | ≥2 chefs | Dietary within a neighbourhood |
| `/[city]/tiffin-service` | ≥2 chefs | Intent page, editorial + FAQ |
| `/[city]/home-cooked-food` | ≥2 chefs | Intent page, editorial + FAQ |

The threshold lives in exactly one place — `MIN_CHEFS_FOR_LANDING` in
`src/lib/seo/landings.ts` — and is imported by `generateStaticParams`, the page
bodies, `generateMetadata` and the sitemap. Below it, a page 404s: not a thin
page, not an empty state. `generateMetadata` also returns `noindex` below
threshold, so a page can never advertise itself into an index and then 404.

Every generated page carries a count-bearing H1, composed editorial copy, the
listings, cross-links to siblings, and `ItemList` + `BreadcrumbList` JSON-LD.
All four types render through one shared `LandingPage` component so the
structure can't drift between them.

### Editorial content

`src/lib/copy/landing.ts` — 15 cuisine blurbs, 7 dietary explainers, 7
neighbourhood contexts, 2 intent-page intros, a 6-question city FAQ, and the
title/description builders. Written by hand, composed per page. This is the part
of a generated page a competitor with our schema could not reproduce, and the
part answer engines preferentially quote.

### Technical SEO

- **robots.txt** rewritten: private surfaces blocked (`/admin`, `/dashboard`,
  `/claim`, `/login`, `/auth`, `/api`, `/search`), and 13 AI crawlers explicitly
  allowed. Listed by name rather than left to the wildcard so the decision is
  auditable.
- **Split sitemaps** — `sitemap.xml` (static + city/neighbourhood/cuisine),
  `sitemap-chefs.xml` (profiles, real `lastmod` from `updated_at`),
  `sitemap-areas.xml` (landing pages, built from the same `qualifying*` helpers
  the routes use, so it can never advertise a URL that 404s).
- **`llms.txt`** — site map for language models, with live chef counts.
- **JSON-LD** — added `FAQPage`, `Organization` and `WebSite`+`SearchAction`.
  Organization and WebSite emit once from the root layout, not per page.
- **Cross-links on chef profiles** — every profile now links to its
  neighbourhood, its cuisines-in-neighbourhood pages and its dietary pages, so
  no profile is an orphan and equity flows both ways.

### PWA

Manifest, icons, and a service worker that is deliberately conservative:
cache-first for content-hashed static assets, network-first for navigations with
an honest offline page as the only fallback, and **no caching of chef data,
menus, prices or availability** — a chef shown as open when they've closed is a
broken promise, and stale HTML would be worse than being offline.

### `/admin/metrics`

Migration `20260815000013_metrics.sql` adds `admin_metrics(p_weeks)` and a
`ranking_wins` table. The page shows the four `CONCEPT.md` KPIs against their
day-60 targets, an 8-week trend, and wa_click breakdowns by neighbourhood,
cuisine, dietary tag and chef.

The panel that earns its place is **"Recruit here next"** — neighbourhoods where
WhatsApp intent is high relative to how many chefs we list. That turns the
metrics page from a report into an instruction for chef outreach.

### Other

- `/about` and `/trust` — link targets for outreach and press. `/trust` carries
  `FAQPage` JSON-LD and is explicit about what we *don't* do (no kitchen
  inspections, no supply-chain audits).
- **Share button** on chef pages — WhatsApp-first with UTM tagging, Web Share
  API where available.
- **`npm run seo:validate`** in CI — 7 invariant checks including "the threshold
  is defined once and is ≥2" and "every landing route calls `qualifies()` and
  `notFound()`". A future edit that weakens the threshold fails the build.

## Validation

Typecheck, lint, format, build and `seo:validate`: all clean.

Database work verified against a real PostGIS 16 instance with all 13 migrations
applied from scratch and the demo seed loaded:

| Check | Result |
|---|---|
| All 13 migrations apply from scratch | pass |
| `admin_metrics` returns the full KPI object | pass |
| RPC weekly sums vs raw SQL (140 wa_clicks, 105 views) | exact match |
| Dietary breakdown vs raw SQL (40 halal clicks) | exact match |
| `authenticated` role reading `events` directly | correctly denied — only the SECURITY DEFINER RPC can |
| **Threshold across 105 neighbourhood × cuisine combos** | **2 qualify; 31 single-chef and 72 empty correctly excluded** |

That last row is acceptance criterion 1, and it is the one that matters most: of
105 possible combinations, 103 would have been thin or empty pages. All 103 are
excluded from generation, from linking and from the sitemap.

## Deviations from the prompt

1. **Dietary pages live at `/[city]/diet/[tag]`, not `/[city]/[tag]`.** The
   prompt specifies `/bangalore/halal`. That URL sits in the same routing slot as
   `/[city]/[neighbourhood]`, and the neighbourhood-level variant
   (`/bangalore/koramangala/halal`) collides directly with the chef profile route
   `/[city]/[neighbourhood]/[chef]`. Resolving those by branching inside the
   route would let a dietary slug shadow a real chef page — and chef profiles are
   the crown jewels. The `/diet/` prefix mirrors the `/cuisine/` prefix already
   shipped in Phase 1, removes the ambiguity entirely, and costs almost nothing:
   exact-match keywords in URL paths are a very weak ranking signal, and the H1,
   title and content carry the query.
2. **Intent pages use literal route segments** (`/[city]/tiffin-service`), which
   gives exactly the URLs the prompt asks for with no shadowing risk, since
   Next.js matches static segments before dynamic ones.
3. **Lighthouse CI is not wired.** The budgets are documented in the playbook's
   monthly ritual and the targets are unchanged, but a CI Lighthouse job needs a
   deployed preview URL with a populated database to measure anything meaningful
   — against an empty build it would measure a skeleton and pass trivially.
   Better as a post-deploy check once there is real content. Flagged rather than
   faked.
4. **PWA icons are generated placeholders** — a brand-coloured mark, not designed
   art. Replace `public/icon-*.png` when real artwork exists.
5. **`linkinator` broken-link crawl not run** — same reason as Lighthouse: needs
   a deployed URL with data. The orphan-page half of criterion 6 is addressed
   structurally by the chef-profile cross-links.

## Still needs production

- GSC and Bing verification, sitemap submission (steps in `docs/seo-playbook.md`).
- Rich Results spot-check on five live pages.
- Lighthouse mobile against real content.
- PWA install test on a real Android device.
- The first weekly GSC ritual.

## Sequencing note

The threshold means the landing-page surface is currently **small on purpose** —
with 7 demo chefs only 2 combinations qualify. This is correct behaviour, not
under-delivery: the surface grows automatically as chefs are verified, with no
code change. The gate on it is supply, which is exactly what
`docs/discoverability-strategy.md` §1 argues it should be.
