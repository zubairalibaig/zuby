import { test } from "node:test";
import assert from "node:assert/strict";
import { isCleanCandidate, normaliseRecord } from "../src/normalise/index.js";
import { parseCsv, toCsvUrl } from "../src/collectors/csv.js";
import { collectPaste } from "../src/collectors/paste.js";
import { findDuplicate, type DedupeIndex } from "../src/dedupe.js";
import type { RefData } from "../src/types.js";

const ref: RefData = {
  cities: [{ id: "c1", slug: "bangalore", name: "Bangalore", country_code: "IN" }],
  neighbourhoods: [
    {
      id: "n1",
      city_slug: "bangalore",
      slug: "indiranagar",
      name: "Indiranagar",
      lat: 12.9719,
      lng: 77.6412,
    },
    {
      id: "n2",
      city_slug: "bangalore",
      slug: "koramangala",
      name: "Koramangala",
      lat: 12.9352,
      lng: 77.6245,
    },
  ],
  cuisines: [
    { id: "cu1", slug: "biryani", name: "Biryani" },
    { id: "cu2", slug: "hyderabadi", name: "Hyderabadi" },
    { id: "cu3", slug: "south-indian", name: "South Indian" },
  ],
  dietaryTags: [
    { id: "t1", slug: "halal", name: "Halal" },
    { id: "t2", slug: "non_veg", name: "Non-Veg" },
    { id: "t3", slug: "veg", name: "Pure Veg" },
  ],
};

test("normalises a complete sheet row", () => {
  const result = normaliseRecord(
    {
      kitchen_name: "AISHA'S BIRYANI",
      chef_name: "aisha khan",
      phone: "99000 00001",
      area: "Indiranagar 2nd Stage",
      cuisines: "Biryani, Hyderabadi",
      dietary: "halal, non veg",
      fssai: "1122 3344 5566 77",
      bio: "Small batch dum biryani",
    },
    "sheet",
    "https://example.com/sheet",
    ref,
  );

  assert.ok(result.ok);
  const c = result.candidate;
  assert.equal(c.kitchen_name, "Aisha's Biryani", "ALL CAPS is tidied");
  assert.equal(c.display_name, "Aisha Khan");
  assert.equal(c.phone_e164, "+919900000001");
  assert.equal(c.whatsapp_e164, "+919900000001", "whatsapp defaults to the published number");
  assert.equal(c.neighbourhood_slug, "indiranagar");
  assert.equal(c.lat, 12.9719);
  assert.equal(c.geo_source, "neighbourhood_centroid");
  assert.deepEqual(c.cuisine_slugs, ["biryani", "hyderabadi"]);
  assert.deepEqual(c.dietary_tag_slugs, ["halal", "non_veg"]);
  assert.equal(c.dietary_profile, "non_veg");
  assert.equal(c.fssai_number, "11223344556677", "punctuation stripped from FSSAI");
  assert.equal(c.suggested_slug, "aishas-biryani");
  assert.ok(isCleanCandidate(c));
});

test("a row without a kitchen name is rejected, not invented", () => {
  const result = normaliseRecord({ phone: "9900000001" }, "sheet", null, ref);
  assert.equal(result.ok, false);
});

test("never fabricates geography when the area is unknown", () => {
  const result = normaliseRecord(
    { kitchen_name: "Somewhere Kitchen", phone: "9900000001", area: "Andheri West" },
    "sheet",
    null,
    ref,
  );
  assert.ok(result.ok);
  assert.equal(result.candidate.neighbourhood_slug, null);
  assert.equal(result.candidate.lat, null);
  assert.equal(result.candidate.geo_source, "none");
  assert.equal(result.candidate.confidence["geo"], 0);
  assert.ok(!isCleanCandidate(result.candidate), "unlocatable listings need review");
});

test("an invalid FSSAI number is dropped rather than stored", () => {
  const result = normaliseRecord(
    { kitchen_name: "Test Kitchen", phone: "9900000001", area: "Indiranagar", fssai: "12345" },
    "sheet",
    null,
    ref,
  );
  assert.ok(result.ok);
  assert.equal(result.candidate.fssai_number, null);
});

