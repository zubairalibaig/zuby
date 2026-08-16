/**
 * Phone normalisation to E.164 — the only format Zuby stores (multi-country
 * from day zero). Returns null rather than guessing: a wrong number is worse
 * than no number, because the WhatsApp button is the whole product.
 */

interface CountryRule {
  code: string;
  prefix: string;
  /** National number length, excluding the country code. */
  nationalLength: number;
  /** Valid first digits of a mobile national number. */
  mobileStarts: string[];
}

const RULES: Record<string, CountryRule> = {
  IN: { code: "IN", prefix: "91", nationalLength: 10, mobileStarts: ["6", "7", "8", "9"] },
  SG: { code: "SG", prefix: "65", nationalLength: 8, mobileStarts: ["8", "9"] },
};

/** Strip everything except digits and a single leading +. */
function clean(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "").replace(/^00/, "");
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Indian metro landline STD codes (without the trunk 0). A landline in the
 * WhatsApp field means a dead "Order on WhatsApp" button — the single most
 * important action on the site — so when a number is written with the trunk
 * prefix AND opens with one of these, we reject it rather than guess.
 *
 * Note the genuine ambiguity: written without the leading 0, an 80-series
 * mobile and a Bangalore landline are indistinguishable by digits alone. We
 * only apply this rule when the trunk prefix is present.
 */
const IN_LANDLINE_STD = [
  "11", // Delhi
  "20", // Pune
  "22", // Mumbai
  "33", // Kolkata
  "40", // Hyderabad
  "44", // Chennai
  "79", // Ahmedabad
  "80", // Bangalore
  "120", // Noida
  "124", // Gurgaon
  "141", // Jaipur
  "172", // Chandigarh
];

/**
 * @param input  raw text, e.g. "+91 99000 00001", "09900000001", "9900000001"
 * @param defaultCountry  which country to assume for bare national numbers
 */
export function toE164(input: string | null | undefined, defaultCountry = "IN"): string | null {
  if (!input) return null;

  const cleaned = clean(String(input));
  if (!cleaned) return null;

  const rule = RULES[defaultCountry];
  if (!rule) return null;

  const digits = cleaned.replace(/^\+/, "");

  // Already carries a known country code.
  for (const candidate of Object.values(RULES)) {
    if (digits.startsWith(candidate.prefix)) {
      const national = digits.slice(candidate.prefix.length);
      if (
        national.length === candidate.nationalLength &&
        candidate.mobileStarts.some((d) => national.startsWith(d))
      ) {
        return `+${candidate.prefix}${national}`;
      }
    }
  }

  // A national number, possibly with a trunk prefix (0).
  const hadTrunkPrefix = digits.startsWith("0");
  const national = digits.replace(/^0+/, "");

  // Written with a trunk prefix and opening with a metro STD code: a landline,
  // which cannot receive WhatsApp. Reject instead of minting a dead link.
  if (
    hadTrunkPrefix &&
    rule.code === "IN" &&
    IN_LANDLINE_STD.some((std) => national.startsWith(std))
  ) {
    return null;
  }

  if (
    national.length === rule.nationalLength &&
    rule.mobileStarts.some((d) => national.startsWith(d))
  ) {
    return `+${rule.prefix}${national}`;
  }

  return null;
}

/**
 * Pull every plausible phone number out of a blob of text (an Instagram bio,
 * a flyer transcription). Returns unique E.164 values in order of appearance.
 */
export function extractPhones(text: string, defaultCountry = "IN"): string[] {
  if (!text) return [];
  const matches = text.match(/(?:\+?\d[\d\s().-]{6,18}\d)/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of matches) {
    const e164 = toE164(match, defaultCountry);
    if (e164 && !seen.has(e164)) {
      seen.add(e164);
      out.push(e164);
    }
  }
  return out;
}

/** Instagram handle from a URL or an @mention. */
export function extractInstagram(text: string | null | undefined): string | null {
  if (!text) return null;
  const url = text.match(/instagram\.com\/([A-Za-z0-9._]{1,30})/i);
  if (url?.[1]) return url[1].toLowerCase().replace(/\.$/, "");
  const at = text.match(/(?:^|\s)@([A-Za-z0-9._]{2,30})/);
  if (at?.[1]) return at[1].toLowerCase().replace(/\.$/, "");
  return null;
}
