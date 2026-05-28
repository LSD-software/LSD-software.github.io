// ============================================================
// LSD CARD GAME — game.js  v3.0
// Full English, LSD visual effects, event badge, hard difficulty
// ============================================================

// --- STATE ---
let data = loadData();
let coins      = data.coins;
let score      = data.score;
let bet        = data.bet;
let currentDeck       = data.deck;
let currentBack       = data.backDeck;
let currentBackground = data.background;

// --- CARD NAMES (English) ---
const CARD_NAMES = ["","Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten"];

// --- PATHS ---
function cardImgPath(v) {
  return `data_cg/deck_base/${(currentDeck - 1) * 10 + v}.png`;
}
function backImgPath() {
  return `data_cg/backDeck/back${currentBack}.png`;
}

// --- BACKGROUND ---
function applyBackground() {
  const bgs = ["SfondoTavolata.png","SfondoTavolata1.png","SfondoTavolata2.png","SfondoTavolata3.png"];
  const idx = Math.max(1, Math.min(currentBackground, bgs.length)) - 1;
  document.getElementById("gameBody").style.backgroundImage = `url("data_cg/${bgs[idx]}")`;
}

// --- UI ELEMENTS ---
const elCoins        = document.getElementById("coins");
const elScore        = document.getElementById("score");
const elBet          = document.querySelector("#betAmount b");
const elCurrentImg   = document.getElementById("currentCardImg");
const elNextImg      = document.getElementById("nextCardImg");
const elCurrentLabel = document.getElementById("currentCardLabel");
const elNextLabel    = document.getElementById("nextCardLabel");
const elResult       = document.getElementById("resultMessage");
const chipBox        = document.getElementById("chipBox");
const eventBadge     = document.getElementById("eventBadge");

// --- GAME STATE ---
let currentValue = null;
let nextValue    = null;
let isAnimating  = false;
let winStreak    = 0;
let loseStreak   = 0;
let totalRounds  = 0;

let roundState = {
  mirrorRound:     false,
  doubleOrNothing: false,
  blindRounds:     0,
  betMultiplier:   2,
  ghostCard:       false,
  freezeBet:       false,
  forcedBet:       false,   // scommessa obbligatoria minima
  swapButtons:     false,   // HIGHER e LOWER sono scambiati
};

