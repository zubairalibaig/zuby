/**
 * All public-facing strings live here (CLAUDE.md convention, future i18n).
 * Do not put user-visible copy inline in JSX where practical.
 */
export const copy = {
  siteName: "Zuby",
  tagline: "Home-cooked food, near you.",
  metaTitle: "Zuby — Home-cooked food near you",
  metaDescription:
    "Zuby is a directory of verified home chefs and tiffin services. Find home-cooked food near you — veg, halal, jain and more — and order directly on WhatsApp.",
  landing: {
    heading: "Home-cooked food, near you.",
    subheading:
      "Zuby is a directory of verified home chefs and tiffin services — launching soon in Bangalore.",
    launchNote: "Launching soon in Bangalore",
    chefCta: "Are you a home chef? Get listed free — keep 100% of your revenue.",
  },
} as const;
