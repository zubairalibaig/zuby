#!/usr/bin/env node
/**
 * Regenerates supabase/setup.sql — the single file you paste into the Supabase
 * SQL Editor to build the whole database from a browser.
 *
 *   node scripts/build-setup-sql.mjs
 *
 * Run this after ANY change to supabase/migrations/ or supabase/seed.sql.
 * CI fails if setup.sql is out of date with its sources.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const header = `-- =====================================================================
-- ZUBY — COMPLETE DATABASE SETUP (browser / Supabase SQL Editor)
-- =====================================================================
-- HOW TO USE
--   1. Supabase dashboard -> SQL Editor -> New query
--   2. Paste this ENTIRE file
--   3. Press RUN
--   4. Then run supabase/verify.sql the same way — expect 20 x PASS
--
-- WHAT IT DOES
--   * DROPS the whole \`public\` schema (and the leftover \`drizzle\` schema from
--     the previous Replit project) — every table and row in them is deleted
--   * Recreates Zuby's full V1 schema, RLS policies, triggers and functions
--   * Loads seed data (India + Singapore, Bangalore + 7 neighbourhoods,
--     15 cuisines, 7 dietary tags, 9 demo chefs with menus)
--
-- WHAT IT DOES NOT TOUCH
--   auth users, storage buckets, the extensions schema, or any other schema.
--
-- SAFE TO RE-RUN: yes. Running it again wipes and rebuilds from scratch.
--
-- GENERATED FILE — do not edit by hand. Edit supabase/migrations/*.sql or
-- supabase/seed.sql, then run: node scripts/build-setup-sql.mjs
-- =====================================================================
`;

const footer = `

-- =====================================================================
-- DONE.
-- Next: run supabase/verify.sql to confirm everything works (20 x PASS).
-- =====================================================================
`;

const migrationsDir = join(root, "supabase", "migrations");
const sources = [
  join(root, "scripts", "reset-public-schema.sql"),
  ...readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(migrationsDir, f)),
  join(root, "supabase", "seed.sql"),
];

const parts = [header];
for (const file of sources) {
  const rel = file.slice(root.length + 1).replace(/\\/g, "/");
  parts.push(
    `\n\n-- =====================================================================\n` +
      `-- SOURCE: ${rel}\n` +
      `-- =====================================================================\n`,
  );
  parts.push(readFileSync(file, "utf8"));
}
parts.push(footer);

const outPath = join(root, "supabase", "setup.sql");
const contents = parts.join("");

if (process.argv.includes("--check")) {
  const current = readFileSync(outPath, "utf8");
  if (current !== contents) {
    console.error(
      "supabase/setup.sql is out of date with the migrations.\n" +
        "Run: node scripts/build-setup-sql.mjs",
    );
    process.exit(1);
  }
  console.log("supabase/setup.sql is up to date.");
} else {
  writeFileSync(outPath, contents);
  console.log(`wrote supabase/setup.sql from ${sources.length} source files.`);
}
