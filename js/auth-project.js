// ============================================================
// auth-project.js — LSD Software project.html auth panel
// ============================================================

const _API = "https://lsd-backend-4phu.onrender.com";

// ── State ────────────────────────────────────────────────────
let _authTab  = "login";
let _authUser = null;
let _authTok  = null;

function _loadAuth() {
  _authTok  = localStorage.getItem("lsd_token");
  try { _authUser = JSON.parse(localStorage.getItem("lsd_user") || "null"); } catch{}
}
function _saveAuth(token, user) {
  _authTok = token; _authUser = user;
  localStorage.setItem("lsd_token", token);
  localStorage.setItem("lsd_user", JSON.stringify(user));
}
function _clearAuth() {
  _authTok = null; _authUser = null;
  localStorage.removeItem("lsd_token");
  localStorage.removeItem("lsd_user");
}

// ── API helper ───────────────────────────────────────────────
async function _apiCall(path, method = "GET", body = null) {
  const h = { "Content-Type": "application/json" };
  if (_authTok) h["Authorization"] = `Bearer ${_authTok}`;
  const opts = { method, headers: h };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(_API + path, opts);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Server error");
  return d;
}

// ── Navbar update ────────────────────────────────────────────
function _updateNavbar() {
  const btn   = document.getElementById("authNavBtn");
  const label = document.getElementById("authNavLabel");
  const avatar = document.getElementById("authAvatar");
  if (!btn) return;
  if (_authUser && !_authUser.isGuest) {
    const initials = _authUser.username.slice(0, 2).toUpperCase();
    avatar.textContent = initials;
    label.textContent  = _authUser.username.toUpperCase();
    btn.style.borderColor = "rgba(186,167,1,0.8)";
  } else {
    avatar.textContent = "?";
    label.textContent  = "SIGN IN";
    btn.style.borderColor = "rgba(186,167,1,0.5)";
  }
}

// ── Modal open/close ─────────────────────────────────────────
function openAuthModal() {
  document.getElementById("authModal").classList.add("open");
  if (_authUser && !_authUser.isGuest) {
    _showLoggedIn();
  } else {
    setAuthModalTab("login");
  }
}
function closeAuthModal() {
  document.getElementById("authModal").classList.remove("open");
}
// Close on backdrop click
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("authModal").addEventListener("click", e => {
    if (e.target === document.getElementById("authModal")) closeAuthModal();
  });
  _loadAuth();
  _updateNavbar();
});
// Close on ESC
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeAuthModal();
});

// ── Tabs ─────────────────────────────────────────────────────
function setAuthModalTab(tab) {
  _authTab = tab;
  document.querySelectorAll(".auth-tab-btn").forEach((btn, i) => {
    btn.classList.toggle("active", ["login","register","forgot"][i] === tab);
  });
  document.getElementById("authLoggedPanel").style.display = "none";
  document.getElementById("authModalFields").style.display = "block";
  document.getElementById("authTabsRow").style.display = "flex";
  _setMsg("","");

  const f = document.getElementById("authModalFields");
  if (tab === "login") {
    f.innerHTML = `
      <div class="auth-field">
        <label>Username or Email</label>
        <input id="am_id" type="text" placeholder="your_username" autocomplete="username">
      </div>
      <div class="auth-field">
        <label>Password</label>
        <input id="am_pw" type="password" placeholder="••••••••" autocomplete="current-password">
        <span class="auth-forgot" onclick="setAuthModalTab('forgot')">Forgot password?</span>
      </div>
      <button class="auth-submit-btn" onclick="doAuthAction()">LOGIN</button>`;
  } else if (tab === "register") {
    f.innerHTML = `
      <div class="auth-field">
        <label>Username</label>
        <input id="am_un" type="text" placeholder="choose_a_username" autocomplete="username">
      </div>
      <div class="auth-field">
        <label>Email</label>
        <input id="am_em" type="email" placeholder="your@email.com" autocomplete="email">
      </div>
      <div class="auth-field">
        <label>Password <span style="color:#555;font-size:0.7em">(min 8 characters)</span></label>
        <input id="am_pw" type="password" placeholder="••••••••" autocomplete="new-password">
      </div>
      <button class="auth-submit-btn" onclick="doAuthAction()">CREATE ACCOUNT</button>`;
  } else if (tab === "forgot") {
    f.innerHTML = `
      <p style="color:rgba(255,255,255,0.5);font-family:'Courier New',monospace;font-size:0.85rem;margin:0;line-height:1.6;">
        Enter your email address and we'll send you a reset link.
      </p>
      <div class="auth-field">
        <label>Email</label>
        <input id="am_em" type="email" placeholder="your@email.com" autocomplete="email">
      </div>
      <button class="auth-submit-btn" onclick="doAuthAction()">SEND RESET LINK</button>`;
  }

  // Allow Enter key to submit
  setTimeout(() => {
    document.querySelectorAll("#authModalFields input").forEach(inp => {
      inp.addEventListener("keydown", e => { if(e.key==="Enter") doAuthAction(); });
    });
  }, 50);
}

