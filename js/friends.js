// ============================================================
// friends.js — Amici LSD Software
// Si attiva da solo se trova #friendsRoot in pagina.
// ============================================================
(function () {
  const API = "https://lsd-backend-4phu.onrender.com";
  const PRESENCE_INTERVAL_MS = 2 * 60 * 1000; // ping ogni 2 minuti

  function getAuth() {
    const token = localStorage.getItem("lsd_token");
    const user  = JSON.parse(localStorage.getItem("lsd_user") || "null");
    if (!token || !user || user.isGuest) return null;
    return token;
  }

  async function call(path, method = "GET", body = null) {
    const token = getAuth();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  // ── Presenza ─────────────────────────────────────────────
  function startPresencePing() {
    const ping = () => { if (document.visibilityState === "visible" && getAuth()) call("/friends/ping", "POST", {}).catch(() => {}); };
    ping();
    setInterval(ping, PRESENCE_INTERVAL_MS);
  }

  // ── Init ─────────────────────────────────────────────────
  async function init() {
    const root = document.getElementById("friendsRoot");
    if (!root) return;
    if (!getAuth()) return; // gate della pagina gestisce già questo caso

    startPresencePing();
    wireSearch();
    await reload();
  }

  async function reload() {
    try {
      const data = await call("/friends/me");
      renderIncoming(data.incoming);
      renderOutgoing(data.outgoing);
      renderFriendsList(data.friends);
      renderBlocked(data.blocked);
    } catch (e) {
      console.warn("Friends: could not load", e.message);
    }
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function presenceDot(online) {
    return `<span class="friend-dot ${online ? "online" : "offline"}" title="${online ? "Online" : "Offline"}"></span>`;
  }

  // ── Ricerca ──────────────────────────────────────────────
  function wireSearch() {
    const input = document.getElementById("friendSearchInput");
    if (!input) return;
    let timer = null;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => doSearch(input.value.trim()), 350);
    });
  }

  async function doSearch(q) {
    const results = document.getElementById("friendSearchResults");
    if (!results) return;
    if (q.length < 2) { results.innerHTML = ""; return; }

    results.innerHTML = `<p class="friends-hint">Searching…</p>`;
    try {
      const data = await call(`/friends/search?q=${encodeURIComponent(q)}`);
      if (!data.results.length) {
        results.innerHTML = `<p class="friends-hint">No players found.</p>`;
        return;
      }
      results.innerHTML = data.results.map(u => `
        <div class="friend-row">
          <div class="friend-info">
            ${presenceDot(u.online)}
            <span class="friend-name">${escHtml(u.username)}</span>
          </div>
          <div class="friend-actions">${searchActionButton(u)}</div>
        </div>
      `).join("");
      wireActionButtons(results);
    } catch (e) {
      results.innerHTML = `<p class="friends-hint error">${escHtml(e.message)}</p>`;
    }
  }

  function searchActionButton(u) {
    switch (u.relation) {
      case "friends":     return `<span class="friend-tag">✓ Friends</span>`;
      case "pending_out":  return `<span class="friend-tag">Request sent</span>`;
      case "pending_in":   return `<button class="friend-btn accept" data-action="accept" data-id="${u.id}">Accept request</button>`;
      case "blocked":      return `<span class="friend-tag">Blocked</span>`;
      default:              return `<button class="friend-btn add" data-action="request" data-id="${u.id}">+ Add friend</button>`;
    }
  }

  // ── Liste (richieste, amici, bloccati) ──────────────────────
  function renderIncoming(list) {
    const el = document.getElementById("friendsIncoming");
    const sec = document.getElementById("friendsIncomingSection");
    if (!el || !sec) return;
    sec.classList.toggle("hidden", !list.length);
    el.innerHTML = list.map(u => `
      <div class="friend-row">
        <div class="friend-info">${presenceDot(u.online)}<span class="friend-name">${escHtml(u.username)}</span></div>
        <div class="friend-actions">
          <button class="friend-btn accept" data-action="accept" data-id="${u.id}">Accept</button>
          <button class="friend-btn decline" data-action="decline" data-id="${u.id}">Decline</button>
        </div>
      </div>
    `).join("");
    wireActionButtons(el);
  }

  function renderOutgoing(list) {
    const el = document.getElementById("friendsOutgoing");
    const sec = document.getElementById("friendsOutgoingSection");
    if (!el || !sec) return;
    sec.classList.toggle("hidden", !list.length);
    el.innerHTML = list.map(u => `
      <div class="friend-row">
        <div class="friend-info"><span class="friend-name">${escHtml(u.username)}</span></div>
        <div class="friend-actions"><span class="friend-tag">Pending…</span></div>
      </div>
    `).join("");
  }

  function renderFriendsList(list) {
    const el = document.getElementById("friendsList");
    const empty = document.getElementById("friendsEmpty");
    if (!el) return;
    if (empty) empty.classList.toggle("hidden", list.length > 0);
    el.innerHTML = list.map(u => `
      <div class="friend-row">
        <div class="friend-info">${presenceDot(u.online)}<span class="friend-name">${escHtml(u.username)}</span></div>
        <div class="friend-actions">
          <button class="friend-btn add" data-action="message" data-id="${u.id}">💬 Message</button>
          <button class="friend-btn ghost" data-action="remove" data-id="${u.id}">Remove</button>
          <button class="friend-btn ghost danger" data-action="block" data-id="${u.id}">Block</button>
        </div>
      </div>
    `).join("");
    wireActionButtons(el);
  }

  function renderBlocked(list) {
    const sec = document.getElementById("friendsBlockedSection");
    const el = document.getElementById("friendsBlocked");
    if (!sec || !el) return;
    sec.classList.toggle("hidden", !list.length);
    el.innerHTML = list.map(u => `
      <div class="friend-row">
        <div class="friend-info"><span class="friend-name">${escHtml(u.username)}</span></div>
        <div class="friend-actions"><button class="friend-btn ghost" data-action="unblock" data-id="${u.id}">Unblock</button></div>
      </div>
    `).join("");
    wireActionButtons(el);
  }

  // ── Azioni ───────────────────────────────────────────────
  function wireActionButtons(container) {
    container.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => handleAction(btn.dataset.action, btn.dataset.id, btn));
    });
  }

  async function handleAction(action, id, btn) {
    btn.disabled = true;
    try {
      if (action === "message") {
        if (window.LSDMessages) await window.LSDMessages.openWith(id);
        btn.disabled = false;
        return;
      }
      if (action === "request") { await call("/friends/request", "POST", { targetUserId: id }); showToast("Friend request sent!"); }
      if (action === "accept")  { await call("/friends/respond", "POST", { requesterId: id, action: "accept" }); showToast("Friend request accepted!"); }
      if (action === "decline") { await call("/friends/respond", "POST", { requesterId: id, action: "decline" }); }
      if (action === "remove")  { if (!confirm("Remove this friend?")) { btn.disabled = false; return; } await call("/friends/remove", "POST", { friendId: id }); }
      if (action === "block")   { if (!confirm("Block this player? They won't be able to message or friend-request you.")) { btn.disabled = false; return; } await call("/friends/block", "POST", { targetUserId: id }); showToast("Player blocked."); }
      if (action === "unblock") { await call("/friends/unblock", "POST", { targetUserId: id }); }

      await reload();
      const searchInput = document.getElementById("friendSearchInput");
      if (searchInput && searchInput.value.trim().length >= 2) doSearch(searchInput.value.trim());
    } catch (e) {
      showToast(e.message, "error");
      btn.disabled = false;
    }
  }

  function showToast(text, type) {
    const el = document.getElementById("friendsToast");
    if (!el) return;
    el.textContent = text;
    el.className = `auth-msg ${type || "success"}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ""; el.className = "auth-msg"; }, 3000);
  }

  document.addEventListener("DOMContentLoaded", init);
  window.LSDFriends = { reload };
})();
