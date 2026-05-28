// ============================================================
// LSD CARD GAME — game.js
// Difficoltà aumentata + meccaniche LSD a sorpresa
// ============================================================

// --- STATO ---
let data = loadData();
let coins      = data.coins;
let score      = data.score;
let bet        = data.bet;

let currentDeck       = data.deck;
let currentBack       = data.backDeck;
let currentBackground = data.background;

// --- PERCORSI IMMAGINI ---
function cardImgPath(value) {
  const offset = (currentDeck - 1) * 10;
  return `data_cg/deck_base/${offset + value}.png`;
}
function backImgPath() {
  return `data_cg/backDeck/back${currentBack}.png`;
}

// --- SFONDO ---
function aggiornaSfondo() {
  const bgFiles = ["SfondoTavolata.png","SfondoTavolata1.png","SfondoTavolata2.png","SfondoTavolata3.png"];
  const idx = Math.max(1, Math.min(currentBackground, bgFiles.length)) - 1;
  document.getElementById("gameBody").style.backgroundImage = `url("data_cg/${bgFiles[idx]}")`;
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

const CARD_NAMES = ["","Asso","Due","Tre","Quattro","Cinque","Sei","Sette","Otto","Nove","Dieci"];

// ============================================================
// STATO GIOCO
// ============================================================
let currentValue = null;
let nextValue    = null;
let isAnimating  = false;

// Streak tracker per difficoltà adattiva
let winStreak  = 0;
let loseStreak = 0;
let totalRounds = 0;

// ============================================================
// MECCANICHE LSD — pool di eventi a sorpresa
// ============================================================
const LSD_EVENTS = [

  {
    id: "mirror",
    label: "🪞 MIRROR WORLD",
    desc: "I risultati sono invertiti per questo round!",
    prob: 0.08,
    apply: (state) => { state.mirrorRound = true; }
  },

  {
    id: "tax",
    label: "💸 ACID TAX",
    desc: "Il banco preleva il 30% delle tue coins!",
    prob: 0.07,
    apply: (state) => {
      const tax = Math.floor(coins * 0.30);
      coins = Math.max(0, coins - tax);
      updateHUD();
    }
  },

  {
    id: "double_or_nothing",
    label: "⚡ DOUBLE OR NOTHING",
    desc: "Vinci → coins ×3. Perdi → perdi TUTTO!",
    prob: 0.07,
    apply: (state) => { state.doubleOrNothing = true; }
  },

  {
    id: "blind",
    label: "🕶️ TRIP BLIND",
    desc: "La carta corrente è nascosta per 3 round!",
    prob: 0.09,
    apply: (state) => { state.blindRounds = 3; }
  },

  {
    id: "shuffle",
    label: "🌀 DECK SHUFFLE",
    desc: "Il mazzo viene rimescolato... valore cambia!",
    prob: 0.10,
    apply: (state) => {
      const old = currentValue;
      currentValue = pickRandom();
      nextValue    = pickNextCardHard(currentValue);
      elCurrentImg.src = cardImgPath(currentValue);
      elCurrentLabel.textContent = state.blindRounds > 0 ? "???" : (CARD_NAMES[currentValue] || "");
    }
  },

  {
    id: "bet_multiplier",
    label: "🎰 JACKPOT CHANCE",
    desc: "La prossima puntata vale ×4 in caso di vittoria!",
    prob: 0.07,
    apply: (state) => { state.betMultiplier = 4; }
  },

  {
    id: "coin_bomb",
    label: "💣 COIN BOMB",
    desc: "Perdi metà delle coins immediatamente!",
    prob: 0.06,
    apply: (state) => {
      coins = Math.max(0, Math.floor(coins / 2));
      updateHUD();
    }
  },

  {
    id: "ghost_card",
    label: "👻 GHOST CARD",
    desc: "La carta successiva è sempre uguale all'attuale!",
    prob: 0.07,
    apply: (state) => { state.ghostCard = true; }
  },

  {
    id: "score_drain",
    label: "🧠 MIND MELT",
    desc: "Perdi 3 punti score istantaneamente!",
    prob: 0.06,
    apply: (state) => {
      score = Math.max(0, score - 3);
      updateHUD();
    }
  },

  {
    id: "freeze",
    label: "🧊 FREEZE",
    desc: "I controlli bet sono bloccati per questo round!",
    prob: 0.07,
    apply: (state) => { state.freezeBet = true; setBetControlsEnabled(false); }
  },
];

// Stato persistente del round corrente
let roundState = {
  mirrorRound:    false,
  doubleOrNothing: false,
  blindRounds:    0,
  betMultiplier:  2,      // moltiplicatore base vittoria
  ghostCard:      false,
  freezeBet:      false,
};

// ============================================================
// GENERATORE DIFFICOLTÀ AUMENTATA (bias contro il giocatore)
// ============================================================
function pickRandom() {
  return Math.floor(Math.random() * 10) + 1;
}

function pickNextCardHard(current) {
  // Difficoltà base aumentata rispetto alla versione originale:
  // la distribuzione è spostata a sfavore del giocatore

  const pool = [];

  for (let i = 1; i <= 10; i++) {
    if (i === current) continue;

    let w = 1;

    // Bias adattivo: più hai vinto di fila, più il gioco ti ostacola
    const difficulty = 1 + Math.min(winStreak * 0.3, 2.5);

    if (current <= 3) {
      // Carta bassa: il giocatore scommette spesso HIGHER
      // → il gioco genera più carte basse (controtendenza)
      w += i < current ? (current - i) * 1.8 * difficulty : (i - current) * 0.2;
      w += Math.random() * 1.2;
    } else if (current >= 8) {
      // Carta alta: il giocatore scommette spesso LOWER
      // → il gioco genera più carte alte
      w += i > current ? (i - current) * 1.8 * difficulty : (current - i) * 0.2;
      w += Math.random() * 1.2;
    } else if (current === 5 || current === 6) {
      // Centro: pure chaos, impossibile da prevedere
      w += Math.random() * 6;
    } else {
      // 4 o 7: bias moderato
      const dist = Math.abs(current - i);
      w += dist < 2 ? 2.5 * difficulty : 0.8;
      w += Math.random() * 2;
    }

    // Caso speciale: dopo streak di vittorie, aumenta la probabilità
    // di carte "pareggio emotivo" (vicine al valore attuale)
    if (winStreak >= 3) {
      const dist = Math.abs(current - i);
      if (dist === 1) w += 3; // carta adiacente = quasi uguale = difficile indovinare
    }

    const count = Math.max(1, Math.floor(w));
    for (let k = 0; k < count; k++) pool.push(i);
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================================
// EVENTO LSD — seleziona e applica un evento casuale
// ============================================================
function tryLSDEvent() {
  // Aumenta la probabilità base dopo ogni round (più giochi, più caos)
  const baseMod = Math.min(totalRounds * 0.005, 0.15);

  for (const ev of LSD_EVENTS) {
    if (Math.random() < ev.prob + baseMod) {
      showLSDEvent(ev);
      ev.apply(roundState);
      return;
    }
  }
}

let lsdOverlay = null;
function showLSDEvent(ev) {
  // Crea o riusa overlay LSD
  if (!lsdOverlay) {
    lsdOverlay = document.createElement("div");
    lsdOverlay.id = "lsdOverlay";
    lsdOverlay.style.cssText = `
      position:fixed; inset:0; z-index:5000;
      background:rgba(80,0,80,0.82);
      display:flex; flex-direction:column;
      justify-content:center; align-items:center;
      text-align:center; padding:20px;
      animation: lsdFlash 0.3s ease;
      pointer-events:none;
    `;
    document.body.appendChild(lsdOverlay);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes lsdFlash {
        0%   { opacity:0; transform:scale(0.9); }
        50%  { opacity:1; transform:scale(1.04); }
        100% { opacity:1; transform:scale(1); }
      }
      @keyframes lsdPulse {
        0%,100% { text-shadow: 0 0 8px #ff00ff, 0 0 20px #00ffff; }
        50%      { text-shadow: 0 0 24px #ffff00, 0 0 40px #ff00ff; }
      }
      #lsdOverlay .ev-title {
        font-size: clamp(1.6rem,6vw,3rem);
        color: #ffff00;
        font-weight: 900;
        animation: lsdPulse 0.8s infinite;
        margin-bottom:12px;
      }
      #lsdOverlay .ev-desc {
        font-size: clamp(0.9rem,3vw,1.3rem);
        color: #fff;
        max-width: 400px;
      }
    `;
    document.head.appendChild(style);
  }

  lsdOverlay.innerHTML = `
    <div class="ev-title">${ev.label}</div>
    <div class="ev-desc">${ev.desc}</div>
  `;
  lsdOverlay.style.display = "flex";

  setTimeout(() => { lsdOverlay.style.display = "none"; }, 2000);
}

// ============================================================
// BET CONTROLS
// ============================================================
function setBetControlsEnabled(enabled) {
  ["btnMinus","btnPlus","btnMinus10","btnPlus10","btnAllIn"].forEach(id => {
    document.getElementById(id).disabled = !enabled;
  });
}

document.getElementById("btnMinus").addEventListener("click", () => {
  if (roundState.freezeBet) return;
  if (bet > 0) { bet = Math.max(0, bet - 1); updateHUD(); }
});
document.getElementById("btnPlus").addEventListener("click", () => {
  if (roundState.freezeBet) return;
  if (coins > bet) { bet = Math.min(coins, bet + 1); updateHUD(); }
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
// HUD + SALVATAGGIO
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
// LOGICA ROUND
// ============================================================
function resolveRound(wantHigher) {
  if (isAnimating) return;
  isAnimating = true;

  // Ghost card: next uguale a current
  const revealed = roundState.ghostCard ? currentValue : nextValue;

  // Mostra carta rivelata a destra
  elNextImg.src = cardImgPath(revealed);
  elNextLabel.textContent = CARD_NAMES[revealed] || "";
  animateEl(elNextImg);

  // Calcola esito (MIRROR inverte la logica)
  let isWin = wantHigher ? (revealed > currentValue) : (revealed < currentValue);
  if (roundState.mirrorRound) isWin = !isWin;

  // Ghost card → sempre parità → sempre perdi
  if (roundState.ghostCard && revealed === currentValue) isWin = false;

  // Applica esito
  if (isWin) {
    score += 1;
    winStreak++;
    loseStreak = 0;
    const mult = roundState.betMultiplier || 2;
    if (bet > 0) coins += bet * mult;
    const gain = bet > 0 ? bet * mult : 0;
    showMessage(`✓ Hai indovinato! +${gain}${roundState.doubleOrNothing ? " (×3!)" : mult > 2 ? ` (×${mult})` : ""}`);
  } else {
    score = Math.max(0, score - 1);
    loseStreak++;
    winStreak = 0;
    if (roundState.doubleOrNothing) {
      const lost = coins;
      coins = 0;
      showMessage(`✗ DOUBLE OR NOTHING — Hai perso tutto! -${lost}`);
    } else if (bet > 0) {
      coins = Math.max(0, coins - bet);
      showMessage(`✗ Sbagliato! -${bet}`);
    } else {
      showMessage("✗ Sbagliato!");
    }
  }

  totalRounds++;
  bet = 0;
  updateHUD();

  // Dopo animazione: slide carta, reset stato round, nuovo evento LSD
  setTimeout(() => {
    currentValue = revealed;

    // Aggiorna label carta corrente (rispetta blind)
    if (roundState.blindRounds > 0) {
      roundState.blindRounds--;
      elCurrentImg.src = backImgPath();
      elCurrentLabel.textContent = "???";
    } else {
      elCurrentImg.src = cardImgPath(currentValue);
      elCurrentLabel.textContent = CARD_NAMES[currentValue] || "";
    }
    animateEl(elCurrentImg);

    // Reset stato round
    const prevBlind = roundState.blindRounds;
    roundState = {
      mirrorRound:    false,
      doubleOrNothing: false,
      blindRounds:    prevBlind, // blind persiste tra round
      betMultiplier:  2,
      ghostCard:      false,
      freezeBet:      false,
    };
    setBetControlsEnabled(true);

    // Nuova carta nascosta
    nextValue = pickNextCardHard(currentValue);
    elNextImg.src = backImgPath();
    elNextLabel.textContent = "?";

    // Prova evento LSD
    tryLSDEvent();

    isAnimating = false;
  }, 900);
}

// ============================================================
// ANIMAZIONE CARTA
// ============================================================
function animateEl(el) {
  el.classList.remove("animate");
  void el.offsetWidth;
  el.classList.add("animate");
}

// ============================================================
// MESSAGGIO RISULTATO
// ============================================================
let msgTimer = null;
function showMessage(text) {
  elResult.textContent = text;
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
    const x = Math.random() * Math.max(0, bw - cs - 4);
    const y = Math.random() * Math.max(0, bh - cs - 4);
    chip.style.left      = x + "px";
    chip.style.top       = y + "px";
    chip.style.transform = `rotate(${Math.floor(Math.random()*360)}deg)`;
    chipBox.appendChild(chip);
  }

  if (count > maxChips) {
    const lbl = document.createElement("div");
    lbl.style.cssText = "position:absolute;bottom:2px;right:4px;color:gold;font-size:11px;font-weight:bold;";
    lbl.textContent = "×" + count;
    chipBox.appendChild(lbl);
  }
}

window.addEventListener("resize", () => generateChips(bet));

// ============================================================
// EVENTI PULSANTI GIOCO
// ============================================================
document.getElementById("btnHigher").addEventListener("click", () => resolveRound(true));
document.getElementById("btnLower").addEventListener("click",  () => resolveRound(false));

// ============================================================
// INIT
// ============================================================
function init() {
  aggiornaSfondo();
  currentValue = pickRandom();
  nextValue    = pickNextCardHard(currentValue);

  elCurrentImg.src = cardImgPath(currentValue);
  elCurrentLabel.textContent = CARD_NAMES[currentValue] || "";
  elNextImg.src = backImgPath();
  elNextLabel.textContent = "?";

  updateHUD();

  // Primo evento LSD dopo 3 secondi (warm-up)
  setTimeout(tryLSDEvent, 3000);
}

document.addEventListener("DOMContentLoaded", init);
