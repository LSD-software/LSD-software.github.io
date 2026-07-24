// ============================================================
// badges.js — LSD Software cross-game badge widget
// Recupera /badges/me e disegna la griglia badge, se presente
// in pagina un elemento #badgesGrid. Non fa nulla se l'utente
// non è loggato o se il widget non è presente nella pagina.
// ============================================================
(function () {
  const API = "https://lsd-backend-4phu.onrender.com";

  document.addEventListener("DOMContentLoaded", loadBadges);

  async function loadBadges() {
    const grid  = document.getElementById("badgesGrid");
    const panel = document.getElementById("myBadgesPanel");
    if (!grid || !panel) return; // widget non presente in questa pagina

    const token = localStorage.getItem("lsd_token");
    const user  = JSON.parse(localStorage.getItem("lsd_user") || "null");
    if (!token || !user || user.isGuest) return; // resta nascosto

    try {
      const res = await fetch(`${API}/badges/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      renderBadges(data.earned || [], data.total || 0);
    } catch (e) {
      // silenzioso: i badge sono un extra, non devono rompere la pagina
      console.warn("Badges: could not load", e.message);
    }
  }

  function renderBadges(earned, total) {
    const grid  = document.getElementById("badgesGrid");
    const panel = document.getElementById("myBadgesPanel");
    const countEl = document.getElementById("badgesCount");

    if (countEl) countEl.textContent = `(${earned.length}/${total})`;

    if (!earned.length) {
      grid.innerHTML = `<p class="badges-empty">Play some games to start earning badges!</p>`;
    } else {
      grid.innerHTML = earned.map(b => `
        <div class="badge-chip" title="${escHtml(b.description)}">
          <span class="badge-icon">${b.icon}</span>
          <span class="badge-name">${escHtml(b.name)}</span>
        </div>
      `).join("");
    }
    panel.classList.remove("hidden");
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  // Espone la funzione per riuso (es. dopo il login da project.html)
  window.LSDBadges = { load: loadBadges };
})();
