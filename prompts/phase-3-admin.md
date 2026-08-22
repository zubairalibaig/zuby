# Phase 3 — Admin panel (verification queue & ops)

## Context

Zuby's trust moat is that **no chef appears publicly without human approval** — read `CONCEPT.md` ("The trust and safety story"), `ARCHITECTURE.md`, `CLAUDE.md` first. Phases 1–2 delivered the public site and a pipeline producing `pending_review` listings. This phase gives the Zuby team (initially just the founder) the tools to review, approve, edit, and audit everything. Function over form: this is an internal tool — shadcn defaults, dense tables, fast keyboard-friendly workflows.

## Prerequisites
Phases 0–2 merged. Founder's email present in `admins` table.

## Scope

### 1. Auth & access
- `/admin/**` behind Supabase Auth (Google login). Middleware: authenticated AND in `admins` table, else 404 (not a login hint). Admin RLS policies from Phase 0 now exercised for real.

### 2. Verification queue — `/admin/queue`
- Table of `pending_review` chefs (oldest first): kitchen name, area, source (scraped/self_signup/claimed), submitted date, completeness indicators (has photo? FSSAI? menu? whatsapp?).
- Detail view: every field, photos, menu, map pin of claimed location vs. stated area, links to `source_url` provenance for scraped listings, side-by-side diff of pending edits vs. last-approved values when applicable.
- Actions, each requiring a note and writing `verification_log`:
  - **Approve** → `status='approved'`, sets `is_verified`, `verified_at/by`; triggers ISR revalidation of the chef page + affected listing pages (use Phase 1's revalidation hook).
  - **Reject** (reason recorded), **Request info** (reason recorded; surfaced to chef in Phase 4), **Suspend**/**Delist** for live chefs.
  - FSSAI check sub-step: admin visually verifies the 14-digit number format and marks `fssai_verified_at/by` (manual in V1 per concept — no API call).

### 3. Listing editor — `/admin/chefs`
- Search/filter all chefs (status, source, neighbourhood, claimed/unclaimed).
- Full edit of any listing: profile fields, location pin (map picker writing `geography` point), service radius, timings (structured weekly editor validating the Phase 0 Zod schema), cuisines, dietary tags (veg/non_veg/halal/jhatka/jain/egg_free), menu CRUD (name, price+currency, unit, veg/non-veg/egg, best-seller flag, availability, nutrition fields), photo upload to Supabase Storage (client-side resize to sane max, kind: kitchen/food/chef).
- Admin edits do NOT flip status to pending (admins are the approvers); every edit still logs to `verification_log` with `action='edited'` (add enum value via migration if missing).
- "Create chef manually" — same form, for phone/WhatsApp onboarding where founder does data entry.

### 4. Ingest candidate review — `/admin/ingest`
- Web UI over Phase 2's promoter: list `ingest_candidates` by status; detail shows normalised fields + confidence + raw source; actions: promote (→ pending_review chef), edit-then-promote, discard, merge-into-existing (for dupes). Replaces CLI promotion for daily use.

### 5. Claims inbox — `/admin/claims` (build UI now, traffic arrives in Phase 4)
- List `claims` with chef + claimant details and proof note. For a WhatsApp self-verification claim (Phase 4), the proof note carries the generated code and the listing's own `whatsapp_e164` — the admin's job is a 10-second visual check: does that code appear in a WhatsApp message actually received from that number? Approve (links `chefs.claimed_by`, logs `claim_approved`) or reject with reason either way. Approving a claim does not auto-approve content changes — those still queue.

### 6. Ops dashboard — `/admin` home
- Counts: approved/pending/unclaimed chefs, claims pending, candidates awaiting review; last-7-days `wa_click` and `profile_view` totals and top-5 chefs by clicks (plain SQL over `events`, no chart library needed — numbers and simple bars).

## Non-goals (do NOT build)
No chef-facing anything (Phase 4). No roles/permissions beyond the single admin allow-list (no editor/moderator tiers). No bulk-approve (deliberate: verification is per-chef human review). No FSSAI API integration. No email notifications to chefs yet (Phase 4 handles chef comms).

## Acceptance criteria
1. Non-admin authenticated user gets 404 on `/admin`; admin gets in via Google login.
2. Full loop works on production data: scraped candidate → promote → appears in queue → approve with note → public page live within a minute (ISR revalidated) → `verification_log` shows the full trail with admin identity.
3. Reject and request-info paths persist reasons; suspended chef disappears from public site + sitemap on next revalidation.
4. Editor round-trips every field: timings validate, menu items with nutrition + best-seller flags render correctly on the public page, photo upload → Storage → public page.
5. Map pin edit updates `location` and `search_chefs` results reflect it.
6. Claims inbox approves a test claim and `claimed_by` is set; audit row written.
7. All admin mutations verified server-side (RLS + server actions) — no client-trusted writes; typecheck/lint green.

## Definition of done
Criteria pass in production; the founder has personally approved at least 5 real scraped listings through the queue; `docs/phase-3-notes.md` records deviations. **Bangalore soft-launch is unblocked after this phase.**
