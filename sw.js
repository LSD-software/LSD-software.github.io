// ============================================================
// sw.js — Service Worker per le notifiche push
// Deve stare nella ROOT del sito (non in js/) perché lo scope di un
// service worker è limitato alla cartella in cui si trova.
// ============================================================

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: "LSD Software", body: event.data.text() }; }

  const title = payload.title || "LSD Software";
  const options = {
    body: payload.body || "",
    icon: "/img/icon.png",
    badge: "/img/icon.png",
    tag: payload.tag || "lsd-notification",
    data: { url: payload.url || "/hub.html" },
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Click sulla notifica: porta all'Hub (o alla url specificata), riusando
// una tab già aperta se possibile invece di aprirne una nuova.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/hub.html";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find(c => c.url.includes(url.replace(/^\//, "")));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
