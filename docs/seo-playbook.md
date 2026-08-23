# Zuby SEO playbook

The operational companion to `docs/discoverability-strategy.md`. That document is
the decade; this one is Monday morning.

**Time cost: about 30 minutes a week, plus 45 minutes once a month.** If it grows
past that, something is wrong with the tooling, not with your discipline.

---

## Part 1 — One-time setup

Do these once, in order. Steps 1 and 2 need to happen before any of the weekly
ritual works, because there's nothing to review until Google is reporting.

### 1. Google Search Console

1. Go to **search.google.com/search-console** and add a property.
2. Choose **Domain** (not URL prefix) and enter `zuby.food`. Domain properties
   cover every subdomain and both protocols, which saves re-doing this later.
3. Google gives you a `TXT` record. Add it in **Cloudflare → zuby.food → DNS**,
   set to **DNS only** (grey cloud — proxying breaks TXT verification, the same
   rule as `docs/dns-cloudflare-setup.md` and `docs/resend-setup.md`).
   Alternatively, Google also offers an **HTML tag** method — a short token
   you can set as `GOOGLE_SITE_VERIFICATION` in Vercel env vars instead of
   touching DNS. The code already renders it (`src/app/layout.tsx`) if set;
   the DNS method is still preferred because it verifies the whole domain in
   one step, but the env var is there for a URL-prefix property or a quick
   re-verify without a DNS round trip.
4. Verify. Then **Sitemaps → Add a new sitemap** and submit all three:
   ```
   sitemap.xml
   sitemap-chefs.xml
   sitemap-areas.xml
   ```
   They're split by type on purpose: when indexed pages drop, you need to know
   whether it was chef profiles or landing pages, and one combined file hides that.

### 2. Bing Webmaster Tools

Worth the ten minutes it takes, despite Bing's small direct traffic in India:
Bing's index feeds Copilot and part of ChatGPT's search grounding, so this is
really AI-visibility work wearing a search-engine costume.

1. **bing.com/webmasters** → Add site.
2. Choose **Import from Google Search Console** — it carries the verification
   and the sitemaps across in one click. If you'd rather verify Bing
   independently, its meta-tag method works too: set `BING_SITE_VERIFICATION`
   to the token it gives you and the layout renders it automatically.
3. Turn on **IndexNow**. Bing then picks up changes on push rather than waiting
   for a crawl.

### 3. Baseline the query set

Create a sheet with the queries you intend to win. Start with roughly 30, built
from the pattern `{cuisine or diet} {home chef | tiffin} {neighbourhood}`:

| Query | Target page |
|---|---|
| jain tiffin service hsr layout | `/bangalore/hsr-layout/diet/jain` |
| halal home chef koramangala | `/bangalore/koramangala/diet/halal` |
| biryani home chef indiranagar | `/bangalore/indiranagar/cuisine/biryani` |
| home cooked food bangalore | `/bangalore/home-cooked-food` |
| tiffin service near me bangalore | `/bangalore/tiffin-service` |
| north indian home food jayanagar | `/bangalore/jayanagar/cuisine/north-indian` |

Record today's position for each (or "not ranking"). Without a baseline you
cannot tell progress from noise, and three months from now you will not remember
where you started.

### 4. Verify the technical surface

Once, after the first deploy:

```
curl -s https://zuby.food/robots.txt          # AI crawlers allowed, private paths blocked
curl -s https://zuby.food/llms.txt | head -20 # renders, counts look real
curl -s https://zuby.food/sitemap-areas.xml   # only qualifying pages
curl -s https://zuby.food/api/health          # {"ok":true,"db":"ok","email":"configured"}
```

Then spot-check five pages in Google's **Rich Results Test** — one chef profile,
one neighbourhood, one neighbourhood × cuisine, one dietary page, one intent page.
All should report valid structured data with no errors.

---

## Part 2 — The weekly ritual (~30 min, Monday)

### a. Search Console → Performance (10 min)

Set the range to **last 28 days** and compare to the previous 28.

Look at four things, in this order:

1. **Total impressions.** Rising means Google is showing us more; this moves
   before clicks do and is the earliest signal that anything is working.
2. **Total clicks.** Rising with impressions is healthy growth. Flat while
   impressions rise means we rank on page two — a **title and description
   problem**, not a content problem. Rewrite those first; it's the cheapest win
   available and it's usually available.
3. **New queries.** Sort by impressions, look for queries you didn't target.
   These are gold: they tell you what people actually type, in their words. Add
   the good ones to the tracked set.
4. **Position changes.** For each tracked query, record the position. Anything
   that reaches page one goes into `/admin/metrics` via the ranking-win form —
   that's KPI 4.

### b. Search Console → Indexing (10 min)

**Pages** report. Two numbers matter:

- **Indexed vs submitted.** A gap over ~10% is a real problem and it is a
  problem *now*, not next month.
- **Why pages aren't indexed.** The common causes and what each actually means:

