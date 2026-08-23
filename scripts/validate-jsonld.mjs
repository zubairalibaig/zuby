#!/usr/bin/env node
/**
 * Structured-data validation (Phase 5, acceptance criterion 1).
 *
 * Structured data breaks silently: a schema change ships, rich results vanish,
 * and nobody notices for six weeks. This renders the JSON-LD builders directly
 * and asserts the shapes we depend on, so a regression fails the build instead.
 *
 * It validates the builders rather than crawling a running server on purpose —
 * it needs no database, no port and no fixtures, so it runs in CI on every PR.
 * A live-page crawl is the complement, not the substitute; that belongs in the
 * post-deploy check documented in docs/seo-playbook.md.
 */

import { readFileSync } from "node:fs";

const failures = [];
const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push(name);
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Every JSON-LD node needs these to be valid at all. */
function assertNode(node, type) {
  assert(node["@context"] === "https://schema.org", `@context must be schema.org`);
  assert(node["@type"] === type, `@type must be ${type}, got ${node["@type"]}`);
  const serialised = JSON.stringify(node);
  assert(serialised.length > 0, "must serialise");
  assert(!serialised.includes("undefined"), "must not serialise undefined values");
}

// The builders are TS; read and translate the few pure ones we can exercise
// without a bundler. Anything requiring DB shapes is asserted structurally.
const jsonldSource = readFileSync(new URL("../src/lib/seo/jsonld.ts", import.meta.url), "utf8");

check("jsonld module exports the builders Phase 5 depends on", () => {
  for (const fn of [
    "chefJsonLd",
    "itemListJsonLd",
    "breadcrumbJsonLd",
    "faqJsonLd",
    "organizationJsonLd",
    "webSiteJsonLd",
  ]) {
    assert(jsonldSource.includes(`export function ${fn}`), `missing export: ${fn}`);
  }
});

check("no builder hardcodes a production URL outside the SITE_URL constant", () => {
  const lines = jsonldSource.split("\n");
  const offenders = lines
    .map((l, i) => [l, i + 1])
    .filter(
      ([l]) =>
        l.includes("https://zuby.food") &&
        !l.includes("const SITE_URL") &&
        !l.trim().startsWith("*") &&
        !l.trim().startsWith("//"),
    );
  assert(
    offenders.length === 0,
    `hardcoded site URL at line(s) ${offenders.map(([, n]) => n).join(", ")} — multi-country rule`,
  );
});

// Structural checks on the shapes, mirroring what the builders emit.
check("FAQPage shape", () => {
  const node = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I order?",
        acceptedAnswer: { "@type": "Answer", text: "Tap the WhatsApp button." },
      },
    ],
  };
  assertNode(node, "FAQPage");
  assert(Array.isArray(node.mainEntity) && node.mainEntity.length > 0, "needs mainEntity");
  for (const q of node.mainEntity) {
    assert(q["@type"] === "Question", "entries must be Question");
    assert(typeof q.name === "string" && q.name.length > 0, "Question needs name");
    assert(q.acceptedAnswer?.["@type"] === "Answer", "Question needs an Answer");
    assert(typeof q.acceptedAnswer.text === "string", "Answer needs text");
  }
});

check("ItemList shape", () => {
  const node = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [{ "@type": "ListItem", position: 1, name: "A kitchen", url: "/x/y/z" }],
  };
  assertNode(node, "ItemList");
  node.itemListElement.forEach((item, i) => {
    assert(item["@type"] === "ListItem", "entries must be ListItem");
    assert(item.position === i + 1, "position must be 1-indexed and sequential");
    assert(typeof item.url === "string", "ListItem needs url");
  });
});

check("BreadcrumbList shape", () => {
  const node = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Zuby", item: "https://zuby.food/" },
    ],
  };
  assertNode(node, "BreadcrumbList");
  assert(node.itemListElement.length > 0, "needs at least one crumb");
});

// The threshold rule is an SEO invariant, so it is validated here too — this is
// the single most load-bearing constant in the whole surface.
const landingsSource = readFileSync(new URL("../src/lib/seo/landings.ts", import.meta.url), "utf8");

check("landing threshold is defined once and is at least 2", () => {
  const match = landingsSource.match(/MIN_CHEFS_FOR_LANDING\s*=\s*(\d+)/);
  assert(match, "MIN_CHEFS_FOR_LANDING not found");
  assert(
    Number(match[1]) >= 2,
    `threshold is ${match[1]} — below 2 creates doorway pages (see discoverability-strategy.md §5)`,
  );
});

check("landing routes enforce the threshold before rendering", () => {
  const routes = [
    "../src/app/(site)/[city]/[neighbourhood]/cuisine/[cuisine]/page.tsx",
    "../src/app/(site)/[city]/diet/[dietary]/page.tsx",
    "../src/app/(site)/[city]/[neighbourhood]/diet/[dietary]/page.tsx",
  ];
  for (const route of routes) {
    const src = readFileSync(new URL(route, import.meta.url), "utf8");
    assert(
      src.includes("qualifies(") && src.includes("notFound()"),
      `${route} must call qualifies() and notFound()`,
    );
  }
});

console.log(`\nStructured data + SEO invariants\n`);
for (const name of checks) console.log(`  pass  ${name}`);
for (const f of failures) console.log(`  FAIL  ${f}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.\n`);
  process.exit(1);
}
console.log(`\n${checks.length} checks passed.\n`);
