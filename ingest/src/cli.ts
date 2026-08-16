#!/usr/bin/env tsx
/**
 * Zuby ingestion CLI.
 *
 * In browser-only operation you never run this by hand — the "Ingest chefs"
 * GitHub Action does (Actions tab → Ingest chefs → Run workflow). The commands
 * below are what that workflow calls.
 *
 *   collect --source sheet --url <google sheet or csv url>
 *   collect --source paste --text "<pasted blocks>"
 *   collect --source web   --urls <comma-separated public listing pages>
 *   normalise                 raw records → reviewed candidates
 *   promote --all-clean       promote every candidate marked 'new'
 *   promote --id <uuid>       promote one candidate
 *   delist  --slug <slug>     take a listing down (takedown request)
 *   stats                     pipeline health
 */
import {
  createIngestClient,
  loadRefData,
  loadUnprocessedRaw,
  saveCandidate,
  saveRaw,
} from "./db.js";
import { collectSheet } from "./collectors/sheet.js";
import { collectPaste } from "./collectors/paste.js";
import { extractStructuredBusiness, fetchPages } from "./collectors/web.js";
import { isCleanCandidate, normaliseRecord } from "./normalise/index.js";
import { addToIndex, buildDedupeIndex, findDuplicate } from "./dedupe.js";
import type { RawRecord } from "./types.js";

function arg(name: string): string | undefined {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index !== -1) return process.argv[index + 1];
  const inline = process.argv.find((a) => a.startsWith(`${flag}=`));
  return inline?.slice(flag.length + 1);
}

const hasFlag = (name: string) => process.argv.includes(`--${name}`);

async function commandCollect(): Promise<void> {
  const source = arg("source") ?? "sheet";
  let records: RawRecord[] = [];

  if (source === "sheet") {
    const url = arg("url");
    if (!url) throw new Error("collect --source sheet needs --url <google sheet or csv url>");
    console.log(`Reading sheet: ${url}`);
    records = await collectSheet(url);
  } else if (source === "paste") {
    const text = arg("text") ?? process.env.PASTE_TEXT;
    if (!text) throw new Error("collect --source paste needs --text or PASTE_TEXT");
    records = collectPaste(text);
  } else if (source === "web") {
    const urls = (arg("urls") ?? "")
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) throw new Error("collect --source web needs --urls a,b,c");
    console.log(`Fetching ${urls.length} page(s), politely...`);
    const pages = await fetchPages(urls);
    for (const page of pages) {
      if (!page.html) {
        console.log(`  skipped ${page.url}${page.skippedReason ? ` (${page.skippedReason})` : ""}`);
        continue;
      }
      const business = extractStructuredBusiness(page.html);
      if (!business) {
        console.log(
          `  no structured business data on ${page.url} — skipping (we do not scrape prose)`,
        );
        continue;
      }
      records.push({
        source: "web",
        source_url: page.url,
        raw: business,
        dedupe_key: page.url,
      });
    }
  } else {
    throw new Error(`Unknown source "${source}". Use sheet, paste or web.`);
  }

  console.log(`Collected ${records.length} record(s).`);
  if (records.length === 0) return;

  if (hasFlag("dry-run")) {
    console.log(JSON.stringify(records.slice(0, 5), null, 2));
    console.log("(dry run — nothing written)");
    return;
  }

  const db = createIngestClient();
  const { written } = await saveRaw(db, records);
  console.log(`Saved ${written} raw record(s) to ingest_raw.`);
}

async function commandNormalise(): Promise<void> {
  const db = createIngestClient();
  const ref = await loadRefData(db);
  const rows = await loadUnprocessedRaw(db);

  console.log(`${rows.length} raw record(s) awaiting normalisation.`);
  if (rows.length === 0) return;

  const index = await buildDedupeIndex(db);
  let clean = 0;
  let review = 0;
  let failed = 0;

  for (const row of rows) {
    const result = normaliseRecord(row.raw, row.source, row.source_url, ref);
    if (!result.ok) {
      failed += 1;
      console.log(`  ✗ ${row.dedupe_key}: ${result.reason}`);
      continue;
    }

    const candidate = result.candidate;
    candidate.duplicate_of = findDuplicate(candidate, index);

    const needsReview = candidate.duplicate_of !== null || !isCleanCandidate(candidate);
    const status = needsReview ? "needs_review" : "new";

    if (hasFlag("dry-run")) {
      console.log(`  ${needsReview ? "?" : "✓"} ${candidate.kitchen_name} → ${status}`);
      if (candidate.duplicate_of) console.log(`      duplicate: ${candidate.duplicate_of.detail}`);
      if (candidate.unmapped.length)
        console.log(`      unmapped: ${candidate.unmapped.join(", ")}`);
    } else {
      await saveCandidate(db, row.id, candidate, status);
      addToIndex(index, row.id, candidate);
    }

    if (needsReview) review += 1;
    else clean += 1;
  }

  console.log(
    `\n${clean} ready to promote, ${review} need review, ${failed} unusable.` +
      (hasFlag("dry-run") ? "\n(dry run — nothing written)" : ""),
  );
  console.log(`Review them in the Supabase SQL Editor:  select * from ingest_review;`);
}

async function commandPromote(): Promise<void> {
  const db = createIngestClient();
  const id = arg("id");

  if (id) {
    const { data, error } = await db.rpc("promote_ingest_candidate", { candidate_id: id });
    if (error) throw new Error(error.message);
    console.log(`Promoted candidate ${id} → chef ${data}`);
  } else if (hasFlag("all-clean")) {
    const { data, error } = await db.rpc("promote_all_clean_candidates");
    if (error) throw new Error(error.message);
    console.log(`Promoted ${data} candidate(s).`);
  } else {
    throw new Error("promote needs --id <uuid> or --all-clean");
  }
  console.log("New listings are pending_review — approve them before they appear publicly.");
}

async function commandDelist(): Promise<void> {
  const slug = arg("slug");
  if (!slug) throw new Error("delist needs --slug <chef-slug>");
  const db = createIngestClient();
  const { error } = await db.rpc("delist_chef", {
    chef_slug: slug,
    reason: arg("reason") ?? "Delisted via ingest CLI",
  });
  if (error) throw new Error(error.message);
  console.log(`Delisted ${slug}. It will drop off the public site on the next revalidation.`);
}

async function commandStats(): Promise<void> {
  const db = createIngestClient();
  const { data, error } = await db.rpc("ingest_stats");
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as { metric: string; value: number }[]) {
    console.log(`${String(row.value).padStart(6)}  ${row.metric}`);
  }
}

const commands: Record<string, () => Promise<void>> = {
  collect: commandCollect,
  normalise: commandNormalise,
  promote: commandPromote,
  delist: commandDelist,
  stats: commandStats,
};

const name = process.argv[2];
const command = name ? commands[name] : undefined;

if (!command) {
  console.error(
    `Usage: npm run ingest -- <command> [options]\n\nCommands:\n  ${Object.keys(commands).join("\n  ")}\n`,
  );
  process.exit(1);
}

command().catch((err: unknown) => {
  console.error(`\nFailed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
