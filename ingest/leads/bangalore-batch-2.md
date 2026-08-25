# Bangalore home-chef leads — batch 2

Follow-up to `bangalore-batch-1.md`, run in response to "find at least 100
home chefs." Same method (web search of public food-blog/news coverage, not
Instagram/Maps scraping) and the same honest ceiling: this round covered
more neighbourhoods and cuisines and found 11 more real, named, distinct
kitchens — bringing the running total to **24** — but the yield per search
round is clearly diminishing (later queries mostly resurfaced the same
handful of LBB articles rather than new names), and web search alone was
never going to reach 100 with real, verifiable entries. See "Why not 100"
at the bottom for what actually would.

**Zero phone numbers found this round.** Every entry below needs a human
to DM the Instagram handle or call before it's anywhere near
`pending_review` — same rule as batch 1's unready section, restated because
it applies to all 11 of these.

| Kitchen | Chef/owner | Cuisine | Area | Source |
|---|---|---|---|---|
| Sneha Vachhaney's kitchen | Sneha Vachhaney | Home thali — dal, rice, dry veg stir-fry, salad | Serves Bellandur, Sarjapur, Koramangala, Yamlur | LBB |
| Bhavesh's tiffin | Bhavesh | North Indian tiffin staples | Serves Indiranagar, Domlur | LBB |
| Travancore Tasties (Papadum & Some) | Tresa Francis (lawyer-turned-food-entrepreneur) | Malayali Syrian Christian — appam, stew, red fish curry | — | [LBB — Travancore Tasties](https://lbb.in/bangalore/travancore-tasties-online/) |
| Leesona Lawrence's kitchen | Leesona Lawrence | Thrissur meen (fish) curry — grandmother's recipe | — | Instagram `@leesonalawrence`, surfaced via LBB/search — self-published, not independently verified by a third-party article |
| Shetty's Coast To Table | Sumanth Shetty | Mangalorean coastal — ghee roast, Kundapur curry ("mum's recipes") | — | [LBB — Coast To Table](https://lbb.in/bangalore/order-mangalorean-coastal-food-shettys-coast-to-table/) |
| Sugar Rush by Samiksha | Samiksha | Eggless cakes, vegan fortune cookies, sugar cookies | — | [LBB — Sugarush by Samiksha](https://lbb.in/bangalore/sugarush-by-samiksha-home-baker-eggless-vegan-cakes-cookies/) — article says orders taken by call/WhatsApp, but doesn't publish the number |
| The Happy Baker | — | Whole-grain, eggless, gluten-free, organic cakes | — | [LBB — The Happy Baker](https://lbb.in/bangalore/the-happy-baker-145927/) |
| Honeypots | Inchara | Tea cakes — whole-wheat eggless plum cake and others | — | [LBB — Honeypots](https://lbb.in/bangalore/order-cakes-cupcakes-desserts-honeypots/) |
| Cake My Heart | — | Vegan/eggless desserts — Instagram-trend cakes, cupcakes, macaroons | — | [LBB — Cake My Heart](https://lbb.in/bangalore/cake-my-heart-vegan-eggless-desserts-cakes/) |
| Fisherwoman | Shalini & Abhishek (founders), Joseph (chef) | Seafood — dishes from multiple coastal cuisines | Sarjapura / Bellandur | [LBB](https://lbb.in/bangalore/order-seafood-dishes-online-fisherwoman-bangalore/); also has its own site (fisherwoman.in) and a Zomato listing, so this reads more like a small registered cloud kitchen than a solo home cook — flag for the admin to judge fit before approving |
| Sumi's Kitchen | Sumitra K | Andhra Brahmin thali, pickles & podis (ships nationwide) | — | [LBB — Sumi's Kitchen](https://lbb.in/bangalore/andhra-brahmin-thali-sumis-kitchen/) |

---

## Why not 100

Web search surfaces what food blogs and journalists have already written
about — a few dozen kitchens at most, clustered around whichever ones LBB
and The Better India happened to profile, and the same names resurface
across different search angles (Mahajabeen Sheikh's kitchen, the original
"Top Home Chefs" LBB roundup, etc.). That's a real ceiling on this method,
not a sign of not trying — this round ran 11 more search queries
specifically targeting neighbourhoods and cuisines batch 1 hadn't covered
yet, and the marginal hit rate for genuinely new names was already dropping
by the end of it.

Three ways to actually get to 100+, in order of how much this session can
help with each:

1. **The TomTom Maps connector** (surfaced this session, not yet
   connected) — an official POI-search API, not scraping. Could search
   "tiffin service" / "home food" / "catering" across Bangalore's
   neighbourhoods and return real, licensed business listings with
   addresses and often phone numbers. Skews toward *registered* tiffin/
   catering businesses (which may be exactly the easier-to-verify slice of
   this market) rather than Instagram-only home cooks — a different, not
   lesser, source. Needs connecting via claude.ai's connector settings and
   likely an API key/account on your end.
2. **Manual outreach using these two leads files as a starting kit** — the
   24 real, named, sourced kitchens across both batches, worked through by
   you or a VA calling/DMing each one. This is slower per-chef but is the
   only path to a phone number for a home cook whose only public presence
   is an Instagram bio, which is most of them.
3. **What CONCEPT.md already expects**: "we scrape and add content... so
   the directory is useful on day one" was never meant to mean a fully
   automated pipeline gets you to launch scale on its own — the ingest
   pipeline (this repo's `ingest/`) is built to make *processing* real
   leads fast once you have them, not to manufacture leads that don't
   exist yet. Getting from 24 to 100 real Bangalore home chefs is
   fundamentally a recruitment problem, the same one `docs/seo-playbook.md`
   and `/admin/metrics` are built to help you work — not a data-processing
   one this session can solve by searching harder.
