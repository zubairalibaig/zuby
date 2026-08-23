# Backlink & off-site outreach — an actionable checklist

**What this is not:** a way for me (or any code change) to place a link on
someone else's website. Backlinks come from another site's owner choosing to
link to Zuby — that's a human, business-development action, not something a
commit can do. This document exists because `docs/discoverability-strategy.md`
§16 ("Off-site: the parts we don't own") already names the right channels; this
turns that into a checklist you can actually work through, starting tonight.

**What earns a real link, and what doesn't.** A directory listing, a genuine
Reddit answer, a food blogger who writes about Zuby because the story is
interesting — these are real, durable links. Buying links, link farms, or
asking chefs to spam their apartment WhatsApp group with a request to "click
this link 10 times" are not — they risk a Google penalty on a brand whose
entire pitch is trust, which is a much worse outcome than a slow start. If
something on this list ever feels like it needs to be hidden from Google,
don't do it.

---

## Tonight (≈ 30 minutes, zero cost)

- [ ] **Update Zuby's Instagram bio** (`instagram.com/zuby.food`) to link
      straight to `https://zuby.food`. This is already declared as the
      Organization's `sameAs` in the site's JSON-LD (`src/lib/seo/jsonld.ts`)
      — the bio link is what makes that connection real from Instagram's side
      too, and it's the single highest-yield off-site action per §16.
- [ ] **Google Business Profile for Zuby the company** (not any individual
      chef — see the privacy reasoning in §14 for why chefs shouldn't do
      this). Register as an online service/software company, category
      "Directory" or "Food & Beverage Consultant" — whichever GBP offers that
      doesn't require a public storefront address. Supports brand-query
      knowledge-panel presence.
- [ ] **Add the Zuby link to your own LinkedIn/X/personal bio** if you have
      one with any following — same `sameAs` logic, and founder-led posts
      about *why* Zuby exists (the zero-commission story from `/about`) get
      shared more than product-feature posts.

## This week

- [ ] **Justdial** — free business listing. Category: online directory /
      local search. Use the same NAP (name/description) as `/about` so entity
      signals stay consistent (§7).
- [ ] **Sulekha** — same idea, different directory. Low individual value, but
      §16 notes these compound for entity consolidation.
- [ ] **Product Hunt** — a "zero-commission home-chef directory in Bangalore"
      launch post is a genuine story for that audience, and Product Hunt
      links carry real authority. One-time effort, evergreen link.
- [ ] **Women-in-business / women-entrepreneur directories and press**
      (SheThePeople, HerStory, YourStory's women-founders coverage). This
      isn't a generic outreach target — `CONCEPT.md`'s own framing is that
      most chefs on Zuby are women running invisible businesses, so this is
      the single most on-story press angle available, not a stretch.
- [ ] **r/bangalore, r/IndiaFoodies, r/india** — search for existing threads
      asking about tiffin services or home food (they come up regularly).
      Answer genuinely, mention Zuby only where it's the actual answer to the
      question asked, and say plainly that you built it if asked — genuine
      participation only, per §16. Never post as if you're an uninvolved
      third party recommending it.
- [ ] **Quora** — same rule. Search "tiffin service Bangalore", "home cooked
      food Bangalore", answer the actual question.

## Ongoing (as each chef is verified)

- [ ] **Ask each newly-approved chef to add their Zuby profile link to their
      own Instagram bio**, if they have one. This is worth writing into the
      approval/welcome message template (Resend transactional email, or the
      admin approval note) rather than a one-off ask — it should become part
      of onboarding, not a separate campaign. Each chef's Instagram following
      is a real, warm audience that already trusts them.
- [ ] **Local food bloggers and Bangalore food Instagram accounts.** The
      angle that works, per §16, is the story (zero-commission, women running
      real businesses, cuisines restaurants don't serve) — not "please cover
      my product." A short list of 5–10 accounts to reach out to personally
      beats a mail-merge to fifty.

## What NOT to spend time on

- **Paid link placements / guest-post link schemes.** Explicitly against
  Google's link-spam policy, and the downside (a manual action penalty) is
  existential for an SEO-dependent site, not proportional.
- **Directory submission services that "submit to 500 directories."** Low or
  negative quality; several of these directories themselves get penalized,
  and their backlink drags the whole graph down with it.
- **Fake/incentivized reviews anywhere.** Zero-commission and verification
  are the entire trust story — anything that could later look like bought
  credibility undermines both at once.

---

*This list is deliberately short and executable, not exhaustive — the full
reasoning behind each channel lives in `docs/discoverability-strategy.md`
§16. Revisit and extend it once the first tranche is done rather than trying
to do all of it in one sitting.*