test("real coordinates beat the neighbourhood centroid", () => {
  const result = normaliseRecord(
    { kitchen_name: "Pin Point", phone: "9900000001", area: "Indiranagar", lat: 12.98, lng: 77.64 },
    "sheet",
    null,
    ref,
  );
  assert.ok(result.ok);
  assert.equal(result.candidate.geo_source, "provided");
  assert.equal(result.candidate.lat, 12.98);
});

test("CSV parsing handles quotes, commas and CRLF", () => {
  const csv =
    'Kitchen Name,Area,Bio\r\n"Aisha\'s, Biryani",Indiranagar,"Says ""best"" biryani"\r\n';
  const rows = parseCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.["kitchen_name"], "Aisha's, Biryani");
  assert.equal(rows[0]?.["bio"], 'Says "best" biryani');
});

test("google sheet links become CSV export links", () => {
  assert.equal(
    toCsvUrl("https://docs.google.com/spreadsheets/d/ABC123/edit#gid=42"),
    "https://docs.google.com/spreadsheets/d/ABC123/export?format=csv&gid=42",
  );
  assert.equal(toCsvUrl("https://example.com/data.csv"), "https://example.com/data.csv");
});

test("paste collector splits blocks and finds contact details", () => {
  const records = collectPaste(
    [
      "Aisha's Biryani",
      "Hyderabadi dum biryani, delivery in Indiranagar",
      "WhatsApp 99000 00001",
      "@aishas.biryani",
      "---",
      "Ghar Ka Khana",
      "Area: Koramangala",
      "Call 9880000002",
    ].join("\n"),
  );

  assert.equal(records.length, 2);
  assert.equal(records[0]?.raw["kitchen_name"], "Aisha's Biryani");
  assert.equal(records[0]?.raw["phone"], "+919900000001");
  assert.equal(records[0]?.raw["instagram"], "aishas.biryani");
  assert.equal(records[0]?.dedupe_key, "+919900000001");
  assert.equal(records[1]?.raw["area"], "Koramangala");
});

function emptyIndex(): DedupeIndex {
  return { chefsByPhone: new Map(), chefs: [], candidatesByPhone: new Map(), candidates: [] };
}

test("flags a candidate whose phone already belongs to a live chef", () => {
  const index = emptyIndex();
  const chef = {
    id: "chef-1",
    kitchen_name: "Aisha's Biryani",
    phone_e164: "+919900000001",
    whatsapp_e164: null,
    neighbourhood_id: "n1",
  };
  index.chefs.push(chef);
  index.chefsByPhone.set("+919900000001", chef);

  const result = normaliseRecord(
    { kitchen_name: "Aishas Biryani Kitchen", phone: "9900000001", area: "Indiranagar" },
    "sheet",
    null,
    ref,
  );
  assert.ok(result.ok);
  const duplicate = findDuplicate(result.candidate, index);
  assert.equal(duplicate?.kind, "chef");
  assert.equal(duplicate?.reason, "phone");
});

test("flags a similarly-named candidate in the same neighbourhood", () => {
  const index = emptyIndex();
  const first = normaliseRecord(
    { kitchen_name: "Meena Home Tiffins", phone: "9900000011", area: "Koramangala" },
    "sheet",
    null,
    ref,
  );
  assert.ok(first.ok);
  index.candidates.push({ id: "cand-1", normalised: first.candidate });

  const second = normaliseRecord(
    { kitchen_name: "Meena Home Tiffin Service", phone: "9900000022", area: "Koramangala" },
    "sheet",
    null,
    ref,
  );
  assert.ok(second.ok);
  const duplicate = findDuplicate(second.candidate, index);
  assert.equal(duplicate?.reason, "name_similarity");
});

test("different kitchens in the same area are not treated as duplicates", () => {
  const index = emptyIndex();
  const first = normaliseRecord(
    { kitchen_name: "Meena Home Tiffins", phone: "9900000011", area: "Koramangala" },
    "sheet",
    null,
    ref,
  );
  assert.ok(first.ok);
  index.candidates.push({ id: "cand-1", normalised: first.candidate });

  const second = normaliseRecord(
    { kitchen_name: "Bengali Ghor Ranna", phone: "9900000022", area: "Koramangala" },
    "sheet",
    null,
    ref,
  );
  assert.ok(second.ok);
  assert.equal(findDuplicate(second.candidate, index), null);
});
