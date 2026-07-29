// ============================================================
// auth.js — login / register / guest logic
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

  // Se già loggato, vai direttamente al gioco
  if (Api.isLoggedIn()) {
    const user = await Api.verifyToken();
    if (user) { goToGame(); return; }
  }

  // ── TABS ──────────────────────────────────────────────
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      document.getElementById("loginForm").classList.toggle("hidden",    target !== "login");
      document.getElementById("registerForm").classList.toggle("hidden", target !== "register");
      document.getElementById("forgotForm").classList.add("hidden");
      clearErrors();
    });
  });

  // ── PASSWORD TOGGLE ───────────────────────────────────
  document.querySelectorAll(".pw-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const inp = document.getElementById(btn.dataset.target);
      inp.type = inp.type === "password" ? "text" : "password";
      btn.textContent = inp.type === "password" ? "👁" : "🙈";
    });
  });

  // Migrazione progresso ospite: se si era giocato come guest, lo stato di
  // gioco è già in localStorage (storage.js lo salva sempre lì). Dopo un
  // login/register riuscito lo inviamo al nuovo token attivo.
  async function migrateGuestGameState() {
    try {
      const raw = localStorage.getItem("lsd_gamestate");
      if (!raw) return;
      const s = JSON.parse(raw);
      await Api.saveState({
        coins: s.coins, score: s.score, bet: s.bet,
        equippedDeck: s.deck, equippedBack: s.backDeck, equippedBg: s.background,
        unlockedDecks: s.unlockedDecks, unlockedBacks: s.unlockedBacks, unlockedBgs: s.unlockedBgs,
        stats: s.stats,
      });
    } catch (e) {
      console.warn("Guest progress migration failed (non-blocking):", e.message);
    }
  }

  // ── LOGIN ──────────────────────────────────────────────
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const identifier = document.getElementById("loginIdentifier").value.trim();
    const password   = document.getElementById("loginPassword").value;
    const btn        = document.getElementById("loginBtn");
    clearErrors();
    setLoading(btn, true);
    try {
      await Api.login(identifier, password);
      await migrateGuestGameState();
      goToGame();
    } catch (err) {
      const msg = err.message.includes("timed out") || err.message.includes("fetch")
        ? "Server is waking up (free tier). Wait 30 seconds and try again."
        : err.message;
      showError("loginError", msg);
    } finally {
      setLoading(btn, false);
    }
  });

  // ── REGISTER ───────────────────────────────────────────
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("regUsername").value.trim();
    const email    = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const btn      = document.getElementById("registerBtn");
    clearErrors();
    if (password.length < 8) { showError("registerError", "Password must be at least 8 characters."); return; }
    setLoading(btn, true);
    try {
      await Api.register(username, email, password);
      await migrateGuestGameState();
      goToGame();
    } catch (err) {
      const msg = err.message.includes("timed out") || err.message.includes("fetch")
        ? "Server is waking up (free tier). Wait 30 seconds and try again."
        : err.message;
      showError("registerError", msg);
    } finally {
      setLoading(btn, false);
    }
  });

  // ── FORGOT PASSWORD ────────────────────────────────────
  document.getElementById("showForgot").addEventListener("click", () => {
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("forgotForm").classList.remove("hidden");
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    clearErrors();
  });

  document.getElementById("backToLogin").addEventListener("click", () => {
    document.getElementById("forgotForm").classList.add("hidden");
    document.getElementById("loginForm").classList.remove("hidden");
    document.querySelector(".tab[data-tab='login']").classList.add("active");
    clearErrors();
  });

  document.getElementById("forgotForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value.trim();
    const btn   = document.getElementById("forgotBtn");
    clearErrors();
    setLoading(btn, true);

    // Il server gratuito può impiegare fino a 40-50s a "svegliarsi" se era
    // inattivo — avvisiamo l'utente dopo 4s per evitare che pensi sia bloccato.
    const wakeupNotice = setTimeout(() => {
      showError("forgotError", "Waking up the server (free tier)… this can take up to a minute the first time. Please wait.");
    }, 4000);

    try {
      await Api.forgotPassword(email);
      clearTimeout(wakeupNotice);
      clearErrors();
      document.getElementById("forgotSuccess").textContent =
        "If that email exists, a reset link has been sent. Check your inbox (and spam folder).";
      document.getElementById("forgotSuccess").classList.remove("hidden");
    } catch (err) {
      clearTimeout(wakeupNotice);
      const msg = err.message.includes("timed out") || err.message.includes("fetch")
        ? "The server is taking too long to respond. Please wait a moment and try again."
        : err.message;
      showError("forgotError", msg);
    } finally {
      setLoading(btn, false);
    }
  });

  // ── GUEST ───────────────────────────────────────────────
  document.getElementById("guestBtn").addEventListener("click", async () => {
    const btn = document.getElementById("guestBtn");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Loading…`;
    try {
      await Api.loginAsGuest();
      goToGame();
    } catch (err) {
      document.getElementById("globalError").textContent = err.message;
      document.getElementById("globalError").classList.remove("hidden");
      btn.disabled = false;
      btn.innerHTML = `🎲 PLAY AS GUEST<span class="guest-note">Progress not saved permanently</span>`;
    }
  });

  // ── HELPERS ────────────────────────────────────────────
  function goToGame() {
    window.location.href = "main.html";
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function clearErrors() {
    document.querySelectorAll(".form-error, .form-success").forEach(el => {
      el.classList.add("hidden");
      el.textContent = "";
    });
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.dataset.orig = btn.dataset.orig || btn.textContent;
    btn.innerHTML = loading
      ? `<span class="spinner"></span> Loading…`
      : btn.dataset.orig;
  }
});
