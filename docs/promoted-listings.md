# Promoted listings

Zuby's first revenue line: a chef pays to appear in the **Featured kitchens**
rail on the home page.

This document exists because paid placement is the one feature that can quietly
destroy the thing Zuby is selling. `CONCEPT.md` puts trust at the centre —
*"Trust as a visible, non-negotiable feature"* — and a directory that sells
ranking without saying so has spent the only asset it has. The guardrails below
are not polish; they are what makes this revenue line survivable.

---

## It does not break the zero-commission promise

`CONCEPT.md` promises **zero commission**: Zuby never takes a cut of an order.
That promise is intact. Promotion is advertising — a chef pays a flat fee for
visibility, and still keeps 100% of every rupee a customer pays them.

The distinction matters and is worth stating plainly in any chef-facing copy:
**we don't take a share of what you earn. You can pay to be seen; you never pay
per order.**

---

## The five rules

These are enforced in code, not left to discipline.

### 1. Always labelled

Every promoted card carries a visible **Promoted** badge. Not a subtle tint, not
a different border — a word.

Beyond the trust argument, this is a compliance requirement: India's ASCI code
requires advertising to be identifiable as advertising. Undisclosed paid
placement in a directory of "verified" businesses is the kind of thing that ends
up in a consumer-affairs story.

*Enforced in:* `ChefRail` renders the badge whenever `promoted` is set, and the
home page only ever passes promoted chefs through a rail with that flag on.

### 2. Never bypasses verification

A promoted listing must be `status = 'approved'` — the same human review as
every other listing. Money does not buy a shortcut past the trust stack.

*Enforced in:* `promoted_chefs()` filters on `status = 'approved'`, and
`setPromotion()` refuses to promote a non-approved listing with an explicit
error rather than silently accepting the sale.

### 3. Never overrides a dietary filter

A promoted chef appears in the Featured rail. It does **not** get injected into
a halal, jain or veg listing page it doesn't qualify for. Someone filtering for
halal is making a religious decision, not browsing a preference — a paid slot
that ignores that is indefensible at any price.

*Enforced in:* promotion is a separate rail with its own query. It is not a
ranking boost inside `search_chefs()`, so it cannot leak into filtered results.

### 4. Chefs cannot promote themselves

`promoted_until` and `promoted_weight` are admin-only. The Phase 4 self-serve
dashboard lets a chef edit their own listing, so without this a chef could set
`promoted_until` to 2099 and rank first for free — which would also make the
"Promoted" label a lie.

*Enforced in:* the `chefs_guard` trigger raises `trust fields can only be
changed by an admin` if a non-admin touches either column — verified against a
live database, along with the RPC rejecting non-admin callers.

### 5. Time-boxed

Promotion has an expiry. A permanent flag becomes a ranking advantage nobody
remembers granting and nobody audits.

*Enforced in:* `promoted_until` is a timestamp, `promoted_chefs()` filters on
`> now()`, and the admin panel takes a number of days rather than a boolean.

---

## How it works operationally

**To promote a chef:** Admin → Chefs → open the listing → **Promoted placement**
panel → set days and weight → Promote. Weight orders the rail (higher first) when
several kitchens are promoted at once.

**To end one early:** the same panel, **End promotion**.

Every change writes a `verification_log` row, so there is a permanent record of
who promoted whom and for how long.

**Promoted chefs are excluded from the Trending rail** — otherwise the same
kitchen appears twice on one screen, which reads as a bug and dilutes both rails.

---

## What is deliberately not built

- **Self-serve purchase.** No payment flow. The founder sells the slot and sets
  it by hand. `CONCEPT.md` rules out payments in V1, and at this volume a
  conversation is faster than a checkout.
- **Auction or bidding.** Weight is a manual integer. Real ad auctions need
  scale and an economics model neither of which exists yet.
- **Promoted slots inside search results or landing pages.** Only the home-page
  rail. Widening this is the decision most likely to damage trust, and it should
  be taken deliberately rather than arrived at incrementally.
- **Impression or click billing.** No per-impression tracking. `events` already
  records `wa_click` per chef, which is enough to show a promoted chef what they
  got for their money.

---

## Pricing (founder's call, not set here)

Nothing in the code assumes a price. Two things worth knowing when setting one:

- `/admin/metrics` shows `wa_click` counts per chef, which is the honest way to
  tell a prospective advertiser what a slot is worth — real contacts, not
  impressions.
- Selling placement before there is meaningful traffic sells something that
  doesn't exist yet. The day-60 target in `CONCEPT.md` is 1,000 weekly visitors;
  below roughly that, a featured slot is not worth charging for and charging for
  it anyway is the fastest way to lose a chef's trust.
