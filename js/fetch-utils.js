// ============================================================
// fetch-utils.js — fetch() con timeout, condiviso da tutti i widget
// dell'Hub (badge, polvere, negozio, amici, messaggi, profili).
// ------------------------------------------------------------
// FIX 1: tutte queste chiamate usavano fetch() nudo, senza timeout. Sul
// piano gratuito di Render, se il server era in stand-by, la richiesta
// restava bloccata in silenzio (a volte per minuti) e il widget non
// mostrava mai nulla — sembrava "non carica" ma era ancora in attesa.
// Ora c'è sempre un limite massimo di attesa.
//
// FIX 2: quando il token è scaduto (401 "Invalid or expired token"), il
// sito continuava a mostrarsi come loggato mentre ogni chiamata falliva
// in silenzio. Ora rileviamo il 401, puliamo la sessione salvata e
// avvisiamo l'utente con un banner ben visibile, invece di lasciarlo
// a fissare pannelli vuoti senza sapere perché.
// ============================================================
window.lsdFetch = function (url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .then((res) => {
      if (res.status === 401 && options.headers?.Authorization) {
        window.lsdHandleSessionExpired();
      }
      return res;
    })
    .finally(() => clearTimeout(timer));
};

// ── Dialoghi personalizzati (al posto di alert/confirm/prompt nativi) ──
// I dialoghi nativi del browser mostrano i pulsanti OK/Annulla nella
// lingua del browser, non del sito — risultato: testo in inglese con
// pulsanti a volte in italiano. Questi dialoghi sono invece sempre
// coerenti con lo stile e la lingua del sito.
function _lsdDialog({ message, showInput, inputValue, confirmLabel, showCancel }) {
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
      <div style="margin-bottom:16px; line-height:1.5; white-space:pre-line;">${message}</div>
      ${showInput ? `<input id="_lsdDialogInput" type="text" class="hub-input" style="width:100%; box-sizing:border-box; margin-bottom:16px;">` : ""}
      <div style="display:flex; gap:10px; justify-content:flex-end;">
        ${showCancel ? `<button id="_lsdDialogCancel" class="friend-btn ghost">Cancel</button>` : ""}
        <button id="_lsdDialogOk" class="friend-btn add">${confirmLabel || "OK"}</button>
      </div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const input = box.querySelector("#_lsdDialogInput");
    if (input) { input.value = inputValue || ""; input.focus(); }

    function done(result) { overlay.remove(); resolve(result); }
    box.querySelector("#_lsdDialogOk").addEventListener("click", () => done(showInput ? (input.value.trim() || null) : true));
    box.querySelector("#_lsdDialogCancel")?.addEventListener("click", () => done(showInput ? null : false));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) done(showInput ? null : false); });
    if (input) input.addEventListener("keydown", (e) => { if (e.key === "Enter") done(input.value.trim() || null); });
  });
}

window.lsdConfirm = (message) => _lsdDialog({ message, showCancel: true, confirmLabel: "Confirm" });
window.lsdPrompt = (message, defaultValue) => _lsdDialog({ message, showInput: true, inputValue: defaultValue, showCancel: true, confirmLabel: "OK" });
window.lsdAlert = (message) => _lsdDialog({ message, confirmLabel: "OK" });
let _sessionExpiredShown = false;
window.lsdHandleSessionExpired = function () {
  const hadSession = !!localStorage.getItem("lsd_token");
  localStorage.removeItem("lsd_token");
  localStorage.removeItem("lsd_user");

  if (hadSession && !_sessionExpiredShown) {
    _sessionExpiredShown = true;
    window.dispatchEvent(new CustomEvent("lsd-session-expired"));
    showSessionExpiredBanner();
  }
};

function showSessionExpiredBanner() {
  if (document.getElementById("lsdSessionExpiredBanner")) return;
  const banner = document.createElement("div");
  banner.id = "lsdSessionExpiredBanner";
  banner.innerHTML = `
    <span>⚠️ Your session has expired. Please sign in again to keep using your account.</span>
    <button id="lsdSessionExpiredBtn">SIGN IN</button>
    <button id="lsdSessionExpiredClose" aria-label="Dismiss">✕</button>
  `;
  Object.assign(banner.style, {
    position: "fixed", top: "0", left: "0", right: "0", zIndex: "10000",
    background: "linear-gradient(135deg,#7a0000,#4a0000)",
    borderBottom: "2px solid #baa701",
    color: "#ffd700", fontFamily: "'Courier New',monospace", fontSize: "0.85rem",
    padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "center",
    gap: "16px", flexWrap: "wrap", textAlign: "center",
  });
  document.body.appendChild(banner);

  const btn = document.getElementById("lsdSessionExpiredBtn");
  const closeBtn = document.getElementById("lsdSessionExpiredClose");
  Object.assign(btn.style, {
    background: "linear-gradient(135deg,#d4b800,#baa701)", color: "#0d0d0d",
    border: "none", borderRadius: "6px", padding: "6px 16px",
    fontFamily: "'Cinzel',serif", fontWeight: "700", fontSize: "0.75rem",
    letterSpacing: "1px", cursor: "pointer",
  });
  Object.assign(closeBtn.style, {
    background: "transparent", border: "none", color: "rgba(255,255,255,0.6)",
    cursor: "pointer", fontSize: "1rem", padding: "0 4px",
  });

  document.getElementById("lsdSessionExpiredClose").addEventListener("click", () => banner.remove());
  document.getElementById("lsdSessionExpiredBtn").addEventListener("click", () => {
    banner.remove();
    if (typeof window.openAuthModal === "function") window.openAuthModal();
  });
}
