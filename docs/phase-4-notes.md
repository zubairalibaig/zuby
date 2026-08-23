# Phase 4 — Chef Auth, Claim Flow & Self-Serve Dashboard

## What shipped

### Authentication
- **Email OTP login** (`/login`) — `signInWithOtp` + `verifyOtp` via Supabase Auth. No passwords, no phone SMS (India DLT cost issue). 6-digit numeric code, auto-redirect on success.
- **Google OAuth** — secondary login method via `signInWithOAuth` + redirect callback at `/auth/callback`.
- **Chef auth layer** (`src/lib/chef/auth.ts`) — `requireChefPage()` for pages, `requireChefAction()` for server actions, `getAuthUser()` for lighter checks (claim page).

### Claim flow
- **Find my kitchen** (`/dashboard/find`) — search unclaimed listings by kitchen name via `/api/search-unclaimed` route.
- **Claim page** (`/claim/[chefId]`) — two paths:
  1. **WhatsApp self-verification**: generates a code (`ZUBY-{chefId prefix}`), opens wa.me deep link to the founder's number. Admin manually matches the sender's phone to verify.
  2. **Manual proof form**: free-text proof note + optional phone. Creates a `claims` row with status=pending for admin review.
- **Unclaimed banner updated** — chef profile pages now link to `/claim/{id}` instead of `/for-chefs`.
- **For-chefs page updated** — now links to `/login` instead of founder WhatsApp.

### Create listing stepper
- **7-step stepper** (`/dashboard/create`): Kitchen info → Location → Contact → Cuisines & dietary → FSSAI → Photos → Menu → Submit for review.
- Creates a draft chef row on step 0, saves fields progressively via `saveChefDraft()`.
- Client-side image resize (1200px max, JPEG 85%) before Supabase Storage upload.
- Submits for review via `submitForReview()` which flips status to `pending_review`.

### Self-serve dashboard
- **Layout** (`/dashboard/layout.tsx`) — nav bar with Overview/Menu/Timings/Photos/Profile tabs, auth gate, email display, sign-out button.
- **Overview** (`/dashboard`) — status card with colour-coded badge, admin notes for pending_review, pending edits banner, stats (WhatsApp clicks + profile views), quick-link cards.
- **Menu editor** (`/dashboard/menu`) — full CRUD with inline edit/add forms, best-seller cap (3 max, enforced client + server), dietary icons, availability toggle, unit selector.
- **Timings editor** (`/dashboard/timings`) — weekly grid with open/close/order-cutoff per day, vacation mode toggle.
- **Photo manager** (`/dashboard/photos`) — upload with client-side resize, set cover photo, delete. Max 8 photos.
- **Profile editor** (`/dashboard/profile`) — trust fields (display name, WhatsApp, FSSAI) with warning banner for approved chefs, safe fields (bio, area, Instagram, radius, dietary profile), cuisine and dietary tag toggles.

### Trust-field pending-edits pattern
- Approved chefs' changes to trust-relevant fields (display_name, fssai_number, address, phone, whatsapp, location) are stored in `pending_edits` jsonb column — NOT applied directly.
- Non-trust fields (bio, menu, timings, photos, availability) apply immediately with ISR revalidation.
- Admin approves via `admin_apply_pending_edits()` RPC which merges edits into main columns and clears the pending_edits.

### Database migration
- `supabase/migrations/20260815000012_chef_dashboard.sql`:
  - `pending_edits jsonb` column on chefs table
  - `chef_set_own_location()` — SECURITY DEFINER, lets chefs set PostGIS point
  - `chef_event_stats()` — aggregate wa_click + profile_view counts
  - `admin_apply_pending_edits()` — merges pending edits, handles location via PostGIS, clears FSSAI verification if changed

## Files created/modified

### New files (22)
- `supabase/migrations/20260815000012_chef_dashboard.sql`
- `src/lib/chef/auth.ts`
- `src/lib/chef/queries.ts`
- `src/lib/chef/actions.ts`
- `src/app/login/page.tsx`
- `src/app/api/search-unclaimed/route.ts`
- `src/app/claim/[chefId]/page.tsx`
- `src/app/claim/[chefId]/ClaimForm.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/menu/page.tsx`
- `src/app/dashboard/timings/page.tsx`
- `src/app/dashboard/photos/page.tsx`
- `src/app/dashboard/profile/page.tsx`
- `src/app/dashboard/start/page.tsx`
- `src/app/dashboard/find/page.tsx`
- `src/app/dashboard/create/page.tsx`
- `src/components/dashboard/MenuEditor.tsx`
- `src/components/dashboard/TimingsEditor.tsx`
- `src/components/dashboard/PhotoManager.tsx`
- `src/components/dashboard/ProfileEditor.tsx`
- `src/components/dashboard/FindKitchenSearch.tsx`
- `src/components/dashboard/CreateListingStepper.tsx`

