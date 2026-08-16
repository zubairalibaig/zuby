import { candidateChefSchema, type CandidateChef, type RefData } from "../types.js";
import { extractInstagram, extractPhones, toE164 } from "./phone.js";
import { clean, slugify, tidyName } from "./text.js";
import { deriveDietaryProfile, mapTaxonomy, matchNeighbourhood } from "./taxonomy.js";
import { DEFAULT_CITY_SLUG } from "../config.js";

/**
 * Raw payload → CandidateChef.
 *
 * Rules:
 *  - Never invent data. A missing address stays missing; coordinates fall back
 *    to the neighbourhood centroid and say so via `geo_source`.
 *  - Never guess a trust claim (halal / jhatka / jain / FSSAI) from prose.
 *  - Report confidence per field so the reviewer knows what to check.
 */
export function normaliseRecord(
  raw: Record<string, unknown>,
  source: string,
  sourceUrl: string | null,
  ref: RefData,
): { ok: true; candidate: CandidateChef } | { ok: false; reason: string } {
  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = clean(raw[key]);
      if (value) return value;
    }
    return null;
  };

  const kitchenNameRaw = pick("kitchen_name", "kitchen", "business_name", "name", "title");
  if (!kitchenNameRaw) return { ok: false, reason: "no kitchen name in source row" };
  const kitchen_name = tidyName(kitchenNameRaw);

  const display_name = pick("chef_name", "display_name", "owner", "contact_name");

  const bioText = pick("bio", "description", "about", "notes", "details");
  const freeText = [bioText, pick("menu", "specialities", "specialties")]
    .filter(Boolean)
    .join(" . ");

  // ---- contact -----------------------------------------------------------
  const countryCode = pick("country") === "SG" ? "SG" : "IN";
  const phoneField = pick("phone", "phone_number", "mobile", "contact");
  const waField = pick("whatsapp", "whatsapp_number", "wa");

  let phone_e164 = toE164(phoneField, countryCode);
  let whatsapp_e164 = toE164(waField, countryCode);

  // Mine free text only when the structured fields gave us nothing.
  if (!phone_e164 && !whatsapp_e164 && freeText) {
    const found = extractPhones(freeText, countryCode);
    phone_e164 = found[0] ?? null;
  }
  // Chefs almost always take orders on the number they publish.
  if (phone_e164 && !whatsapp_e164) whatsapp_e164 = phone_e164;
  if (whatsapp_e164 && !phone_e164) phone_e164 = whatsapp_e164;

  const instagram_handle =
    extractInstagram(pick("instagram", "instagram_handle", "ig", "social")) ??
    extractInstagram(freeText);

  // ---- geography ---------------------------------------------------------
  const city_slug = pick("city") ?? DEFAULT_CITY_SLUG;
  const city = ref.cities.find((c) => c.slug === city_slug) ?? null;
  const areaText = pick("area", "neighbourhood", "locality", "address_area", "address");

  const cityNeighbourhoods = ref.neighbourhoods.filter((n) => n.city_slug === city_slug);
  const matched = matchNeighbourhood(areaText, cityNeighbourhoods);

  const providedLat = Number(raw["lat"] ?? raw["latitude"]);
  const providedLng = Number(raw["lng"] ?? raw["longitude"]);
  const hasProvided =
    Number.isFinite(providedLat) &&
    Number.isFinite(providedLng) &&
    providedLat !== 0 &&
    providedLng !== 0;

  let lat: number | null = null;
  let lng: number | null = null;
  let geo_source: CandidateChef["geo_source"] = "none";

  if (hasProvided) {
    lat = providedLat;
    lng = providedLng;
    geo_source = "provided";
  } else if (matched) {
    lat = matched.lat;
    lng = matched.lng;
    geo_source = "neighbourhood_centroid";
  }

  // ---- taxonomy ----------------------------------------------------------
  const taxonomy = mapTaxonomy(
    { cuisines: pick("cuisines", "cuisine"), dietary: pick("dietary", "dietary_tags", "tags") },
    freeText || null,
    ref.cuisines.map((c) => c.slug),
    ref.dietaryTags.map((t) => t.slug),
  );

  // ---- regulatory --------------------------------------------------------
  const fssaiRaw = pick("fssai", "fssai_number", "licence", "license");
  const fssaiDigits = fssaiRaw?.replace(/\D/g, "") ?? "";
  const fssai_number = /^\d{14}$/.test(fssaiDigits) ? fssaiDigits : null;

  // ---- confidence --------------------------------------------------------
  const confidence: Record<string, number> = {
    kitchen_name: kitchenNameRaw === kitchen_name ? 1 : 0.9,
    phone: phone_e164 ? (phoneField || waField ? 1 : 0.6) : 0,
    neighbourhood: matched ? (areaText ? 0.9 : 0.5) : 0,
    geo: geo_source === "provided" ? 1 : geo_source === "neighbourhood_centroid" ? 0.5 : 0,
    cuisines: taxonomy.cuisine_slugs.length > 0 ? (pick("cuisines") ? 0.9 : 0.6) : 0,
    dietary: taxonomy.dietary_tag_slugs.length > 0 ? 0.8 : 0,
    fssai: fssai_number ? 1 : 0,
  };

  const candidate: CandidateChef = {
    kitchen_name,
    display_name: display_name ? tidyName(display_name) : null,
    bio: bioText,
    phone_e164,
    whatsapp_e164,
    instagram_handle,
    city_slug: city?.slug ?? DEFAULT_CITY_SLUG,
    neighbourhood_slug: matched?.slug ?? null,
    address_area: areaText,
    lat,
    lng,
    geo_source,
    cuisine_slugs: taxonomy.cuisine_slugs,
    dietary_tag_slugs: taxonomy.dietary_tag_slugs,
    dietary_profile: deriveDietaryProfile(taxonomy.dietary_tag_slugs),
    fssai_number,
    suggested_slug: slugify(kitchen_name),
    unmapped: taxonomy.unmapped,
    confidence,
    source,
    source_url: sourceUrl,
    duplicate_of: null,
  };

  const parsed = candidateChefSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      reason: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }
  return { ok: true, candidate: parsed.data };
}

/**
 * A candidate is "clean" — safe to promote without a human editing it first —
 * when we have a contactable number, a located neighbourhood, and no unmapped
 * values or duplicate suspicion.
 */
export function isCleanCandidate(candidate: CandidateChef): boolean {
  return (
    candidate.whatsapp_e164 !== null &&
    candidate.neighbourhood_slug !== null &&
    candidate.lat !== null &&
    candidate.cuisine_slugs.length > 0 &&
    candidate.unmapped.length === 0 &&
    candidate.duplicate_of === null
  );
}