// ============================================================
// LSD EVENTS POOL — tutti in inglese
// ============================================================
const LSD_EVENTS = [

  {
    id: "mirror",
    icon: "🪞",
    label: "MIRROR WORLD",
    desc: "Results are INVERTED this round. Higher means lower, lower means higher!",
    color: "#8800ff",
    prob: 0.08,
    apply: (s) => { s.mirrorRound = true; }
  },

  {
    id: "acid_tax",
    icon: "💸",
    label: "ACID TAX",
    desc: "The Dealer takes 30% of your coins. Right now.",
    color: "#cc0000",
    prob: 0.07,
    apply: () => {
      const tax = Math.floor(coins * 0.30);
      coins = Math.max(0, coins - tax);
      updateHUD();
    }
  },

  {
    id: "double_or_nothing",
    icon: "⚡",
    label: "DOUBLE OR NOTHING",
    desc: "WIN → coins ×3. LOSE → you lose EVERYTHING. No escape.",
    color: "#ff6600",
    prob: 0.06,
    apply: (s) => { s.doubleOrNothing = true; }
  },

  {
    id: "trip_blind",
    icon: "🕶️",
    label: "TRIP BLIND",
    desc: "Your current card is hidden for the next 3 rounds. Good luck.",
    color: "#004488",
    prob: 0.09,
    apply: (s) => { s.blindRounds = 3; }
  },

  {
    id: "deck_shuffle",
    icon: "🌀",
    label: "DECK SHUFFLE",
    desc: "The deck reshuffles. Your current card just changed.",
    color: "#006644",
    prob: 0.10,
    apply: (s) => {
      currentValue = pickRandom();
      nextValue = pickNextCardHard(currentValue);
      elCurrentImg.src = s.blindRounds > 0 ? backImgPath() : cardImgPath(currentValue);
      elCurrentLabel.textContent = s.blindRounds > 0 ? "???" : (CARD_NAMES[currentValue] || "");
    }
  },

  {
    id: "jackpot",
    icon: "🎰",
    label: "JACKPOT CHANCE",
    desc: "Win this round and your bet pays ×4. But the odds are against you.",
    color: "#886600",
    prob: 0.07,
    apply: (s) => { s.betMultiplier = 4; }
  },

  {
    id: "coin_bomb",
    icon: "💣",
    label: "COIN BOMB",
    desc: "BOOM. Half your coins vanish. Instantly.",
    color: "#880000",
    prob: 0.06,
    apply: () => {
      coins = Math.max(0, Math.floor(coins / 2));
      updateHUD();
    }
  },

  {
    id: "ghost_card",
    icon: "👻",
    label: "GHOST CARD",
    desc: "The next card mirrors the current one. You cannot win this round.",
    color: "#334455",
    prob: 0.07,
    apply: (s) => { s.ghostCard = true; }
  },

  {
    id: "mind_melt",
    icon: "🧠",
    label: "MIND MELT",
    desc: "3 score points dissolve from your brain. Just like that.",
    color: "#550055",
    prob: 0.06,
    apply: () => {
      score = Math.max(0, score - 3);
      updateHUD();
    }
  },

  {
    id: "freeze",
    icon: "🧊",
    label: "BET FREEZE",
    desc: "Bet controls are locked this round. Your current bet stands.",
    color: "#003366",
    prob: 0.07,
    apply: (s) => { s.freezeBet = true; setBetControlsEnabled(false); }
  },

  // --- NUOVE MECCANICHE INFAMI ---

  {
    id: "swap_buttons",
    icon: "🔀",
    label: "CONTROLS SWAPPED",
    desc: "HIGHER and LOWER are swapped for this round. Think carefully.",
    color: "#993300",
    prob: 0.08,
    apply: (s) => {
      s.swapButtons = true;
      // swap visivamente le label dei bottoni
      document.getElementById("btnHigher").innerHTML = "▼<br>LOWER";
      document.getElementById("btnLower").innerHTML  = "▲<br>HIGHER";
    }
  },

  {
    id: "forced_allin",
    icon: "🎭",
    label: "ALL IN FORCED",
    desc: "You have no choice. Your entire wallet is the bet this round.",
    color: "#660000",
    prob: 0.05,
    apply: (s) => {
      bet = coins;
      s.forcedBet = true;
      s.freezeBet = true;
      setBetControlsEnabled(false);
      updateHUD();
    }
  },

  {
    id: "score_steal",
    icon: "🦹",
    label: "SCORE BANDIT",
    desc: "The Dealer steals HALF your score. Rounded down, naturally.",
    color: "#440066",
    prob: 0.05,
    apply: () => {
      score = Math.max(0, Math.floor(score / 2));
      updateHUD();
    }
  },

  {
    id: "reverse_payout",
    icon: "🔄",
    label: "REVERSE PAYOUT",
    desc: "If you WIN this round, you still lose your bet. Psychedelic economics.",
    color: "#004400",
    prob: 0.05,
    apply: (s) => { s.reversePayout = true; }
  },

  {
    id: "bleed",
    icon: "🩸",
    label: "COIN BLEED",
    desc: "You lose 5 coins every second until this round ends. Hurry up.",
    color: "#550000",
    prob: 0.05,
    apply: (s) => {
      s.bleedInterval = setInterval(() => {
        coins = Math.max(0, coins - 5);
        updateHUD();
      }, 1000);
    }
  },

  // --- EFFETTI VISIVI LSD ---

  {
    id: "redvision",
    icon: "🔴",
    label: "RED EYES",
    desc: "Your eyes are burning. Everything looks... wrong.",
    color: "#660000",
    prob: 0.09,
    apply: () => applyVisualEffect("fx-redvision", 4000)
  },

  {
    id: "blur_vision",
    icon: "😵",
    label: "BLURRED VISION",
    desc: "The acid kicks in. You can barely see the cards.",
    color: "#220044",
    prob: 0.09,
    apply: () => applyVisualEffect("fx-blur", 4000)
  },

  {
    id: "dizzy",
    icon: "💫",
    label: "DIZZY SPELL",
    desc: "The room is spinning. Hold on.",
    color: "#004466",
    prob: 0.08,
    apply: () => applyVisualEffect("fx-dizzy", 1400)
  },

  {
    id: "shake",
    icon: "💥",
    label: "TABLE QUAKE",
    desc: "The table shakes violently.",
    color: "#663300",
    prob: 0.08,
    apply: () => applyVisualEffect("fx-shake", 500)
  },

  {
    id: "tunnel",
    icon: "🌀",
    label: "TUNNEL VISION",
    desc: "Your vision narrows into a dark tunnel.",
    color: "#001133",
    prob: 0.07,
    apply: () => applyVisualEffect("fx-tunnel", 1800)
  },

  {
    id: "negative",
    icon: "☯️",
    label: "NEGATIVE REALITY",
    desc: "Everything inverts. Colors, logic, life.",
    color: "#111111",
    prob: 0.06,
    apply: () => applyVisualEffect("fx-negative", 3000)
  },

  {
    id: "glitch",
    icon: "👾",
    label: "MATRIX GLITCH",
    desc: "Reality is glitching. This shouldn't be happening.",
    color: "#003300",
    prob: 0.07,
    apply: () => applyVisualEffect("fx-glitch", 1200)
  },
];

