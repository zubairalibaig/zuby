# Zuby discoverability strategy

**Scope:** the long horizon — Bangalore to pan-India to Singapore, Malaysia and
beyond, across Google, Bing, and the answer engines (ChatGPT, Perplexity, Gemini,
Claude, Copilot).

**Status:** strategy document. `prompts/phase-5-seo-growth.md` is the build spec
for the Bangalore slice; this is the frame that spec sits inside. Where the two
disagree, this document explains the reasoning and the phase prompt wins on
sequencing.

**Companion:** `docs/seo-playbook.md` is the operational weekly ritual. This
document is the *why* and the *decade*; the playbook is the *Monday morning*.

---

## Contents

1. [The thesis](#1-the-thesis)
2. [What changed: from ten blue links to answer engines](#2-what-changed-from-ten-blue-links-to-answer-engines)
3. [The surface map](#3-the-surface-map)
4. [URL architecture as a twenty-year asset](#4-url-architecture-as-a-twenty-year-asset)
5. [The programmatic page engine](#5-the-programmatic-page-engine)
6. [Editorial content: the moat programmatic pages can't build](#6-editorial-content-the-moat-programmatic-pages-cant-build)
7. [Entity SEO and the knowledge graph](#7-entity-seo-and-the-knowledge-graph)
8. [Answer Engine Optimisation](#8-answer-engine-optimisation-aeo)
9. [Crawler policy](#9-crawler-policy-who-we-let-in)
10. [International expansion](#10-international-expansion)
11. [Singapore](#11-singapore)
12. [Malaysia](#12-malaysia)
13. [Pan-India rollout](#13-pan-india-rollout)
14. [Local, Maps and the home-address problem](#14-local-maps-and-the-home-address-problem)
15. [Performance as a ranking input](#15-performance-as-a-ranking-input)
16. [Off-site: the parts we don't own](#16-off-site-the-parts-we-dont-own)
17. [Measurement](#17-measurement)
18. [Risk register](#18-risk-register)
19. [Sequencing](#19-sequencing)

---

## 1. The thesis

Zuby is a bootstrapped directory competing with funded marketplaces. We cannot
outspend Homeal or Cookr on acquisition, and we don't need to: their commission
model forces them to monetise every order, which forces paid acquisition, which
sets a floor under their unit economics. Ours is a content business wearing a
product's clothes. Every verified chef is a page. Every page is an asset that
compounds. A chef added in month three is still pulling traffic in year three at
zero marginal cost.

That's the bet in `CONCEPT.md`: *"That's free, compounding traffic — and it's how
a bootstrapped marketplace beats a well-funded one in year two."*

Three things follow, and they constrain the whole strategy:

**We win on the long tail, not the head.** "Food delivery Bangalore" is
unwinnable — Swiggy and Zomato own it with a decade of domain authority. "Jain
tiffin service HSR Layout" is winnable in weeks, because nobody has built a page
that genuinely answers it. There are tens of thousands of such queries across our
target geographies. Individually tiny; collectively larger than the head, and
converting far better because the intent is exact.

**Our content is generated, so quality control is structural.** We are not
writing 4,000 pages by hand. We are generating them from a database. This makes
scale trivial and quality dangerous — the same mechanism that produces a genuinely
useful "12 halal home chefs in Koramangala" page produces a worthless "0 halal
home chefs in Rajarajeshwari Nagar" page. The thresholds in §5 are not
housekeeping; they are the entire difference between an asset and a penalty.

**Supply is the input to the growth engine.** No chefs in a neighbourhood, no
page. No page, no traffic. No traffic, no chefs. The SEO strategy and the chef
recruitment strategy are the same strategy, which is why §17 measures wa_click by
neighbourhood: it tells outreach where to go next.

---

## 2. What changed: from ten blue links to answer engines

Most SEO advice still assumes the goal is a blue link a human clicks. That
assumption is now roughly half wrong, and the half that's wrong is growing.

A user asking "where can I get home-cooked jain food near Indiranagar" today gets
some mix of: a Google AI Overview synthesising three sources, a Maps pack, a few
organic links, and — increasingly — they never asked Google at all. They asked
ChatGPT, which searched, read four pages, and answered in prose with citations.

This changes what we optimise for in three concrete ways.

**Being *extractable* matters as much as being *rankable*.** An answer engine
reading our Koramangala page needs to pull out "there are 12 verified halal home
chefs, here are three, here's how to contact them." Prose that buries facts in
marketing language extracts badly. Clear headings, direct first-sentence answers,
tables, and structured data extract well. This is not a different discipline from
good SEO — it's the same discipline with less tolerance for fluff.

**Citation replaces the click, and that's survivable.** Zero-click answers are
usually framed as a threat. For a *directory* they're less threatening than for a
publisher: an answer engine that says "Zuby lists 12 verified halal home chefs in
Koramangala" has done our brand marketing for free, and the user who wants to
actually contact a chef must come to us. Our conversion event is a WhatsApp click,
which no answer engine can perform. We should want to be cited even when we aren't
clicked.

**Brand queries are the compounding asset.** The end state is a user who types
"zuby koramangala" instead of "home chefs koramangala" — or asks ChatGPT "is there
a Zuby chef near me." Every citation moves us toward that. Brand search is the one
channel no algorithm change can take away, which is why §17 tracks it separately.

**What has not changed:** answer engines are grounded in a web index. Bing's index
feeds Copilot and much of ChatGPT's search. Google's index feeds AI Overviews and
Gemini. Perplexity runs its own crawler over the same open web. There is no
separate "AI SEO" that bypasses fundamentals — crawlability, structured data,
genuine information, speed. AEO is a layer on top of technical SEO, not a
replacement. Anyone selling it as a replacement is selling something.

---

## 3. The surface map

Ranked by expected contribution over the first two years.

| Surface | Why it matters to Zuby | Our lever |
|---|---|---|
| **Google organic (long tail)** | The engine. Hundreds of neighbourhood × cuisine × dietary queries. | Programmatic pages, §5 |
| **Google AI Overviews** | Increasingly occupies the answer slot for "near me" and "best X" queries. Uses the normal index — you cannot opt in or out separately. | Extractable content, §8 |
| **ChatGPT Search** | Fastest-growing discovery surface. Crawled by `OAI-SearchBot`, grounded partly in Bing. | Crawler policy §9, structured facts §8 |
| **Bing organic** | Small direct traffic in India, but it feeds Copilot and parts of ChatGPT. Punches above its weight. | Bing Webmaster Tools, IndexNow |
| **Perplexity** | Heavy citation behaviour — links prominently, sends real referral traffic. | `PerplexityBot` allowed, clean extraction |
| **Google Maps / local pack** | Enormous for food. Structurally hard for us — see §14. | Limited; honest about it |
| **Instagram / WhatsApp forwards** | How Indian home-food discovery *actually* works today. Not SEO, but the same funnel. | Share buttons, OG images |
| **Google Images** | Food is visual. Under-exploited by directories. | `alt` text, image sitemap, §15 |
| **Google Discover** | Feed-based, unpredictable, occasionally enormous. | Good OG images, freshness |
| **Reddit / Quora / local forums** | Increasingly cited *by* answer engines as trusted sources. | §16, and never astroturf |

The strategic read: **Google organic long-tail is the volume, answer engines are
the trajectory, Instagram/WhatsApp is the launch bootstrap.** Maps is where we're
structurally weak and should stop pretending otherwise.

---

## 4. URL architecture as a twenty-year asset

URLs are the hardest thing to change later. Every migration leaks equity, breaks
inbound links, and costs weeks. Decide once, correctly.

### Current structure

```
/                                        home
/bangalore                               city
/bangalore/indiranagar                   neighbourhood
/bangalore/indiranagar/aishas-biryani    chef
/bangalore/cuisine/biryani               city × cuisine
/search                                  interactive search (noindex)
```

Clean, human-readable, keyword-bearing without stuffing, and shallow — every chef
is three clicks from home. Good foundation.

### The latent collision problem

The database enforces uniqueness on `(country_id, slug)` for cities. So India and
Malaysia can each legally have a city slugged `victoria`, and both would resolve
to `/victoria`. The route would break the moment the second country launches with
a colliding name.

This is not hypothetical at our target footprint. India and Malaysia share
colonial-era place names; India and Singapore share several neighbourhood names
(`serangoon`, `little-india` — Singapore has a Little India, and so does
practically every Indian metro at the neighbourhood level).

### The decision

Three options, and the reasoning matters more than the answer:

| Option | Example | Verdict |
|---|---|---|
| **ccTLD per country** | `zuby.sg`, `zuby.my` | **No.** Strongest geo-signal, but each domain starts at zero authority. Fatal for a bootstrapped brand — we'd be relaunching from scratch in every market. |
| **Country subfolder** | `/in/bangalore/indiranagar/...` | Safe, conventional, hreflang-friendly. But it's a full URL migration of every existing page, and it lengthens every URL for the 95% case where there's no ambiguity. |
| **Flat cities + global slug uniqueness** | `/bangalore/...`, `/singapore/...` | **Chosen.** Shortest URLs, no migration, no equity leak. Cost: a data-integrity rule. |

**We keep flat city URLs and enforce globally-unique city and neighbourhood slugs
as a database constraint**, not a convention someone remembers. Where a genuine
collision arises, the later market disambiguates in the slug
(`victoria-my`), which is a one-row problem rather than a site-wide migration.

Add **country hub pages** — `/in`, `/sg`, `/my` — as hreflang anchors and market
landing pages. These are new pages, not a restructure. They give answer engines
and Search Console a clean per-market entity to attach to, and they give us
somewhere to put market-specific trust copy (FSSAI in India, SFA and MUIS in
Singapore, JAKIM in Malaysia).

**Migration trigger:** if we ever exceed ~8 countries or hit three or more genuine
slug collisions, revisit the subfolder option with a full 301 map. Below that
threshold the flat structure wins on every axis that matters.

### Rules that hold regardless

- Lowercase, hyphenated, ASCII. No underscores, no percent-encoding, no
  transliteration ambiguity (`jayanagar`, never `jayanagara`).
- A chef's slug never changes after approval. If a kitchen renames, the slug
  stays and the display name changes — or we 301, never silently swap.
- Trailing slashes off, one canonical form, enforced in `next.config`.
- Filter state (`?radius=5&dietary=halal`) lives in query params and is
  `noindex`. Faceted filtering is the classic index-bloat trap: three filters with
  five values each generate 125 crawlable near-duplicates that dilute the pages we
  actually want ranked.
- **Indexable pages are server-rendered, always.** Already a hard rule in
  `CLAUDE.md`; restated because it's the single most common way a React directory
  quietly becomes invisible.

---

## 5. The programmatic page engine

This is the volume play, and the place where this strategy most easily becomes a
liability. Read §18 before shipping any of it.

### The page grid

| Type | Pattern | Scale (Bangalore) |
|---|---|---|
| City | `/bangalore` | 1 |
| Neighbourhood | `/bangalore/koramangala` | ~30 |
| City × cuisine | `/bangalore/cuisine/biryani` | ~20 |
| **Neighbourhood × cuisine** | `/bangalore/koramangala/cuisine/biryani` | ~600 possible, ~60 that qualify |
| **City × dietary** | `/bangalore/halal` | ~7 |
| **Neighbourhood × dietary** | `/bangalore/koramangala/halal` | ~210 possible, ~40 that qualify |
| **Intent** | `/bangalore/tiffin-service` | ~5 |
| Chef | `/bangalore/koramangala/aishas-biryani` | = chef count |

Note the gap between *possible* and *qualify*. That gap is the strategy.

### The threshold rule

**A programmatic page exists only when at least 2 approved chefs match it.**

Below that it is not generated, not linked, not in the sitemap, and returns 404.
Not a thin page, not an empty state with a "no chefs yet" message — a 404, so
Google never indexes it and never learns to distrust the pattern.

Why 2 and not 1: a single-chef page is functionally a duplicate of that chef's own
profile. It adds no information, competes with the profile for the same query, and
is exactly the "doorway page" pattern Google's spam policy names explicitly.

Why not 3 or 5: at 2 the page genuinely answers a comparison question — "who are
the halal chefs in Koramangala" with two answers is a useful answer. Higher
thresholds cost real coverage in exactly the underserved segments
(`CONCEPT.md`'s halal/jain thesis) where we most want presence.

**The threshold is enforced in one place** — a single predicate used by
`generateStaticParams`, the page component, the sitemap, and the internal link
components. Enforcing it in three places means it will eventually be enforced in
two.

### Pages must differ by more than a noun

Two neighbourhood pages whose only difference is the place name are duplicates
with extra steps. Every generated page carries:

- **A real H1** with the actual count: "12 verified halal home chefs in Koramangala".
- **Composed editorial copy** — cuisine blurb + dietary blurb + neighbourhood
  context, written once by a human (§6), assembled per page. Three components with
  ~20 variants each yield thousands of genuinely distinct combinations.
- **The listings themselves** — the actual differentiator, and real information.
- **A count-aware meta description** built from live data.
- **Cross-links** to sibling pages (nearby neighbourhoods, related cuisines, other
  dietary options in the same area) so equity flows and crawlers find everything.
- **`ItemList` + `BreadcrumbList` JSON-LD**; `FAQPage` on city and intent pages.

### The freshness advantage

A chef updates their menu and the page changes. A chef goes on vacation and the
page reflects it. Static competitor listicles ("10 best tiffin services in
Bangalore, published 2023") decay; ours don't. `lastmod` in the sitemap must be
real — driven by `updated_at`, not `now()` — because a sitemap that claims
everything changed today teaches Google to ignore the field entirely.

---

## 6. Editorial content: the moat programmatic pages can't build

Programmatic pages scale; they don't differentiate. Anyone with our database
schema could generate them. What can't be copied is genuine knowledge, and it is
also what answer engines preferentially cite.

**Per-cuisine blurbs (~20).** Two or three real sentences on what the cuisine
actually is, what a home chef makes differently from a restaurant, what to order
first. Written by someone who has eaten the food. "Kori rotti is a Mangalorean
dish of crisp rice wafers drowned in chicken curry — the wafers must be added at
the table or they turn to paste, which is why it travels badly from restaurants
and brilliantly from a home kitchen ten minutes away."

**Per-dietary-tag explainers (~7).** These carry disproportionate weight because
they serve the underserved audiences in `CONCEPT.md` and because the questions are
genuinely under-answered online. What jain cooking excludes and why. What
distinguishes jhatka from halal, written respectfully and factually. What "egg-free"
means in Indian baking. Nobody has written these well for a food-discovery
audience; whoever does becomes the cited source.

**Per-neighbourhood context (~30).** One or two sentences of local truth. Which
apartment complexes, which office clusters, what the food culture is. This is the
hardest to fake and the most obviously human.

**Trust and safety explainers.** What an FSSAI number is, how to read one, what
Zuby's verification actually checks. Direct answers to real questions, which is
precisely what gets pulled into AI Overviews.

Rules: written once, stored in the copy module (`CLAUDE.md` convention), never
generated per-request. **No AI-written filler.** A page with two honest sentences
outranks a page with six paragraphs of hedged padding, and the padding is what
triggers helpful-content scrutiny.

---

## 7. Entity SEO and the knowledge graph

Search engines increasingly reason about *entities*, not keywords. Zuby needs to
be an entity, and every chef needs to be one.

**Organization schema on every page** — name, URL, logo, `sameAs` pointing at every
profile we control (Instagram, LinkedIn, X, Crunchbase when it exists). `sameAs`
is the primary mechanism for consolidating scattered brand mentions into one
knowledge-graph entity.

**Each chef as `LocalBusiness`** (already shipped, Phase 1) — extended over time
with `servesCuisine`, `areaServed`, `openingHoursSpecification` from the timings
schema, `priceRange`, and `hasMenu` pointing at the menu items.

**`ItemList` on every listing page**, positioned so the ordering is meaningful.

**`FAQPage`** on city, intent and trust pages. Rich-result eligibility has narrowed
over time, but the extraction benefit for answer engines has grown — the format is
exactly what a model wants to lift.

**`BreadcrumbList`** everywhere (shipped) — reinforces hierarchy and improves SERP
display.

**Validation in CI, not by hand.** A build step that renders one instance of each
page type and validates the emitted JSON-LD. Structured data breaks silently: a
schema change ships, rich results vanish, and nobody notices for six weeks.

---

## 8. Answer Engine Optimisation (AEO)

Concrete practices, in rough order of leverage.

**Answer in the first sentence.** Not "Zuby is a platform that aims to help you
discover…" but "There are 12 verified halal home chefs in Koramangala." Models
extract from the top. So do humans.

**One question per heading, phrased as asked.** "How do I order from a home chef?"
outperforms "Ordering" — it matches the query and gives the model a clean
question-answer pair to lift.

**Numbers, dates, specifics.** "12 chefs, verified as of 23 August 2026" is
citable. "Many chefs" is not. Specificity is the single strongest signal that a
page contains real information.

**Tables for comparisons.** Models parse tables reliably and reproduce them in
answers. A dietary-tag comparison table is more likely to be cited than the same
content as prose.

**Say the entity name.** Pronouns break extraction. "Zuby verifies every chef's
FSSAI number" survives being lifted out of context; "we verify it" does not.

**`llms.txt` at the root.** An emerging convention — a markdown map of the site
for language models. Genuinely uncertain payoff; near-zero cost. Cheap optionality,
and we should say so honestly rather than overclaiming.

**Never fabricate.** If we claim chef counts we don't have, a model will repeat the
claim, a user will check, and the trust — which is the entire product per
`CONCEPT.md` — is gone. Every number on every page comes from a live query.

---

## 9. Crawler policy: who we let in

The default instinct is to block AI crawlers. **For Zuby that instinct is wrong.**

We are a directory. Our product is being found. A model that has read Zuby can
recommend Zuby; a model that hasn't, can't. We have no paywalled archive to
protect and no ad impressions to lose. The asymmetry is stark: blocking costs us
citations and gains us nothing.

| Crawler | Operator | Purpose | Policy |
|---|---|---|---|
| `Googlebot` | Google | Search + AI Overviews | **Allow** |
| `Google-Extended` | Google | Gemini training | **Allow** |
| `Bingbot` | Microsoft | Search + Copilot | **Allow** |
| `OAI-SearchBot` | OpenAI | ChatGPT Search results | **Allow** |
| `ChatGPT-User` | OpenAI | Live fetch on user request | **Allow** |
| `GPTBot` | OpenAI | Model training | **Allow** |
| `PerplexityBot` | Perplexity | Search index | **Allow** |
| `ClaudeBot` | Anthropic | Index + training | **Allow** |
| `Applebot-Extended` | Apple | Apple Intelligence | **Allow** |
| `CCBot` | Common Crawl | Open dataset | **Allow** |

**Two nuances worth knowing.** `Google-Extended` controls Gemini training only —
it does **not** control AI Overviews, which use the standard Google index. Blocking
it does not remove you from AI Overviews; the only way out of those is out of
Google entirely. And `OAI-SearchBot` (search) is distinct from `GPTBot` (training):
blocking the latter while allowing the former is the "cite me but don't train on
me" position, which is coherent for publishers and pointless for us.

**Blocked regardless:** `/admin`, `/dashboard`, `/claim`, `/login`, `/auth`, and
`/search` (interactive, parameterised, no unique indexable content). Blocked in
`robots.txt` *and* `noindex` — robots.txt prevents crawling, not indexing of a URL
discovered via a link.

**What robots.txt cannot do:** stop scrapers who ignore it. Our data is public by
design. The defence against a competitor cloning our listings isn't obfuscation —
it's that they can copy the data and not the verification, the freshness, or the
chef relationships.

---

## 10. International expansion

### Sequencing, and why

`CONCEPT.md` is explicit: Bangalore, prove it, then Singapore. The temptation at
every stage is to open a new market because the code supports it. The code
supporting it is not the constraint — **supply density is.** A market with 8 chefs
generates ~4 qualifying pages and no traffic; a market with 80 generates ~200 and
compounds.

The recommended order, and the reasoning:

1. **Bangalore** — prove the engine. Target: 50+ chefs, 3 first-page long-tail rankings.
2. **Delhi NCR / Mumbai / Hyderabad / Pune** — same language, same regulator
   (FSSAI), same currency, zero new code. Pure supply operations.
3. **Singapore** — first international. Small, dense, English-speaking, high
   willingness to pay. New regulator (SFA), new currency, new halal authority (MUIS).
4. **Malaysia** — natural follow-on: shared halal-forward market, similar cuisine
   overlap with both India and Singapore, JAKIM certification, MYR.
5. **Gulf (UAE first)** — large Indian diaspora, halal-default market, strong
   home-catering culture. Only after 3 and 4 prove the international playbook.

### hreflang

Not needed while India-only. Needed the moment two markets serve overlapping
English-language content, because `/bangalore` and `/singapore` will otherwise
compete for generic "home chef" queries.

```
<link rel="alternate" hreflang="en-in" href="https://zuby.food/in" />
<link rel="alternate" hreflang="en-sg" href="https://zuby.food/sg" />
<link rel="alternate" hreflang="en-my" href="https://zuby.food/my" />
<link rel="alternate" hreflang="x-default" href="https://zuby.food/" />
```

Applied at the country-hub level, not per chef page — chef pages are inherently
local and have no equivalent in another market. `x-default` points at the global
home page, which geo-routes.

### Currency and locale

Already correct in the schema: prices carry a currency code, cities carry a
timezone, countries carry a phone prefix. The rule from `CLAUDE.md` — never
hardcode `₹`, `Bangalore`, `India`, or IST — is what makes market three cost a
data migration instead of a rewrite. Every new formatting helper must be checked
against it; this is the most common place multi-country intent quietly dies.

### What does *not* change per market

Brand, trust model, WhatsApp-native ordering, URL structure, page grid. The
playbook ports. Only the regulator, the currency, the halal authority and the
cuisine vocabulary are market-specific — and all four are already data, not code.

---

## 11. Singapore

The second market, per `CONCEPT.md`. Different enough to need its own thinking.

**Regulatory.** Home-based food businesses operate under SFA's Home-Based Small
Scale Business scheme: no hired staff, no bulk catering, no industrial equipment.
This is *narrower* than India's FSSAI regime, and the constraint is a content
opportunity — "what Singapore home chefs can and cannot legally sell" is a
genuinely under-answered question that we can answer authoritatively. The schema
already carries `sfa_compliant` and `muis_certified`.

**Halal is the wedge.** `CONCEPT.md` calls this out: premium halal in a city where
it's underserved. MUIS certification is the recognised authority and carries far
more weight than a self-declared tag. `/sg/halal` and its neighbourhood variants
are the highest-value pages in the market. Precision matters — MUIS-certified,
muslim-owned, and no-pork-no-lard are three different claims, and conflating them
is both an SEO failure and a trust failure.

**Geography inverts the model.** Singapore is 50 km end to end with excellent
transit. Radius search matters less; *estate* matters more. Tampines, Jurong East,
Punggol, Woodlands, Bedok are the units, and HDB block clusters are how residents
actually think about proximity. Expect the neighbourhood layer to carry more weight
and the radius filter less.

**Competition is different.** Not Swiggy and Zomato but WhatsApp groups, Telegram
channels, Carousell, and Facebook Marketplace. Less SEO competition for home-food
queries, which means faster ranking — and a smaller total query volume, so the
ceiling is lower and the climb is quicker.

**Language.** English is sufficient for V1. Malay and Mandarin matter for depth
later, and `CLAUDE.md` rules out multi-language UI in V1 — but cuisine vocabulary
should absorb local terms (*nasi padang*, *mee rebus*, *bak chor mee*) as cuisine
slugs from day one. Those are data, not UI language, so they don't violate the rule.

---

## 12. Malaysia

Not in `CONCEPT.md` — proposed here as market four, with reasoning.

**Why it follows Singapore naturally.** Shared halal-forward consumer base and
regulatory literacy, overlapping cuisine vocabulary with both Singapore and India,
English widely used online, MYR is a straightforward currency addition, and a large
existing home-catering culture (*kuih* sellers, Ramadan bazaar economics, home-based
*nasi lemak* operations) that is almost entirely undigitised.

**JAKIM is the halal authority** — the Malaysian equivalent of MUIS, and one of the
most internationally respected halal certifications. This needs a schema field
alongside `muis_certified`, not a reuse of it: they are different authorities with
different scopes, and a buyer who cares about one cares about the distinction.

**Geography is closer to India than Singapore.** Kuala Lumpur sprawls; Petaling
Jaya, Shah Alam, Subang Jaya, Cheras are distinct sub-markets with real distance
between them. Radius search matters again. Penang and Johor Bahru are separate
launches, not extensions of KL — Johor Bahru has interesting cross-border dynamics
with Singapore worth a dedicated look.

**Ramadan is the seasonal peak** and needs planning a quarter ahead. Home-food
demand spikes enormously for *iftar* and *sahur*, and the query patterns are
seasonal and predictable. A market entry timed to land two months before Ramadan
with supply already in place would compound unusually fast.

**Language.** Bahasa Malaysia matters more here than Malay does in Singapore — a
meaningful share of local food search is in Malay. This is the first market where
`CLAUDE.md`'s no-multi-language-UI rule becomes a real constraint rather than a
theoretical one. Recommendation: keep the UI English through market entry, but
treat Bahasa content pages as the first candidate for the eventual i18n phase, and
make sure the copy module's structure doesn't foreclose it.

---

## 13. Pan-India rollout

The largest opportunity and the easiest to fumble, because nothing technical stops
us from switching on thirty cities tomorrow.

**Nothing technical should be the constraint. Supply density must be.** The gate
for opening a city: **20 approved chefs across at least 3 neighbourhoods.** Below
that, the city generates a handful of qualifying pages, ranks for nothing, and
teaches Google that our city pages are thin — damage that transfers to the cities
that *are* dense, because these patterns are evaluated site-wide.

**Tier structure:**

- **Tier 1** — Delhi NCR, Mumbai, Hyderabad, Chennai, Pune. Metro density,
  high disposable income, existing home-chef economies. Each is a Bangalore-sized
  opportunity.
- **Tier 2** — Ahmedabad, Kolkata, Jaipur, Kochi, Chandigarh, Indore. Smaller but
  far less competitive; several have distinctive regional cuisines that make
  strong differentiated content (Kochi's Malabar food, Indore's snack culture).
- **Tier 3** — everything else, opened on demand when organic chef signups from a
  city cross the threshold on their own. Let demand pull the market open.

**Regional cuisine is the pan-India moat.** No national competitor does justice to
Malabar, Chettinad, Kumaoni, Bohri, Sindhi, Naga, Kashmiri Wazwan cooking. Home
chefs are precisely where these cuisines actually live, because restaurants
homogenise toward north-Indian defaults. A well-written page for a cuisine with 8
chefs and no competition ranks faster than a biryani page with 40 chefs and heavy
competition. **Depth beats breadth** in the tail.

**Language is the biggest unlock and the biggest cost.** Hindi, Tamil, Telugu,
Kannada, Bengali and Marathi search volumes for food queries are enormous and
under-served. This is genuinely out of V1 scope per `CLAUDE.md`, and it is the
single largest post-V1 SEO opportunity in the plan. It should be its own phase,
with real translation rather than machine output — machine-translated food content
reads as spam to both users and Google, in every language.

---

## 14. Local, Maps and the home-address problem

Worth being blunt: **Google Business Profile is largely unavailable to us, and
pretending otherwise wastes effort.**

GBP requires a verifiable business address and, for service-area businesses,
in-person service. Our chefs operate from home kitchens and — per Phase 1's column
allow-list — we deliberately never expose precise addresses, only approximate
coordinates. Encouraging chefs to create GBP listings at their home addresses would
be actively irresponsible: it publishes a woman's home address alongside her name
and phone number. That trade is not worth a Maps pin.

**What we do instead:**

- **A GBP listing for Zuby itself** as a business, which supports brand queries
  and knowledge-panel presence.
- **`LocalBusiness` schema per chef with `areaServed` rather than a precise
  address** — communicates locality to search engines without publishing anything
  private. This is the correct primitive for our situation and we already emit it.
- **Win the organic result above the Maps pack instead.** For "home chef
  Koramangala" the local pack is weak — these businesses aren't in Maps — which
  means the organic slot is unusually winnable. Our structural weakness in Maps is
  also the reason our competitors aren't there either.
- **Neighbourhood pages as the local surrogate.** They carry the local signal that
  a Maps listing would.

Chefs who *want* a GBP listing and understand the privacy trade-off are free to
create one; we should document the trade-off honestly in the chef help content and
never nudge.

---

## 15. Performance as a ranking input

Core Web Vitals are a real but modest ranking factor, and a large conversion
factor. The targets in the Phase 5 prompt (LCP < 2.0s, CLS < 0.05, INP < 200ms)
are correct and should be enforced by CI, not by good intentions.

The India-specific point that matters more than the metric: **a meaningful share of
our traffic is a mid-range Android phone on congested 4G.** Not a MacBook on
fibre. Every decision — image weight, JS bundle, font loading — should be judged
against that device. The `CLAUDE.md` rule of no new public-route dependency over
20 kB gzipped without sign-off is the enforcement mechanism, and it is worth
defending against every plausible-sounding exception.

Image discipline matters most, because food directories are image-heavy by nature:
correct `sizes`/`srcset`, modern formats, explicit dimensions to prevent layout
shift, lazy-loading below the fold, and a genuinely descriptive `alt` — which is
also the Google Images play, and the accessibility obligation, at the same time.

---

## 16. Off-site: the parts we don't own

**Instagram is where Indian home chefs already are.** Every chef with an Instagram
presence linking to their Zuby profile is a real, editorially-given link and a
referral path. The chef dashboard captures `instagram_handle`; the reciprocal ask
— "add your Zuby link to your bio" — should be part of chef onboarding copy. This
is the highest-yield off-site work available to us.

**WhatsApp forwards are the native distribution channel** and are invisible to
analytics. A Zuby link forwarded into a Koramangala apartment group is worth more
than a backlink and will never appear in Search Console. This is what the
UTM-tagged share button is for — imperfect attribution beats none.

**Local press and food blogs.** Bangalore has an active food-writing scene. The
angle that works is the story, not the product: women running kitchens, cuisines
that restaurants have abandoned, zero-commission economics. `/about` and `/trust`
exist as link targets for exactly this.

**Reddit and Quora are increasingly cited by answer engines**, which makes genuine
participation disproportionately valuable — r/bangalore gets asked about tiffin
services constantly. Genuine participation only. Astroturfing a trust-first brand
is a category error, and the downside if caught is existential rather than
proportional.

**Directory listings and aggregators** — Justdial, Sulekha, Zomato-adjacent
listings. Low quality individually, useful in aggregate for entity consolidation
(§7) as long as NAP details stay consistent.

---

## 17. Measurement

Four KPIs from `CONCEPT.md`, plus the leading indicators that predict them.

| KPI | Target (day 60) | Source |
|---|---|---|
| Verified chefs | 50, ideally 100 | `chefs` where approved |
| Weekly unique visitors | 1,000 | `events` distinct visitor hash + Vercel Analytics |
| Weekly WhatsApp clicks | 100 | `events` where `wa_click` |
| First-page long-tail rankings | 3 | Search Console, manual until API |

**Leading indicators** — these move weeks before the KPIs do, and are what to watch
when the KPIs look flat:

- Indexed page count vs submitted (coverage gap = a technical problem, now)
- Impressions before clicks — impressions rising with flat clicks means we rank on
  page two, which is a title/description problem, not a content problem
- Average position for the tracked query set
- **Brand search volume** — the strongest long-term health signal (§2)
- **Citation appearances in AI answers** — manual for now; check a fixed query set
  monthly across ChatGPT, Perplexity and Google AI Overviews and log what's said
  about us. There is no tooling for this worth paying for yet; a spreadsheet and
  twenty minutes a month is the right instrument.
- wa_click by neighbourhood and cuisine — **this is the supply-recruitment signal.**
  High clicks with low chef count in an area means go recruit there.

The weekly ritual lives in `docs/seo-playbook.md`. The discipline that matters is
`CONCEPT.md`'s: **if the metrics are flat, fix the funnel — don't ship features.**

---

## 18. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| **Thin/doorway pages trigger a site-wide quality demotion** | **Critical** | The ≥2 threshold (§5), enforced in one place, 404 below it. This is the single largest risk in the plan. |
| Scaled-content-abuse policy hits programmatic pages | High | Real editorial components (§6), real listings, no AI filler. The policy targets low-value generation, not generation per se. |
| Faceted-filter index bloat | High | `noindex` on all parameterised search; canonical to the clean page. |
| Supply collapse in a neighbourhood empties pages | Medium | Pages disappear gracefully below threshold; monitor for sudden 404 spikes. |
| Answer engines cite without sending traffic | Medium | Accept it — §2. Conversion is a WhatsApp click we still own. Track brand search as the real signal. |
| Competitor scrapes the directory | Medium | Data is public by design. Moat is verification, freshness, relationships — not obscurity. |
| Chef privacy: home addresses leak into an index | **Critical** | Column allow-list at the query layer (Phase 1), approximate coordinates only, no GBP push (§14). |
| Core update volatility | Medium | Diversify across surfaces (§3); don't over-index on one Google feature. |
| A JS-rendering regression makes pages invisible | High | SSR is a hard rule; add a CI check that fetches a page with JS disabled and asserts content. |
| Multi-country hardcoding creeps in | Medium | `CLAUDE.md` rule; review every formatting helper. |
| City slug collision breaks routing | Low now, High at market 3 | Global slug uniqueness constraint (§4) — add before Singapore, not during. |

---

## 19. Sequencing

**Now — Phase 5, Bangalore.** The page grid at scale with thresholds enforced.
Technical hardening: GSC and Bing verification, split sitemaps with real `lastmod`,
robots policy per §9, `llms.txt`, canonical and H1 audit. Structured-data
validation in CI. Performance budgets in CI. PWA. `/admin/metrics`. `/about` and
`/trust`. The playbook.

**Next — pan-India, gated on supply.** City gate of 20 chefs across 3
neighbourhoods. Tier 1 first. Regional-cuisine content depth as the differentiator.

**Then — Singapore.** Global slug uniqueness constraint *before* launch. Country
hubs and hreflang. SFA and MUIS content. Estate-level geography.

**Then — Malaysia.** JAKIM as a distinct field. Ramadan-timed entry. First serious
case for Bahasa content.

**Post-V1, own phase — Indian language content.** The largest single opportunity
in this document, explicitly out of V1 scope, and the thing most likely to be done
badly if rushed.

---

*Living document. Revisit each phase boundary and each market entry. Where this
disagrees with `CONCEPT.md`, `CONCEPT.md` wins.*
