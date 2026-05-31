// ============================================================
// storage.js v4 — salvataggio affidabile con retry e wake-up
// ============================================================

const STORAGE_KEY = "lsd_gamestate_v4";

// Stato in memoria
let _state = {
  coins: 0, score: 0, bet: 0,
  deck: 1, backDeck: 1, background: 1,
  unlockedDecks: [1], unlockedBacks: [1], unlockedBgs: [1],
  stats: {
    totalRounds:0, wins:0, losses:0,
    maxScore:0, maxCoins:100,
    totalPlayed:0, winStreak:0, bestWinStreak:0
  },
  audioVolume: 0.5, audioMuted: false, audioTime: 0,
};

let _dirty      = false;   // ci sono dati non ancora salvati sul server?
let _saving     = false;   // salvataggio in corso?
let _quickTimer = null;
let _forceTimer = null;
let _retryCount = 0;
const MAX_RETRY = 3;

// ── LOCALSTORAGE (sincrono, sempre affidabile) ────────────
function _lsSave() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); } catch(e) {}
}
function _lsLoad() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch(e) { return null; }
}

// ── PUSH AL SERVER ────────────────────────────────────────
async function _pushToServer() {
  if (_saving) return;
  if (!_dirty)  return;

  // Aspetta che Api sia disponibile
  if (typeof Api === "undefined" || !Api.isLoggedIn || !Api.isLoggedIn()) return;

  _saving = true;
  const payload = {
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
  };

  try {
    await Api.saveState(payload);
    _dirty      = false;
    _retryCount = 0;
    console.log(`💾 Server saved — coins:${_state.coins} score:${_state.score}`);
  } catch(e) {
    _retryCount++;
    console.warn(`⚠️ Save failed (attempt ${_retryCount}):`, e.message);
    if (_retryCount < MAX_RETRY) {
      // Riprova tra 3 secondi
      setTimeout(_pushToServer, 3000);
    } else {
      console.warn("⚠️ Max retries reached. Data safe in localStorage.");
      _retryCount = 0;
    }
  } finally {
    _saving = false;
  }
}

// ── SCHEDULE ──────────────────────────────────────────────
function _schedule() {
  _dirty = true;
  _lsSave(); // localStorage immediato

  // Quick: salva 800ms dopo l'ultima azione
  if (_quickTimer) clearTimeout(_quickTimer);
  _quickTimer = setTimeout(() => {
    _quickTimer = null;
    if (_forceTimer) { clearTimeout(_forceTimer); _forceTimer = null; }
    _pushToServer();
  }, 800);

  // Force: salva comunque entro 5s
  if (!_forceTimer) {
    _forceTimer = setTimeout(() => {
      _forceTimer = null;
      if (_quickTimer) { clearTimeout(_quickTimer); _quickTimer = null; }
      _pushToServer();
    }, 5000);
  }
}

// Salva SUBITO senza debounce
function saveNow() {
  if (_quickTimer) { clearTimeout(_quickTimer); _quickTimer = null; }
  if (_forceTimer) { clearTimeout(_forceTimer); _forceTimer = null; }
  _dirty = true;
  _lsSave();
  _pushToServer();
}

// ── CARICA DAL SERVER ─────────────────────────────────────
async function loadStateFromAPI() {
  if (typeof Api === "undefined" || !Api.isLoggedIn || !Api.isLoggedIn()) return;
  try {
    const remote = await Api.loadState();
    // Applica ogni campo solo se il server lo ha
    if (typeof remote.coins === "number") _state.coins = remote.coins;
    if (typeof remote.score === "number") _state.score = remote.score;
    _state.bet        = 0; // bet non si ripristina
    if (remote.equippedDeck)  _state.deck       = remote.equippedDeck;
    if (remote.equippedBack)  _state.backDeck   = remote.equippedBack;
    if (remote.equippedBg)    _state.background = remote.equippedBg;
    if (Array.isArray(remote.unlockedDecks)) _state.unlockedDecks = remote.unlockedDecks;
    if (Array.isArray(remote.unlockedBacks)) _state.unlockedBacks = remote.unlockedBacks;
    if (Array.isArray(remote.unlockedBgs))   _state.unlockedBgs   = remote.unlockedBgs;
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
    _lsSave(); // aggiorna backup locale col dato server
    console.log(`✅ Loaded from server — coins:${_state.coins} score:${_state.score}`);
  } catch(e) {
    console.warn("⚠️ Server load failed, trying localStorage…", e.message);
    const backup = _lsLoad();
    if (backup) {
      // Applica solo se più recente (coins o score più alti)
      if (typeof backup.coins === "number") _state.coins = backup.coins;
      if (typeof backup.score === "number") _state.score = backup.score;
      if (backup.stats)       _state.stats = { ..._state.stats, ...backup.stats };
      if (backup.deck)        _state.deck       = backup.deck;
      if (backup.backDeck)    _state.backDeck   = backup.backDeck;
      if (backup.background)  _state.background = backup.background;
      console.log(`📦 Restored from localStorage — coins:${_state.coins} score:${_state.score}`);
      // Tenta di sincronizzare col server dopo il restore
      _dirty = true;
      setTimeout(_pushToServer, 2000);
    }
  }
}

// Salva quando la tab va in background (mobile)
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { _lsSave(); if (_dirty) _pushToServer(); }
});
// Salva alla chiusura
window.addEventListener("beforeunload", () => { _lsSave(); if (_dirty) _pushToServer(); });
// Salva quando torna online dopo essere stato offline
window.addEventListener("online", () => { if (_dirty) _pushToServer(); });

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
  if (d.stats && typeof d.stats === "object") {
    Object.assign(_state.stats, d.stats);
  }
  // Aggiorna massimi
  if (_state.coins > _state.stats.maxCoins) _state.stats.maxCoins = _state.coins;
  if (_state.score > _state.stats.maxScore) _state.stats.maxScore = _state.score;

  _schedule();
}

async function initStorage() {
  if (typeof Api === "undefined") return;
  if (!Api.requireAuth("/cardGameWeb/auth.html")) return;
  await loadStateFromAPI();
}
