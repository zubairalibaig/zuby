/**
 * Zuby service worker — deliberately conservative.
 *
 * Caches the app shell and static assets only. It must NEVER cache chef data,
 * search results, menus, prices or availability: a chef who marks themselves
 * closed and still shows as open is a broken promise to both sides, and the
 * whole product is trust. Stale HTML here would be worse than being offline.
 *
 * Strategy:
 *   - Static assets (/_next/static, icons): cache-first. Content-hashed, safe.
 *   - Navigations: network-first, falling back to the offline page. Never a
 *     cached page — the offline page is honest, a stale listing is not.
 *   - Everything else (API, Supabase, storage images): straight to network.
 */

const CACHE = "zuby-shell-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never touch authenticated or dynamic surfaces.
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/claim")
  ) {
    return;
  }

  // Content-hashed static assets: cache-first is safe by construction.
  if (url.pathname.startsWith("/_next/static") || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Page navigations: network-first, offline page as the only fallback.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});
