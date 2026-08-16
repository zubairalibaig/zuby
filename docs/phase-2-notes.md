# Phase 2 — completion notes

Status: **code complete and tested.** One founder action remains (add two
GitHub secrets) before the pipeline can run against the live database.

## What was built

```
collect   →  ingest_raw          verbatim source data + provenance
normalise →  ingest_candidates   cleaned, mapped, deduped, confidence-scored
promote   →  chefs               pending_review, unclaimed
approve   →  public              (admin — Phase 3)
```

- **Collectors:** `sheet` (Google Sheet/CSV — the workhorse), `paste` (manual
  transcription of Instagram bios and flyers), `web` (robots.txt-obeying fetch
  of Schema.org structured data on public directory pages).
- **Normaliser:** E.164 phones, name tidying, cuisine/dietary mapping,
  neighbourhood matching with centroid fallback, slug generation, FSSAI
  validation, per-field confidence.
- **Dedupe:** phone match (strong) and name similarity within a neighbourhood
  (weak). Flags `needs_review` with an explanation; never silently merges.
- **Promotion in SQL** (`promote_ingest_candidate`): writes the PostGIS point
  natively, guarantees `status='pending_review'` and `claimed_by=null`, copies
  cuisines/tags/menu, and writes a `verification_log` provenance row.

## Deviation from the original prompt: browser-only operation

The prompt specified a local CLI (`npm run ingest -- collect`). The founder has
no local toolchain, so the operating model changed:

| Step | How it runs now |
|---|---|
| Collect + normalise | GitHub → Actions → **Ingest chefs** → Run workflow (with a "Preview only" dry-run tickbox, defaulted **on**) |
| Review | Supabase SQL Editor: `select * from ingest_review;` |
| Promote | The same Action (`promote-clean`), or `select promote_ingest_candidate('…')` in the SQL Editor |
| Takedown | `select delist_chef('slug', 'reason');` |

Promotion logic lives in SQL rather than TypeScript so there is exactly **one**
implementation, reachable from both the Action and the SQL Editor — and because
inserting a PostGIS geography through PostgREST is awkward.

The CLI still exists and is documented for contributors with a terminal.

## Verification

**26 unit tests** (`cd ingest && npm test`), no database required, covering the
logic most likely to be wrong: phone formats, taxonomy mapping, geography
fallbacks, CSV edge cases, and dedupe.

**Against a real PostGIS database**, the SQL layer was verified to:

- create the chef as `pending_review`, `scraped`, `claimed_by = null`
- keep the promoted listing invisible to `anon` (RLS)
- refuse a second promotion of the same candidate
- resolve slug collisions (`aunty-meena-tiffins-2`)
- refuse promotion by a signed-in non-admin
- copy cuisines, dietary tags and menu items, and write the audit row

**End-to-end on a deliberately messy CSV**, the pipeline produced:

| Row | Outcome |
|---|---|
| `AISHA'S BIRYANI` | clean → ready to promote (name tidied, FSSAI punctuation stripped) |
| `Meena Home Tiffins` | clean |
| `Meena Home Tiffin Service` | `needs_review` — duplicate, similarity 0.75 |
| `Ghar Ka Khana` (080 landline) | `needs_review` — no usable WhatsApp number |
| `Mystery Kitchen` (Mumbai, "Martian Fusion") | `needs_review` — no area match, unmapped cuisine |
| blank name | rejected |

### Two bugs the tests caught

1. **A Bangalore landline (`080 4123 4567`) normalised to a valid-looking
   mobile.** Since the normaliser copies the phone into the WhatsApp field, that
   would have produced a dead "Order on WhatsApp" button — the single most
   important action on the site. Numbers written with a trunk prefix that open
   with a metro STD code are now rejected. Note the residual ambiguity, which is
   documented in the code: written *without* the leading `0`, an 80-series
   mobile and a Bangalore landline are indistinguishable by digits alone.

2. **Name-similarity dedupe missed "Tiffins" vs "Tiffin".** Token comparison now
   folds trailing plurals, so the pair scores 0.75 and is caught.

## Deliberate design decisions worth knowing

- **Trust claims are never inferred from prose.** `halal`, `jhatka` and `jain`
  are only accepted from a structured `dietary` column, never mined from a bio —
  buyers rely on these, and a scraped guess is not a claim the chef made.
- **Unmapped values are reported, not dropped.** An unrecognised cuisine sends
  the candidate to review with the original text preserved.
- **No fabricated geography.** No neighbourhood match means no coordinates.
- **No guessed prices.** Menu prices import only when explicitly present.
- **Duplicates are flagged, not merged.** Two kitchens can legitimately share a
  name; a human decides.

## Pending — founder action

**Add two GitHub secrets** before the first real run: Settings → Secrets and
variables → Actions → New repository secret:

- `SUPABASE_URL` — Supabase → Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API → `service_role` key

Then: Actions → **Ingest chefs** → Run workflow, leaving **Preview only** ticked
for the first pass.

## Known gaps

- The `web` collector reads only Schema.org structured data. Directories that
  publish none yield nothing — by design; use `paste` for those.
- Justdial and similar sites may block the fetch outright. That is their answer
  and the run reports it rather than working around it.
- Instagram has no automated collector, deliberately (its terms forbid it) — the
  `paste` collector covers it.
- Scraped listings are not visible anywhere in the product until Phase 1 (public
  pages) and Phase 3 (admin queue) exist. Until then, review them in the SQL
  Editor via `ingest_review`.
