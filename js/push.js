// ============================================================
// push.js — Sottoscrizione alle notifiche push
// Si attiva se trova #pushToggleBtn in pagina (Impostazioni dell'Hub).
// ============================================================
(function () {
  const API = "https://lsd-backend-4phu.onrender.com";

  function getAuth() {
    const token = localStorage.getItem("lsd_token");
    const user  = JSON.parse(localStorage.getItem("lsd_user") || "null");
    if (!token || !user || user.isGuest) return null;
    return token;
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }

  async function isSupported() {
    return "serviceWorker" in navigator && "PushManager" in window;
  }

  async function getStatus() {
    if (!(await isSupported())) return "unsupported";
    if (Notification.permission === "denied") return "denied";
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return sub ? "subscribed" : "not-subscribed";
  }

  async function subscribe() {
    if (!(await isSupported())) throw new Error("Push notifications aren't supported in this browser.");
    const token = getAuth();
    if (!token) throw new Error("Sign in first.");

    const keyRes = await fetch(`${API}/push/vapid-key`);
    if (!keyRes.ok) throw new Error("Push isn't configured on the server yet.");
    const { publicKey } = await keyRes.json();

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notification permission denied.");

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch(`${API}/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });

    return true;
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    const token = getAuth();
    if (token) {
      fetch(`${API}/push/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
    }
    await sub.unsubscribe();
  }

  async function refreshToggleUI() {
    const btn = document.getElementById("pushToggleBtn");
    const label = document.getElementById("pushToggleLabel");
    if (!btn) return;

    const status = await getStatus();
    if (status === "unsupported") {
      btn.disabled = true;
      if (label) label.textContent = "Not supported in this browser";
      return;
    }
    if (status === "denied") {
      btn.disabled = true;
      if (label) label.textContent = "Blocked — enable notifications in browser settings";
      return;
    }
    btn.disabled = false;
    if (label) label.textContent = status === "subscribed" ? "Notifications are ON" : "Notifications are OFF";
    btn.textContent = status === "subscribed" ? "TURN OFF" : "TURN ON";
    btn.dataset.state = status;
  }

  function wireToggle() {
    const btn = document.getElementById("pushToggleBtn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        if (btn.dataset.state === "subscribed") await unsubscribe();
        else await subscribe();
      } catch (e) {
        alert(e.message);
      } finally {
        await refreshToggleUI();
      }
    });
    refreshToggleUI();
  }

  document.addEventListener("DOMContentLoaded", wireToggle);
})();
