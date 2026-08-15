# Phase 4 — Chef auth, claim flow & self-serve dashboard

## Context

Zuby's supply engine: chefs discover their scraped listing (or arrive via `/for-chefs`), **claim it or create their own**, and manage everything themselves — timings, menu, photos, prices, nutrition, best-sellers, dietary tags. Read `CONCEPT.md`, `ARCHITECTURE.md`, `CLAUDE.md` first. Audience note: many chefs are non-technical, mobile-only users — every flow must work beautifully on a low-end Android phone, in simple English, with WhatsApp-number-first thinking. Nothing a chef does goes public without admin approval (Phase 3 queue).

## Prerequisites
Phases 0–3 merged and live. Supabase Auth phone provider configured (SMS OTP; founder provisions Twilio/MSG91 on Supabase's free-tier allowance) plus Google OAuth as secondary.

## Scope

### 1. Chef auth
- `/login` — phone number + OTP primary (chefs' identity IS their phone), Google secondary. Post-login: has claimed/created chef → `/dashboard`; else → onboarding chooser: **"Find my kitchen"** (claim) or **"List my kitchen"** (create).

### 2. Claim flow ("Is this your kitchen?")
- Public chef pages' claim banner (Phase 1) now links to `/claim/[chefId]`.
- **Fast path — phone match:** logged-in user's verified phone equals the listing's `phone_e164`/`whatsapp_e164` → claim auto-approved instantly (OTP already proved ownership): `claimed_by` set, `listing_source='claimed'`, `verification_log` row. This should be the majority case and it's the magic moment — make it feel like one.
- **Manual path:** numbers don't match → short form (name, role, proof note, optional photo evidence) → `claims` row `pending` → Phase 3 admin inbox → decision notified via Resend email (when email known) and shown in dashboard. Claiming never alters public content by itself.
- "Find my kitchen" search: by kitchen name/phone across unclaimed listings in the chef's city.

### 3. Create new listing
- Stepper (each step savable, resumable, `status='draft'`): ① kitchen name + chef name + city/neighbourhood, ② location (map pin with "use my location" + drag; plain-language service-radius picker: "How far will you deliver? 2 / 5 / 10 km") + area text, ③ contact (WhatsApp number — prefilled from login phone), ④ cuisines + dietary profile + dietary tags (veg/non_veg/halal/jhatka/jain/egg_free explained in plain words), ⑤ FSSAI number (14-digit format validation; "Don't have one? Here's how to get it" help section — listing can be submitted without it but shows as incomplete and admins may hold approval), ⑥ photos, ⑦ menu (below), then **Submit for review** → `pending_review` → Phase 3 queue.

### 4. Dashboard — `/dashboard`
- **Status card:** live / under review / changes requested (with admin's note from `verification_log`) / rejected; link to public page.
- **Menu manager** (the most-used screen — optimise ruthlessly for mobile): add/edit/reorder items; per item: name, description, photo, price (+ currency from city), unit, veg/non-veg/egg, **best-seller toggle (max 3 enforced)**, availability toggle, optional nutrition (calories/protein/carbs/fat per serving) behind an "Add nutrition info" expander. Availability + best-seller + price edits apply **immediately** (they're not trust fields — revalidate ISR directly); name/description/new-item changes follow the trust-field rules below.
- **Timings editor:** weekly grid + order-cutoff per day ("Take orders until 9 PM for next-day delivery"), writing the Phase 0 timings schema. Vacation mode toggle (sets all-closed flag; public page shows "Currently on a break").
- **Photos manager:** upload (client-side compress), reorder, set cover, kind tagging.
- **Profile editor:** bio, cuisines, tags, radius, area. Trust-relevant fields (per Phase 0 trigger: name, FSSAI, address, phone, WhatsApp, location) flip status to `pending_review` on change — the UI must say so *before* saving: "Changing this needs a quick re-check by Zuby. Your page stays live with the old details until approved." (Public page keeps serving last-approved values — implement via the pending-edits pattern: store pending values in a `chef_pending_edits` jsonb column via migration, applied on admin approve.)
- **My stats:** last-30-days profile views + WhatsApp clicks from `events` — chefs seeing "27 people tapped WhatsApp this month" is the retention hook.

### 5. Comms
- Resend emails (when chef email known): claim decision, listing approved (with public URL to share), changes requested. Keep copy short and warm; every email includes the chef's public URL.

## Non-goals (do NOT build)
No payments/orders/chat (WhatsApp is the channel). No reviews. No multi-user kitchens (one auth user per chef). No chef-facing Singapore fields yet. No in-app FSSAI verification API. No push notifications.

## Acceptance criteria
1. Phone-OTP login works on a real Indian number; Google login works.
2. **Phone-match claim:** logging in with the same number as a seeded unclaimed listing and tapping claim links it instantly, with audit row; mismatch path creates a pending claim that Phase 3 inbox can approve, and the decision email arrives.
3. Create-listing stepper: a non-technical tester completes it on a phone in under 10 minutes; draft survives abandoning and resuming; submit lands in admin queue.
4. Menu: best-seller cap of 3 enforced; availability/price/best-seller changes hit the public page within a minute without admin involvement; adding nutrition renders on the public item.
5. Trust-field edit: public page continues serving old values, admin queue shows a diff (Phase 3 view), approval applies pending edits and revalidates.
6. Vacation mode reflects on public page; timings render correctly ("Order by 9 PM").
7. RLS verified: a chef cannot read or write another chef's rows, cannot touch `status`/`is_verified`/`fssai_verified_*` directly (attempt via forged request fails at the database).
8. Stats numbers match `events` table counts; Lighthouse mobile on `/dashboard` ≥ 85 performance.

## Definition of done
Criteria pass in production; at least 2 real Bangalore chefs have claimed or created listings end-to-end; `docs/phase-4-notes.md` records deviations.
