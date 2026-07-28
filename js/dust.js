// ============================================================
// dust.js — Polvere LSD: heartbeat del tempo giocato + saldo
// ------------------------------------------------------------
// Due compiti in un unico file (entrambi opzionali, si attivano da soli
// in base a cosa trovano in pagina):
//
// 1) HEARTBEAT (pagine di gioco vere e proprie): manda un "tick" al
//    server ogni 5 minuti, MA SOLO se la tab è visibile (Page
//    Visibility API) — così non si guadagna polvere lasciando una tab
//    in background. Non fa nulla se l'utente è ospite o non loggato.
//
// 2) SALDO (project.html, leaderboard.html): se in pagina esiste un
//    elemento #dustBalance, lo popola con il saldo attuale e lo
//    aggiorna quando arriva nuova polvere (heartbeat, login, badge).
// ============================================================
(function () {
  const API = "https://lsd-backend-4phu.onrender.com";
  const INTERVAL_MS = 5 * 60 * 1000; // 5 minuti

  function getAuth() {
    const token = localStorage.getItem("lsd_token");
    const user  = JSON.parse(localStorage.getItem("lsd_user") || "null");
    if (!token || !user || user.isGuest) return null;
    return token;
  }

  // ── 1) HEARTBEAT ─────────────────────────────────────────
  async function tick() {
    if (document.visibilityState !== "visible") return; // tab non attiva: salta
    const token = getAuth();
    if (!token) return; // ospite o non loggato: nessuna polvere

    try {
      const res = await fetch(`${API}/dust/heartbeat`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.awarded > 0) {
        window.dispatchEvent(new CustomEvent("lsd-dust-earned", { detail: data }));
        loadBalance(); // se in questa pagina c'è anche il widget saldo, aggiornalo
      }
    } catch (e) {
      // silenzioso: l'heartbeat è un extra, non deve disturbare il gioco
      console.warn("Dust heartbeat: could not reach server", e.message);
    }
  }

  // Primo tick dopo 5 minuti (non subito all'apertura pagina), poi ogni 5 minuti
  setInterval(tick, INTERVAL_MS);

  // ── 2) SALDO ─────────────────────────────────────────────
  async function loadBalance() {
    const el = document.getElementById("dustBalance");
    if (!el) return; // widget non presente in questa pagina

    const token = getAuth();
    if (!token) { el.closest("#dustPanel")?.classList.add("hidden"); return; }

    try {
      const res = await fetch(`${API}/dust/me`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      el.textContent = data.lsdDust.toLocaleString("en-US");
      const streakEl = document.getElementById("dustStreak");
      if (streakEl) streakEl.textContent = data.loginStreak > 1 ? `🔥 ${data.loginStreak}-day streak` : "";
      document.getElementById("dustPanel")?.classList.remove("hidden");
    } catch (e) {
      console.warn("Dust balance: could not load", e.message);
    }
  }

  document.addEventListener("DOMContentLoaded", loadBalance);
  window.LSDDust = { load: loadBalance };
})();

