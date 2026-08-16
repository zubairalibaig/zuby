# `ingest/` — scraping and seeding pipeline

**Not built yet.** This package is created in **Phase 2** — see
[`../prompts/phase-2-ingestion.md`](../prompts/phase-2-ingestion.md).

It will be a standalone Node/TypeScript CLI (its own `package.json`), deliberately
outside the Next.js app so scraper churn can never destabilise the website.

Contract, already supported by the Phase 0 schema:

```
collect   → writes raw payloads to  ingest_raw       (source, source_url, raw, dedupe_key)
normalise → writes candidates to    ingest_candidates (normalised jsonb + confidence)
promote   → inserts into            chefs             (listing_source='scraped',
                                                       claimed_by=null,
                                                       status='pending_review')
```

Scraped data **never** writes directly to `chefs`, and promotion never auto-approves
— an admin approves each listing in the Phase 3 queue before it is publicly visible.
Both `ingest_*` tables are service-role only (RLS enabled, no anon/authenticated
policies).