// ============================================================
// VISUAL FX HELPER
// ============================================================
function applyVisualEffect(cls, duration) {
  const body = document.getElementById("gameBody");
  body.classList.add(cls);
  setTimeout(() => body.classList.remove(cls), duration);
}

// ============================================================
// DIFFICOLTÀ AUMENTATA
// ============================================================
function pickRandom() {
  return Math.floor(Math.random() * 10) + 1;
}

function pickNextCardHard(current) {
  const pool = [];
  const difficulty = 1 + Math.min(winStreak * 0.35, 3.0);

  for (let i = 1; i <= 10; i++) {
    if (i === current) continue;
    let w = 1;

    if (current <= 3) {
      w += i < current ? (current - i) * 2.0 * difficulty : (i - current) * 0.15;
      w += Math.random() * 1.0;
    } else if (current >= 8) {
      w += i > current ? (i - current) * 2.0 * difficulty : (current - i) * 0.15;
      w += Math.random() * 1.0;
    } else if (current === 5 || current === 6) {
      // dead center: pure chaos
      w += Math.random() * 7;
    } else {
      const dist = Math.abs(current - i);
      w += dist < 2 ? 2.8 * difficulty : 0.6;
      w += Math.random() * 1.5;
    }

    if (winStreak >= 3) {
      const dist = Math.abs(current - i);
      if (dist === 1) w += 4;
    }

    // dopo una lunga streak di perdite, il gioco dà qualche respiro (UX fairness)
    if (loseStreak >= 4) {
      const wantedDir = current <= 5 ? (i > current) : (i < current);
      if (wantedDir) w += 1.5;
    }

    const count = Math.max(1, Math.floor(w));
    for (let k = 0; k < count; k++) pool.push(i);
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================================
// LSD EVENT SYSTEM
// ============================================================
function tryLSDEvent() {
  const baseMod = Math.min(totalRounds * 0.006, 0.18);
  // shuffle array per evitare bias posizionale
  const shuffled = [...LSD_EVENTS].sort(() => Math.random() - 0.5);

  for (const ev of shuffled) {
    if (Math.random() < ev.prob + baseMod) {
      showLSDModal(ev, () => {
        ev.apply(roundState);
        showEventBadge(ev);
      });
      return;
    }
  }
}

// --- MODALE EVENTO (centro schermo, con countdown) ---
function showLSDModal(ev, onClose) {
  // Crea modale se non esiste
  let modal = document.getElementById("lsdModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "lsdModal";
    modal.innerHTML = `
      <div id="lsdModalBox">
        <span id="lsdModalIcon"></span>
        <div id="lsdModalTitle"></div>
        <div id="lsdModalDesc"></div>
        <div id="lsdModalTimer"></div>
      </div>`;
    document.body.appendChild(modal);
  }

  document.getElementById("lsdModalIcon").textContent  = ev.icon;
  document.getElementById("lsdModalTitle").textContent = ev.label;
  document.getElementById("lsdModalDesc").textContent  = ev.desc;
  modal.querySelector("#lsdModalBox").style.borderColor = ev.color || "gold";

  modal.classList.add("active");

  // Shake immediato per impatto
  applyVisualEffect("fx-shake", 400);

  // Countdown 3 secondi
  const timerEl = document.getElementById("lsdModalTimer");
  let countdown = 3;
  timerEl.textContent = `Closing in ${countdown}...`;
  const tick = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(tick);
      modal.classList.remove("active");
      if (onClose) onClose();
    } else {
      timerEl.textContent = `Closing in ${countdown}...`;
    }
  }, 1000);
}

