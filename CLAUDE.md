# Zuby — Instructions for AI assistants and contributors

Zuby is a **directory** of verified home chefs (zuby.food). It is NOT a marketplace in V1.
Read these three documents before doing anything, in this order:

1. **`CONCEPT.md`** — what Zuby is, who it's for, what it is deliberately NOT. This is the canonical source of truth. Never contradict it. Never invent product behaviour not described in it.
2. **`ARCHITECTURE.md`** — the technical architecture: stack, data model, hosting, cost posture. All code must fit this architecture.
3. **`ROADMAP.md`** — the phased build plan. Each phase has a self-contained prompt in `prompts/`. Build only the current phase. Do not pull work forward from later phases.

## Hard rules

- **No V1 scope creep.** No payments, no delivery, no cart/checkout/order states, no in-app chat, no ratings/reviews, no subscriptions, no native apps, no multi-language UI. Ordering happens via pre-filled WhatsApp links. If a task seems to need one of these, stop and flag it instead of building it.
- **Multi-country from day zero.** Countries and cities are first-class DB entities. Prices always carry a currency code. Regulatory fields cover India (FSSAI) and Singapore (SFA/MUIS). Never hardcode "Bangalore", "India", "₹", or IST into logic — they are data/config.
- **Geo is real.** Radius search uses PostGIS geo-indexed queries against each chef's location AND declared service radius. No fake "sort by city" geo.
- **Trust is non-negotiable.** Nothing appears publicly without admin approval. FSSAI number, verification badge, and dietary tags (veg / non-veg / halal / jhatka / jain / egg-free) are visible and filterable.
- **SEO is the growth engine.** Clean URLs (`/bangalore/indiranagar/chef-slug`), server-rendered pages, structured data (Schema.org LocalBusiness), sitemaps. Never ship a public page that is client-rendered-only.
- **Cost stays near zero.** Free tiers (Vercel Hobby, Supabase Free, Cloudflare) until traffic forces an upgrade. Don't add paid services without founder approval.
- **Follow the phases.** One phase per branch/PR. A phase is done when its acceptance criteria in its `prompts/phase-*.md` file pass. Don't refactor previous phases while building a new one unless the phase prompt says to.

## Conventions

- TypeScript strict mode everywhere. Next.js App Router. Tailwind CSS.
- Database changes only via SQL migration files in `supabase/migrations/` — never ad-hoc schema edits.
- All public-facing strings in a copy module (future i18n), not inline JSX literals, where practical.
- Commit messages: imperative mood, scoped (`db: add menu_items table`, `web: chef profile page`).
