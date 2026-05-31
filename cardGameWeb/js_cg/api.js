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
  async request(path, method = "GET", body = null, timeoutMs = 15000) {
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
    return this.request("/auth/forgot-password", "POST", { email });
  },

  async resetPassword(token, newPassword) {
    return this.request("/auth/reset-password", "POST", { token, newPassword });
  },

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
