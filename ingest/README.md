# `ingest/` — how chefs get into Zuby

This is how the directory gets its first hundred listings: we collect **public**
home-chef information, normalise it, and create **unclaimed listings** that
chefs can later claim (Phase 4).

**Nothing here can put a listing on the public site.** Everything lands as
`status = 'pending_review'`; a human approves each one before it is visible.

```
collect   →  ingest_raw          verbatim source data, kept for provenance
normalise →  ingest_candidates   cleaned, mapped, deduped, with confidence scores
promote   →  chefs               pending_review, unclaimed, awaiting approval
approve   →  public              (admin, Phase 3)
```

---

## Running it from the browser (no terminal)

**One-time setup:** GitHub → Settings → Secrets and variables → Actions → *New
repository secret*:

| Secret | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` key |

**Every run:** GitHub → **Actions** → **Ingest chefs** → **Run workflow**.

| Field | What to put |
|---|---|
| What to run | `collect-and-normalise` first; `promote-clean` once you've reviewed |
| Where the chefs come from | `sheet` (usual), `paste`, or `web` |
| Google Sheet / CSV link | your sheet's share link — see columns below |
| Pasted listings | for `paste`: blocks separated by `---` |
| Preview only | **leave ticked the first time** — shows what would happen, writes nothing |

**Then review** in the Supabase SQL Editor:

```sql
select * from ingest_review order by created_at desc;
```

- `status = 'new'` → clean, ready to promote
- `status = 'needs_review'` → look at `duplicate_of` and `unmapped` first

**Promote** either by re-running the workflow with `promote-clean` (untick
"Preview only"), or one at a time from the SQL Editor:

```sql
select promote_ingest_candidate('paste-the-candidate_id-here');
select promote_all_clean_candidates();   -- everything marked 'new'
```

Promoted listings then wait in the admin queue (Phase 3) for approval.

---

## The sheet format

Any Google Sheet shared as "Anyone with the link can view", or any CSV URL.
Only `kitchen_name` is required — leave the rest blank when you don't know it.
**Never invent data**; a blank cell is better than a guess, and the pipeline is
built to flag gaps rather than paper over them.

| Column | Example | Notes |
|---|---|---|
| `kitchen_name` | `Aisha's Biryani` | **required** |
| `chef_name` | `Aisha Khan` | |
| `phone` | `99000 00001` | any format; converted to `+91…` |
| `whatsapp` | | defaults to `phone` when blank |
| `instagram` | `@aishas.biryani` | handle or profile URL |
| `area` | `Indiranagar 2nd Stage` | matched to a neighbourhood |
| `city` | `bangalore` | defaults to `bangalore` |
| `country` | `IN` | `IN` or `SG` |
| `cuisines` | `Biryani, Hyderabadi` | unmapped values are reported, not dropped |
| `dietary` | `halal, non veg` | see the trust note below |
| `fssai` | `11223344556677` | 14 digits; anything else is discarded |
| `bio` | `Small batch dum biryani` | |
| `lat`, `lng` | | only if you genuinely have them |
| `source_url` | | where you found the listing |

Re-running on the same sheet **updates** rather than duplicating — rows are
keyed on the phone number, falling back to name + area.

---

## What the normaliser will and won't do

**It will:** convert phone numbers to E.164, tidy ALL-CAPS names, map cuisine
and dietary words onto Zuby's slugs, match an area to a neighbourhood and use
that neighbourhood's centroid for coordinates, generate a URL slug, strip
punctuation from FSSAI numbers, and score its own confidence per field.

**It won't:**

- **Invent a location.** No area match means no coordinates and `geo_source:
  "none"` — the candidate goes to review.
- **Infer halal, jhatka or jain from prose.** These are trust claims that
  buyers rely on. They are only accepted from the structured `dietary` column,
  never mined from a bio.
- **Accept a landline as a WhatsApp number.** A number like `080 4123 4567` is
  rejected rather than turned into a dead "Order on WhatsApp" button.
- **Keep a malformed FSSAI number.** Anything that isn't 14 digits is dropped.
- **Guess a price.** Menu prices are imported only when explicitly present.

Duplicates are **flagged, never silently merged**: matching phone numbers
(strong signal) or similar names in the same neighbourhood (weak signal) mark a
candidate `needs_review` with a `duplicate_of` explanation, so a human decides.

---

## Ethics and the law

- Only **public business information** — a kitchen advertising to customers.
  We list businesses, not private individuals. Phone numbers only when they are
  publicly advertised for taking orders.
- **`source` and `source_url` are kept end to end.** Every promoted listing can
  be traced back to exactly where it came from.
- **The claim flow is the consent mechanism.** Every unclaimed listing carries
  "Is this your kitchen?" and the chef takes control, edits, or asks for removal.
- **Takedown is immediate**, no questions asked:
  ```sql
  select delist_chef('the-chef-slug', 'Removal requested by owner');
  ```
- **No scraping behind logins, no CAPTCHA evasion, no rate-limit dodging.** The
  `web` collector reads `robots.txt` and obeys it, waits between requests,
  identifies itself honestly, and only reads Schema.org structured data that
  sites publish for search engines — it does not scrape prose. Instagram is
  handled by the `paste` collector precisely because automated collection there
  is not permitted.

---

## Local development (contributors with a terminal)

```bash
cd ingest
npm install
npm test          # 26 unit tests, no database needed
npm run typecheck

export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
npm run ingest -- collect --source sheet --url "<sheet url>" --dry-run
npm run ingest -- normalise --dry-run
npm run ingest -- promote --all-clean
npm run ingest -- stats
npm run ingest -- delist --slug some-kitchen --reason "Owner request"
```

`--dry-run` prints what would happen and writes nothing.
