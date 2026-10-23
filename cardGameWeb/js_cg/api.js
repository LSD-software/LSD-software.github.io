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
      catch (_) {
        throw new Error("We couldn't complete that right now. Please try again in a moment.");
      }

      if (!res.ok) {
        const message = this.userFriendlyError(data?.error, res.status);
        throw new Error(message);
      }
      return data;

    } catch(e) {
      clearTimeout(timer);
      if (e.name === "AbortError") {
        throw new Error("This is taking longer than expected. Please try again shortly.");
      }
      if (e instanceof TypeError || /failed to fetch|networkerror|network request failed/i.test(e?.message || "")) {
        throw new Error("We couldn't connect. Check your internet connection and try again.");
      }
      throw e;
    }
  },

  // Convert technical server failures into clear, helpful messages for players.
  // Keep known account/game messages, but never show HTTP codes or raw diagnostics.
  userFriendlyError(message, status) {
    const raw = typeof message === "string" ? message.trim() : "";
    if (status === 429 || /too many requests|too many messages/i.test(raw)) {
      return "You're doing that a little too quickly. Please wait a moment and try again.";
    }
    if (status >= 500 || /server error|internal server|http \d{3}|non-json|exception|stack trace/i.test(raw)) {
      return "Something went wrong on our side. Please try again in a moment.";
    }
    if (status === 401) return "Your session may have expired. Please sign in again.";
    if (/user not found|player not found/i.test(raw)) return "We couldn't find that player.";
    if (/conversation not found/i.test(raw)) return "This conversation is no longer available.";
    if (/invalid (item|category|targetuserid|participant|friendid|request|trophies array|objectid)/i.test(raw)) {
      return "Some information looks incorrect. Please check it and try again.";
    }
    if (status === 403 && !raw) return "You can't do that with this account.";
    if (status === 404 && !raw) return "We couldn't find what you were looking for.";
    return raw || "We couldn't complete that. Please try again.";
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

  // ── OPTIONAL HEALTH CHECK ──────────────────────────────
  // Do not ping /health automatically on every page load: privacy extensions may
  // block the request (ERR_BLOCKED_BY_CLIENT). Real API calls wake Render when needed.
  async wakeUp() {
    try {
      const res = await fetch(`${API_URL}/health`, { method: "GET", cache: "no-store" });
      return res.ok;
    } catch (_) {
      return false;
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

