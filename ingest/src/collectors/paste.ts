import { extractInstagram, extractPhones } from "../normalise/phone.js";
import { clean, slugify } from "../normalise/text.js";
import type { RawRecord } from "../types.js";

/**
 * Manual-paste collector — for Instagram bios, WhatsApp-group flyers and
 * apartment noticeboard photos that the founder transcribes.
 *
 * This is deliberately the Instagram path: Instagram blocks automated
 * collection and its terms forbid it, so a human copies the public bio and we
 * parse the text. No login-walled access, no evasion.
 *
 * Format: blocks separated by a line of three or more dashes. The first
 * non-empty line is the kitchen name; the rest is parsed for phone, handle and
 * area.
 *
 *   Aisha's Biryani
 *   Hyderabadi dum biryani, home delivery in Indiranagar
 *   WhatsApp 99000 00001
 *   @aishas.biryani
 *   ---
 *   Ghar Ka Khana
 *   ...
 */
export function collectPaste(text: string, sourceLabel = "paste"): RawRecord[] {
  const blocks = text
    .split(/^\s*-{3,}\s*$/m)
    .map((b) => b.trim())
    .filter(Boolean);

  const records: RawRecord[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const kitchen = clean(lines[0]);
    if (!kitchen) continue;

    const body = lines.slice(1).join(" \n ");
    const phones = extractPhones(block);
    const instagram = extractInstagram(block);

    // "Area:" / "Location:" style hints, if the transcriber included them.
    const areaMatch = block.match(/(?:area|location|locality|near)\s*[:\-]\s*([^\n]{2,60})/i);

    const raw: Record<string, string> = { kitchen_name: kitchen, notes: body };
    if (phones[0]) raw["phone"] = phones[0];
    if (phones[1]) raw["whatsapp"] = phones[1];
    if (instagram) raw["instagram"] = instagram;
    if (areaMatch?.[1]) raw["area"] = areaMatch[1].trim();

    records.push({
      source: sourceLabel,
      source_url: instagram ? `https://instagram.com/${instagram}` : null,
      raw,
      dedupe_key: phones[0] ?? `${slugify(kitchen)}|${slugify(areaMatch?.[1] ?? "")}`,
    });
  }

  return records;
}
