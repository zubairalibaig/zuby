import { parseCsv, toCsvUrl } from "./csv.js";
import { toE164 } from "../normalise/phone.js";
import { slugify, clean } from "../normalise/text.js";
import type { RawRecord } from "../types.js";
import { USER_AGENT } from "../config.js";

/**
 * The workhorse collector: a founder-maintained Google Sheet (or any CSV URL).
 * Most early supply comes from legwork — WhatsApp groups, apartment notice
 * boards, referrals — and this is how that becomes data.
 *
 * Recognised columns (all optional except kitchen_name; header matching is
 * case-insensitive and spaces become underscores):
 *
 *   kitchen_name   REQUIRED  "Aisha's Biryani"
 *   chef_name                "Aisha Khan"
 *   phone                    "+91 99000 00001" / "9900000001"
 *   whatsapp                 defaults to phone when blank
 *   instagram                handle or profile URL
 *   area                     "Indiranagar 2nd Stage"  → matched to a neighbourhood
 *   city                     defaults to "bangalore"
 *   country                  "IN" (default) or "SG"
 *   cuisines                 "biryani, hyderabadi"    → mapped to cuisine slugs
 *   dietary                  "halal, non veg"         → mapped to dietary tags
 *   fssai                    14-digit number
 *   bio / notes              free text
 *   lat, lng                 only if you genuinely have them
 *   source_url               where you found this listing
 */
export async function collectSheet(url: string): Promise<RawRecord[]> {
  const csvUrl = toCsvUrl(url);
  const response = await fetch(csvUrl, {
    headers: { "user-agent": USER_AGENT },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Could not read the sheet (HTTP ${response.status}). ` +
        `Make sure it is shared as "Anyone with the link can view", or use File → Share → Publish to web → CSV.`,
    );
  }

  const body = await response.text();
  if (body.trimStart().startsWith("<")) {
    throw new Error(
      "The sheet URL returned a web page rather than CSV — check that link sharing is enabled.",
    );
  }

  const rows = parseCsv(body);
  const records: RawRecord[] = [];

  for (const row of rows) {
    const kitchen = clean(row["kitchen_name"] ?? row["kitchen"] ?? row["name"]);
    if (!kitchen) continue; // skip blank/comment rows rather than failing the run

    // Prefer a phone-based dedupe key (a number identifies a business);
    // fall back to name + area.
    const phone =
      toE164(row["whatsapp"] ?? null, row["country"] === "SG" ? "SG" : "IN") ??
      toE164(row["phone"] ?? null, row["country"] === "SG" ? "SG" : "IN");
    const dedupe_key = phone ?? `${slugify(kitchen)}|${slugify(row["area"] ?? "")}`;

    records.push({
      source: "sheet",
      source_url: clean(row["source_url"]) ?? url,
      raw: row,
      dedupe_key,
    });
  }

  return records;
}
