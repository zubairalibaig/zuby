/**
 * Editorial copy for the programmatic landing pages (Phase 5).
 *
 * Written once, by hand, and composed per page — see
 * `docs/discoverability-strategy.md` §6. This is the part of a generated page
 * that a competitor with our schema could not reproduce, and the part answer
 * engines preferentially quote. It is deliberately specific: real detail about
 * real food beats three paragraphs of hedged filler, both for readers and for
 * the helpful-content classifier.
 *
 * Rules for anything added here:
 *   - Say something a person who has eaten the food would say.
 *   - No superlatives we can't stand behind, no invented statistics.
 *   - Two or three sentences. If it needs more, it wants to be its own page.
 */

/** Per-cuisine editorial. Keyed by cuisine slug (see supabase/seed.sql). */
export const cuisineBlurbs: Record<string, string> = {
  biryani:
    "Biryani is the dish home kitchens do best and restaurants do fastest — and those are not the same thing. A home cook layering two kilos of rice can afford the slow dum that a commercial kitchen turning forty orders an hour cannot. Order it for the day it's cooked, not reheated.",
  "north-indian":
    "North Indian home cooking is mostly the food restaurants don't put on menus: everyday dal, seasonal sabzi, roti made to order rather than held under a lamp. The restaurant version leans on cream and cashew paste because it has to survive a warmer; the home version doesn't need to.",
  "south-indian":
    "South Indian home kitchens run on fermentation and timing — batter ground the night before, podi mixed in small batches, sambar that tastes of the specific household's masala rather than a standardised paste. Tiffin items travel well; anything with a crisp element does not.",
  bengali:
    "Bengali home cooking is built on a sequence — bitter first, then dal, then vegetables, then fish — that almost no restaurant reproduces because it doesn't fit a single plate. Mustard, poppy seed and panch phoron do the heavy lifting. Ask about the fish; it changes with the season and the cook will know.",
  andhra:
    "Andhra food is assertive in a way that survives transport well: gongura, heavy tamarind, chillies used for flavour rather than only for heat. Home kitchens tend to make the pickles and podis themselves, which is the entire difference between an Andhra meal and a spicy one.",
  kerala:
    "Kerala home cooking is coconut in four different forms — grated, milk, first press, oil — plus curry leaves and a lot of restraint. Malabar biryani, appam, meen curry and beef fry are the things home cooks make that Bangalore restaurants either skip or flatten.",
  maharashtrian:
    "Maharashtrian home food splits sharply between the coastal and the interior — koli fish curries on one side, goda masala and bhakri on the other. Puran poli, thalipeeth and misal are festival and weekend food, so order ahead rather than same-day.",
  gujarati:
    "Gujarati home cooking balances sweet, sour and heat in the same mouthful, and it is the most reliably vegetarian cuisine on this list. A proper Gujarati thali is a construction of eight or nine small things, which is precisely the sort of order a home kitchen handles better than a restaurant.",
  rajasthani:
    "Rajasthani cooking was built for scarce water and long keeping — dal baati churma, ker sangri, gatte ki sabzi. Much of it is naturally vegetarian and uses no onion or garlic, which makes Rajasthani home kitchens a good first stop if you're looking for jain-friendly food.",
  mangalorean:
    "Mangalorean food is coastal Karnataka's least-exported cuisine: kori rotti, neer dosa, ghee roast, fish in a coconut-and-red-chilli gravy. Kori rotti in particular has to be assembled at the table or the wafers turn to paste — which is why it travels badly from restaurants and brilliantly from a kitchen ten minutes away.",
  hyderabadi:
    "Hyderabadi cooking carries a Mughlai inheritance — biryani, haleem, baghara baingan, double ka meetha — and depends on ingredients most kitchens shortcut: real saffron, fried onions made rather than bought, mutton on the bone. Haleem is seasonal; ask around Ramadan.",
  "chinese-desi":
    "Indo-Chinese is its own eighty-year-old cuisine, not a compromise. Home versions tend to use less colour and more actual wok heat. Order it for immediate eating — nothing in this category improves in a container.",
  "bakes-desserts":
    "Home bakers are where the interesting baking is: eggless without tasting like a substitution, less sugar than commercial equivalents, and a willingness to make thirty of something rather than three hundred. Most work to order, so plan a day or two ahead.",
  "healthy-meals":
    "The useful version of a healthy meal from a home kitchen is portion control and real ingredients, not a label. Chefs in this category typically publish calories and macros per serving — look for the nutrition panel on the menu item rather than the word on the tin.",
  "tiffin-thali":
    "A daily tiffin is the oldest subscription in Indian food and still the best value in it. Most tiffin cooks run a fixed rotating menu, cook to a headcount, and want to know by the previous evening. Ask what the week looks like before committing.",
};