### Modified files (6)
- `src/types/db.ts` — pending_edits column, 3 new RPC function types
- `src/middleware.ts` — matcher expanded for `/dashboard`, `/claim`, `/login`
- `src/lib/copy/en.ts` — login, onboarding, claim, createListing, dashboard copy strings
- `src/app/auth/callback/route.ts` — default redirect to `/dashboard`
- `src/app/[city]/[neighbourhood]/[chef]/page.tsx` — unclaimed banner links to `/claim/{id}`
- `src/app/for-chefs/page.tsx` — links to `/login` instead of founder WhatsApp

## Gap-closing pass

A completeness audit against `prompts/phase-4-chef-dashboard.md` found five things
the first pass had missed. All are now built:

1. **WhatsApp claim created no claim row** (acceptance criterion 2). The page
   generated and displayed a code but only opened `wa.me` — nothing reached the
   admin inbox, so there was nothing to approve. `submitWhatsAppClaim()` now
   records the claim (code in `proof_note`) *before* the link opens, which is the
   order the admin needs: the row has to be waiting when the chef's message
   arrives. Re-tapping is idempotent rather than an error.
2. **Admin pending-edits diff + apply** (criterion 5, explicitly deferred from
   Phase 3). `admin_apply_pending_edits` existed in the migration and in the
   types but nothing called it. Added `PendingEditsPanel` (side-by-side live vs
   proposed, FSSAI re-verification warning), `applyPendingEdits` /
   `discardPendingEdits` actions, and — the part that made it reachable at all —
   `getQueue` now matches `status = 'pending_review' OR pending_edits IS NOT NULL`.
   A chef with queued edits stays `approved` so their page keeps serving
   last-approved values, which made them invisible to the old status-only filter.
3. **Nutrition expander missing from the chef menu editor** (criterion 4). The
   admin editor had it; the chef-facing one didn't, so a chef could not add the
   nutrition the public item row already knew how to render.
4. **Draft was not resumable** (criterion 3). `/dashboard/create` redirected any
   chef with a listing to `/dashboard`, including their own unfinished draft, and
   photos/menu items were only persisted on final submit. Now: drafts re-enter
   the stepper with every field rehydrated, photos and menu items persist as they
   are added, and the overview shows a "Continue setup" link.
5. **FSSAI help section** (scope §3⑤) — `fssaiHowToGet` existed in the copy module
   but was never rendered. Now an expander with the five FoSCoS steps and a portal link.

Also added: **Resend transactional email** (scope §5) — listing approved, changes
requested, claim decision.

## Validation

Typecheck, lint and build: clean (0 errors, 0 warnings).

Database behaviour verified against a real PostGIS 16 instance with all 12
migrations applied and a Supabase-compatible auth/roles shim:

| Check | Result |
|---|---|
| All 12 migrations apply from scratch | pass |
| Chef edits trust field directly → `chefs_guard` flips to `pending_review` | pass |
| Chef attempts self-approve (`status`, `is_verified`) | blocked — "trust fields can only be changed by an admin" |
| Another user tries to update this chef's row | 0 rows affected (RLS) |
| Non-admin calls `admin_apply_pending_edits` | blocked — "only admins may apply pending edits" |
| Queued edits: live `display_name`/`whatsapp`/`fssai` unchanged, status stays `approved` | pass |
| Admin applies: all three fields updated, `fssai_verified_at` cleared, `pending_edits` cleared, audit row written | pass |
| Queue filter surfaces approved-chef-with-pending-edits | pass |
| WhatsApp claim row inserts under chef RLS with code in the note | pass |
| `admin_decide_claim` approve → `claimed_by` set, `listing_source='claimed'`, audit row | pass |

That covers acceptance criteria 5, 6 and 7 and the database half of 2. Criteria 1,
3, 4 and 8 (email delivery, a real tester on a phone, ISR timing on the live
public page, Lighthouse) need production and are listed below.

## Deviations

- **Column named `pending_edits`, not `chef_pending_edits`** as the prompt wrote
  it. It's a column on `chefs`, so the table name in the column name would stutter.
- **No drag-map pin in the stepper** — "use my location" only. Same reason Phase 3
  used numeric lat/lng: a real tile map needs a provider and visual testing.
  The chef can refine the pin from the profile editor; admins can from the editor.
- **Resend is dependency-free** — a plain `fetch` against the REST endpoint, not
  the `resend` npm package. Unset `RESEND_API_KEY` makes every send a silent
  no-op, so the app behaves identically before a sending domain is verified.
  Email failures never fail the admin action that triggered them.
- **Menu reordering** is not built; `sort_order` is written but there's no drag UI.

## Still needs production to verify

- Email OTP and Google login against real inboxes (criterion 1).
- Resend: needs `RESEND_API_KEY` + a verified sending domain before any email
  actually goes out.
- `NEXT_PUBLIC_FOUNDER_WHATSAPP_E164` must be set or the WhatsApp claim path is
  hidden (the manual form still works).
- A non-technical tester completing the stepper on a phone (criterion 3).
- Lighthouse mobile ≥ 85 on `/dashboard` (criterion 8).
- Two real Bangalore chefs end-to-end (definition of done).

## What's NOT included (by design, per CLAUDE.md)
- No payments, no cart/checkout, no delivery tracking
- No in-app chat (orders via WhatsApp)
- No ratings/reviews, no subscriptions
- No native apps, no multi-language UI
