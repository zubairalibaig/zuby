# Zuby — The Concept

> **This file is the canonical source of truth for what Zuby is.**
> Every contributor — human or AI — must read this before writing code or making product decisions.
> If a proposed feature or change contradicts this document, the document wins until the founder explicitly updates it.

## What Zuby is

Zuby is a searchable directory of verified home chefs and tiffin services. Think of it as Google for home cooks — filtered by where you live, what you want to eat, and what you care about (halal, veg, jain, egg-free, healthy).

A person in Bangalore opens Zuby, allows location, and immediately sees home chefs within 5 kilometres of them. They see the chef's name, their photo, their menu, their prices, their FSSAI number, verification badge, cuisines they specialise in, and dietary tags. They tap a button and it opens a WhatsApp chat with that chef, pre-filled with what they want to order. The chef takes it from there, exactly the way they already run their business today.

Zuby doesn't hold the money. Zuby doesn't arrange delivery. Zuby doesn't manage the order state. Zuby's job is discovery and trust — helping the right buyer find the right chef, and giving both sides enough signal to transact with confidence. The order itself happens on WhatsApp, the way tens of thousands of home food orders already happen every day in Indian cities.

## Why Zuby exists

Home-cooked food in Indian cities is enormous, invisible, and inefficient. There are tens of thousands of home chefs — mostly women, often exceptional cooks — running micro-businesses out of their kitchens. Their customers find them through neighbourhood WhatsApp groups, Instagram DMs, printed flyers stuck on apartment noticeboards, and word of mouth. Discovery is broken. Trust is patchy. Quality is invisible until you order.

The existing marketplaces — Homeal, Cookr, MyKhaana, Mealawe — have solved parts of this by becoming full-stack platforms: they onboard chefs, take orders, process payments, arrange delivery, and charge 20 to 35 percent commission for the privilege. This works, but it forces chefs to either pay a big cut or stay invisible. Most stay invisible.

Zuby's insight: you don't need to own the transaction to solve the discovery problem. A well-built directory with real geo-search, real verification, and a friction-free way to contact the chef is enormously valuable on its own. Chefs love it because they pay nothing and keep 100% of their revenue. Buyers love it because they finally have one place to search instead of eight WhatsApp groups. Zuby wins because it becomes the default entry point — and everything that comes later (payments, delivery, subscriptions) is easier once we already own the discovery layer.

## Who Zuby is for

**Buyers** are urban professionals and families in Indian metros who want healthier, more authentic alternatives to restaurant food. They're the people who cook when they can and order out when they can't — but the "order out" default of Swiggy or Zomato leaves them eating restaurant food they don't really want. When they think "I wish someone would just cook me a nice ghar-ka-khana meal today," Zuby is the answer. Primary use case: "I'm at home or at work, I'm hungry now or planning tomorrow's meal, show me who's cooking near me."

**Chefs** are home-based cooks and small tiffin operators — the aunty in Koramangala making the best kori rotti in the neighbourhood, the ex-corporate mother in Indiranagar who quit to run a two-tiffin-a-day operation, the graduate student in HSR Layout selling weekend biryani through Instagram. Most are women. Most run everything themselves. They want visibility without giving up control. Zuby gives them a public profile, geo-visibility, and free customer flow — while they continue to take orders and payments the way they always have.

**Admins** are the Zuby team, verifying each chef manually before their profile appears publicly. This is the trust moat. No chef ever appears in search until a human at Zuby has looked at their FSSAI, their photos, their address, and approved them.

## Where Zuby operates

Zuby launches in **Bangalore first**. All initial marketing, chef outreach, and buyer acquisition is Bangalore-only — starting in high-density neighbourhoods where home-chef supply and buyer demand already coexist: Indiranagar, Koramangala, HSR Layout, Whitefield, Jayanagar, Marathahalli, Bellandur.

But Zuby is **architected for multiple cities and multiple countries from day zero**. The database understands countries and cities as first-class entities. Prices carry currency codes. Regulatory fields exist for both India (FSSAI) and Singapore (SFA compliance). This is a design constraint, not a feature — retrofitting multi-country later is a rewrite; doing it now costs almost nothing.