/**
 * Per-dietary-tag explainers. These carry disproportionate weight: they serve
 * the underserved audiences CONCEPT.md is built around, and the questions are
 * genuinely under-answered online. Accuracy and respect matter more here than
 * anywhere else on the site.
 */
export const dietaryBlurbs: Record<string, string> = {
  veg: "Pure vegetarian kitchens cook no meat, fish or egg at all — and, importantly, do it in a kitchen where none is ever cooked. That last part is what separates a pure-veg home kitchen from a restaurant with a vegetarian section, and it's the reason many households will only order from one.",
  non_veg:
    "Kitchens listed as non-veg cook meat, poultry or fish alongside vegetarian dishes. If you need a specific slaughter method or want to know whether the same utensils are used for both, ask before ordering — home cooks are used to the question and will answer it straight.",
  halal:
    "Halal here means the kitchen sources halal-slaughtered meat and does not cook pork or use alcohol. In India there is no single certifying authority for a home kitchen the way MUIS certifies in Singapore, so this is the chef's own declaration and Zuby's verification confirms the chef, not the supply chain. If certification matters to you, ask which butcher they use — most will tell you by name.",
  jhatka:
    "Jhatka meat is killed with a single strike, and for many Sikh and some Hindu households it's a requirement rather than a preference. It is genuinely hard to find in Indian cities, because most commercial supply defaults to halal. Kitchens listed here source jhatka specifically — which usually means a named supplier they've used for years.",
  jain: "Jain cooking excludes all root vegetables — no onion, no garlic, no potato, ginger or carrot — because harvesting them kills the plant and the organisms around it. Many kitchens also avoid cooking after sunset during certain periods. This is not 'vegetarian, minus a few things': it's a different way of building flavour, using asafoetida, green chilli and raw banana where another kitchen would start with onions.",
  egg_free:
    "Egg-free matters most in baking, where eggs do structural work that has to be replaced rather than removed. A good egg-free bake is not a compromised version of the original — it's a different recipe. Kitchens tagged here bake without eggs as their default, rather than offering it as a substitution on request.",
  healthy:
    "Kitchens tagged healthy focus on calorie-aware, high-protein or diet-specific cooking — often for people eating the same thing five days a week. The useful signal isn't the tag, it's whether the menu items carry actual nutrition numbers. Many here publish calories and macros per serving.",
};

/**
 * Per-neighbourhood context. One or two sentences of local truth — the hardest
 * component to fabricate and the most obviously human. Keyed by
 * `${citySlug}/${neighbourhoodSlug}`.
 */
export const neighbourhoodBlurbs: Record<string, string> = {
  "bangalore/indiranagar":
    "Indiranagar's home-food scene skews toward the people who left corporate jobs to cook — smaller operations, tighter menus, more baking than most parts of the city. Delivery radius here is genuinely small; a kitchen on 12th Main may not serve CMH Road.",
  "bangalore/koramangala":
    "Koramangala has the densest concentration of tiffin services in Bangalore, driven by two decades of startup offices and the shared flats around them. Weekday subscriptions dominate; weekend biryani and North-Eastern cooking are the interesting edges.",
  "bangalore/hsr-layout":
    "HSR runs on daily tiffin. The sector layout matters more than distance — a kitchen in Sector 2 will often deliver across Sector 1 and skip Sector 7 entirely, so check the radius rather than the map.",
  "bangalore/whitefield":
    "Whitefield is spread out enough that home kitchens tend to serve one or two apartment complexes rather than an area. Strong Kerala and Bengali representation, following the tech-corridor demographics.",
  "bangalore/jayanagar":
    "Jayanagar is the old-Bangalore end of the home-food market: long-running kitchens, festival cooking, Tamil and Kannada household food that predates any of this being a business. Several cooks here have been feeding the same families for a decade.",
  "bangalore/marathahalli":
    "Marathahalli's kitchens serve the ORR office belt, so lunch tiffin volume is high and weekend volume drops. Andhra and Telangana cooking is well represented.",
  "bangalore/bellandur":
    "Bellandur cooking clusters around the lakeside apartment complexes, with a lot of North Indian and Bengali home kitchens serving within their own gated communities. If you live in one of the large complexes, check whether a kitchen is already inside it.",
};

