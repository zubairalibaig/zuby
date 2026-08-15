# Phase 6 — Singapore enablement

## Context

Singapore is Zuby's second country — designed into the schema since Phase 0, activated now via **configuration and data, near-zero code** (`CONCEPT.md` → "Where Zuby operates"). The proposition leans into **premium halal**, where MUIS certification matters and the segment is underserved. Market differences: strict home-based food rules (SFA Home-Based Small Scale Business framework — no hired staff, no mass catering), small dense geography (radii of 2–5 km cover real service areas; island is ~50 km wide), SGD pricing, WhatsApp still ubiquitous. **Gate: this phase starts only on explicit founder go-decision after Bangalore metrics justify it.** If any step requires forking code paths per country, stop — that's an architecture bug to fix, not a pattern to extend.

## Prerequisites
Phases 0–5 live; Bangalore healthy; founder go. A local market contact (founder's sister is in Singapore) lined up for on-the-ground validation and first chef outreach.

## Scope

### 1. Data activation
- Flip `countries.is_active=true` for SG; verify currency (SGD), phone prefix (+65) flow through everywhere prices/phones render.
- Seed city **Singapore** (timezone `Asia/Singapore`) with planning-area "neighbourhoods": Tampines, Bedok, Jurong East, Woodlands, Punggol, Ang Mo Kio, Toa Payoh, Clementi, Hougang, Yishun (validate list with local contact; correct centroids).
- Seed SG-relevant cuisines if missing: malay, peranakan, indian-muslim, indonesian, middle-eastern (verify against existing list; extend via migration-safe seed).

### 2. Regulatory & trust surfacing (fields exist since Phase 0 — now render them)
- Chef profile + admin editor + chef dashboard show, for SG chefs only (driven by `country.code`, not hardcoded route logic — a per-country field-visibility config map): **SFA home-based business compliance** self-declaration (with link to SFA guidelines) and **MUIS halal certification** flag + cert number where held.
- India-only fields (FSSAI) hidden for SG chefs; SG fields hidden for India — same config map, proving the pattern for country #3.
- Admin verification checklist for SG (documented in queue UI): SFA framework fit (home kitchen, no staff, no bulk), MUIS cert visual check when claimed.
- `/trust` page gains a Singapore section.

### 3. Halal-first presentation for SG
- SG city landing leads with halal positioning (copy module, country-keyed); `/singapore/halal` and MUIS-certified filter ("MUIS-certified only" toggle appears only in SG contexts) prominent in search.
- Dietary tag surface for SG: halal (with MUIS distinction), plus veg/egg-free; **jhatka/jain de-emphasised by country config, not removed** (same config map).

### 4. Localisation touches (not multi-language — English UI stays)
- Currency formatting (`S$12` vs `₹120`) via one `formatPrice(amount, currency)` helper — audit every price render uses it.
- Phone/WhatsApp validation accepts +65; wa.me links country-agnostic (already E.164 — verify).
- Distance copy sanity for dense geography (default search radius 3 km in SG vs 5 km in India — per-city config column via migration `cities.default_radius_km`).
- Timezone correctness in timings display and admin timestamps.

### 5. SEO for SG
- `/singapore/...` routes work identically (they should already — this is the payoff test of the architecture); sitemap includes SG once ≥ 1 approved chef; JSON-LD emits correct `addressCountry`/currency; GSC geo-targeting reviewed; seed programmatic pages respect the 2-chef threshold as ever.

### 6. Launch support
- Seed supply: sister-assisted founder outreach list → Phase 2 `sheet` collector (works unchanged — verify with SG-format data); demo/staging SG chefs for QA, removed before launch.
- `docs/singapore-playbook.md`: regulatory summary (SFA framework, MUIS), outreach approach, differences cheat-sheet for admins.

## Non-goals (do NOT build)
No PayNow/payments (still V1-scope-frozen). No delivery. No Mandarin/Malay/Tamil UI. No SG-specific app fork of any kind. No third country. No MUIS API integration (visual cert check only).

## Acceptance criteria
1. `zuby.food/singapore` and full page tree render from seed data with zero code changes to routing/components (config + data only, except the field-visibility map and `formatPrice` audit).
2. SG chef end-to-end: created via dashboard with +65 phone → SFA/MUIS fields visible → admin queue shows SG checklist → approve → public page shows SGD prices, MUIS badge, correct JSON-LD country, "~1.2 km" distances; wa.me opens correctly to a +65 number.
3. India pages show zero SG artefacts and vice-versa (FSSAI vs SFA/MUIS, ₹ vs S$, radius defaults) — verified by checklist on both countries' key pages.
4. MUIS-only filter works in SG search; jhatka absent from SG filter UI but data model untouched.
5. Grep-level audit: no `'IN'`/`'bangalore'`/`'₹'` literals in components (config/data only); price formatting 100% through helper.
6. Phase 2 sheet collector ingests an SG-format test sheet correctly (E.164 +65, SG neighbourhoods, SGD).
7. Sitemap/GSC: SG URLs appear only when the chef threshold is met; no thin pages.

## Definition of done
Criteria pass in production behind the data flag; first real SG chef approved and live; `docs/phase-6-notes.md` records deviations **and a retrospective on what the multi-country architecture got right/wrong** — that retro is the design input for country #3.
