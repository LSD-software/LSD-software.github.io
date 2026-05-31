// ============================================================
// storage.js v6 — FIXED
// Flusso: LOGIN → carica da server → gioca → salva su LS + server ad ogni azione
//
// BUG FIXES:
// 1. coins iniziali 100 (erano 10)
// 2. _serverReady impedisce salvataggi prima che il server abbia risposto
// 3. _guardSave() blocca push se i dati non sono stati caricati dal server
// ============================================================

const LS_KEY = "lsd_gamestate";

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

// FIX: _serverReady = true solo dopo aver ricevuto dati reali dal server
// Finché è false, _push() non invia nulla (evita di sovrascrivere col default)
let _serverReady = false;
let _saveTimer   = null;
let _saving      = false;
let _retries     = 0;

// ── LOCALSTORAGE ──────────────────────────────────────────
function _lsSave() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(_state)); } catch(e) {}
}

function _lsLoad() {
  try {
    const r = localStorage.getItem(LS_KEY);
    return r ? JSON.parse(r) : null;
  } catch(e) { return null; }
}

// ── LOAD DAL SERVER (fonte di verità) ─────────────────────
async function loadStateFromAPI() {
  if (typeof Api === "undefined" || !Api.isLoggedIn()) return;

  try {
    const remote = await Api.loadState();

    // Il server è la fonte di verità: sovrascrive tutto
    _state.coins      = typeof remote.coins === "number" ? remote.coins : 100;
    _state.score      = typeof remote.score === "number" ? remote.score : 0;
    _state.bet        = 0;
    _state.deck       = remote.equippedDeck  || 1;
    _state.backDeck   = remote.equippedBack  || 1;
    _state.background = remote.equippedBg    || 1;
    _state.unlockedDecks = Array.isArray(remote.unlockedDecks) ? remote.unlockedDecks : [1];
    _state.unlockedBacks = Array.isArray(remote.unlockedBacks) ? remote.unlockedBacks : [1];
    _state.unlockedBgs   = Array.isArray(remote.unlockedBgs)   ? remote.unlockedBgs   : [1];

    if (remote.stats && typeof remote.stats === "object") {
      _state.stats = {
        totalRounds:   remote.stats.totalRounds   ?? 0,
        wins:          remote.stats.wins           ?? 0,
        losses:        remote.stats.losses         ?? 0,
        maxScore:      remote.stats.maxScore       ?? 0,
        maxCoins:      remote.stats.maxCoins       ?? _state.coins,
        totalPlayed:   remote.stats.totalPlayed    ?? 0,
        winStreak:     remote.stats.winStreak      ?? 0,
        bestWinStreak: remote.stats.bestWinStreak  ?? 0,
      };
    }

    // FIX: solo ora i dati sono affidabili → abilita i salvataggi
    _serverReady = true;
    _lsSave();
    console.log(`✅ Loaded from server — coins:${_state.coins} score:${_state.score}`);

  } catch(e) {
    console.warn("⚠️ Server unreachable, loading from localStorage…", e.message);

    const backup = _lsLoad();
    if (backup && typeof backup.coins === "number") {
      Object.assign(_state, {
        coins:      backup.coins,
        score:      backup.score      ?? 0,
        deck:       backup.deck       ?? 1,
        backDeck:   backup.backDeck   ?? 1,
        background: backup.background ?? 1,
        unlockedDecks: Array.isArray(backup.unlockedDecks) ? backup.unlockedDecks : [1],
        unlockedBacks: Array.isArray(backup.unlockedBacks) ? backup.unlockedBacks : [1],
        unlockedBgs:   Array.isArray(backup.unlockedBgs)   ? backup.unlockedBgs   : [1],
      });
      if (backup.stats) Object.assign(_state.stats, backup.stats);
      // FIX: con fallback localStorage consideriamo i dati comunque validi
      // così il gioco può salvare appena si riconnette
      _serverReady = true;
      console.log(`📦 Fallback localStorage — coins:${_state.coins} score:${_state.score}`);

      // Ritenta il server dopo 5 secondi per sincronizzare
      setTimeout(async () => {
        try {
          const remote = await Api.loadState();
          _state.coins      = typeof remote.coins === "number" ? remote.coins : _state.coins;
          _state.score      = typeof remote.score === "number" ? remote.score : _state.score;
          _state.deck       = remote.equippedDeck  || _state.deck;
          _state.backDeck   = remote.equippedBack  || _state.backDeck;
          _state.background = remote.equippedBg    || _state.background;
          _state.unlockedDecks = Array.isArray(remote.unlockedDecks) ? remote.unlockedDecks : _state.unlockedDecks;
          _state.unlockedBacks = Array.isArray(remote.unlockedBacks) ? remote.unlockedBacks : _state.unlockedBacks;
          _state.unlockedBgs   = Array.isArray(remote.unlockedBgs)   ? remote.unlockedBgs   : _state.unlockedBgs;
          if (remote.stats) Object.assign(_state.stats, remote.stats);
          _serverReady = true;
          _lsSave();
          console.log(`✅ Retry server load OK — coins:${_state.coins}`);
          if (typeof updateHUD === "function") updateHUD();
        } catch(e2) {
          console.warn("⚠️ Retry also failed:", e2.message);
        }
      }, 5000);
    } else {
      // Nessun dato locale: lascia i default MA abilita i salvataggi
      // (nuovo utente, giusto partire da valori freschi)
      _serverReady = true;
    }
  }
}

