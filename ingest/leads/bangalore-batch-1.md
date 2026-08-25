# Bangalore home-chef leads — batch 1

Sourced 2026-08-25 via web search of public food-blog roundups and news
coverage. **Not scraped from Instagram or Google Maps** — see
`ingest/README.md`'s "Ethics and the law" section for why, and the session
notes for the fuller reasoning (Instagram/Maps scraping violates both
platforms' terms and this repo's own documented ethics policy).

**Every fact below is attributed to the article it came from.** Nothing is
invented. Where an article didn't state a phone number, area, or FSSAI
status, that field is left blank here too — per `ingest/README.md`: *"Never
invent data; a blank cell is better than a guess."*

This sandbox's web-fetch tool is blocked for essentially every blog/lifestyle
domain (`lbb.in`, `magicpin.in`, `stayeatsee.com`, `sulekha.com`, even
`en.wikipedia.org`) — confirmed by testing, not assumed. Only web *search*
worked, which returns short snippets, not full articles. That's the ceiling
on how much could be verified from here in one session: two records below
have a publicly-published phone number and are close to ingest-ready; the
rest are real, named, sourced leads that need a **human** to actually call or
DM before they can go anywhere near `pending_review` — a phone/WhatsApp
number is required for the site's core feature (the WhatsApp order button)
to work at all, and none of these should be promoted without a real
verification call regardless, per the standard admin-approval flow.

**Update:** both records in the "ready" section below have since been loaded
into the real database by hand (direct SQL, not the ingest pipeline — see
the session notes). **Pâte Sucrée is approved and live.** **Karnivore
Kitchen By Kalyan is still stuck in `pending_review`** — it was inserted
with no neighbourhood, and a fix from this same session now blocks
approving any chef without one (a chef page's only URL is
`/<city>/<neighbourhood>/<chef>`). It needs its area confirmed on the
verification call, then:
```sql
update public.chefs set neighbourhood_id = (
  select id from public.neighbourhoods
   where city_id = '00000000-0000-4000-8000-000000000101' and slug = 'the-real-area-slug'
) where slug = 'karnivore-kitchen-by-kalyan';
```
before it can be approved from `/admin/queue`.

See `bangalore-batch-2.md` for a second, larger round — same method, same
constraints, run after the request to find "at least 100."

---

## Ready for the ingest pipeline (phone number publicly published)

### Karnivore Kitchen By Kalyan
- **Chef:** Kalyan Gopalakrishna
- **Cuisine:** Old-Bangalore Naati-style meat cooking — Bannur mutton, pork,
  mutton biryani/pulao (Kalyan himself calls it a pulao, not a biryani)
