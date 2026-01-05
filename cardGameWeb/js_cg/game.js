// =========================
// CARICAMENTO DATI
// =========================
let data = loadData();

let coins = data.coins;
let score = data.score;
let bet = data.bet;

let currentDeck = data.deck;            // 1–3
let currentBack = data.backDeck;        // 1–3
let currentBackground = data.background; // 1–4

// =========================
// FUNZIONI IMMAGINI
// =========================
function cardImgPath(value) {
  const offset = (currentDeck - 1) * 10; // 0, 10, 20
  return `data_cg/deck_base/${offset + value}.png`;
}

function backImgPath() {
  return `data_cg/backDeck/back${currentBack}.png`;
}

// =========================
// SFONDO DINAMICO
// =========================
function aggiornaSfondo() {
  const bgFiles = [
    "SfondoTavolata.png",   // 1
    "SfondoTavolata1.png",  // 2
    "SfondoTavolata2.png",  // 3
    "SfondoTavolata3.png"   // 4
  ];

  const body = document.getElementById("gameBody");
  const index = Math.max(1, Math.min(currentBackground, bgFiles.length)) - 1;

  body.style.backgroundImage = `url("data_cg/${bgFiles[index]}")`;
  body.style.backgroundSize = "contain";
  body.style.backgroundPosition = "center";
  body.style.backgroundRepeat = "no-repeat";
  body.style.backgroundColor = "#000";
}

// =========================
// ELEMENTI UI
// =========================
const elCoins = document.getElementById("coins");
const elScore = document.getElementById("score");
const elBet = document.querySelector("#betAmount b");
const elCurrentCardImg = document.getElementById("currentCardImg");
const elNextCardImg = document.getElementById("nextCardImg");
const elResultMessage = document.getElementById("resultMessage");
const chipBox = document.getElementById("chipBox");

// Pulsanti
const btnHigher = document.getElementById("btnHigher");
const btnLower = document.getElementById("btnLower");
const btnAllIn = document.getElementById("btnAllIn");
const btnMinus = document.getElementById("btnMinus");
const btnPlus = document.getElementById("btnPlus");
const btnMinus10 = document.getElementById("btnMinus10");
const btnPlus10 = document.getElementById("btnPlus10");

// =========================
// INIZIALIZZAZIONE
// =========================
let currentValue = null;

function init() {
  aggiornaSfondo();

  currentValue = pickInitialValue();
  elCurrentCardImg.src = cardImgPath(currentValue);
  elNextCardImg.src = backImgPath();

  updateHUD();
}

// Valore iniziale (1–10)
function pickInitialValue() {
  return Math.floor(Math.random() * 10) + 1;
}

// =========================
// NUOVA LOGICA DI GENERAZIONE CARTA
// =========================
function pickNextCard(current) {
  const values = [];

  for (let i = 1; i <= 10; i++) {
    if (i === current) continue; // evita stessa carta

    let weight = 1;

    // Se la carta è ALTA → favorisci carte ancora più alte
    if (current >= 7) {
      if (i > current) {
        weight += (i - current) * 1.2; // molto più probabile
      } else {
        weight += (current - i) * 0.2; // poco probabile
      }
    }

    // Se la carta è BASSA → favorisci carte ancora più basse
    else if (current <= 4) {
      if (i < current) {
        weight += (current - i) * 1.2; // molto più probabile
      } else {
        weight += (i - current) * 0.2; // poco probabile
      }
    }

    // Se la carta è MEDIA → distribuzione imprevedibile
    else {
      weight += Math.random() * 2; // aggiunge caos controllato
    }

    // Aggiunge la carta tante volte quanto il peso
    for (let w = 0; w < Math.floor(weight); w++) {
      values.push(i);
    }
  }

  return values[Math.floor(Math.random() * values.length)];
}


// =========================
// HUD + SALVATAGGIO
// =========================
function updateHUD() { 
  elCoins.textContent = coins; 
  elScore.textContent = score; 
  elBet.textContent = bet; 

  const data = loadData(); 
  data.coins = coins; 
  data.score = score; 
  data.bet = bet; 
  data.deck = currentDeck; 
  data.backDeck = currentBack;
  data.background = currentBackground; 
  saveData(data); 

  generateChips(bet);
}

// =========================
// GESTIONE PUNTATA
// =========================
btnMinus.addEventListener("click", () => {
  if (bet > 0) {
    bet -= 1;
    updateHUD();
  }
});

btnPlus.addEventListener("click", () => {
  if (coins > bet) {
    bet += 1;
    updateHUD();
  }
});

btnMinus10.addEventListener("click", () => {
  bet = Math.max(0, bet - 10);
  updateHUD();
});

btnPlus10.addEventListener("click", () => {
  bet = Math.min(coins, bet + 10);
  updateHUD();
});

btnAllIn.addEventListener("click", () => {
  bet = coins;
  updateHUD();
});

// =========================
// LOGICA DI GIOCO
// =========================
function generateNextCard(wantHigher) {
  animateCard(elNextCardImg);

  const nextValue = pickNextCard(currentValue);

  elCurrentCardImg.src = cardImgPath(nextValue);
  animateCard(elCurrentCardImg);

  const isWin = wantHigher ? (nextValue > currentValue) : (nextValue < currentValue);

  if (isWin) {
    score += 1;
    if (bet > 0) coins += bet * 2;
    showMessage("Hai indovinato");
  } else {
    score = Math.max(0, score - 1);
    if (bet > 0) coins = Math.max(0, coins - bet);
    showMessage("Hai sbagliato");
  }

  currentValue = nextValue;
  bet = 0;

  updateHUD();
}

// =========================
// ANIMAZIONE CARTA
// =========================
function animateCard(el) {
  el.classList.remove("animate");
  void el.offsetWidth;
  el.classList.add("animate");
}

// =========================
// MESSAGGIO TEMPORANEO
// =========================
function showMessage(text) {
  elResultMessage.textContent = text;
  elResultMessage.classList.remove("hidden");
  setTimeout(() => {
    elResultMessage.classList.add("hidden");
  }, 3000);
}

// =========================
// CHIPS
// =========================
function generateChips(count) {
  chipBox.innerHTML = "";
  const boxWidth = chipBox.offsetWidth;
  const boxHeight = chipBox.offsetHeight;

  for (let i = 0; i < count; i++) {
    const chip = document.createElement("div");
    chip.classList.add("chip");

    const chipType = Math.floor(Math.random() * 6) + 1;
    chip.style.backgroundImage = `url("data_cg/fish/CasinoChip${chipType}.png")`;

    const x = Math.random() * (boxWidth - 70);
    const y = Math.random() * (boxHeight - 70);
    const r = Math.floor(Math.random() * 360);

    chip.style.left = `${x}px`;
    chip.style.top = `${y}px`;
    chip.style.transform = `rotate(${r}deg)`;

    chipBox.appendChild(chip);
  }
}

window.addEventListener("resize", () => {
  generateChips(bet);
});

// =========================
// EVENTI GIOCO
// =========================
btnHigher.addEventListener("click", () => generateNextCard(true));
btnLower.addEventListener("click", () => generateNextCard(false));

// =========================
// AVVIO
// =========================
document.addEventListener("DOMContentLoaded", () => {
  init();
});

