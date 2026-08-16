import { test } from "node:test";
import assert from "node:assert/strict";
import { extractInstagram, extractPhones, toE164 } from "../src/normalise/phone.js";

test("Indian numbers in every format people actually write", () => {
  const expected = "+919900000001";
  for (const input of [
    "9900000001",
    "09900000001",
    "+919900000001",
    "91 9900000001",
    "+91 99000 00001",
    "+91-99000-00001",
    "(+91) 99000 00001",
    "0091 9900000001",
    "  9900000001  ",
  ]) {
    assert.equal(toE164(input), expected, `failed for: ${input}`);
  }
});

test("Singapore numbers normalise with the SG default", () => {
  assert.equal(toE164("9123 4567", "SG"), "+6591234567");
  assert.equal(toE164("+65 8123 4567"), "+6581234567");
});

test("rejects rather than guesses when a number cannot be valid", () => {
  assert.equal(toE164("12345"), null, "too short");
  assert.equal(toE164("1234567890"), null, "Indian mobiles never start with 1");
  assert.equal(toE164("5900000001"), null, "invalid Indian mobile prefix");
  assert.equal(toE164(""), null);
  assert.equal(toE164(null), null);
  assert.equal(toE164("call us!"), null);
});

test("a landline-looking number is not accepted as a mobile", () => {
  assert.equal(toE164("08041234567"), null);
});

test("extracts numbers from a bio, deduplicated and in order", () => {
  const bio = "Order on WhatsApp 99000 00001 or call +91 98800 00002. Same number 9900000001.";
  assert.deepEqual(extractPhones(bio), ["+919900000001", "+919880000002"]);
});

test("instagram handle from url or mention", () => {
  assert.equal(extractInstagram("https://instagram.com/aishas.biryani"), "aishas.biryani");
  assert.equal(extractInstagram("https://www.instagram.com/Ghar_Ka_Khana/"), "ghar_ka_khana");
  assert.equal(extractInstagram("DM us @meena.tiffins today"), "meena.tiffins");
  assert.equal(extractInstagram("no socials here"), null);
});