// ── Auth actions ─────────────────────────────────────────────
async function doAuthAction() {
  const btn = document.querySelector(".auth-submit-btn");
  if (btn) btn.disabled = true;
  _setMsg("Loading…","");
  try {
    if (_authTab === "login") {
      const id = document.getElementById("am_id")?.value.trim();
      const pw = document.getElementById("am_pw")?.value;
      if (!id || !pw) throw new Error("All fields required.");
      const d = await _apiCall("/auth/login","POST",{identifier:id, password:pw});
      _saveAuth(d.token, d.user);
      _setMsg(`Welcome back, ${d.user.username}!`, "success");
      _updateNavbar();
      setTimeout(() => { closeAuthModal(); }, 1400);

    } else if (_authTab === "register") {
      const un = document.getElementById("am_un")?.value.trim();
      const em = document.getElementById("am_em")?.value.trim();
      const pw = document.getElementById("am_pw")?.value;
      if (!un || !em || !pw) throw new Error("All fields required.");
      if (pw.length < 8) throw new Error("Password must be at least 8 characters.");
      const d = await _apiCall("/auth/register","POST",{username:un, email:em, password:pw});
      _saveAuth(d.token, d.user);
      _setMsg(`Account created! Welcome, ${d.user.username}!`, "success");
      _updateNavbar();
      setTimeout(() => { closeAuthModal(); }, 1400);

    } else if (_authTab === "forgot") {
      const em = document.getElementById("am_em")?.value.trim();
      if (!em) throw new Error("Email required.");
      await _apiCall("/auth/forgot-password","POST",{email:em});
      _setMsg("If that email exists, a reset link has been sent. Check your inbox.", "success");
      if (btn) btn.disabled = false;
      return;
    }
  } catch(e) {
    _setMsg(e.message || "Error. Try again.", "error");
  }
  if (btn) btn.disabled = false;
}

// ── Logged-in view ───────────────────────────────────────────
function _showLoggedIn() {
  document.getElementById("authModalFields").style.display = "none";
  document.getElementById("authTabsRow").style.display = "none";
  _setMsg("","");
  const panel = document.getElementById("authLoggedPanel");
  panel.style.display = "flex";
  const initials = (_authUser?.username || "?").slice(0,2).toUpperCase();
  panel.innerHTML = `
    <div class="user-avatar-big">${initials}</div>
    <div class="welcome-text">Welcome back,<br><span>${_authUser?.username || ""}</span></div>
    <div class="user-email">${_authUser?.email || "Guest"}</div>
    <hr class="auth-divider" style="width:100%">
    <button class="auth-submit-btn" onclick="window.location.href='lsdConsole/index.html'">
      🎮  PLAY LSD CONSOLE
    </button>
    <button class="auth-submit-btn" onclick="window.location.href='leaderboard.html'"
      style="background:linear-gradient(135deg,#1a1100,#0d0800);">
      🏆  VIEW LEADERBOARD
    </button>
    <button class="auth-logout-btn" onclick="doLogout()">SIGN OUT</button>`;
}

function doLogout() {
  _clearAuth();
  _updateNavbar();
  _setMsg("Signed out successfully.", "success");
  setTimeout(() => { closeAuthModal(); }, 900);
}

// ── Message helper ───────────────────────────────────────────
function _setMsg(text, type) {
  const el = document.getElementById("authModalMsg");
  if (!el) return;
  el.textContent = text;
  el.className = "auth-msg" + (type ? " " + type : "");
}