// --- BADGE sopra carta coperta (destra) ---
function showEventBadge(ev) {
  if (!eventBadge) return;
  eventBadge.textContent = `${ev.icon} ${ev.label}`;
  eventBadge.classList.remove("hidden");
}

function hideEventBadge() {
  if (eventBadge) eventBadge.classList.add("hidden");
}

// ============================================================
// BET CONTROLS
// ============================================================
function setBetControlsEnabled(enabled) {
  ["btnMinus","btnPlus","btnMinus10","btnPlus10","btnAllIn"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.disabled = !enabled; el.style.opacity = enabled ? "1" : "0.4"; }
  });
}

document.getElementById("btnMinus").addEventListener("click", () => {
  if (roundState.freezeBet) return;
  bet = Math.max(0, bet - 1); updateHUD();
});
document.getElementById("btnPlus").addEventListener("click", () => {
  if (roundState.freezeBet) return;
  bet = Math.min(coins, bet + 1); updateHUD();
});
document.getElementById("btnMinus10").addEventListener("click", () => {
  if (roundState.freezeBet) return;
  bet = Math.max(0, bet - 10); updateHUD();
});
document.getElementById("btnPlus10").addEventListener("click", () => {
  if (roundState.freezeBet) return;
  bet = Math.min(coins, bet + 10); updateHUD();
});
document.getElementById("btnAllIn").addEventListener("click", () => {
  if (roundState.freezeBet) return;
  bet = coins; updateHUD();
});

// ============================================================
// HUD
// ============================================================
function updateHUD() {
  elCoins.textContent = coins;
  elScore.textContent = score;
  elBet.textContent   = bet;
  const d = loadData();
  d.coins = coins; d.score = score; d.bet = bet;
  d.deck = currentDeck; d.backDeck = currentBack; d.background = currentBackground;
  saveData(d);
  generateChips(bet);
}

// ============================================================
// ROUND LOGIC
// ============================================================
function resolveRound(wantHigher) {
  if (isAnimating) return;
  isAnimating = true;

  // stop bleed se attivo
  if (roundState.bleedInterval) { clearInterval(roundState.bleedInterval); }

  // swap buttons: inverti l'intenzione
  const effectiveHigher = roundState.swapButtons ? !wantHigher : wantHigher;

  const revealed = roundState.ghostCard ? currentValue : nextValue;

  // Mostra carta
  elNextImg.src = cardImgPath(revealed);
  elNextLabel.textContent = CARD_NAMES[revealed] || "";
  animateEl(elNextImg);
  hideEventBadge();

  // Esito
  let isWin = effectiveHigher ? (revealed > currentValue) : (revealed < currentValue);
  if (roundState.mirrorRound) isWin = !isWin;
  if (roundState.ghostCard && revealed === currentValue) isWin = false;
  if (roundState.reversePayout) isWin = !isWin;

  if (isWin) {
    score += 1;
    winStreak++; loseStreak = 0;
    const mult = roundState.betMultiplier || 2;
    if (bet > 0) coins += bet * mult;
    const gain = bet > 0 ? bet * mult : 0;
    showMessage(`✓ Correct! +${gain}${mult > 2 ? ` (×${mult})` : ""}`, "#00ff88");
  } else {
    score = Math.max(0, score - 1);
    loseStreak++; winStreak = 0;
    if (roundState.doubleOrNothing) {
      const lost = coins;
      coins = 0;
      showMessage(`✗ DOUBLE OR NOTHING — Lost everything! −${lost}`, "#ff2222");
    } else if (bet > 0) {
      coins = Math.max(0, coins - bet);
      showMessage(`✗ Wrong! −${bet}`, "#ff4444");
    } else {
      showMessage("✗ Wrong!", "#ff4444");
    }
  }

  totalRounds++;
  bet = 0;
  updateHUD();

  setTimeout(() => {
    currentValue = revealed;

    // Reset swap buttons label
    document.getElementById("btnHigher").innerHTML = "▲<br>HIGHER";
    document.getElementById("btnLower").innerHTML  = "▼<br>LOWER";

    if (roundState.blindRounds > 0) {
      roundState.blindRounds--;
      elCurrentImg.src = backImgPath();
      elCurrentLabel.textContent = "???";
    } else {
      elCurrentImg.src = cardImgPath(currentValue);
      elCurrentLabel.textContent = CARD_NAMES[currentValue] || "";
    }
    animateEl(elCurrentImg);

    const prevBlind = roundState.blindRounds;
    roundState = {
      mirrorRound: false, doubleOrNothing: false,
      blindRounds: prevBlind, betMultiplier: 2,
      ghostCard: false, freezeBet: false,
      forcedBet: false, swapButtons: false,
      reversePayout: false, bleedInterval: null,
    };
    setBetControlsEnabled(true);

    nextValue = pickNextCardHard(currentValue);
    elNextImg.src = backImgPath();
    elNextLabel.textContent = "?";

    tryLSDEvent();
    isAnimating = false;
  }, 900);
}

