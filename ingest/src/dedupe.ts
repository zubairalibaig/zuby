import type { SupabaseClient } from "@supabase/supabase-js";
import type { CandidateChef } from "./types.js";
import { similarity } from "./normalise/text.js";

/**
 * Duplicate detection, checked against BOTH existing candidates and live chefs.
 *
 * A match never discards anything: the candidate is kept and flagged
 * `needs_review` with `duplicate_of` populated, so a human decides whether to
 * merge, promote anyway, or discard. Silent de-duplication loses real kitchens
 * that happen to share a name.
 */

const NAME_SIMILARITY_THRESHOLD = 0.6;

interface ExistingChef {
  id: string;
  kitchen_name: string;
  phone_e164: string | null;
  whatsapp_e164: string | null;
  neighbourhood_id: string | null;
}

interface ExistingCandidate {
  id: string;
  normalised: CandidateChef;
}

export interface DedupeIndex {
  chefsByPhone: Map<string, ExistingChef>;
  chefs: ExistingChef[];
  candidatesByPhone: Map<string, ExistingCandidate>;
  candidates: ExistingCandidate[];
}

export async function buildDedupeIndex(db: SupabaseClient): Promise<DedupeIndex> {
  const { data: chefs, error: chefError } = await db
    .from("chefs")
    .select("id, kitchen_name, phone_e164, whatsapp_e164, neighbourhood_id");
  if (chefError) throw new Error(`Could not load chefs for dedupe: ${chefError.message}`);

  const { data: candidates, error: candidateError } = await db
    .from("ingest_candidates")
    .select("id, normalised")
    .neq("status", "discarded");
  if (candidateError) {
    throw new Error(`Could not load candidates for dedupe: ${candidateError.message}`);
  }

  const chefsByPhone = new Map<string, ExistingChef>();
  for (const chef of (chefs ?? []) as ExistingChef[]) {
    for (const phone of [chef.phone_e164, chef.whatsapp_e164]) {
      if (phone) chefsByPhone.set(phone, chef);
    }
  }

  const candidatesByPhone = new Map<string, ExistingCandidate>();
  const candidateList = ((candidates ?? []) as { id: string; normalised: CandidateChef }[]).map(
    (c) => ({ id: c.id, normalised: c.normalised }),
  );
  for (const candidate of candidateList) {
    for (const phone of [candidate.normalised.phone_e164, candidate.normalised.whatsapp_e164]) {
      if (phone) candidatesByPhone.set(phone, candidate);
    }
  }

  return {
    chefsByPhone,
    chefs: (chefs ?? []) as ExistingChef[],
    candidatesByPhone,
    candidates: candidateList,
  };
}

/**
 * Returns the duplicate marker to store on the candidate, or null when it
 * looks new. Phone is the strong signal; name similarity within the same
 * neighbourhood is the weak one.
 */
export function findDuplicate(
  candidate: CandidateChef,
  index: DedupeIndex,
): CandidateChef["duplicate_of"] {
  // 1. Same phone number as a live chef — almost certainly the same business.
  for (const phone of [candidate.whatsapp_e164, candidate.phone_e164]) {
    if (!phone) continue;
    const chef = index.chefsByPhone.get(phone);
    if (chef) {
      return {
        kind: "chef",
        id: chef.id,
        reason: "phone",
        detail: `${phone} already belongs to "${chef.kitchen_name}"`,
      };
    }
  }

  // 2. Same phone as another candidate from this or an earlier run.
  for (const phone of [candidate.whatsapp_e164, candidate.phone_e164]) {
    if (!phone) continue;
    const other = index.candidatesByPhone.get(phone);
    if (other) {
      return {
        kind: "candidate",
        id: other.id,
        reason: "phone",
        detail: `${phone} also appears in candidate "${other.normalised.kitchen_name}"`,
      };
    }
  }

  // 3. Similar name in the same neighbourhood.
  for (const other of index.candidates) {
    if (other.normalised.neighbourhood_slug !== candidate.neighbourhood_slug) continue;
    const score = similarity(candidate.kitchen_name, other.normalised.kitchen_name);
    if (score >= NAME_SIMILARITY_THRESHOLD) {
      return {
        kind: "candidate",
        id: other.id,
        reason: "name_similarity",
        detail: `"${other.normalised.kitchen_name}" in the same area (similarity ${score.toFixed(2)})`,
      };
    }
  }

  return null;
}

/** Register a freshly-normalised candidate so later rows in the same run see it. */
export function addToIndex(index: DedupeIndex, id: string, candidate: CandidateChef): void {
  const entry = { id, normalised: candidate };
  index.candidates.push(entry);
  for (const phone of [candidate.phone_e164, candidate.whatsapp_e164]) {
    if (phone) index.candidatesByPhone.set(phone, entry);
  }
}
