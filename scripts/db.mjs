#!/usr/bin/env node
/**
 * Applies Zuby's schema to a Postgres database (local or Supabase).
 *
 *   npm run db:reset   → wipe `public` schema, apply all migrations, seed
 *   npm run db:apply   → apply all migrations only (fresh/empty DB)
 *
 * Connection comes from DATABASE_URL (falls back to SUPABASE_DB_URL).
 * Get it from: Supabase dashboard → Project Settings → Database → Connection
 * string (use the "Transaction pooler" URI if direct IPv6 doesn't work for you).
 *
 * Everything runs in ONE transaction: it either fully applies or fully rolls back.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const doReset = args.has("--reset");
const doSeed = args.has("--seed");

const connectionString = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error(
    "Set DATABASE_URL to your Postgres connection string.\n" +
      "Supabase: Project Settings → Database → Connection string.\n\n" +
      '  DATABASE_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres" npm run db:reset',
  );
  process.exit(1);
}

const needsSsl = /supabase\.(co|com)|pooler\.supabase/.test(connectionString);
const client = new pg.Client({
  connectionString,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

const files = [];
if (doReset) files.push(join(root, "scripts", "reset-public-schema.sql"));
const migrationsDir = join(root, "supabase", "migrations");
for (const f of readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  files.push(join(migrationsDir, f));
}
if (doSeed) files.push(join(root, "supabase", "seed.sql"));

try {
  await client.connect();
  await client.query("begin");
  for (const file of files) {
    const rel = file.slice(root.length + 1);
    process.stdout.write(`applying ${rel} ... `);
    await client.query(readFileSync(file, "utf8"));
    console.log("ok");
  }
  await client.query("commit");
  console.log(`\ndone — ${files.length} file(s) applied${doSeed ? " (with seed data)" : ""}.`);
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error(`\nFAILED: ${err.message}\nNothing was changed (transaction rolled back).`);
  process.exitCode = 1;
} finally {
  await client.end();
}
