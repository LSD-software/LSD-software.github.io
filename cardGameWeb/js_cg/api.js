// ============================================================
// api.js — LSD Card Game API client
// ============================================================

const API_URL = "https://lsd-backend-4phu.onrender.com";

const Api = {

  // ── TOKEN ──────────────────────────────────────────────
  getToken()  { return localStorage.getItem("lsd_token"); },
  getUser()   { return JSON.parse(localStorage.getItem("lsd_user") || "null"); },
  isGuest()   { return this.getUser()?.isGuest === true; },
  isLoggedIn(){ return !!this.getToken(); },

  saveSession(token, user) {
    localStorage.setItem("lsd_token", token);
    localStorage.setItem("lsd_user",  JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem("lsd_token");
    localStorage.removeItem("lsd_user");
  },

  // ── REQUEST ────────────────────────────────────────────
  async request(path, method = "GET", body = null, timeoutMs = 40000) {
    const headers = { "Content-Type": "application/json" };
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    // Timeout controller
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    opts.signal = controller.signal;

    try {
      const res = await fetch(`${API_URL}${path}`, opts);
      clearTimeout(timer);

      // Leggi il body una volta sola
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch(e) { throw new Error(`Server returned non-JSON: ${text.slice(0,100)}`); }

      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;

    } catch(e) {
      clearTimeout(timer);
      if (e.name === "AbortError") throw new Error("Request timed out. Server may be waking up, try again.");
      throw e;
    }
  },

  // ── AUTH ───────────────────────────────────────────────
  async register(username, email, password) {
    const data = await this.request("/auth/register", "POST", { username, email, password });
    this.saveSession(data.token, data.user);
    return data;
  },

  async login(identifier, password) {
    const data = await this.request("/auth/login", "POST", { identifier, password });
    this.saveSession(data.token, data.user);
    return data;
  },

  async loginAsGuest() {
    const data = await this.request("/auth/guest", "POST");
    this.saveSession(data.token, data.user);
    return data;
  },

  async forgotPassword(email) {
    // Timeout più lungo: il server gratuito (Render) può impiegare fino a
    // 40-50s a "svegliarsi" se era in stand-by. 15s bastava a farlo fallire
    // quasi sempre alla prima richiesta dopo un periodo di inattività.
    return this.request("/auth/forgot-password", "POST", { email }, 50000);
  },

  async resetPassword(token, newPassword) {
    return this.request("/auth/reset-password", "POST", { token, newPassword }, 50000);
  },

  async changeUsername(username) {
    return this.request("/auth/username", "PATCH", { username });
  },

  async getShopCatalog() { return this.request("/shop/catalog"); },
  async getShopProfile() { return this.request("/shop/me"); },
  async buyCosmetic(itemId, category) { return this.request("/shop/buy", "POST", { itemId, category }); },
  async equipCosmetic(itemId, category) { return this.request("/shop/equip", "POST", { itemId, category }); },

  async searchFriends(q) { return this.request(`/friends/search?q=${encodeURIComponent(q)}`); },
  async getFriends() { return this.request("/friends/me"); },
  async sendFriendRequest(targetUserId) { return this.request("/friends/request", "POST", { targetUserId }); },
  async respondFriendRequest(requesterId, action) { return this.request("/friends/respond", "POST", { requesterId, action }); },
  async removeFriend(friendId) { return this.request("/friends/remove", "POST", { friendId }); },
  async blockUser(targetUserId) { return this.request("/friends/block", "POST", { targetUserId }); },
  async unblockUser(targetUserId) { return this.request("/friends/unblock", "POST", { targetUserId }); },
  async pingPresence() { return this.request("/friends/ping", "POST", {}, 8000); },

  async getConversations() { return this.request("/messages/conversations"); },
  async openDM(targetUserId) { return this.request("/messages/conversations/dm", "POST", { targetUserId }); },
  async createGroup(name, participantIds) { return this.request("/messages/conversations/group", "POST", { name, participantIds }); },
  async getConversation(id) { return this.request(`/messages/conversations/${id}`); },
  async sendMessage(id, text) { return this.request(`/messages/conversations/${id}/send`, "POST", { text }); },
  async markConversationRead(id) { return this.request(`/messages/conversations/${id}/read`, "POST", {}); },

  async verifyToken() {
    try {
      const data = await this.request("/auth/me", "GET", null, 8000);
      return data.user;
    } catch {
      this.clearSession();
      return null;
    }
  },

  // ── GAME STATE ─────────────────────────────────────────
  async loadState() {
    const data = await this.request("/game/state", "GET", null, 15000);
    return data.state;
  },

  async saveState(state) {
    return this.request("/game/save", "POST", state, 10000);
  },

  async getLeaderboard(sortBy = "score") {
    return this.request(`/game/leaderboard?sortBy=${sortBy}`, "GET", null, 10000);
  },

  // ── WAKE UP (sveglia Render free tier) ─────────────────
  async wakeUp() {
    try {
      const res = await fetch(`${API_URL}/health`, { method: "GET" });
      if (res.ok) console.log("🟢 Server awake");
    } catch(e) {
      console.warn("⚠️ Server warming up, first request may be slow…");
    }
  },

  // ── REQUIRE AUTH ───────────────────────────────────────
  requireAuth(redirectTo = "/cardGameWeb/auth.html") {
    if (!this.isLoggedIn()) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }
};

// Sveglia il server appena la pagina si carica
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Api.wakeUp());
} else {
  Api.wakeUp();
}