| Reason | What it means | What to do |
|---|---|---|
| Crawled — currently not indexed | Google saw it and judged it not worth indexing | Usually a thin page. Check the chef count — it may be a threshold bug letting a 1-chef page through |
| Discovered — currently not indexed | Crawl budget, or low perceived value | Improve internal links to it; check it's in a sitemap |
| Duplicate, Google chose different canonical | Two URLs serving the same content | Check the canonical tag. Often a filter URL that escaped `noindex` |
| Soft 404 | Page returns 200 with nothing useful | A landing page that lost its chefs and should be 404ing. **Check the threshold logic** |
| Not found (404) | A URL was linked but doesn't exist | Expected when a page drops below threshold. A *spike* is not expected — investigate |

**A soft-404 or "crawled — not indexed" cluster on landing pages is the early
warning for the biggest risk in the whole plan** (`discoverability-strategy.md`
§18). Treat it as urgent, not as housekeeping.

### c. `/admin/metrics` (10 min)

The four KPIs against their day-60 targets, plus the thing the KPIs don't say:

- **"Recruit here next"** — neighbourhoods with high WhatsApp intent and few
  chefs. This is the single most actionable panel on the site. Demand is telling
  you where supply should go. Take the top two to chef outreach this week.
- **By dietary tag** — if halal or jain clicks are disproportionate to how many
  such chefs we list, that's the underserved-audience thesis from `CONCEPT.md`
  being confirmed with data. Recruit into it.
- **By cuisine** — high clicks on a cuisine with few chefs is a content-depth
  opportunity as much as a supply one.

---

## Part 3 — The monthly ritual (~45 min)

### a. AI answer audit (20 min)

There is no tool worth paying for here yet. A spreadsheet and twenty minutes is
the correct instrument.

Ask each of **ChatGPT**, **Perplexity**, and **Google** (checking the AI Overview)
the same fixed set of about eight questions:

- "Where can I find home-cooked food in Koramangala?"
- "Best tiffin service in HSR Layout"
- "Halal home chefs in Bangalore"
- "How do I find a jain tiffin service in Bangalore?"
- "What is Zuby?"

Record, for each: **are we cited? what did it say about us? was it accurate?**

The last question matters most. A model repeating something wrong about Zuby —
that we charge commission, that we deliver — is a trust problem that spreads
faster than we can correct it. If you see it, the fix is on-site: state the
correct fact more plainly and more prominently on the page the model is reading,
usually `/about`, `/trust`, or `llms.txt`.

### b. Performance check (10 min)

Run PageSpeed Insights on the home page, a city page, a chef page and a landing
page. Mobile, not desktop — our traffic is a mid-range Android phone on 4G.

Targets: **LCP < 2.0s, CLS < 0.05, INP < 200ms.** A regression is nearly always
either a new image that isn't going through the transform pipeline, or a new
dependency on a public route.

### c. Content depth (15 min)

- Any cuisine or dietary tag now above the threshold whose blurb is still missing
  from `src/lib/copy/landing.ts`? Write it.
- Any new neighbourhood with chefs but no context blurb? Write it.
- Reread one existing blurb and ask honestly whether it says something a person
  who has eaten the food would say. If not, rewrite it. This is the moat.

---

## Part 4 — Recognising the common failure modes

**Impressions rising, clicks flat.** Page-two rankings. Rewrite titles and meta
descriptions to lead with the number and the specific thing ("12 verified halal
home chefs in Koramangala" beats "Halal home chefs | Zuby"). Cheapest fix in SEO.

**A page ranked, then dropped.** Check chef count first — it may have fallen below
threshold and started 404ing, which is correct behaviour, not a bug. If the chefs
are still there, check for a duplicate-canonical problem.

**Landing pages not indexing.** Usually thin. Check the editorial blurb is
actually rendering (a missing key in `cuisineBlurbs` silently renders nothing),
and check internal links point at the page.

**Traffic without WhatsApp clicks.** An intent mismatch — we're ranking for
something we don't serve well, or the listings on that page are weak. Look at
which page, then at what's on it.

**Everything flat for a month.** Supply. A directory with too few chefs cannot
rank for anything, because there's nothing to rank. Go back to recruitment;
`CONCEPT.md` is explicit that this is the moment to fix the funnel rather than
ship features.

---

## Part 5 — When to break the rules

Two rules in `discoverability-strategy.md` will feel wrong at some point. They
aren't:

**"Just generate all the neighbourhood × cuisine pages, even the empty ones."**
No. This is exactly the doorway-page pattern, the penalty is site-wide rather
than page-level, and recovery takes months. The 2-chef threshold stays.

**"Block the AI crawlers so they can't take our content."** No. We are a
directory — our product is being found, and a model that hasn't read Zuby cannot
recommend Zuby. We have no paywalled archive to protect. Blocking costs citations
and gains nothing.

If either genuinely needs revisiting, revisit it in the strategy document with
reasoning, not in a hurry on a Monday.
