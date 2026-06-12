/* Service worker for The Block (/program) PWA.
 *
 * Scope is /program only (see Service-Worker-Allowed header in next.config.mjs),
 * so this can never affect the rest of justinmillheim.com. Strategy:
 *   - navigations to /program → network-first, fall back to the cached shell
 *     (lets the app launch offline at the gym).
 *   - hashed build assets (/_next/static) + /program icons → cache-first.
 *   - cross-origin (e.g. Supabase) and everything else → passthrough.
 * Bump CACHE when the caching logic changes to evict old entries.
 */
const CACHE = "the-block-v1";
const SHELL = "/program";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([SHELL, "/program/manifest.webmanifest"]).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/program/") && /\.(png|webmanifest|css|js|svg|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch Supabase et al.

  // App navigations → network-first with an offline shell fallback.
  if (req.mode === "navigate" && url.pathname.startsWith("/program")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match(SHELL)))
    );
    return;
  }

  // Hashed build assets + program icons → cache-first (stale-while-revalidate).
  if (isAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
