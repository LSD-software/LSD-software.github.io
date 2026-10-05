// ============================================================
// sw.js — Service Worker: PWA caching + notifiche push
// ============================================================
// VERSIONE CACHE — incrementata automaticamente ad ogni deploy
// (il frontend la confronta con /version sul backend per decidere
// se mostrare la schermata di aggiornamento)
const CACHE_NAME = "lsd-hub-v1.0.0";
const CACHE_FIRST = ["/img/", "/css/", "/js/", "/fonts/", "manifest.json"];
const ALWAYS_NETWORK = ["/api/", "lsd-backend-4phu.onrender.com", "/version"];

// File da precachare subito all'installazione (la shell dell'app)
const PRECACHE_URLS = [
  "/hub.html",
  "/css/style.css",
  "/css/hub.css",
  "/css/auth-modal.css",
  "/css/badges.css",
  "/css/cosmetics.css",
  "/css/footer.css",
  "/js/fetch-utils.js",
  "/js/auth-modal.js",
  "/js/badges.js",
  "/js/dust.js",
  "/js/shop.js",
  "/js/friends.js",
  "/js/messages.js",
  "/js/push.js",
  "/js/profile-view.js",
  "/js/footer.js",
  "/js/script.js",
  "/js/cookie-banner.js",
  "/cardGameWeb/js_cg/api.js",
  "/img/icon.png",
  "/img/pwa/icon-192.png",
  "/img/pwa/icon-512.png",
  "/img/pwa/apple-touch-icon.png",
  "/manifest.json",
];

// ── Installazione ────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
  // Prendi subito il controllo senza aspettare che le vecchie tab vengano chiuse
  self.skipWaiting();
});

// ── Attivazione (pulisce cache vecchie) ──────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Strategia di fetch ───────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Sempre dalla rete: API backend, dati real-time
  if (ALWAYS_NETWORK.some((p) => url.href.includes(p))) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // Immagini, CSS, JS, font: cache-first (veloce offline)
  if (
    CACHE_FIRST.some((p) => url.pathname.startsWith(p)) ||
    event.request.destination === "image" ||
    event.request.destination === "style" ||
    event.request.destination === "script" ||
    event.request.destination === "font"
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // HTML e tutto il resto: network-first, fallback su cache
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Notifiche push ───────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: "LSD Software", body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(payload.title || "LSD Software", {
      body: payload.body || "",
      icon: "/img/pwa/icon-192.png",
      badge: "/img/pwa/icon-96.png",
      tag: payload.tag || "lsd-notification",
      data: { url: payload.url || "/hub.html" },
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/hub.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes("hub.html"));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

// ── Messaggio dall'app (es. skipWaiting forzato) ────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
