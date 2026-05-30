// ============================================================
// storage.js v2 — usa API Render invece di localStorage
// ============================================================

let _state = {
  coins: 100, score: 0, bet: 0,
  deck: 1, backDeck: 1, background: 1,
  unlockedDecks: [1], unlockedBacks: [1], unlockedBgs: [1],
  stats: { totalRounds:0, wins:0, losses:0, maxScore:0, maxCoins:100,
           totalPlayed:0, winStreak:0, bestWinStreak:0 },
  audioVolume: 0.5, audioMuted: false, audioTime: 0,
};

let _saveTimer = null;

async function loadStateFromAPI() {
  if (typeof Api === "undefined" || !Api.isLoggedIn()) return;
  try {
    const remote = await Api.loadState();
    _state.coins      = remote.coins      ?? 100;
    _state.score      = remote.score      ?? 0;
    _state.bet        = remote.bet        ?? 0;
    _state.deck       = remote.equippedDeck  ?? 1;
    _state.backDeck   = remote.equippedBack  ?? 1;
    _state.background = remote.equippedBg    ?? 1;
    _state.unlockedDecks = remote.unlockedDecks ?? [1];
    _state.unlockedBacks = remote.unlockedBacks ?? [1];
    _state.unlockedBgs   = remote.unlockedBgs   ?? [1];
    if (remote.stats) Object.assign(_state.stats, remote.stats);
  } catch (e) {
    console.warn("Could not load state from API, using defaults.", e);
  }
}

function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(pushStateToAPI, 2000);
}

async function pushStateToAPI() {
  if (typeof Api === "undefined" || !Api.isLoggedIn()) return;
  try {
    await Api.saveState({
      coins: _state.coins, score: _state.score, bet: _state.bet,
      equippedDeck: _state.deck, equippedBack: _state.backDeck,
      equippedBg: _state.background,
      unlockedDecks: _state.unlockedDecks,
      unlockedBacks: _state.unlockedBacks,
      unlockedBgs:   _state.unlockedBgs,
      stats: _state.stats,
    });
  } catch (e) {
    console.warn("Could not save state to API.", e);
  }
}

window.addEventListener("beforeunload", () => pushStateToAPI());

function loadData()  { return { ..._state }; }

function saveData(d) {
  Object.assign(_state, d);
  if (_state.coins > (_state.stats.maxCoins || 0)) _state.stats.maxCoins = _state.coins;
  if (_state.score > (_state.stats.maxScore || 0)) _state.stats.maxScore = _state.score;
  scheduleSave();
}

// Inizializza: carica dal server prima che il gioco parta
// game.js chiama initStorage() nel proprio DOMContentLoaded
async function initStorage() {
  if (typeof Api === "undefined") return;
  if (!Api.requireAuth("/cardGameWeb/auth.html")) return;
  await loadStateFromAPI();
}
