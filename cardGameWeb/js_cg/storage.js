// ============================================================
// storage.js v3 — salvataggio immediato + fallback localStorage
// ============================================================

let _state = {
  coins: 100, score: 0, bet: 0,
  deck: 1, backDeck: 1, background: 1,
  unlockedDecks: [1], unlockedBacks: [1], unlockedBgs: [1],
  stats: {
    totalRounds:0, wins:0, losses:0,
    maxScore:0, maxCoins:100,
    totalPlayed:0, winStreak:0, bestWinStreak:0
  },
  audioVolume: 0.5, audioMuted: false, audioTime: 0,
};

// ── DEBOUNCE CONFIG ──────────────────────────────────────
// Due timer separati:
// - _quickTimer: salva dopo 800ms dall'ultima azione (aggiornamenti frequenti)
// - _forceTimer: salva SEMPRE entro 5s anche se l'utente continua a giocare
let _quickTimer = null;
let _forceTimer = null;
let _pendingSave = false;

// ── LOCALSTORAGE FALLBACK ─────────────────────────────────
// Salva sempre su localStorage come backup locale immediato
function saveToLocalStorage() {
  try {
    localStorage.setItem("lsd_state_backup", JSON.stringify(_state));
  } catch(e) {}
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem("lsd_state_backup");
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
}

// ── LOAD DAL SERVER ───────────────────────────────────────
async function loadStateFromAPI() {
  if (typeof Api === "undefined" || !Api.isLoggedIn()) return;
  try {
    const remote = await Api.loadState();
    _state.coins         = remote.coins         ?? 100;
    _state.score         = remote.score         ?? 0;
    _state.bet           = 0; // bet non va mai ripristinato
    _state.deck          = remote.equippedDeck  ?? 1;
    _state.backDeck      = remote.equippedBack  ?? 1;
    _state.background    = remote.equippedBg    ?? 1;
    _state.unlockedDecks = remote.unlockedDecks ?? [1];
    _state.unlockedBacks = remote.unlockedBacks ?? [1];
    _state.unlockedBgs   = remote.unlockedBgs   ?? [1];
    if (remote.stats) {
      Object.assign(_state.stats, {
        totalRounds:   remote.stats.totalRounds   ?? 0,
        wins:          remote.stats.wins           ?? 0,
        losses:        remote.stats.losses         ?? 0,
        maxScore:      remote.stats.maxScore       ?? 0,
        maxCoins:      remote.stats.maxCoins       ?? 100,
        totalPlayed:   remote.stats.totalPlayed    ?? 0,
        winStreak:     remote.stats.winStreak      ?? 0,
        bestWinStreak: remote.stats.bestWinStreak  ?? 0,
      });
    }
    // Sovrascrive anche il backup locale col dato dal server
    saveToLocalStorage();
    console.log("✅ State loaded from server:", _state.coins, "coins,", _state.score, "score");
  } catch (e) {
    console.warn("⚠️ Could not load from API, trying localStorage backup…", e);
    // Fallback: usa il backup locale se disponibile
    const backup = loadFromLocalStorage();
    if (backup) {
      Object.assign(_state, backup);
      console.log("📦 Restored from localStorage backup");
    }
  }
}

// ── PUSH AL SERVER ────────────────────────────────────────
async function pushStateToAPI() {
  _pendingSave = false;
  if (typeof Api === "undefined" || !Api.isLoggedIn()) return;
  try {
    await Api.saveState({
      coins:         _state.coins,
      score:         _state.score,
      bet:           _state.bet,
      equippedDeck:  _state.deck,
      equippedBack:  _state.backDeck,
      equippedBg:    _state.background,
      unlockedDecks: _state.unlockedDecks,
      unlockedBacks: _state.unlockedBacks,
      unlockedBgs:   _state.unlockedBgs,
      stats:         _state.stats,
    });
    console.log("💾 Saved to server:", _state.coins, "coins,", _state.score, "score");
  } catch (e) {
    console.warn("⚠️ Could not save to API:", e);
    // Non perdiamo i dati: il backup localStorage è già aggiornato
  }
}

// ── SCHEDULE SAVE ─────────────────────────────────────────
function scheduleSave() {
  _pendingSave = true;

  // Salva subito su localStorage (sincrono, sempre affidabile)
  saveToLocalStorage();

  // Quick timer: salva sul server 800ms dopo l'ultima azione
  if (_quickTimer) clearTimeout(_quickTimer);
  _quickTimer = setTimeout(() => {
    pushStateToAPI();
    if (_forceTimer) { clearTimeout(_forceTimer); _forceTimer = null; }
  }, 800);

  // Force timer: salva COMUNQUE entro 5s anche se le azioni continuano
  if (!_forceTimer) {
    _forceTimer = setTimeout(() => {
      _forceTimer = null;
      if (_pendingSave) {
        if (_quickTimer) { clearTimeout(_quickTimer); _quickTimer = null; }
        pushStateToAPI();
      }
    }, 5000);
  }
}

// Salva immediatamente senza aspettare il debounce
function saveNow() {
  if (_quickTimer) { clearTimeout(_quickTimer); _quickTimer = null; }
  if (_forceTimer) { clearTimeout(_forceTimer); _forceTimer = null; }
  saveToLocalStorage();
  pushStateToAPI();
}

// Salva prima che l'utente chiuda/navighi via
window.addEventListener("beforeunload", () => {
  saveToLocalStorage(); // sincrono, sempre eseguito
  pushStateToAPI();     // async best-effort
});

// Salva quando la tab va in background (mobile: swipe via)
document.addEventListener("visibilitychange", () => {
  if (document.hidden && _pendingSave) {
    saveNow();
  }
});

// ── PUBLIC API ────────────────────────────────────────────
function loadData() {
  return { ..._state, stats: { ..._state.stats } };
}

function saveData(d) {
  // Aggiorna lo stato interno con i dati passati
  if (typeof d.coins         === "number") _state.coins         = d.coins;
  if (typeof d.score         === "number") _state.score         = d.score;
  if (typeof d.bet           === "number") _state.bet           = d.bet;
  if (typeof d.deck          === "number") _state.deck          = d.deck;
  if (typeof d.backDeck      === "number") _state.backDeck      = d.backDeck;
  if (typeof d.background    === "number") _state.background    = d.background;
  if (d.audioVolume !== undefined) _state.audioVolume = d.audioVolume;
  if (d.audioMuted  !== undefined) _state.audioMuted  = d.audioMuted;
  if (d.audioTime   !== undefined) _state.audioTime   = d.audioTime;
  if (Array.isArray(d.unlockedDecks)) _state.unlockedDecks = d.unlockedDecks;
  if (Array.isArray(d.unlockedBacks)) _state.unlockedBacks = d.unlockedBacks;
  if (Array.isArray(d.unlockedBgs))   _state.unlockedBgs   = d.unlockedBgs;

  // Aggiorna stats se passate
  if (d.stats && typeof d.stats === "object") {
    Object.assign(_state.stats, d.stats);
  }

  // Aggiorna massimi automaticamente
  if (_state.coins > (_state.stats.maxCoins || 0)) _state.stats.maxCoins = _state.coins;
  if (_state.score > (_state.stats.maxScore || 0)) _state.stats.maxScore = _state.score;

  scheduleSave();
}

// Chiamato da game.js all'avvio
async function initStorage() {
  if (typeof Api === "undefined") return;
  if (!Api.requireAuth("/cardGameWeb/auth.html")) return;
  await loadStateFromAPI();
}