The **second country is Singapore**, turned on later via a configuration change and a data migration. Singapore has a very different market: strict home-based food regulations (no catering, no bulk, no hired staff), a small dense geography, a different currency (SGD), different payment rails (PayNow), and a strong halal segment where MUIS certification matters. Zuby's Singapore proposition leans into premium halal — but that's Phase 2 country, not V1.

Expansion beyond these two, to other Indian cities or other countries, happens after Bangalore is proven. Not before.

## What makes Zuby different from what exists

**Directory-first, not marketplace-first.** Zero commission at launch. Chefs keep 100% of their revenue. This makes chef onboarding radically easier — we're offering visibility, not asking for a cut. Competitors have to convince chefs to give up 25% before they've earned any trust. Zuby earns the relationship first.

**Real geo-search from day one.** Not "show all chefs in Bangalore, sorted by rating." Actual radius-based filtering using proper geo-indexed queries (PostGIS), matched against each chef's declared service radius. If the chef says "I serve within 5 km of my kitchen," they only appear to buyers within that 5 km. This is basic infrastructure that competitors underinvest in and it's the single most important discovery feature.

**Trust as a visible, non-negotiable feature.** Every listing shows the chef's FSSAI number, verification badge, and dietary certifications. Halal, veg, jain, egg-free are searchable filters, not buried footnotes. Nothing appears publicly without human admin approval. Buyers who care about halal or jain food — a huge underserved audience in India — get a search experience built for them, not retrofitted.

**SEO as the growth engine, not paid ads.** Every chef gets a clean URL: `zuby.food/bangalore/indiranagar/aishas-biryani-kitchen`. Every city gets a landing page. Every neighbourhood, every cuisine. Structured data on every page so Google indexes each chef as a local business. We aim to rank on the first page of Google for hundreds of long-tail queries like "biryani home chef Koramangala" or "jain tiffin service HSR Layout." That's free, compounding traffic — and it's how a bootstrapped marketplace beats a well-funded one in year two.

**WhatsApp-native ordering.** The order button opens a pre-filled WhatsApp message to the chef. This matches how buyers and chefs already transact in India — no new app to install, no new payment flow to learn, no failed UPI transactions eating into the chef's trust. It also removes 80% of the technical scope from V1, which is what makes a one-week launch actually possible.

The strategic bet: reach 100+ verified chefs and organic buyer traffic before adding payments and delivery. When we add those later, we already have the supply and demand. We're not launching a marketplace cold — we're layering commerce on top of a live, working directory.

## What Zuby is deliberately not, in V1

Being clear about what we're *not* building matters as much as what we are. Every AI assistant, every future teammate, every enthusiastic contractor will want to add things. The answer to almost all of them is: not yet.

Not in V1:

- Payments of any kind. No Razorpay, no HitPay, no PayNow, no escrow.
- Delivery integration. No Swiggy Genie, no Porter, no Dunzo, no Pickupp.
- An order state machine, an in-app cart, an in-app checkout, a 15-minute acceptance timer.
- In-app chat between buyer and chef — they use WhatsApp.
- Ratings and reviews — we add them once we have order-volume signal to make them meaningful.
- Chef payouts, GST invoicing, TDS.
- Meal subscriptions or corporate catering flows.
- Native mobile apps — responsive web only, installable as a PWA.
- Multi-language UI.
- Any Singapore-facing feature — the schema supports it but functionally we're India-only.

When someone asks "should we also do X?", the answer is: not in V1. Log it, park it, come back to it after launch.

## The MVP shape (founder's directive)

The MVP is a **directory listing of all home chefs**:

1. **We seed supply ourselves.** We scrape and add content (public listings, Instagram pages, WhatsApp-group flyers, existing directories) so the directory is useful on day one.
2. **Chefs claim their listing.** Every seeded listing carries a "This is my kitchen — claim it" flow. Claiming requires verification.
3. **Chefs can self-serve.** A chef can log in and create their listing if it doesn't exist, and manage: timings/availability, menu items, photos, best-seller tags, prices, nutrition values, and dietary tags — **veg / non-veg / halal / jhatka / jain / egg-free**.
4. **Bangalore first, Singapore designed-in.** We start with Bangalore but the schema, URLs, and copy are multi-city/multi-country from day zero, because Singapore follows.
5. **Built in phases, not in one day.** Work proceeds through the phase prompts in `prompts/` so we don't re-code and create bugs. See `ROADMAP.md`.

## The trust and safety story

Home-cooked food carries a specific kind of trust risk. A buyer inviting a stranger's cooking into their home has to believe two things: the food is safe, and the chef is who they say they are.

Zuby's answer is a three-layer trust stack, all visible on every listing.

**Regulatory layer:** every India-based chef displays their FSSAI number (the 14-digit registration India requires for home food businesses under ₹12 lakh turnover). The number is captured at signup, displayed publicly, and manually verified by an admin before the chef goes live. In V1 we don't hit the FSSAI database programmatically — that's a Phase 8 backlog item — but the visible commitment matters. Singapore chefs will carry SFA compliance flags and, where applicable, MUIS halal certification.

**Verification layer:** every chef is human-reviewed before their profile is public. Admins see a queue of pending chefs, check their photos, their address, their FSSAI details, and either approve, reject, or ask for more information. The audit trail of who approved whom lives in the database. A verification badge appears on every approved profile.

**Community layer** (post-V1): once we have order volume, we add reviews from verified buyers — people whose WhatsApp click on a chef we can correlate with their subsequent activity. Fake reviews are a plague on Indian marketplaces; we solve for this by only accepting reviews from buyers with a demonstrable interaction history. This isn't in V1 but the data model anticipates it.

## Success in the first 60 days

We measure four things after launch, and we don't add features until these are moving in the right direction.

1. **Chef supply:** at least 50 verified chefs listed in Bangalore, ideally 100. If we can't reach 50 in 60 days, the product has a supply problem and we work on that before anything else.
2. **Buyer traffic:** at least 1,000 unique buyers on the site per week. Below that number, no amount of features helps.
3. **Engagement:** at least 100 WhatsApp click-throughs per week. This is our proxy for real intent-to-order. Every wa.me link is tracked with an approximate geohash so we can see which neighbourhoods, cuisines, and chefs are converting.
4. **Organic search presence:** ranking on the first page of Google for at least three long-tail queries by day 60. If SEO isn't kicking in by then, our page structure or metadata is wrong and we fix it.

If any of these are missing at day 60, we fix the funnel before shipping more features. This discipline — refusing to respond to weak metrics with more features — is what separates products that grow from products that die of complexity.

## The longer arc

Directory today. Marketplace tomorrow. But only if the directory earns it.

Once Bangalore has 100+ chefs and consistent buyer traffic, the next natural layer is optional in-app ordering with integrated payments. Chefs who want it opt in; chefs who prefer WhatsApp stay on WhatsApp. Zuby's take rate on in-app orders funds the growth. Delivery comes next, either via aggregators (Swiggy Genie, Porter) or a Zuby-owned rider layer in dense neighbourhoods where volume justifies it. Subscriptions and meal plans layer on top of that. Corporate catering — big-ticket, high-margin — is a separate go-to-market motion once the consumer product is stable.

Singapore turns on somewhere between month six and month twelve, depending on how Bangalore is going. Different market, different playbook, but the same code, the same brand, the same trust proposition — now leaning into premium halal in a city where that's underserved.

Two years out, if this works, Zuby is the default answer to "where do I find home-cooked food near me" in every Indian metro and the top three Singapore hubs. It's the layer of India's food economy that Swiggy and Zomato don't touch, unlocked by trust, discovery, and a refusal to over-engineer the first version.

## The one-line summary

**Zuby is the trust-first, geo-native directory of home chefs — starting in Bangalore, architected for the world, launched in a week because we're building the right thing, not everything.**

---

*Domain: `zuby.food` · Repo: `github.com/zubairalibaig/zuby` · Founder: Zubair Ali Baig*