// ── PUSH AL SERVER ────────────────────────────────────────
async function _push() {
  if (_saving) return;
  // FIX: non salvare MAI prima che il server abbia caricato i dati reali
  // Questo era il bug principale: il gioco chiamava updateHUD() con coins=10/0
  // durante init(), prima che loadStateFromAPI() finisse, sovrascrivendo il DB
  if (!_serverReady) {
    console.warn("⏳ Push skipped — server not ready yet");
    return;
  }
  if (typeof Api === "undefined" || !Api.isLoggedIn()) return;

  _saving = true;
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
      stats:         { ..._state.stats },
    });
    _retries = 0;
    console.log(`💾 Saved — coins:${_state.coins} score:${_state.score}`);
  } catch(e) {
    _retries++;
    console.warn(`⚠️ Save failed (attempt ${_retries}):`, e.message);
    if (_retries < 4) setTimeout(_push, 3000 * _retries);
    else { _retries = 0; console.warn("Max retries. Data in localStorage."); }
  } finally {
    _saving = false;
  }
}

// Salva subito: localStorage (sincrono) + server (async)
function saveNow() {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  _lsSave();
  _push();
}

// Salva con debounce 500ms
function _scheduleSave() {
  _lsSave();
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { _saveTimer = null; _push(); }, 500);
}

// ── EVENTI BROWSER ────────────────────────────────────────
window.addEventListener("beforeunload", () => { _lsSave(); _push(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) saveNow(); });
window.addEventListener("online", () => { console.log("🌐 Back online, syncing…"); _push(); });

// ── API PUBBLICA ──────────────────────────────────────────
function loadData() {
  return { ..._state, stats: { ..._state.stats } };
}

function saveData(d) {
  if (typeof d.coins      === "number") _state.coins      = d.coins;
  if (typeof d.score      === "number") _state.score      = d.score;
  if (typeof d.bet        === "number") _state.bet        = d.bet;
  if (typeof d.deck       === "number") _state.deck       = d.deck;
  if (typeof d.backDeck   === "number") _state.backDeck   = d.backDeck;
  if (typeof d.background === "number") _state.background = d.background;
  if (d.audioVolume !== undefined) _state.audioVolume = d.audioVolume;
  if (d.audioMuted  !== undefined) _state.audioMuted  = d.audioMuted;
  if (d.audioTime   !== undefined) _state.audioTime   = d.audioTime;
  if (Array.isArray(d.unlockedDecks)) _state.unlockedDecks = d.unlockedDecks;
  if (Array.isArray(d.unlockedBacks)) _state.unlockedBacks = d.unlockedBacks;
  if (Array.isArray(d.unlockedBgs))   _state.unlockedBgs   = d.unlockedBgs;
  if (d.stats && typeof d.stats === "object") Object.assign(_state.stats, d.stats);

  if (_state.coins > _state.stats.maxCoins) _state.stats.maxCoins = _state.coins;
  if (_state.score > _state.stats.maxScore) _state.stats.maxScore = _state.score;

  _scheduleSave();
}

async function initStorage() {
  if (typeof Api === "undefined") return;
  if (!Api.requireAuth("/cardGameWeb/auth.html")) return;
  await loadStateFromAPI();
}
