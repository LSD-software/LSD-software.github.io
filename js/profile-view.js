// ============================================================
// profile-view.js — Modale profilo pubblico di un giocatore
// ------------------------------------------------------------
// Apribile da qualsiasi pagina che includa questo script + il markup del
// modale (#profileViewModal, iniettato automaticamente se assente).
// Uso: window.LSDProfileView.show(userId)
// ============================================================
(function () {
  const API = "https://lsd-backend-4phu.onrender.com";

  function ensureModal() {
    if (document.getElementById("profileViewModal")) return;
    const div = document.createElement("div");
    div.id = "profileViewModal";
    div.innerHTML = `
      <div id="profileViewBox">
        <button class="modal-close" onclick="LSDProfileView.close()" aria-label="Close">✕</button>
        <div id="profileViewContent"></div>
      </div>
    `;
    document.body.appendChild(div);

    div.addEventListener("click", (e) => { if (e.target === div) close(); });
  }

  function open() { document.getElementById("profileViewModal")?.classList.add("open"); }
  function close() { document.getElementById("profileViewModal")?.classList.remove("open"); }

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function avatarHtml(cosmetics, initials) {
    const border = cosmetics.border?.css || "border-default";
    return `
      <div class="lsd-avatar-wrap ${border}">
        ${border === "border-spin" ? '<div class="lsd-avatar-ring"></div>' : ""}
        ${border === "border-orbit" ? '<div class="lsd-avatar-particles"><span></span><span></span><span></span><span></span><span></span><span></span></div>' : ""}
        <div class="lsd-avatar-inner">${cosmetics.icon?.icon || "🙂"}</div>
      </div>
    `;
  }

  async function show(userId) {
    if (!userId) return;
    ensureModal();
    const content = document.getElementById("profileViewContent");
    content.innerHTML = `<p class="friends-hint" style="text-align:center; padding:30px;">Loading profile…</p>`;
    open();

    try {
      const res = await lsdFetch(`${API}/profiles/${userId}`, {}, 15000);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        content.innerHTML = `<p class="friends-hint error" style="text-align:center; padding:30px;">${escHtml(err.error || "Could not load this profile.")}</p>`;
        return;
      }
      const data = await res.json();
      const bg = data.cosmetics.background?.css || "bg-midnight";
      const memberSince = new Date(data.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" });

      content.innerHTML = `
        <div class="lsd-profile-card ${bg}" style="padding:30px 24px; text-align:center; border-radius:14px;">
          ${avatarHtml(data.cosmetics)}
          <div class="hub-profile-name" style="margin-top:14px; font-size:1.2rem;">${escHtml(data.username)}</div>
          <div class="hub-profile-email">Member since ${memberSince}</div>
          <div style="display:flex; justify-content:center; gap:20px; margin-top:18px;">
            <div class="hub-stat-chip"><span class="num">${data.badgeCount}</span><span class="lbl">Badges</span></div>
          </div>
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<p class="friends-hint error" style="text-align:center; padding:30px;">Couldn't reach the server. Try again.</p>`;
    }
  }

  document.addEventListener("DOMContentLoaded", ensureModal);
  window.LSDProfileView = { show, close };
})();
