# Phase 4 — Chef auth, claim flow & self-serve dashboard

## Context

Zuby's supply engine: chefs discover their scraped listing (or arrive via `/for-chefs`), **claim it or create their own**, and manage everything themselves — timings, menu, photos, prices, nutrition, best-sellers, dietary tags. Read `CONCEPT.md`, `ARCHITECTURE.md`, `CLAUDE.md` first. Audience note: many chefs are non-technical, mobile-only users — every flow must work beautifully on a low-end Android phone, in simple English, with WhatsApp-number-first thinking. Nothing a chef does goes public without admin approval (Phase 3 queue).

## Prerequisites
Phases 0–3 merged and live. Supabase Auth **email OTP** (magic-code, no password) configured as the primary sign-in method, plus **Google OAuth** as secondary. Resend (or Supabase's built-in email) sends the OTP codes — no SMS provider, no Twilio, no DLT registration. (Earlier drafts of this prompt specified phone-OTP login; that was dropped deliberately — see "Why not phone-OTP login" below.)

## Scope

### 1. Chef auth
- `/login` — **email address + one-time code** primary (enter email → 6-digit code sent → enter code, no password ever), **Google** secondary. Post-login: has claimed/created chef → `/dashboard`; else → onboarding chooser: **"Find my kitchen"** (claim) or **"List my kitchen"** (create).
- Email is the login identity; it proves nothing about the kitchen's WhatsApp number. That's what the claim flow below is for.

### 2. Claim flow ("Is this your kitchen?")

Why not phone-OTP login: SMS OTP in India needs DLT (Distributed Ledger Technology) template registration with a telecom operator plus a paid SMS provider (Twilio, MSG91) — real recurring cost and real signup friction for a pre-revenue product. Email OTP + Google are free on Supabase's free tier and need no registration. The trade-off: logging in no longer *proves* the chef controls the kitchen's WhatsApp number the way an SMS OTP would have, so claiming can no longer auto-approve instantly on login alone. Every claim gets a quick human check — which is exactly the trust posture `CONCEPT.md` already commits to ("every chef is human-reviewed"), so this isn't a new burden on the admin queue, just one more thing it checks.

- Public chef pages' claim banner (Phase 1) links to `/claim/[chefId]`.
- **Fast path — WhatsApp self-verification (no SMS, no cost):** the chef taps "Verify with WhatsApp." This opens a `wa.me` deep link (same mechanism as the buyer-facing order button) addressed to Zuby's own WhatsApp number, pre-filled with a short generated code and the listing's slug — e.g. "Hi, I'm claiming aishas-biryani on Zuby. Code: ZUBY-4821." The chef just hits Send from the kitchen's own phone. Because the message arrives *from* that phone number, the admin can see in WhatsApp that the sender's number matches `chefs.whatsapp_e164` for that listing — strong proof of ownership, entirely free, no API integration needed (the founder reads it like any other WhatsApp message; a Business API webhook to automate the match is a backlog item, not V1). The claim shows in the Phase 3 admin inbox with the generated code and a "does the sender's number match?" prompt — one click to approve. Typically same-day, not instant, and that's an accepted trade-off for zero SMS cost.
- **Manual path** (no matching WhatsApp number, or the chef prefers it): short form (name, role, proof note, optional photo evidence) → `claims` row `pending` → same Phase 3 admin inbox → decision notified via email (when known) and shown in dashboard. Claiming never alters public content by itself — approval only ever changes `claimed_by`.
- "Find my kitchen" search: by kitchen name/phone across unclaimed listings in the chef's city.

### 3. Create new listing
- Stepper (each step savable, resumable, `status='draft'`): ① kitchen name + chef name + city/neighbourhood, ② location (map pin with "use my location" + drag; plain-language service-radius picker: "How far will you deliver? 2 / 5 / 10 km") + area text, ③ contact (WhatsApp number entered directly — nothing to prefill, since login no longer implies a phone number; validate as E.164-convertible before allowing next), ④ cuisines + dietary profile + dietary tags (veg/non_veg/halal/jhatka/jain/egg_free explained in plain words), ⑤ FSSAI number (14-digit format validation; "Don't have one? Here's how to get it" help section — listing can be submitted without it but shows as incomplete and admins may hold approval), ⑥ photos, ⑦ menu (below), then **Submit for review** → `pending_review` → Phase 3 queue.

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
1. Email-OTP login works with a real email address (code arrives, no password anywhere); Google login works.
2. **WhatsApp self-verification claim:** tapping "Verify with WhatsApp" on a seeded unclaimed listing opens a correctly pre-filled `wa.me` link with a generated code; the resulting claim appears in the Phase 3 admin inbox showing that code; approving it sets `claimed_by` and writes the audit row. The manual-proof path also creates a pending claim that Phase 3 can approve, and the decision email arrives.
3. Create-listing stepper: a non-technical tester completes it on a phone in under 10 minutes; draft survives abandoning and resuming; submit lands in admin queue.
4. Menu: best-seller cap of 3 enforced; availability/price/best-seller changes hit the public page within a minute without admin involvement; adding nutrition renders on the public item.
5. Trust-field edit: public page continues serving old values, admin queue shows a diff (Phase 3 view), approval applies pending edits and revalidates.
6. Vacation mode reflects on public page; timings render correctly ("Order by 9 PM").
7. RLS verified: a chef cannot read or write another chef's rows, cannot touch `status`/`is_verified`/`fssai_verified_*` directly (attempt via forged request fails at the database).
8. Stats numbers match `events` table counts; Lighthouse mobile on `/dashboard` ≥ 85 performance.

## Definition of done
Criteria pass in production; at least 2 real Bangalore chefs have claimed or created listings end-to-end; `docs/phase-4-notes.md` records deviations.