/**
 * Editorial for the pan-India "coming soon" pages (docs/discoverability-
 * strategy.md §13). Keyed by city slug — see supabase/seed.sql's cities
 * insert for the current list, all is_active = false until each crosses the
 * documented chef-supply gate. Same rules as cuisineBlurbs above: specific,
 * no invented statistics, nothing a person who knows the city would wince at.
 */
export const comingSoonCityBlurbs: Record<string, string> = {
  "delhi-ncr":
    "Delhi NCR runs on Punjabi and Mughlai home cooking — rajma-chawal, everyday dal, kebabs — alongside a large Kayastha, Bihari and Purvanchali food culture restaurants rarely represent well. Gurugram and Noida's dense apartment towers are exactly the tiffin-subscription demand a directory like this is built for.",
  mumbai:
    "Mumbai invented the dabbawala, the daily home-tiffin delivery network the whole idea of reliably-delivered home food is arguably named after. Maharashtrian, Gujarati, Parsi and Konkani home kitchens already run in nearly every suburb from Bandra to Thane — mostly found through a building's WhatsApp group rather than one searchable place.",
  hyderabad:
    "Hyderabad's home kitchens specialise in things that reward patience over speed: slow dum biryani, haleem through Ramadan, Irani-chai-and-Osmania-biscuit routines. Banjara Hills, Gachibowli and the Old City each carry a genuinely different food culture worth searching separately, not one generic 'Hyderabadi' bucket.",
  chennai:
    "Chennai's home kitchens carry Tamil Brahmin and Chettinad cooking most restaurants flatten for a broader audience — filter coffee made properly, sambar that tastes of one household's own masala, Chettinad meat curries with a spice depth restaurants rarely attempt at scale. Much of it already happens informally around T Nagar, Adyar and Velachery.",
  pune: "Pune pairs a large student and IT population with strong Maharashtrian and Kolhapuri home cooking — misal, thalipeeth, puran poli — and one of India's highest tiffin-subscription rates per capita, driven by hostellers and PG residents across Koregaon Park, Baner and Viman Nagar.",
};

/**
 * Intent-page editorial. These target the head of the long tail — real search
 * demand with genuine informational intent behind it.
 */
export const intentPages = {
  "tiffin-service": {
    slug: "tiffin-service",
    title: (cityName: string) => `Home tiffin services in ${cityName}`,
    metaTitle: (cityName: string, count: number) =>
      `${count} verified home tiffin services in ${cityName} | Zuby`,
    metaDescription: (cityName: string, count: number) =>
      `${count} verified home tiffin services in ${cityName}. Daily meals from home kitchens — veg, non-veg, jain and halal. Compare menus and prices, then order on WhatsApp.`,
    intro: [
      "A tiffin service is a home kitchen that cooks the same rotating menu every day and delivers it to a fixed set of subscribers. It is the cheapest reliable way to eat home-style food in an Indian city, and it predates every food-delivery app by about a century.",
      "Most tiffin cooks want to know your headcount the evening before, run a weekly menu rather than an à la carte one, and price per meal rather than per dish. The listings below show what each kitchen cooks, what it charges, and which dietary requirements it handles.",
    ],
  },
  "home-cooked-food": {
    slug: "home-cooked-food",
    title: (cityName: string) => `Home-cooked food in ${cityName}`,
    metaTitle: (cityName: string, count: number) =>
      `Home-cooked food in ${cityName} — ${count} verified home chefs | Zuby`,
    metaDescription: (cityName: string, count: number) =>
      `${count} verified home chefs cooking in ${cityName}. Find home food and home-cooked meals near you — filter by cuisine, veg, halal, jain or egg-free — and order directly on WhatsApp.`,
    intro: [
      "Home-cooked food in Indian cities has always been sold — through apartment WhatsApp groups, Instagram pages, and notices in lift lobbies. What it has never had is one place to search. That is the whole of what Zuby does.",
      "Every kitchen below has been checked by a person before appearing here: FSSAI number, photos, address, contact. Ordering happens on WhatsApp, directly with the cook, exactly as it does today — Zuby takes no commission and handles no money.",
    ],
  },
} as const;

export type IntentSlug = keyof typeof intentPages;

/**
 * FAQ blocks. Rendered as visible content AND as FAQPage JSON-LD — the
 * question-and-answer shape is what answer engines lift most reliably
 * (see docs/discoverability-strategy.md §8).
 */
