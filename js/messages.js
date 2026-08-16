// ============================================================
// messages.js — Chat LSD Software (DM + gruppi, 48h auto-delete)
// Si attiva se trova #messagesRoot in pagina.
// ============================================================
(function () {
  const API = "https://lsd-backend-4phu.onrender.com";
  const POLL_INTERVAL_MS = 4000;

  let activeConvoId = null;
  let pollTimer = null;
  let lastMessageCount = 0;

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
    const res = await lsdFetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function timeAgo(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  // ── Init ─────────────────────────────────────────────────
  async function init() {
    const root = document.getElementById("messagesRoot");
    if (!root) return;
    if (!getAuth()) return;

    wireComposer();
    wireGroupCreate();
    await reloadConversationList();
    setInterval(reloadConversationList, 10000); // aggiorna la lista ogni 10s
  }

  // ── Lista conversazioni ──────────────────────────────────
  async function reloadConversationList() {
    const list = document.getElementById("conversationsList");
    if (!list) return;
    try {
      const data = await call("/messages/conversations");
      const empty = document.getElementById("conversationsEmpty");
      if (empty) empty.classList.toggle("hidden", data.conversations.length > 0);

      list.innerHTML = data.conversations.map(c => `
        <div class="convo-row ${c.id === activeConvoId ? "active" : ""}" data-id="${c.id}">
          <div class="convo-icon">${c.type === "group" ? "👥" : "💬"}</div>
          <div class="convo-info">
            <div class="convo-name">${escHtml(c.name)}</div>
            <div class="convo-preview">${escHtml(c.lastMessagePreview || "No messages yet")}</div>
          </div>
          <div class="convo-meta">
            <span class="convo-time">${c.lastMessageAt ? timeAgo(c.lastMessageAt) : ""}</span>
            ${c.unread > 0 ? `<span class="convo-unread">${c.unread}</span>` : ""}
          </div>
        </div>
      `).join("");

      list.querySelectorAll(".convo-row").forEach(row => {
        row.addEventListener("click", () => openConversation(row.dataset.id));
      });
    } catch (e) {
      console.warn("Messages: could not load conversations", e.message);
    }
  }

  // ── Apertura conversazione (esterno: chiamato anche da friends.js) ──
  async function openConversationWith(targetUserId) {
    try {
      const data = await call("/messages/conversations/dm", "POST", { targetUserId });
      showChatPanel();
      await openConversation(data.id);
    } catch (e) {
      lsdAlert(e.message);
    }
  }

  async function openConversation(id) {
    activeConvoId = id;
    lastMessageCount = 0;
    showChatPanel();
    document.querySelectorAll(".convo-row").forEach(r => r.classList.toggle("active", r.dataset.id === id));

    await loadMessages(true);
    call(`/messages/conversations/${id}/read`, "POST", {}).then(reloadConversationList).catch(() => {});

    clearInterval(pollTimer);
    pollTimer = setInterval(() => loadMessages(false), POLL_INTERVAL_MS);
  }

  function showChatPanel() {
    document.getElementById("chatEmptyState")?.classList.add("hidden");
    document.getElementById("chatPanel")?.classList.remove("hidden");
  }

  async function loadMessages(scrollToBottom) {
    if (!activeConvoId) return;
    try {
      const data = await call(`/messages/conversations/${activeConvoId}`);
      document.getElementById("chatTitle").textContent = (data.type === "group" ? "👥 " : "💬 ") + data.name;

      if (data.messages.length === lastMessageCount && !scrollToBottom) return; // niente di nuovo
      lastMessageCount = data.messages.length;

      const thread = document.getElementById("chatThread");
      if (!data.messages.length) {
        thread.innerHTML = `<p class="friends-hint">No messages yet — say hi! Messages disappear after 48 hours.</p>`;
      } else {
        thread.innerHTML = data.messages.map(m => `
          <div class="chat-msg ${m.mine ? "mine" : ""}">
            ${!m.mine ? `<div class="chat-msg-sender">${escHtml(m.senderName)}</div>` : ""}
            <div class="chat-msg-bubble">${escHtml(m.text)}</div>
            <div class="chat-msg-time">${timeAgo(m.createdAt)} ago</div>
          </div>
        `).join("");
      }
      if (scrollToBottom) thread.scrollTop = thread.scrollHeight;

      // Se sono nuovi arrivi mentre la chat è aperta, segna subito come letti
      call(`/messages/conversations/${activeConvoId}/read`, "POST", {}).catch(() => {});
    } catch (e) {
      console.warn("Messages: could not load thread", e.message);
    }
  }

  function wireComposer() {
    const form = document.getElementById("chatComposerForm");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("chatComposerInput");
      const text = input.value.trim();
      if (!text || !activeConvoId) return;
      input.value = "";
      try {
        await call(`/messages/conversations/${activeConvoId}/send`, "POST", { text });
        await loadMessages(true);
        reloadConversationList();
      } catch (e) {
        lsdAlert(e.message);
      }
    });
  }

  // ── Creazione gruppo (dialogo con caselle di spunta, non prompt nativi) ──
  function wireGroupCreate() {
    const btn = document.getElementById("newGroupBtn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      try {
        const friendsData = await call("/friends/me");
        if (!friendsData.friends.length) return lsdAlert("Add some friends first before creating a group.");
        const picked = await showGroupCreateDialog(friendsData.friends);
        if (!picked) return;
        const data = await call("/messages/conversations/group", "POST", { name: picked.name, participantIds: picked.ids });
        await reloadConversationList();
        await openConversation(data.id);
      } catch (e) {
        lsdAlert(e.message);
      }
    });
  }

  function showGroupCreateDialog(friends) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      Object.assign(overlay.style, {
        position: "fixed", inset: "0", zIndex: "10001",
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      });
      const box = document.createElement("div");
      Object.assign(box.style, {
        background: "linear-gradient(160deg,#131313,#0a0a0a)", border: "2px solid #baa701",
        borderRadius: "14px", padding: "24px", width: "min(380px,100%)",
        fontFamily: "'Courier New',monospace", color: "#eee",
      });
      box.innerHTML = `
        <div style="font-family:'Cinzel',serif; color:gold; margin-bottom:14px; font-weight:700;">New Group</div>
        <input id="_groupNameInput" type="text" class="hub-input" placeholder="Group name" style="width:100%; box-sizing:border-box; margin-bottom:14px;">
        <div style="max-height:220px; overflow-y:auto; margin-bottom:16px; display:flex; flex-direction:column; gap:6px;">
          ${friends.map(f => `
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:6px 4px;">
              <input type="checkbox" value="${f.id}" style="accent-color:#baa701;"> ${escHtml(f.username)}
            </label>
          `).join("")}
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button id="_groupCancel" class="friend-btn ghost">Cancel</button>
          <button id="_groupCreate" class="friend-btn add">Create</button>
        </div>
      `;
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      box.querySelector("#_groupNameInput").focus();

      function done(result) { overlay.remove(); resolve(result); }
      overlay.addEventListener("click", (e) => { if (e.target === overlay) done(null); });
      box.querySelector("#_groupCancel").addEventListener("click", () => done(null));
      box.querySelector("#_groupCreate").addEventListener("click", () => {
        const name = box.querySelector("#_groupNameInput").value.trim();
        const ids = [...box.querySelectorAll('input[type="checkbox"]:checked')].map(c => c.value);
        if (!name) return lsdAlert("Please enter a group name.");
        if (!ids.length) return lsdAlert("Select at least one friend.");
        done({ name, ids });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  window.LSDMessages = { openWith: openConversationWith, reload: reloadConversationList };
})();
