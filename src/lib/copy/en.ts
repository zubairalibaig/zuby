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
    useLocationCta: "Show chefs near me",
    locationHelp: "We only use this to find chefs close to you — never stored precisely.",
    citiesHeading: "Cities",
    valuePropsHeading: "Why Zuby",
    valueProps: [
      {
        title: "Verified chefs only",
        body: "Every kitchen is human-reviewed before it goes live — photos, address, FSSAI number.",
      },
      {
        title: "Search the way you eat",
        body: "Filter by halal, jain, veg, jhatka or egg-free — not buried footnotes, real filters.",
      },
      {
        title: "Order on WhatsApp",
        body: "No new app, no account. Tap the button, chat with the chef directly.",
      },
    ],
    howItWorksHeading: "How it works",
    howItWorks: [
      { step: "1", text: "Tell us your location or pick your neighbourhood." },
      { step: "2", text: "Browse verified home chefs near you, filtered your way." },
      { step: "3", text: "Tap to order — it opens WhatsApp, chatting straight to the chef." },
    ],
    forChefsTeaser: "Are you a home chef? Get listed free — keep 100% of your revenue.",
    forChefsCta: "List your kitchen",
  },

  city: {
    neighbourhoodsHeading: "Neighbourhoods",
    cuisinesHeading: "Cuisines",
    featuredHeading: "Verified kitchens in",
    chefCountSuffix: (n: number) => `${n} verified ${n === 1 ? "kitchen" : "kitchens"}`,
    notLiveHeading: (city: string) => `Zuby isn't in ${city} yet`,
    notLiveBody: "We're starting in Bangalore. More cities are coming soon.",
    backHome: "Back to Zuby",
  },

  neighbourhood: {
    heading: (neighbourhood: string) => `Home chefs in ${neighbourhood}`,
    empty: "No verified chefs here yet — check back soon, or widen your search.",
    searchNearbyLink: "Search a wider area",
  },

  cuisine: {
    heading: (cuisine: string, city: string) => `${cuisine} home chefs in ${city}`,
    empty: "No verified chefs for this cuisine yet — check back soon.",
  },

  chef: {
    verifiedBadge: "Verified by Zuby",
    unclaimedBanner: "Is this your kitchen?",
    unclaimedBannerBody: "Claim this listing to manage your menu, photos and prices.",
    unclaimedBannerCta: "Claim this listing",
    menuHeading: "Menu",
    bestSellerBadge: "Best seller",
    unavailable: "Currently unavailable",
    photosHeading: "Photos",
    timingsHeading: "Timings",
    orderCta: "Order on WhatsApp",
    distanceAway: (km: number) => `~${km} km away`,
    fssaiLabel: "FSSAI",
    cuisinesLabel: "Cuisines",
    dietaryLabel: "Dietary",
    nutritionPer: "per serving",
  },

  search: {
    heading: "Chefs near you",
    radiusLabel: "Distance",
    dietaryLabel: "Dietary",
    cuisineLabel: "Cuisine",
    verifiedOnlyLabel: "Verified only",
    locationDeniedHeading: "We couldn't get your location",
    locationDeniedBody: "Pick your neighbourhood instead and we'll show chefs nearby.",
    loading: "Finding chefs near you…",
    empty: "No chefs found in this area yet — try widening your search.",
    resultCount: (n: number) => `${n} ${n === 1 ? "chef" : "chefs"} found`,
  },

  forChefs: {
    metaTitle: "List your kitchen on Zuby — free, forever",
    heading: "List your kitchen on Zuby",
    subheading:
      "Free visibility for home chefs and tiffin services. No commission, ever — you keep 100% of what you earn.",
    points: [
      { title: "Zero commission", body: "We never take a cut of your orders. Not now, not later." },
      {
        title: "You stay in control",
        body: "Orders and payments happen exactly how they do today, on WhatsApp.",
      },
      {
        title: "Real customers",
        body: "Buyers searching by location, cuisine and dietary need — not another noticeboard.",
      },
    ],
    interimHeading: "We're onboarding chefs in Bangalore right now",
    interimBody: "Message us on WhatsApp with your kitchen name and area to get listed.",
    interimCta: "Message us on WhatsApp",
  },

  wa: {
    messageTemplate: (chefFirstName: string | null, kitchenName: string) =>
      `Hi${chefFirstName ? ` ${chefFirstName}` : ""}! I found ${kitchenName} on Zuby (zuby.food) and would like to order. 🍱`,
  },

  notFound: {
    heading: "This page doesn't exist",
    body: "The listing you're looking for isn't here — it may have moved or isn't live yet.",
    cta: "Back to Zuby",
  },
} as const;
