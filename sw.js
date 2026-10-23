// LSD Software PWA service worker.
// Keep this version in sync with each frontend release.
const CACHE_NAME = "lsd-shell-v1.0.8";
const STATIC_CACHE = "lsd-static-v1.0.8";
const MAX_RUNTIME_ENTRIES = 80;
const PRECACHE_URLS = [
  "/", "/index.html", "/hub.html",
  "/css/styleIndex.css", "/css/lsd-immersive-motion.css",
  "/js/lsd-immersive-motion.js",
  "/img/home/lsd-logo-transparent.avif", "/img/home/lsd-logo-transparent.webp", "/img/home/lsd-logo-transparent.png",
  "/css/style.css", "/css/hub.css", "/css/auth-modal.css",
  "/css/badges.css", "/css/cosmetics.css", "/css/footer.css",
  "/js/fetch-utils.js", "/js/icons.js", "/js/auth-modal.js",
  "/js/badges.js", "/js/dust.js", "/js/shop.js", "/js/friends.js",
  "/js/messages.js", "/js/push.js", "/js/profile-view.js",
  "/js/footer.js", "/js/script.js", "/js/cookie-banner.js",
  "/cardGameWeb/js_cg/api.js",
  "/lsdConsole/console-icon.png", "/img/icon.png", "/img/icon.webp", "/img/logoCG.webp", "/img/logoPesca.webp", "/img/logoConsole.webp", "/img/pwa/icon-192.png", "/img/pwa/icon-512.png",
  "/img/pwa/apple-touch-icon.png",
  "/img/cosmetics/avatar-arcade-core.webp", "/img/cosmetics/avatar-hood.webp",
  "/img/cosmetics/avatar-lsd-logo.webp", "/img/cosmetics/avatar-pixel-pad.webp",
  "/img/cosmetics/avatar-skull.webp", "/img/cosmetics/avatar-neon-mask.webp",
  "/img/cosmetics/avatar-dragon.webp",
  "/img/cosmetics/banner-lsd-classic.webp", "/img/cosmetics/banner-cyber.webp",
  "/img/cosmetics/banner-forest.webp", "/img/cosmetics/banner-moonlight.webp",
  "/img/cosmetics/banner-neon-city.webp", "/img/cosmetics/banner-redline.webp",
  "/img/cosmetics/banner-sunset.webp",
  "/img/cosmetics/frame-classic.webp", "/img/cosmetics/frame-fire.webp",
  "/img/cosmetics/frame-gold.webp", "/img/cosmetics/frame-ice.webp",
  "/img/cosmetics/frame-neon-blue.webp", "/img/cosmetics/frame-neon-purple.webp",
  "/img/cosmetics/frame-rainbow.webp",
  "/img/pwa/icon-96.png", "/manifest.json"
];

async function trimCache(cacheName, maxEntries = MAX_RUNTIME_ENTRIES) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(keys.slice(0, keys.length - maxEntries).map(key => cache.delete(key)));
  }
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache valid shell files individually so a single missing asset won't cancel all caching.
    await Promise.all(PRECACHE_URLS.map(async path => {
      try {
        const response = await fetch(path, { cache: "reload" });
        if (response.ok) await cache.put(path, response);
      } catch (_) { /* Offline or optional asset: continue installing. */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("lsd-") && key !== CACHE_NAME && key !== STATIC_CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never cache cross-origin requests (API, CDN, external resources) or media.
  if (url.origin !== self.location.origin) return;
  if (request.destination === "audio" || request.destination === "video") return;

  // Never store API or account-sensitive endpoints in the service-worker cache.
  if (/\/(auth|game|console|messages|friends|profiles|shop|push|pesca|dust|trophies|badges)(\/|$)/i.test(url.pathname)) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  const isStatic = /\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?|ttf)$/i.test(url.pathname)
    || url.pathname.endsWith("/manifest.json");
  if (isStatic) {
    // Prefer fresh deployed assets; use the cache only when offline.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: "no-store" });
        if (response.ok && response.type === "basic") {
          await cache.put(request, response.clone());
          await trimCache(CACHE_NAME);
        }
        return response;
      } catch (_) {
        return (await cache.match(request)) || Response.error();
      }
    })());
    return;
  }

  // Navigation: fresh content first, cached shell as offline fallback.
  if (request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === "/") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic") {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
          await trimCache(CACHE_NAME);
        }
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match("/hub.html")) || Response.error();
      }
    })());
  }
});

self.addEventListener("push", event => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); }
  catch (_) { payload = { title: "LSD Software", body: event.data.text() }; }
  event.waitUntil(self.registration.showNotification(payload.title || "LSD Software", {
    body: payload.body || "",
    icon: "/img/pwa/icon-192.png",
    badge: "/img/pwa/icon-96.png",
    tag: payload.tag || "lsd-notification",
    data: { url: payload.url || "/hub.html" },
    renotify: true
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const requested = event.notification.data?.url || "/hub.html";
  // Notifications may only navigate within this app's origin.
  const target = new URL(requested, self.location.origin);
  const safeUrl = target.origin === self.location.origin ? target.href : new URL("/hub.html", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) return existing.focus();
    return self.clients.openWindow(safeUrl);
  }));
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