// ============================================================
// ANIMATIONS & MESSAGES
// ============================================================
function animateEl(el) {
  el.classList.remove("animate");
  void el.offsetWidth;
  el.classList.add("animate");
}

let msgTimer = null;
function showMessage(text, color = "white") {
  elResult.textContent = text;
  elResult.style.color = color;
  elResult.classList.remove("hidden");
  if (msgTimer) clearTimeout(msgTimer);
  msgTimer = setTimeout(() => elResult.classList.add("hidden"), 2800);
}

// ============================================================
// CHIPS
// ============================================================
function generateChips(count) {
  chipBox.innerHTML = "";
  const bw = chipBox.offsetWidth  || 100;
  const bh = chipBox.offsetHeight || 80;
  const cs = Math.min(bw * 0.13, 52);
  const maxChips = 40;
  const display  = Math.min(count, maxChips);

  for (let i = 0; i < display; i++) {
    const chip = document.createElement("div");
    chip.classList.add("chip");
    const t = Math.floor(Math.random() * 6) + 1;
    chip.style.backgroundImage = `url("data_cg/fish/CasinoChip${t}.png")`;
    chip.style.width  = cs + "px";
    chip.style.height = cs + "px";
    chip.style.left   = Math.random() * Math.max(0, bw - cs - 4) + "px";
    chip.style.top    = Math.random() * Math.max(0, bh - cs - 4) + "px";
    chip.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
    chipBox.appendChild(chip);
  }

  if (count > maxChips) {
    const lbl = document.createElement("div");
    lbl.style.cssText = "position:absolute;bottom:2px;right:4px;color:gold;font-size:11px;font-weight:bold;font-family:'Cinzel',serif;";
    lbl.textContent = "×" + count;
    chipBox.appendChild(lbl);
  }
}

window.addEventListener("resize", () => generateChips(bet));

// ============================================================
// BUTTON EVENTS
// ============================================================
document.getElementById("btnHigher").addEventListener("click", () => resolveRound(true));
document.getElementById("btnLower").addEventListener("click",  () => resolveRound(false));

// ============================================================
// INIT
// ============================================================
function init() {
  applyBackground();
  currentValue = pickRandom();
  nextValue    = pickNextCardHard(currentValue);

  elCurrentImg.src = cardImgPath(currentValue);
  elCurrentLabel.textContent = CARD_NAMES[currentValue] || "";
  elNextImg.src = backImgPath();
  elNextLabel.textContent = "?";

  updateHUD();

  // Primo evento LSD con warm-up di 4 secondi
  setTimeout(tryLSDEvent, 4000);
}

document.addEventListener("DOMContentLoaded", init);
