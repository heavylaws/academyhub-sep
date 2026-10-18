// PeakForm Athletics Service Worker for Offline Trackside Shell Caching
const CACHE_NAME = "peakform-shell-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/kiosk",
  "/index.html",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Tolerant if some assets fail during dev
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Purge cached data on user logout or session reset
self.addEventListener("message", (event) => {
  if (
    event.data &&
    (event.data.type === "LOGOUT" ||
      event.data.type === "CLEAR_USER_DATA" ||
      event.data.type === "RESET_CACHE")
  ) {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      })
    );
  }
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // Strictly exclude API, Convex queries/mutations, auth endpoints, and developer passes
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("convex") ||
    url.hostname.includes("convex.cloud") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.includes("invite-cards") ||
    url.protocol.startsWith("ws") ||
    event.request.headers.has("Authorization")
  ) {
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith("/assets/") ||
    /\.(?:js|css|woff2?|ttf|png|jpe?g|svg|ico|webp)$/i.test(url.pathname);

  // Cache static code assets (immutable JS/CSS/fonts/images)
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // For SPA navigation requests: network first with offline fallback to cached shell
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }
});
