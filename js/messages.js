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
    const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
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
      alert(e.message);
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
        alert(e.message);
      }
    });
  }

  // ── Creazione gruppo ─────────────────────────────────────
  function wireGroupCreate() {
    const btn = document.getElementById("newGroupBtn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const name = prompt("Group name:");
      if (!name) return;
      try {
        const friendsData = await call("/friends/me");
        if (!friendsData.friends.length) return alert("Add some friends first before creating a group.");
        const names = friendsData.friends.map((f, i) => `${i + 1}. ${f.username}`).join("\n");
        const pick = prompt(`Add friends by number (comma-separated):\n${names}`);
        if (!pick) return;
        const idxs = pick.split(",").map(s => parseInt(s.trim()) - 1).filter(i => !isNaN(i) && friendsData.friends[i]);
        if (!idxs.length) return alert("No valid friends selected.");
        const participantIds = idxs.map(i => friendsData.friends[i].id);
        const data = await call("/messages/conversations/group", "POST", { name, participantIds });
        await reloadConversationList();
        await openConversation(data.id);
      } catch (e) {
        alert(e.message);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  window.LSDMessages = { openWith: openConversationWith, reload: reloadConversationList };
})();
