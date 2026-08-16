import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./config.js";
import type { CandidateChef, RawRecord, RefData } from "./types.js";

/**
 * Service-role client. The ingest tables are RLS-locked with no policies for
 * anon/authenticated, so only this key can touch them — which is the contract:
 * scraped data is invisible to the public site until an admin approves it.
 */
export function createIngestClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function loadRefData(db: SupabaseClient): Promise<RefData> {
  const [cities, neighbourhoods, cuisines, tags] = await Promise.all([
    db.from("cities").select("id, slug, name, countries(code)"),
    db.from("neighbourhoods").select("id, slug, name, cities(slug)"),
    db.from("cuisines").select("id, slug, name"),
    db.from("dietary_tags").select("id, slug, name"),
  ]);

  for (const result of [cities, neighbourhoods, cuisines, tags]) {
    if (result.error) throw new Error(`Could not load reference data: ${result.error.message}`);
  }

  // Neighbourhood centroids come from a helper view because PostGIS geography
  // is not directly readable through PostgREST.
  const { data: centroids, error: centroidError } = await db.rpc("neighbourhood_centroids");
  if (centroidError) {
    throw new Error(
      `Could not load neighbourhood centroids: ${centroidError.message}. ` +
        `Apply the latest migrations (supabase/setup.sql).`,
    );
  }

  const centroidBySlug = new Map<string, { lat: number; lng: number }>();
  for (const row of (centroids ?? []) as { slug: string; lat: number; lng: number }[]) {
    centroidBySlug.set(row.slug, { lat: row.lat, lng: row.lng });
  }

  return {
    cities: (cities.data ?? []).map((c) => {
      const country = c.countries as unknown as { code: string } | null;
      return { id: c.id, slug: c.slug, name: c.name, country_code: country?.code ?? "IN" };
    }),
    neighbourhoods: (neighbourhoods.data ?? []).map((n) => {
      const city = n.cities as unknown as { slug: string } | null;
      const centroid = centroidBySlug.get(n.slug);
      return {
        id: n.id,
        city_slug: city?.slug ?? "",
        slug: n.slug,
        name: n.name,
        lat: centroid?.lat ?? 0,
        lng: centroid?.lng ?? 0,
      };
    }),
    cuisines: cuisines.data ?? [],
    dietaryTags: tags.data ?? [],
  };
}

/** Upsert raw records. Re-running a collector updates rather than duplicates. */
export async function saveRaw(
  db: SupabaseClient,
  records: RawRecord[],
): Promise<{ written: number }> {
  if (records.length === 0) return { written: 0 };

  const { error, count } = await db.from("ingest_raw").upsert(
    records.map((r) => ({
      source: r.source,
      source_url: r.source_url,
      raw: r.raw,
      dedupe_key: r.dedupe_key,
      scraped_at: new Date().toISOString(),
    })),
    { onConflict: "source,dedupe_key", count: "exact" },
  );

  if (error) throw new Error(`Could not save raw records: ${error.message}`);
  return { written: count ?? records.length };
}

export interface RawRow {
  id: string;
  source: string;
  source_url: string | null;
  raw: Record<string, unknown>;
  dedupe_key: string;
}

export async function loadUnprocessedRaw(db: SupabaseClient, limit = 500): Promise<RawRow[]> {
  // Raw rows that have not produced a candidate yet.
  const { data: candidates, error: candidateError } = await db
    .from("ingest_candidates")
    .select("ingest_raw_id");
  if (candidateError) throw new Error(candidateError.message);

  const done = new Set((candidates ?? []).map((c) => c.ingest_raw_id).filter(Boolean));

  const { data, error } = await db
    .from("ingest_raw")
    .select("id, source, source_url, raw, dedupe_key")
    .order("scraped_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  return ((data ?? []) as RawRow[]).filter((row) => !done.has(row.id));
}

export async function saveCandidate(
  db: SupabaseClient,
  rawId: string,
  candidate: CandidateChef,
  status: "new" | "needs_review",
): Promise<void> {
  const { error } = await db.from("ingest_candidates").insert({
    ingest_raw_id: rawId,
    normalised: candidate as unknown as Record<string, unknown>,
    status,
  });
  if (error) throw new Error(`Could not save candidate: ${error.message}`);
}
