import type { MetadataRoute } from "next";

/**
 * PWA manifest (Phase 5). Installable on Android, which is where most of our
 * traffic is — CONCEPT.md rules out native apps, so this is the whole of the
 * "app" story and it needs to be right.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zuby — Home-cooked food near you",
    short_name: "Zuby",
    description:
      "A directory of verified home chefs and tiffin services. Find home-cooked food near you and order on WhatsApp.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#e8590c",
    categories: ["food", "lifestyle", "shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
