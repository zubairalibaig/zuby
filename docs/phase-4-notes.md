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

## Validation
- `tsc --noEmit`: ✅ 0 errors
- `next lint`: ✅ 0 errors, 0 warnings
- `next build`: ✅ passes, all routes render

## What's NOT included (by design, per CLAUDE.md)
- No payments, no cart/checkout, no delivery tracking
- No in-app chat (orders via WhatsApp)
- No ratings/reviews, no subscriptions
- No native apps, no multi-language UI
- Admin pending-edits diff display (enhancement for admin panel, not in Phase 4 scope)