export const cityFaq = (cityName: string): { q: string; a: string }[] => [
  {
    q: "How do I order from a home chef on Zuby?",
    a: `Every listing has a WhatsApp button. Tapping it opens a chat with that chef with a short message already written. You agree what you want, when you want it and how you'll pay directly with the cook. Zuby does not take the order, hold the money or arrange delivery.`,
  },
  {
    q: "Is the food safe? How are chefs verified?",
    a: `Nothing appears on Zuby until a person has reviewed it. We check the chef's FSSAI registration number, their photos, their kitchen address and their contact details before the listing goes live. The FSSAI number is displayed publicly on every Indian listing so you can see it yourself. Chefs who change their name, address or FSSAI number go back through review before the change appears.`,
  },
  {
    q: "What does Zuby charge?",
    a: `Nothing, to either side. Chefs pay no commission and no listing fee, and keep everything they earn. Buyers pay the chef directly. Zuby makes no money on any order placed through it today.`,
  },
  {
    q: "How is Zuby different from Swiggy or Zomato?",
    a: `Swiggy and Zomato are restaurant-delivery marketplaces — they take the order, handle delivery, and charge the restaurant a commission of roughly 20-30% per order. Zuby is a directory of home chefs, not restaurants: it helps you find a verified home kitchen and connects you to them on WhatsApp, but the chef takes the order, cooks it and arranges delivery themselves, the way home food has always worked. Zuby charges no commission, so it isn't trying to be a faster Swiggy — it's solving a problem Swiggy and Zomato don't: finding a real home cook, not a restaurant, near you.`,
  },
  {
    q: `How do I find chefs near me in ${cityName}?`,
    a: `Use the location search — it finds chefs within a distance you choose, and only shows kitchens whose own delivery radius actually reaches you. A chef who delivers within 5 km of their kitchen will not appear if you are 8 km away, even if you are both in ${cityName}.`,
  },
  {
    q: "Can I get halal, jain, jhatka or egg-free food?",
    a: `Yes — these are filters, not footnotes. Each kitchen declares what it cooks and Zuby confirms the declaration during verification. You can filter the whole directory by halal, jhatka, jain, pure veg, non-veg or egg-free, and combine those filters with cuisine and distance.`,
  },
  {
    q: "How do I list my kitchen on Zuby?",
    a: `Sign in with your email at zuby.food/login and create your listing — kitchen name, area, WhatsApp number, cuisines, FSSAI number, photos and menu. It goes into a review queue and is usually live within a day. It is free, and it stays free.`,
  },
];

/** Composed title/description builders. Counts always come from live queries. */
export const landingCopy = {
  neighbourhoodCuisine: {
    h1: (count: number, cuisineName: string, hoodName: string) =>
      `${count} ${cuisineName} home ${count === 1 ? "chef" : "chefs"} in ${hoodName}`,
    metaTitle: (count: number, cuisineName: string, hoodName: string, cityName: string) =>
      `${cuisineName} home chefs in ${hoodName}, ${cityName} — ${count} verified | Zuby`,
    metaDescription: (count: number, cuisineName: string, hoodName: string) =>
      `${count} verified home chefs cooking ${cuisineName} in ${hoodName}. See menus, prices and dietary tags, then order directly on WhatsApp. No commission, no app.`,
  },
  cityDietary: {
    h1: (count: number, tagName: string, cityName: string) =>
      `${count} ${tagName} home ${count === 1 ? "chef" : "chefs"} in ${cityName}`,
    metaTitle: (count: number, tagName: string, cityName: string) =>
      `${tagName} home chefs in ${cityName} — ${count} verified kitchens | Zuby`,
    metaDescription: (count: number, tagName: string, cityName: string) =>
      `${count} verified ${tagName.toLowerCase()} home kitchens in ${cityName}. Every listing is human-reviewed with its FSSAI number shown. Order directly on WhatsApp.`,
  },
  neighbourhoodDietary: {
    h1: (count: number, tagName: string, hoodName: string) =>
      `${count} ${tagName} home ${count === 1 ? "chef" : "chefs"} in ${hoodName}`,
    metaTitle: (count: number, tagName: string, hoodName: string, cityName: string) =>
      `${tagName} home chefs in ${hoodName}, ${cityName} — ${count} verified | Zuby`,
    metaDescription: (count: number, tagName: string, hoodName: string) =>
      `${count} verified ${tagName.toLowerCase()} home kitchens delivering in ${hoodName}. Menus, prices and FSSAI numbers on every listing. Order on WhatsApp.`,
  },
  /** Shown under the H1 on every generated landing page. */
  verifiedNote:
    "Every kitchen below has been reviewed by a person before appearing here. Ordering happens directly on WhatsApp — Zuby charges no commission.",
  relatedHeading: "Related searches",
  faqHeading: "Common questions",
} as const;