- **Phone:** 9972192511 (article also lists 9996071932 as an alternate —
  unclear which takes WhatsApp orders; call to confirm, don't assume)
- **Area:** not stated in the source — needs confirming
- **Source:** [LBB — Order Food From The Top Home Chefs In Town](https://lbb.in/bangalore/top-favourite-home-chefs-in-bangalore-order-online/)

### Pâte Sucrée
- **Chef:** Sonya Balasubramanyam (former journalist, Le Cordon Bleu
  Bangkok — Certificat de Pâtisserie de Base)
- **Cuisine:** Home baking — cakes, galettes, pies, tarts
- **Area:** Whitefield (delivery ₹100 within Whitefield, ₹300 elsewhere in
  Bangalore per the article — worth asking if that's still current)
- **Contact:** +91 98861 24094, patesucreebangalore@gmail.com
- **Note:** orders need 48 hours' notice per the article
- **Source:** [LBB — Pâte Sucrée, Home Baker in Bangalore](https://lbb.in/bangalore/pate-sucree-bakery-whitefield/)

---

## Real, named leads — need a human to make contact before anything else

No phone number was found in the public search snippet for any of these.
Someone (not an automated tool) needs to DM the Instagram handle or call a
listed number to get a real contact, confirm they're still operating, and
ask about FSSAI registration — exactly the admin-verification conversation
every listing needs anyway.

| Kitchen | Chef/owner | Cuisine | Area | Source |
|---|---|---|---|---|
| Kori Rotti / Colonnade Caterers ("Biryani Aunty") | — | Dum, Hyderabadi, Bangalore, Bhatkali and "authentic Muslim" biryani | — | [LBB](https://lbb.in/bangalore/top-favourite-home-chefs-in-bangalore-order-online/) |
| Mahajabeen Sheikh's kitchen | Mahajabeen Sheikh | Dum biryani by the kilo — mutton, chicken, fish, prawn | Kamanahalli | [LBB — Biryani Home Chefs Bangalore](https://lbb.in/bangalore/biryani-home-chefs-bangalore/) |
| Tona's Biryani | Azra Sidhan | Biryani caterer, 11 varieties | — | [LBB — Tona's Biryani](https://lbb.in/bangalore/tonas-biryani-bangalore/) |
| Chef's Touch | — | Biryani & kebabs | — | [LBB](https://lbb.in/bangalore/beat-your-midweek-blues-with-6c3a1a/) |
| Lady and Ladle | Fathima Riyaz | Bhatkali cuisine — vermicelli biryani, Bhatkali biryani | — | LBB (found via search summary; re-verify before use) |
| Apna Thakur's Kitchen | — | Daily/weekly tiffin subscriptions | — | Instagram handle surfaced in search: `@apnathakurskitchen` — self-published, not independently verified by a third-party article |
| Pooja Patil's kitchen | Pooja Patil | Maharashtrian thali (veg ₹200 — curry, starter, rice, jowar roti, sweet); weekend delivery, order by Friday | — | LBB |
| Nida and Nidhi's Home Kitchen | Nida & Nidhi | Cakes, bakes, gift hampers/baskets | — | [The Better India — 10 Best Home Kitchens in Bengaluru](https://thebetterindia.com/298498/best-home-kitchens-in-bengaluru-to-order-from-deliver-biryani-pasta-cakes-meals/) |
| Wullar Kitchen | — | Kashmiri — mutton yakhni, rogan josh, waed prawns, chaat ras rice bowl | — | The Better India (as above) |
| Chef Sahar Adil's Kitchen | Sahar Adil | Multi-regional Indian | — | The Better India (as above) |
| Venus Menon's Home Cooking | Venus Menon | Ghee roast, payasam | — | The Better India (as above) |

Wullar Kitchen is worth prioritising for outreach: Kashmiri is one of the
cuisines added to `supabase/seed.sql` last session and currently has zero
chefs, so it's the difference between that landing page qualifying
(≥2 chefs) or continuing to correctly 404.

---

## How to actually load the two ready ones

Paste-collector format (`ingest/README.md`) — blocks separated by `---`:

```
Karnivore Kitchen By Kalyan
Chef Kalyan Gopalakrishna. Old Bangalore Naati style meat cooking — Bannur mutton, pork, mutton biryani/pulao.
Phone 9972192511
Source: https://lbb.in/bangalore/top-favourite-home-chefs-in-bangalore-order-online/
---
Pate Sucree
Sonya Balasubramanyam. Home baker — cakes, galettes, pies, tarts. Le Cordon Bleu trained.
Area: Whitefield
WhatsApp 9886124094
Source: https://lbb.in/bangalore/pate-sucree-bakery-whitefield/
```

Verified this parses cleanly against the real `collectPaste()` normaliser
(phones convert to E.164, the `Area:` line is picked up) — see the session
notes for the exact command. Not run against a live database: this sandbox
has no Supabase project connected, and the ingest CLI talks to Supabase's
REST API (`@supabase/supabase-js`), not a raw Postgres connection, so even
the local PostGIS instance used elsewhere this session couldn't stand in
for it.

**To actually load these:** GitHub → Actions → **Ingest chefs** → Run
workflow → source = `paste` → paste the block above → tick "Preview only"
first to confirm → untick and run for real → review in the admin queue like
any other candidate. Neither should be approved without an admin actually
calling the kitchen first — the phone number being public doesn't mean the
FSSAI/verification conversation is done.
