import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveDietaryProfile,
  mapTaxonomy,
  matchNeighbourhood,
} from "../src/normalise/taxonomy.js";

const CUISINES = [
  "biryani",
  "north-indian",
  "south-indian",
  "bengali",
  "mangalorean",
  "hyderabadi",
  "tiffin-thali",
  "bakes-desserts",
  "healthy-meals",
];
const TAGS = ["veg", "non_veg", "halal", "jhatka", "jain", "egg_free", "healthy"];

test("maps explicit cuisine and dietary columns", () => {
  const result = mapTaxonomy(
    { cuisines: "Biryani, Hyderabadi", dietary: "halal, non veg" },
    null,
    CUISINES,
    TAGS,
  );
  assert.deepEqual(result.cuisine_slugs, ["biryani", "hyderabadi"]);
  assert.deepEqual(result.dietary_tag_slugs, ["halal", "non_veg"]);
  assert.deepEqual(result.unmapped, []);
});

test("reports unmapped values from structured columns instead of dropping them", () => {
  const result = mapTaxonomy({ cuisines: "Biryani, Martian Fusion" }, null, CUISINES, TAGS);
  assert.deepEqual(result.cuisine_slugs, ["biryani"]);
  assert.deepEqual(result.unmapped, ["Martian Fusion"]);
});

test("mines cuisines out of prose", () => {
  const result = mapTaxonomy(
    {},
    "Authentic kori rotti and neer dosa, weekend only",
    CUISINES,
    TAGS,
  );
  assert.ok(result.cuisine_slugs.includes("mangalorean"));
});

test("NEVER infers halal, jhatka or jain from prose — they are trust claims", () => {
  const result = mapTaxonomy(
    {},
    "our halal chicken is jhatka style and we also do jain food",
    CUISINES,
    TAGS,
  );
  assert.ok(!result.dietary_tag_slugs.includes("halal"));
  assert.ok(!result.dietary_tag_slugs.includes("jhatka"));
  assert.ok(!result.dietary_tag_slugs.includes("jain"));
});

test("accepts halal when it comes from the structured column", () => {
  const result = mapTaxonomy({ dietary: "Halal" }, null, CUISINES, TAGS);
  assert.deepEqual(result.dietary_tag_slugs, ["halal"]);
});

test("jain and egg-free map from their common phrasings", () => {
  const result = mapTaxonomy({ dietary: "no onion no garlic; eggless" }, null, CUISINES, TAGS);
  assert.ok(result.dietary_tag_slugs.includes("jain"));
  assert.ok(result.dietary_tag_slugs.includes("egg_free"));
});

test("derives the kitchen dietary profile", () => {
  assert.equal(deriveDietaryProfile(["veg", "jain"]), "veg_only");
  assert.equal(deriveDietaryProfile(["non_veg", "halal"]), "non_veg");
  assert.equal(deriveDietaryProfile(["veg", "non_veg"]), "mixed");
  assert.equal(deriveDietaryProfile([]), null);
});

const HOODS = [
  { slug: "indiranagar", name: "Indiranagar", lat: 12.9719, lng: 77.6412 },
  { slug: "hsr-layout", name: "HSR Layout", lat: 12.9116, lng: 77.6474 },
  { slug: "koramangala", name: "Koramangala", lat: 12.9352, lng: 77.6245 },
];

test("matches a neighbourhood from messy area text", () => {
  assert.equal(matchNeighbourhood("Indiranagar 2nd Stage", HOODS)?.slug, "indiranagar");
  assert.equal(matchNeighbourhood("HSR Layout Sector 2", HOODS)?.slug, "hsr-layout");
  assert.equal(matchNeighbourhood("koramangala 5th block", HOODS)?.slug, "koramangala");
  assert.equal(matchNeighbourhood("Near Indiranagar metro", HOODS)?.slug, "indiranagar");
});

test("returns null rather than a wrong neighbourhood", () => {
  assert.equal(matchNeighbourhood("Andheri West, Mumbai", HOODS), null);
  assert.equal(matchNeighbourhood(null, HOODS), null);
});
