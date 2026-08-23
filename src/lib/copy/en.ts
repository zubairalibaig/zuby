/**
 * All public-facing strings live here (CLAUDE.md convention, future i18n).
 * Do not put user-visible copy inline in JSX where practical.
 */
export const copy = {
  siteName: "Zuby",
  tagline: "Home-cooked food, near you.",
  // Generic fallback — used by the root layout for any page that doesn't set
  // its own <title>/<description> (there should be very few; every real page
  // overrides this). Deliberately city-agnostic since it has no request
  // context to pull a live city from.
  metaTitle: "Zuby — Home-cooked food near you",
  metaDescription:
    "Zuby is a directory of verified home chefs and tiffin services. Find home-cooked food near you — veg, halal, jain and more — and order directly on WhatsApp.",
  // The home page's real title/description — dynamic per active city so it
  // never hardcodes a place name into logic (CLAUDE.md), while still leading
  // with the exact phrases we most want to rank for: home chef, home tiffin,
  // tiffin service, home-cooked food, all anchored to a real city name.
  homeMetaTitle: (cityName: string) =>
    `Zuby — Verified Home Chefs & Tiffin Services in ${cityName}`,
  homeMetaDescription: (cityName: string) =>
    `Find verified home chefs and home tiffin services in ${cityName}. Real home-cooked food — veg, halal, jhatka, jain and egg-free — ordered directly on WhatsApp. Zero commission, no app.`,

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
    headingFor: (q: string) => `"${q}" near you`,
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

  nav: {
    about: "About",
    howWeVerify: "How we verify",
    listKitchen: "List your kitchen",
  },

  footer: {
    blurb:
      "A directory of verified home chefs and tiffin services. Find home-cooked food near you and order straight on WhatsApp — no commission, no app.",
    cuisinesHeading: "Cuisines",
    dietaryHeading: "Dietary",
    zubyHeading: "Zuby",
    citiesHeading: "Cities",
    chefLogin: "Chef sign in",
    legal: "Zuby is a directory. Orders and payments happen directly with the chef.",
    madeIn: "Made in Bangalore 🇮🇳",
  },

  home: {
    // Location
    setLocation: "Set your location",
    useMyLocation: "Use my current location",
    locating: "Finding you…",
    locationDenied:
      "We couldn't get your location — pick your area below and we'll show chefs who deliver there.",
    nearMe: "Near me",
    areaFilterPlaceholder: "Search for your area…",
    noAreas: "No areas match that.",

    // Search
    searchPlaceholder: "Search for a kitchen, dish, cuisine or area",
    chefCount: (n: number) => `${n} ${n === 1 ? "chef" : "chefs"}`,

    // Hero
    heroHeading: "Home-cooked food, near you",
    heroLine1: "Real home cooking,",
    heroLine2: "from someone near you.",
    heroSub:
      "Verified home chefs and tiffin services. Find them by area, cuisine or how you eat — then order straight on WhatsApp.",
    heroLocationPrompt: "Tell us where you are and we'll show who's cooking nearby.",
    // City comes from data — CLAUDE.md forbids hardcoding it, and a second
    // market would otherwise show the wrong name beside a live count.
    liveBadge: (n: number, city: string) =>
      `${n} verified ${n === 1 ? "kitchen" : "kitchens"} in ${city}`,

    // Trust band
    trustPoints: [
      {
        icon: "✅",
        title: "A person checks every kitchen",
        body: "Nothing appears on Zuby until someone has reviewed the FSSAI registration, the photos and the address. No exceptions, no auto-approval.",
      },
      {
        icon: "🌱",
        title: "Halal, jain and veg are filters",
        body: "Not footnotes buried in a description. Filter the whole directory by halal, jhatka, jain, pure veg or egg-free, and combine it with distance.",
      },
      {
        icon: "💬",
        title: "You order on WhatsApp",
        body: "No app, no account, no cart. Tap once and you're chatting with the cook — exactly how home food already gets ordered.",
      },
    ],
    trustCta: "How we verify chefs",

    // How it works
    howHeading: "How Zuby works",
    howSteps: [
      {
        n: "1",
        title: "Say where you are",
        body: "Share your location or pick your area. We only show kitchens whose own delivery radius actually reaches you.",
      },
      {
        n: "2",
        title: "Find your kind of food",
        body: "Search a dish, a cuisine or a dietary need. Every kitchen shows its menu, prices and FSSAI number up front.",
      },
      {
        n: "3",
        title: "Message the cook",
        body: "One tap opens WhatsApp with a message ready. You agree the order and pay them directly — Zuby takes nothing.",
      },
    ],

    // Chef CTA
    chefCtaTitle: "Cooking from home? Get found.",
    chefCtaBody:
      "Free listing, zero commission, and you keep every rupee your customers pay you. Most kitchens are live within a day.",
    chefCtaButton: "List your kitchen — free",
    chefCtaSecondary: "Already listed? Claim it",

    // Sections
    cravingHeading: "What are you craving?",
    dietaryHeading: "Eating a particular way?",
    promotedHeading: "Featured kitchens",
    promotedNote: "Paid placement. Every featured kitchen is verified like any other.",
    promotedBadge: "Promoted",
    trendingHeading: "Trending this month",
    trendingNote: "Most contacted on WhatsApp in the last 30 days",
    nearYouHeading: "Near you",
    showChefsNear: (area: string) => `Show all kitchens near ${area}`,
    areasHeading: "Browse by area",
    citiesHeading: "Cities on Zuby",
    seeAll: "See all",
    emptyHeading: "Kitchens are coming to your area",
    emptyBody:
      "We're verifying home chefs in Bangalore right now — every one checked by a person before it appears here. Know someone who cooks? Send them our way.",
    emptyNearYou:
      "No kitchens cover your exact spot yet. Try browsing an area below — chefs each set their own delivery radius.",
  },

  share: {
    heading: "Share this kitchen",
    message: (kitchenName: string, url: string) =>
      `${kitchenName} is on Zuby — home-cooked food, order straight on WhatsApp. ${url}`,
    whatsappCta: "Share on WhatsApp",
    otherCta: "Copy link",
    copied: "Link copied",
  },

  wa: {
    messageTemplate: (chefFirstName: string | null, kitchenName: string) =>
      `Hi${chefFirstName ? ` ${chefFirstName}` : ""}! I found ${kitchenName} on Zuby (zuby.food) and would like to order. 🍱`,
  },

  login: {
    metaTitle: "Sign in — Zuby",
    heading: "Sign in to Zuby",
    subheading: "Manage your kitchen listing, menu, photos and more.",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    sendCode: "Send sign-in code",
    codeSent: "We sent a 6-digit code to",
    codeLabel: "Enter code",
    verifyCode: "Verify",
    orDivider: "or",
    googleCta: "Continue with Google",
    codeError: "That code didn't work. Please try again.",
  },

  onboarding: {
    heading: "Welcome to Zuby!",
    subheading: "What would you like to do?",
    findKitchen: "Find my kitchen",
    findKitchenDesc: "I already have a listing on Zuby that I want to manage.",
    listKitchen: "List my kitchen",
    listKitchenDesc: "I want to create a new listing for my home kitchen.",
    claimPendingHeading: "Your claim is with us",
    claimPendingBody:
      "waiting on a quick check. We'll email you when it's decided — usually same-day. No need to create a second listing.",
  },

  claim: {
    metaTitle: (kitchenName: string) => `Claim ${kitchenName} — Zuby`,
    heading: (kitchenName: string) => `Claim ${kitchenName}`,
    subheading:
      "Prove this is your kitchen to manage its menu, photos, timings and prices on Zuby.",
    whatsappVerifyHeading: "Quick verify with WhatsApp",
    whatsappVerifyBody:
      "Tap below to send us a message from the kitchen's WhatsApp number. We'll match it to confirm you're the owner — usually same-day.",
    whatsappVerifyCta: "Verify with WhatsApp",
    whatsappSent:
      "Claim started. Send the WhatsApp message we opened — we'll match the number and confirm, usually same-day.",
    whatsappReopen: "Open WhatsApp again",
    manualHeading: "Or verify manually",
    manualBody: "Tell us your connection to this kitchen and we'll review your claim.",
    nameLabel: "Your name",
    roleLabel: "Your role",
    rolePlaceholder: "Owner, chef, manager…",
    proofLabel: "How can we verify you run this kitchen?",
    proofPlaceholder: "e.g. I'm Aisha, I've been running this kitchen for 5 years. My number is…",
    submitClaim: "Submit claim",
    claimSubmitted: "Claim submitted! We'll review it shortly and email you the result.",
    alreadyClaimed: "This listing has already been claimed.",
    loginRequired: "Sign in first to claim this listing.",
    searchHeading: "Find your kitchen",
    searchPlaceholder: "Search by kitchen name…",
    noResults: "No unclaimed kitchens found. Try a different search or list your kitchen instead.",
  },

  createListing: {
    metaTitle: "List your kitchen — Zuby",
    heading: "List your kitchen on Zuby",
    steps: ["Kitchen info", "Location", "Contact", "Cuisines & dietary", "FSSAI", "Photos", "Menu"],
    submitForReview: "Submit for review",
    saveDraft: "Save draft",
    next: "Next",
    back: "Back",
    kitchenNameLabel: "Kitchen name",
    kitchenNamePlaceholder: "e.g. Aisha's Biryani Kitchen",
    displayNameLabel: "Your name (as the chef)",
    displayNamePlaceholder: "e.g. Aisha",
    cityLabel: "City",
    neighbourhoodLabel: "Neighbourhood",
    neighbourhoodPrompt: "Choose your neighbourhood…",
    neighbourhoodRequired:
      "Please choose your neighbourhood — your Zuby page address is built from it.",
    locationHeading: "Where is your kitchen?",
    useMyLocation: "Use my location",
    radiusLabel: "How far will you deliver?",
    radiusOptions: ["2 km", "5 km", "10 km"],
    areaLabel: "Area name (shown to customers)",
    areaPlaceholder: "e.g. Indiranagar 2nd Stage",
    whatsappLabel: "WhatsApp number",
    whatsappPlaceholder: "+91 99000 00001",
    whatsappHelp: "Customers will message you here. Include country code.",
    cuisineLabel: "What do you cook?",
    dietaryProfileLabel: "Kitchen type",
    dietaryProfileOptions: {
      veg_only: "Pure vegetarian",
      non_veg: "Non-vegetarian",
      mixed: "Both veg and non-veg",
    },
    dietaryTagsLabel: "Dietary tags (customers filter by these)",
    dietaryTagExplainers: {
      veg: "Vegetarian",
      non_veg: "Non-vegetarian",
      halal: "Halal certified",
      jhatka: "Jhatka meat",
      jain: "Jain (no onion/garlic/root veg)",
      egg_free: "No eggs",
      healthy: "Health-focused / diet meals",
    } as Record<string, string>,
    fssaiHeading: "FSSAI registration",
    fssaiLabel: "14-digit FSSAI number",
    fssaiPlaceholder: "e.g. 10020064000123",
    fssaiHelp:
      "Don't have one? You can submit without it, but your listing may show as incomplete.",
    fssaiHowToGet: "Don't have one? How to get an FSSAI registration",
    fssaiSteps: [
      "Go to the FSSAI FoSCoS portal and create an account with your mobile number.",
      "Choose 'Basic Registration' — it covers home kitchens turning over under ₹12 lakh a year.",
      "Upload a photo ID, a passport photo, and proof of your kitchen address.",
      "Pay the fee (₹100 per year) and note the 14-digit number on your certificate.",
      "Come back here and add it — your listing gets the verified badge once we check it.",
    ],
    fssaiPortalLink: "Open the FSSAI FoSCoS portal",
    resuming: "Picking up where you left off — your earlier answers are saved.",
    photosHeading: "Photos of your kitchen and food",
    photosHelp: "Upload up to 8 photos. Kitchen, food and chef photos help customers trust you.",
    menuHeading: "Your menu",
    menuHelp:
      "Add at least 3 items so customers know what you offer. You can always add more later.",
    submittedHeading: "Listing submitted!",
    submittedBody:
      "We'll review your listing and email you when it's live. This usually takes less than a day.",
    viewDashboard: "Go to your dashboard",
  },

  dashboard: {
    metaTitle: "Dashboard — Zuby",
    heading: "Your kitchen",
    statusLive: "Live on Zuby",
    statusPending: "Under review",
    statusDraft: "Draft — not submitted yet",
    statusChangesRequested: "Changes requested",
    statusRejected: "Listing rejected",
    statusSuspended: "Listing suspended",
    viewPublicPage: "View your page",
    submitForReview: "Submit for review",
    continueSetup: "Continue setup",
    nav: {
      overview: "Overview",
      menu: "Menu",
      timings: "Timings",
      photos: "Photos",
      profile: "Profile",
    },
    menuHeading: "Menu",
    addItem: "Add item",
    bestSellerMax: "You can mark up to 3 best sellers.",
    timingsHeading: "Timings",
    vacationMode: "Vacation mode",
    vacationHelp: "Turn this on to show customers you're taking a break.",
    photosHeading: "Photos",
    profileHeading: "Profile",
    trustFieldWarning:
      "Changing this needs a quick re-check by Zuby. Your page stays live with the old details until approved.",
    statsHeading: "Your stats",
    statsWaClicks: (n: number) => `${n} people tapped WhatsApp this month`,
    statsProfileViews: (n: number) => `${n} profile views this month`,
    noStats: "No activity yet — share your Zuby page to get started!",
  },

  notFound: {
    heading: "This page doesn't exist",
    body: "The listing you're looking for isn't here — it may have moved or isn't live yet.",
    cta: "Back to Zuby",
  },
} as const;
