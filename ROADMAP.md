# Zuby — Phased Build Roadmap

> The MVP is built in **seven phases**, each with a self-contained build prompt in `prompts/`.
> Rules: build one phase at a time, in order. A phase is complete only when its acceptance criteria pass. Never pull later-phase work forward. Never refactor earlier phases mid-phase unless the prompt says so. This is how we avoid re-coding and compounding bugs.

## Why phases, and how to use the prompts

Each `prompts/phase-N-*.md` file is written as a standalone instruction set for an AI coding session (or a human contractor): it carries its own context, exact scope, explicit non-goals, and acceptance criteria. Start a session, point it at `CLAUDE.md` + the phase prompt, and build. One phase ≈ one branch ≈ one PR.

## The phases

| # | Phase | Delivers | Depends on |
|---|---|---|---|
| 0 | [Foundation](prompts/phase-0-foundation.md) | Next.js scaffold, Supabase project, full DB schema + PostGIS + RLS, seed data, CI, deploy pipeline to zuby.food | — |
| 1 | [Public directory](prompts/phase-1-public-directory.md) | Read-only buyer site: city/neighbourhood/cuisine pages, chef profiles, geo "near me" search, filters, WhatsApp CTA + click tracking, SEO/JSON-LD/sitemap | 0 |
| 2 | [Ingestion pipeline](prompts/phase-2-ingestion.md) | `/ingest` scrapers → staging tables → normalise/dedupe → promote to unclaimed listings | 0 (parallel with 1) |
| 3 | [Admin panel](prompts/phase-3-admin.md) | Verification queue, approve/reject with audit log, listing editor, ingest-candidate review, claims inbox | 1, 2 |
| 4 | [Chef auth, claim & self-serve](prompts/phase-4-chef-dashboard.md) | Chef login (email OTP/Google), claim-your-listing flow (WhatsApp self-verification), create new listing, manage menu/photos/timings/prices/nutrition/tags/best-sellers | 3 |
| 5 | [SEO & growth hardening](prompts/phase-5-seo-growth.md) | Programmatic landing pages at scale, metadata polish, PWA install, performance budget, analytics dashboards on `events` | 1–4 live |
| 6 | [Singapore enablement](prompts/phase-6-singapore.md) | Activate SG: cities/areas seed, SGD, SFA/MUIS surfacing, halal-first positioning — config + data, near-zero code | 5 + founder go |

## Sequencing notes

- **Phases 1 and 2 can run in parallel** (different surfaces: web app vs. scripts). Everything else is strictly sequential.
- **Launchable milestone = end of Phase 3.** With seeded, admin-approved listings and the public directory live, Bangalore launch can happen while Phase 4 is being built. Phase 4 turns launch traffic into claimed listings.
- **Phase 6 does not start** until Bangalore metrics (see `CONCEPT.md` → "Success in the first 60 days") justify it and the founder says go.

## Parked (post-V1) — log ideas here, do not build them

Payments (Razorpay/HitPay/PayNow) · delivery (Genie/Porter/Dunzo/Pickupp) · order state machine, cart, checkout · in-app chat · ratings & reviews (schema anticipates) · subscriptions/meal plans · corporate catering · native apps · multi-language UI · programmatic FSSAI verification API.
