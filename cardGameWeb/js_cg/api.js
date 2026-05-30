// ============================================================
// api.js — LSD Card Game API client
// Tutti i file del gioco importano questo per parlare con Render
// ============================================================

const API_URL = "https://lsd-backend-4phu.onrender.com"; 

const Api = {

  // ── TOKEN ──────────────────────────────────────────────
  getToken()  { return localStorage.getItem("lsd_token"); },
  getUser()   { return JSON.parse(localStorage.getItem("lsd_user") || "null"); },
  isGuest()   { return this.getUser()?.isGuest === true; },
  isLoggedIn(){ return !!this.getToken(); },

  saveSession(token, user) {
    localStorage.setItem("lsd_token",  token);
    localStorage.setItem("lsd_user",   JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem("lsd_token");
    localStorage.removeItem("lsd_user");
  },

  // ── REQUEST HELPER ─────────────────────────────────────
  async request(path, method = "GET", body = null) {
    const headers = { "Content-Type": "application/json" };
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res  = await fetch(`${API_URL}${path}`, opts);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "API error");
    return data;
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
    return this.request("/auth/forgot-password", "POST", { email });
  },

  async resetPassword(token, newPassword) {
    return this.request("/auth/reset-password", "POST", { token, newPassword });
  },

  async verifyToken() {
    try {
      const data = await this.request("/auth/me");
      return data.user;
    } catch {
      this.clearSession();
      return null;
    }
  },

  // ── GAME STATE ─────────────────────────────────────────
  async loadState() {
    const data = await this.request("/game/state");
    return data.state;
  },

  async saveState(state) {
    return this.request("/game/save", "POST", state);
  },

  async getLeaderboard() {
    return this.request("/game/leaderboard");
  }
};

// Reindirizza alla pagina auth se non loggato
// (chiamare da ogni pagina protetta)
Api.requireAuth = function(redirectTo = "/cardGameWeb/auth.html") {
  if (!this.isLoggedIn()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
};
