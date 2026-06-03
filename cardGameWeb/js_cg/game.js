// ============================================================
// LSD CARD GAME — game.js  v5.0
// ============================================================

// FIX v5.1: NON chiamare loadData() qui al top-level.
// I dati del server non sono ancora arrivati in questo momento.
// Le variabili vengono impostate correttamente nel DOMContentLoaded,
// DOPO await initStorage(). Così non si rischia di sovrascrivere
// il DB con i valori di default (coins=100, score=0) durante init().
let coins      = 100;
let score      = 0;
let bet        = 0;
let currentDeck       = 1;
let currentBack       = 1;
let currentBackground = 1;

const CARD_NAMES = ["","Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten"];

function cardImgPath(v)  { return `data_cg/deck_base/${(currentDeck-1)*10+v}.png`; }
function backImgPath()   { return `data_cg/backDeck/back${currentBack}.png`; }

function applyBackground() {
  const bgs = ["SfondoTavolata.png","SfondoTavolata1.png","SfondoTavolata2.png","SfondoTavolata3.png"];
  const url = `url("data_cg/${bgs[Math.max(1,Math.min(currentBackground,bgs.length))-1]}")`;
  const wrapper = document.getElementById("gameWrapper");
  if (wrapper) { wrapper.style.backgroundImage = url; wrapper.style.backgroundSize = "100% 100%"; }
}

// --- UI ---
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
const buffsList      = document.getElementById("buffsList");

// --- GAME STATE ---
let currentValue = null;
let nextValue    = null;
let isAnimating  = false;
let winStreak = 0, loseStreak = 0, totalRounds = 0;

// Stats locali sincronizzate con storage
let _stats_wins    = 0;
let _stats_losses  = 0;
let _state_winStreak = 0;

let roundState = {
  mirrorRound:false, doubleOrNothing:false, blindRounds:0,
  betMultiplier:2, ghostCard:false, freezeBet:false,
  forcedBet:false, swapButtons:false, reversePayout:false,
  bleedInterval:null, activeVisualFx:null, activeVisualRounds:0,
  blindBet:false, winTax:0,
};

// Effetti visivi multi-round
let persistentFxRounds = 0;
let persistentFxClass  = null;

// ============================================================
// BUFFS — 7 tipi: 4 classici + 3 carte LSD personaggio
// ============================================================
let activeBuffs = [];

// Debuff visivi multi-round tracciati per il panel laterale
let activeDebuffs = [];

const BUFF_DEFS = [

  // --- CLASSICI ---
  {
    id:"shield", icon:"🛡️", label:"COIN SHIELD",
    desc:"Your coins are protected from the next 2 loss deductions. The shield breaks after 2 hits.",
    color:"#0044cc", rounds:8, prob:0.038,
    state:{ shieldCharges:2 },
  },
  {
    id:"oracle", icon:"🔮", label:"ORACLE SIGHT",
    desc:"A faint arrow appears above the hidden card each round, hinting the direction. Trust it... or not.",
    color:"#6600bb", rounds:5, prob:0.032,
    onRound: () => showOracleHint(),
  },
  {
    id:"lucky_streak", icon:"✨", label:"LUCKY STREAK",
    desc:"Every win pays ×3 instead of ×2 for the duration. Stack it with Jackpot for ×4.",
    color:"#997700", rounds:6, prob:0.028,
  },
  {
    id:"heal", icon:"💚", label:"SCORE REGEN",
    desc:"+1 score per round automatically, win or lose. Survives the Joker.",
    color:"#006622", rounds:7, prob:0.032,
    onRound: () => { score = Math.max(0,score+1); updateHUD(); },
  },

  // --- CARTE LSD PERSONAGGIO ---
  {
    id:"leonardo", isRareLSD: true, icon:"🎨", label:"CARTA LSD: LEONARDO",
    desc:"SCHIZOPHRENIC BUT CRAZY — Leonardo reshuffles the deck in your favour (weighted toward a good card), then doubles your current bet for free. But there's a 30% chance he panics and swaps HIGHER/LOWER for this round.",
    color:"#880044", rounds:4, prob:0.022,
    isLSD: true,
    onActivate: (s) => {
      // Genera una carta successiva leggermente favorevole
      const biasedNext = pickBiasedCard(currentValue);
      nextValue = biasedNext;
      // Raddoppia la puntata gratis (aggiunge coins pari alla bet)
      if (bet > 0) { coins += bet; updateHUD(); }
      // 30% chance: lo schizofrenico fa un casino e swappa i tasti
      if (Math.random() < 0.30) {
        s.swapButtons = true;
        document.getElementById("btnHigher").innerHTML = "▼<br>LOWER";
        document.getElementById("btnLower").innerHTML  = "▲<br>HIGHER";
      }
    },
  },
  {
    id:"skywalker", isRareLSD: true, icon:"🧠", label:"CARTA LSD: SKYWALKER",
    desc:"GENIUS BUT INSANE — Skywalker reveals the exact next card value for 1 round (Oracle guaranteed). But being a genius is stressful: your bet multiplier drops to ×1.5 this round.",
    color:"#003388", rounds:3, prob:0.020,
    isLSD: true,
    onActivate: (s) => {
      // Rivela la carta esatta (oracle perfetto)
      showPerfectOracle();
      // Penalità: moltiplicatore ridotto
      s.betMultiplier = 1.5;
    },
  },
  {
    id:"dario", isRareLSD: true, icon:"🍀", label:"CARTA LSD: DARIO",
    desc:"STONED BUT LUCKY — Dario is too high to care about rules. He randomly gives you +10 to +50 coins (pure luck), ignores the next debuff event, and applies a random visual trip for 1–4 rounds.",
    color:"#226600", rounds:5, prob:0.022,
    isLSD: true,
    onActivate: (s) => {
      // Coins casuali (fortuna)
      const bonus = (Math.floor(Math.random()*5)+1) * 10;
      coins += bonus;
      updateHUD();
      showMessage(`🍀 Dario gift: +${bonus} coins!`, "#00ff44");
      // Scudo prossimo evento debuff
      s.darioShield = true;
      // Visual trip random per 1-4 round
      const trips = ["fx-rainbow","fx-dizzy-loop","fx-wave-loop","fx-zoom"];
      const chosen = trips[Math.floor(Math.random()*trips.length)];
      const tripRounds = Math.floor(Math.random()*4)+1;
      activateMultiRoundFx(chosen, tripRounds);
    },
  },
];

function trySpawnBuff() {
  const baseMod = Math.min(totalRounds * 0.002, 0.055);
  const shuffled = [...BUFF_DEFS].sort(() => Math.random()-0.5);
  for (const def of shuffled) {
    if (Math.random() < def.prob + baseMod) {
      if (activeBuffs.find(b => b.id === def.id)) continue;
      const buff = {
        ...def,
        roundsLeft: def.rounds,
        stateData: def.state ? JSON.parse(JSON.stringify(def.state)) : {},
      };
      activeBuffs.push(buff);
      // Attiva subito l'effetto per carte LSD personaggio
      if (def.onActivate) def.onActivate(roundState);
      showBuffModal(buff);
      renderBuffs();
      return;
    }
  }
}

function tickBuffs() {
  activeBuffs.forEach(b => {
    b.roundsLeft--;
    if (b.onRound) b.onRound();
  });
  activeBuffs = activeBuffs.filter(b => b.roundsLeft > 0);
  renderBuffs();
}

function renderBuffs() {
  buffsList.innerHTML = "";
  activeBuffs.forEach(b => {
    const el = document.createElement("div");
    el.className = "buff-item" + (b.isLSD ? " buff-lsd" : "") + (b.isRareLSD ? " buff-lsd-rare" : "");
    el.innerHTML = `<span class="buff-icon">${b.icon}</span><span class="buff-rounds">${b.roundsLeft}</span>`;
    el.title = b.label;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      showInfoModal(b.icon, b.label, b.desc, `${b.roundsLeft} round${b.roundsLeft!==1?"s":""} remaining`, b.color);
    });
    buffsList.appendChild(el);
  });
}

function renderDebuffs() {
  const debuffsList = document.getElementById("debuffsList");
  if (!debuffsList) return;
  debuffsList.innerHTML = "";
  activeDebuffs.forEach(d => {
    const el = document.createElement("div");
    el.className = "debuff-item";
    el.innerHTML = `<span class="debuff-icon">${d.icon}</span><span class="debuff-rounds">${d.roundsLeft}</span>`;
    el.title = d.label;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      showInfoModal(d.icon, d.label, d.desc, `${d.roundsLeft} round${d.roundsLeft!==1?"s":""} remaining`, d.color);
    });
    debuffsList.appendChild(el);
  });
}

function tickDebuffs() {
  activeDebuffs.forEach(d => d.roundsLeft--);
  activeDebuffs = activeDebuffs.filter(d => d.roundsLeft > 0);
  renderDebuffs();
}

function hasActiveBuff(id) { return !!activeBuffs.find(b => b.id === id); }

// Fullscreen modal per buff (stile verde — diverso da debuff viola/rosso)
function showBuffModal(buff) {
  const modal = document.getElementById("buffModal");
  if (!modal) { // fallback toast se modal non presente
    const toast = document.createElement("div");
    toast.className = "buff-toast" + (buff.isLSD ? " buff-toast-lsd" : "");
    toast.innerHTML = `${buff.icon} <b>${buff.label}</b> activated!`;
    document.getElementById("gameWrapper").appendChild(toast);
    setTimeout(() => toast.classList.add("buff-toast-show"), 50);
    setTimeout(() => { toast.classList.remove("buff-toast-show"); setTimeout(()=>toast.remove(),500); }, 3000);
    return;
  }
  document.getElementById("buffModalIcon").textContent  = buff.icon;
  document.getElementById("buffModalTitle").textContent = buff.label;
  document.getElementById("buffModalDesc").textContent  = buff.desc;
  const isRare = buff.isLSD;
  const box = document.getElementById("buffModalBox");
  box.style.borderColor = isRare ? "gold" : "#00ff88";
  box.classList.toggle("buff-modal-rare", isRare);
  modal.classList.add("active");
  applyTempFx("fx-shake-loop", 300);

  let cd = 3;
  const timerEl = document.getElementById("buffModalTimer");
  timerEl.textContent = `Tap anywhere or wait ${cd}s…`;
  const iv = setInterval(() => {
    cd--;
    if (cd <= 0) close();
    else timerEl.textContent = `Tap anywhere or wait ${cd}s…`;
  }, 1000);

  function close() {
    clearInterval(iv);
    modal.classList.remove("active");
    modal.removeEventListener("click", onTap);
  }
  function onTap() { close(); }
  modal.addEventListener("click", onTap, { once: true });
}

// Mantieni anche il toast per compatibilità (non usato direttamente ora)
function showBuffToast(buff) { showBuffModal(buff); }

// Oracle normale (freccia indizio)
function showOracleHint() {
  if (!nextValue || !currentValue) return;
  const hint = nextValue > currentValue ? "▲" : nextValue < currentValue ? "▼" : "≈";
  const hintEl = document.createElement("div");
  hintEl.className = "oracle-hint";
  hintEl.textContent = hint;
  const cardBox = document.querySelector(".card-box.right");
  if (cardBox) { cardBox.appendChild(hintEl); setTimeout(()=>hintEl.remove(), 3500); }
}

// Oracle perfetto Skywalker (mostra valore esatto)
function showPerfectOracle() {
  if (!nextValue) return;
  const hintEl = document.createElement("div");
  hintEl.className = "oracle-hint oracle-perfect";
  hintEl.textContent = CARD_NAMES[nextValue] || nextValue;
  const cardBox = document.querySelector(".card-box.right");
  if (cardBox) { cardBox.appendChild(hintEl); setTimeout(()=>hintEl.remove(), 8000); }
}

// Carta biased per Leonardo (leggermente favorevole)
function pickBiasedCard(current) {
  const pool = [];
  for (let i=1; i<=10; i++) {
    if (i===current) continue;
    // Peso verso la direzione "ovvia" (aiuto leggero)
    let w = 1;
    if (current <= 5 && i > current) w += 2;
    if (current >= 6 && i < current) w += 2;
    w += Math.random() * 1.5;
    for (let k=0;k<Math.max(1,Math.floor(w));k++) pool.push(i);
  }
  return pool[Math.floor(Math.random()*pool.length)];
}

// ============================================================
// MULTI-ROUND FX (per Dario e debuff visivi multi-round)
// ============================================================
function activateMultiRoundFx(cls, rounds, evDef) {
  if (persistentFxClass) getWrapper().classList.remove(persistentFxClass);
  persistentFxClass  = cls;
  persistentFxRounds = rounds;
  getWrapper().classList.add(cls);
  // Track debuff visivo nel panel laterale
  if (evDef) {
    activeDebuffs = activeDebuffs.filter(d => d.id !== evDef.id);
    activeDebuffs.push({ ...evDef, roundsLeft: rounds });
    renderDebuffs();
  }
}

function tickVisualFx() {
  if (persistentFxClass && persistentFxRounds > 0) {
    persistentFxRounds--;
    if (persistentFxRounds <= 0) {
      getWrapper().classList.remove(persistentFxClass);
      persistentFxClass = null;
    }
  }
}

// ============================================================
// LSD EVENTS
// ============================================================
const LSD_EVENTS = [

  // --- DEBUFF CLASSICI ---
  { id:"mirror",        icon:"🪞", label:"MIRROR WORLD",      desc:"Results INVERTED this round. Higher means lower!",                                    color:"#8800ff", prob:0.08, type:"debuff",
    apply:(s)=>{ s.mirrorRound=true; } },
  { id:"acid_tax",      icon:"💸", label:"ACID TAX",           desc:"The Dealer takes 30% of your coins. Right now.",                                      color:"#cc0000", prob:0.07, type:"debuff", needsCoins:true,
    apply:()=>{ coins=Math.max(0,coins-Math.floor(coins*0.30)); updateHUD(); } },
  { id:"double_nothing",icon:"⚡", label:"DOUBLE OR NOTHING",  desc:"WIN → ×3 coins. LOSE → you lose EVERYTHING.",                                         color:"#ff6600", prob:0.06, type:"debuff",
    apply:(s)=>{ s.doubleOrNothing=true; } },
  { id:"trip_blind",    icon:"🕶️", label:"TRIP BLIND",         desc:"Your current card is hidden for 3 rounds.",                                           color:"#004488", prob:0.09, type:"debuff",
    apply:(s)=>{ s.blindRounds=3; } },
  { id:"deck_shuffle",  icon:"🌀", label:"DECK SHUFFLE",       desc:"The deck reshuffles. Your current card changed.",                                      color:"#006644", prob:0.10, type:"debuff",
    apply:(s)=>{ currentValue=pickRandom(); nextValue=pickNextCardHard(currentValue);
                 elCurrentImg.src=s.blindRounds>0?backImgPath():cardImgPath(currentValue);
                 elCurrentLabel.textContent=s.blindRounds>0?"???":(CARD_NAMES[currentValue]||""); } },
  { id:"jackpot",       icon:"🎰", label:"JACKPOT CHANCE",     desc:"Win this round → bet pays ×4. But odds are against you.",                             color:"#886600", prob:0.07, type:"debuff",
    apply:(s)=>{ s.betMultiplier=4; } },
  { id:"coin_bomb",     icon:"💣", label:"COIN BOMB",          desc:"BOOM. Half your coins vanish. Instantly.",                                             color:"#880000", prob:0.06, type:"debuff", needsCoins:true,
    apply:()=>{ coins=Math.max(0,Math.floor(coins/2)); updateHUD(); } },
  { id:"ghost_card",    icon:"👻", label:"GHOST CARD",         desc:"Next card mirrors current. You cannot win.",                                           color:"#334455", prob:0.07, type:"debuff",
    apply:(s)=>{ s.ghostCard=true; } },
  { id:"mind_melt",     icon:"🧠", label:"MIND MELT",          desc:"3 score points dissolve. Just like that.",                                             color:"#550055", prob:0.06, type:"debuff", needsScore:true,
    apply:()=>{ score=Math.max(0,score-3); updateHUD(); } },
  { id:"freeze",        icon:"🧊", label:"BET FREEZE",         desc:"Bet controls locked this round. Your current bet stands.",                            color:"#003366", prob:0.07, type:"debuff",
    apply:(s)=>{ s.freezeBet=true; setBetControlsEnabled(false); } },
  { id:"swap_buttons",  icon:"🔀", label:"CONTROLS SWAPPED",   desc:"HIGHER and LOWER buttons are physically swapped. Think before you tap.",              color:"#993300", prob:0.08, type:"debuff",
    apply:(s)=>{ s.swapButtons=true; document.getElementById("btnHigher").innerHTML="▼<br>LOWER"; document.getElementById("btnLower").innerHTML="▲<br>HIGHER"; } },
  { id:"forced_allin",  icon:"🎭", label:"ALL IN FORCED",      desc:"Your entire wallet is the bet. No choice.",                                           color:"#660000", prob:0.05, type:"debuff", needsCoins:true,
    apply:(s)=>{ bet=coins; s.forcedBet=true; s.freezeBet=true; setBetControlsEnabled(false); updateHUD(); } },
  { id:"score_steal",   icon:"🦹", label:"SCORE BANDIT",       desc:"The Dealer steals HALF your score.",                                                   color:"#440066", prob:0.05, type:"debuff", needsScore:true,
    apply:()=>{ score=Math.max(0,Math.floor(score/2)); updateHUD(); } },
  { id:"reverse_pay",   icon:"🔄", label:"REVERSE PAYOUT",     desc:"Win this round and you still lose your bet. Psychedelic economics.",                  color:"#004400", prob:0.05, type:"debuff",
    apply:(s)=>{ s.reversePayout=true; } },
  { id:"bleed",         icon:"🩸", label:"COIN BLEED",         desc:"You lose 5 coins/second until this round ends. Hurry.",                               color:"#550000", prob:0.05, type:"debuff", needsCoins:true,
    apply:(s)=>{ s.bleedInterval=setInterval(()=>{ coins=Math.max(0,coins-5); updateHUD(); },1000); } },
  { id:"bet_floor",     icon:"📉", label:"MINIMUM BET",        desc:"You must bet at least 10 coins this round.",                                          color:"#660033", prob:0.06, type:"debuff", needsCoins:true,
    apply:(s)=>{ if(bet<10){ bet=Math.min(10,coins); } s.freezeBet=true; setBetControlsEnabled(false); updateHUD(); } },
  { id:"flip_score",    icon:"🔃", label:"SCORE FLIP",         desc:"Your score is reset to zero. Start over.",                                             color:"#440000", prob:0.03, type:"debuff", needsScore:true,
    apply:()=>{ score=0; updateHUD(); } },
  { id:"joker",         icon:"🃏", label:"WILD JOKER",         desc:"ALL your active buffs are wiped. The house always wins.",                             color:"#222200", prob:0.04, type:"debuff",
    apply:()=>{ activeBuffs=[]; renderBuffs(); } }, // joker only clears buffs, debuffs remain
  { id:"blind_bet",     icon:"🙈", label:"BLIND BET",          desc:"Your bet display is hidden. You don't know how much you're wagering.",                color:"#2a0044", prob:0.06, type:"debuff",
    apply:(s)=>{ s.blindBet=true; elBet.textContent="???"; } },
  { id:"coin_tax_win",  icon:"💰", label:"WIN TAX",            desc:"If you win, the house takes 50% of your winnings.",                                    color:"#aa4400", prob:0.05, type:"debuff",
    apply:(s)=>{ s.winTax=0.5; } },
  { id:"score_drain",   icon:"📛", label:"SCORE DRAIN",        desc:"-1 score per round for the next 3 rounds. Passive damage.",                           color:"#330022", prob:0.05, type:"debuff", needsScore:true,
    apply:()=>{ let r=3; const iv=setInterval(()=>{ score=Math.max(0,score-1); updateHUD(); if(--r<=0)clearInterval(iv); },1200); } },
  { id:"chaos_bet",     icon:"🎲", label:"CHAOS BET",          desc:"Your bet is set to a random value between 1 and your total coins. You can't change it.",color:"#553300",prob:0.05,type:"debuff",needsCoins:true,
    apply:(s)=>{ bet=Math.max(1,Math.floor(Math.random()*coins)); s.freezeBet=true; setBetControlsEnabled(false); updateHUD(); } },
  { id:"hot_potato",    icon:"🥔", label:"HOT POTATO",         desc:"If you win, you lose score instead of gaining. If you lose, you gain score instead. Everything is backwards.",color:"#885500",prob:0.04,type:"debuff",
    apply:(s)=>{ s.hotPotato=true; } },
  { id:"coin_floor",    icon:"🏦", label:"BROKER",             desc:"You can only bet 1 coin this round. The house sets the rules.",                        color:"#004422", prob:0.05, type:"debuff", needsCoins:true,
    apply:(s)=>{ bet=1; s.freezeBet=true; setBetControlsEnabled(false); updateHUD(); } },

  // --- EFFETTI VISIVI MULTI-ROUND (1-10 round casuali) ---
  { id:"redvision",     icon:"🔴", label:"RED EYES",           desc:"Your eyes are burning red for several rounds. Vision impaired.",                       color:"#660000", prob:0.09, type:"visual",
    apply:(s)=>{ activateMultiRoundFx("fx-redvision",  Math.ceil(Math.random()*6)); s.activeVisualFx="fx-redvision"; } },
  { id:"blur_vision",   icon:"😵", label:"BLURRED VISION",     desc:"Everything blurs for several rounds. The cards mock you.",                             color:"#220044", prob:0.09, type:"visual",
    apply:(s)=>{ activateMultiRoundFx("fx-blur",       Math.ceil(Math.random()*6)); s.activeVisualFx="fx-blur"; } },
  { id:"negative",      icon:"☯️", label:"NEGATIVE REALITY",   desc:"Colors invert for several rounds. Welcome to the other side.",                         color:"#111111", prob:0.06, type:"visual",
    apply:(s)=>{ activateMultiRoundFx("fx-negative",   Math.ceil(Math.random()*5)); s.activeVisualFx="fx-negative"; } },
  { id:"dark_room",     icon:"🌑", label:"LIGHTS OUT",         desc:"Almost total darkness for several rounds. Squint harder.",                             color:"#000011", prob:0.06, type:"visual",
    apply:(s)=>{ activateMultiRoundFx("fx-dark-blink", Math.ceil(Math.random()*4)); s.activeVisualFx="fx-dark-blink"; } },
  { id:"rainbow",       icon:"🌈", label:"RAINBOW TRIP",       desc:"Acid rainbow for several rounds. Psychedelic.",                                        color:"#330033", prob:0.07, type:"visual",
    apply:(s)=>{ activateMultiRoundFx("fx-rainbow",    Math.ceil(Math.random()*8)); s.activeVisualFx="fx-rainbow"; } },
  { id:"dizzy",         icon:"💫", label:"DIZZY SPELL",        desc:"The room spins for several rounds. Hold on.",                                          color:"#004466", prob:0.08, type:"visual",
    apply:(s)=>{ activateMultiRoundFx("fx-dizzy-loop", Math.ceil(Math.random()*6)); s.activeVisualFx="fx-dizzy-loop"; } },
  { id:"shake",         icon:"💥", label:"TABLE QUAKE",        desc:"The table shakes for several rounds.",                                                 color:"#663300", prob:0.08, type:"visual",
    apply:(s)=>{ activateMultiRoundFx("fx-shake-loop", Math.ceil(Math.random()*5)); s.activeVisualFx="fx-shake-loop"; } },
  { id:"glitch",        icon:"👾", label:"MATRIX GLITCH",      desc:"Reality glitches for several rounds.",                                                 color:"#003300", prob:0.07, type:"visual",
    apply:(s)=>{ activateMultiRoundFx("fx-glitch-loop",Math.ceil(Math.random()*7)); s.activeVisualFx="fx-glitch-loop"; } },
  { id:"zoom_loop",     icon:"🔭", label:"ZOOM LOOP",          desc:"The screen breathes in and out for several rounds.",                                   color:"#001133", prob:0.06, type:"visual",
    apply:(s)=>{ activateMultiRoundFx("fx-zoom",       Math.ceil(Math.random()*6)); s.activeVisualFx="fx-zoom"; } },
  { id:"drunk_walk",    icon:"🍺", label:"DRUNK WALK",         desc:"The screen wobbles like a drunkard for several rounds.",                               color:"#553300", prob:0.07, type:"visual",
    apply:(s)=>{ activateMultiRoundFx("fx-drunk-loop", Math.ceil(Math.random()*8)); s.activeVisualFx="fx-drunk-loop";
                 drunkButtons(Math.ceil(Math.random()*5)*1000); } },
  { id:"wave",          icon:"🌊", label:"WAVE REALITY",       desc:"Reality waves and warps for several rounds.",                                          color:"#002244", prob:0.06, type:"visual",
    apply:(s)=>{ activateMultiRoundFx("fx-wave-loop",  Math.ceil(Math.random()*7)); s.activeVisualFx="fx-wave-loop"; } },
  { id:"spin",          icon:"🌀", label:"FULL SPIN",          desc:"Everything slowly rotates. Play fast before you puke.",                                color:"#220022", prob:0.05, type:"visual",
    apply:(s)=>{ activateMultiRoundFx("fx-spin-loop",  Math.ceil(Math.random()*4)+1); s.activeVisualFx="fx-spin-loop"; } },
];

// ============================================================
// VISUAL FX
// ============================================================
function getWrapper() {
  return document.getElementById("gameWrapper") || document.getElementById("gameBody");
}
function activatePersistentFx(cls, s) {
  getWrapper().classList.add(cls);
  s.activeVisualFx = cls;
}
function clearPersistentFx(s) {
  // NON rimuovere multi-round fx — quelli li gestisce tickVisualFx
  // Rimuovi solo quelli single-round residui
  if (s.activeVisualFx && persistentFxRounds <= 0) {
    getWrapper().classList.remove(s.activeVisualFx);
    s.activeVisualFx = null;
  }
}
function applyTempFx(cls, ms) {
  const el = getWrapper();
  el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls), ms);
}

// ============================================================
// DRUNK BUTTONS
// ============================================================
function drunkButtons(duration) {
  const btns = ["btnHigher","btnLower","btnAllIn"].map(id=>document.getElementById(id));
  const iv = setInterval(()=>{
    btns.forEach(b=>{
      if(!b) return;
      b.style.transform = `translate(${(Math.random()-.5)*60}px,${(Math.random()-.5)*38}px) rotate(${(Math.random()-.5)*18}deg)`;
    });
  },280);
  setTimeout(()=>{ clearInterval(iv); btns.forEach(b=>{ if(b) b.style.transform=""; }); }, duration);
}

// ============================================================
// DIFFICULTY
// ============================================================
function pickRandom() { return Math.floor(Math.random()*10)+1; }

function pickNextCardHard(current) {
  const pool = [];
  const difficulty = 1 + Math.min(winStreak*0.35, 3.0);
  for (let i=1; i<=10; i++) {
    if (i===current) continue;
    let w=1;
    if      (current<=3) { w += i<current?(current-i)*2.0*difficulty:(i-current)*0.15; w+=Math.random(); }
    else if (current>=8) { w += i>current?(i-current)*2.0*difficulty:(current-i)*0.15; w+=Math.random(); }
    else if (current===5||current===6) { w+=Math.random()*7; }
    else { w += Math.abs(current-i)<2?2.8*difficulty:0.6; w+=Math.random()*1.5; }
    if (winStreak>=3 && Math.abs(current-i)===1) w+=4;
    if (loseStreak>=4) { if((current<=5 && i>current)||(current>5 && i<current)) w+=1.5; }
    for (let k=0;k<Math.max(1,Math.floor(w));k++) pool.push(i);
  }
  return pool[Math.floor(Math.random()*pool.length)];
}

// ============================================================
// EVENT SYSTEM
// ============================================================
let activeEventDef = null;

function tryLSDEvent() {
  const baseMod = Math.min(totalRounds*0.006, 0.18);
  const shuffled = [...LSD_EVENTS].sort(()=>Math.random()-0.5);

  for (const ev of shuffled) {
    if (ev.needsCoins && coins <= 1) continue;
    if (ev.needsScore && score <= 0) continue;
    // Dario shield blocca il prossimo debuff
    if (roundState.darioShield && ev.type === "debuff") {
      roundState.darioShield = false;
      continue;
    }
    if (Math.random() < ev.prob + baseMod) {
      showLSDModal(ev, ()=>{ ev.apply(roundState, ev); activeEventDef=ev; showEventBadge(ev);
        // Track visual debuffs for side panel
        if (ev.type === "visual") {
          activeDebuffs = activeDebuffs.filter(d => d.id !== ev.id);
          activeDebuffs.push({ ...ev, roundsLeft: persistentFxRounds });
          renderDebuffs();
        }
      });
      return;
    }
  }
  trySpawnBuff();
}

// --- MODALE EVENTO ---
let modalCountdown = null;
function showLSDModal(ev, onClose) {
  const modal = document.getElementById("lsdModal");
  document.getElementById("lsdModalIcon").textContent  = ev.icon;
  document.getElementById("lsdModalTitle").textContent = ev.label;
  document.getElementById("lsdModalDesc").textContent  = ev.desc;
  document.getElementById("lsdModalBox").style.borderColor = ev.color||"gold";
  const timerEl = document.getElementById("lsdModalTimer");
  modal.classList.add("active");
  applyTempFx("fx-shake-loop", 400);

  let cd = 3;
  timerEl.textContent = `Tap anywhere or wait ${cd}s…`;
  if (modalCountdown) clearInterval(modalCountdown);
  modalCountdown = setInterval(()=>{
    cd--;
    if (cd<=0) closeModal();
    else timerEl.textContent = `Tap anywhere or wait ${cd}s…`;
  },1000);

  function closeModal() {
    clearInterval(modalCountdown);
    modal.classList.remove("active");
    if (onClose) onClose();
    modal.removeEventListener("click", onTap);
  }
  function onTap() { closeModal(); }
  modal.addEventListener("click", onTap, {once:true});
}

// --- BADGE ---
function showEventBadge(ev) {
  if (!eventBadge) return;
  eventBadge.textContent = `${ev.icon} ${ev.label}`;
  eventBadge.classList.remove("hidden");
}
function hideEventBadge() {
  if (eventBadge) eventBadge.classList.add("hidden");
  activeEventDef = null;
}
eventBadge.addEventListener("click", (e)=>{
  e.stopPropagation();
  if (!activeEventDef) return;
  showInfoModal(activeEventDef.icon, activeEventDef.label, activeEventDef.desc, "Active this round", activeEventDef.color);
});

// ============================================================
// INFO MODAL
// ============================================================
function showInfoModal(icon, title, desc, sub, borderColor) {
  const modal = document.getElementById("infoModal");
  document.getElementById("infoModalIcon").textContent   = icon;
  document.getElementById("infoModalTitle").textContent  = title;
  document.getElementById("infoModalDesc").textContent   = desc;
  document.getElementById("infoModalRounds").textContent = sub||"";
  document.getElementById("infoModalBox").style.borderColor = borderColor||"#00ff88";
  modal.classList.add("active");
  function close() { modal.classList.remove("active"); }
  document.getElementById("infoModalClose").onclick = (e)=>{ e.stopPropagation(); close(); };
  modal.onclick = (e)=>{ if(e.target===modal) close(); };
}

// ============================================================
// RULES MODAL
// ============================================================
function showRulesIfFirst() {
  if (localStorage.getItem("LSD_RULES_SEEN")) return;
  const modal = document.getElementById("rulesModal");
  modal.classList.add("active");
  document.getElementById("rulesClose").onclick = ()=>{
    modal.classList.remove("active");
    localStorage.setItem("LSD_RULES_SEEN","1");
  };
}

// ============================================================
// BET CONTROLS
// ============================================================
function setBetControlsEnabled(en) {
  ["btnMinus","btnPlus","btnMinus10","btnPlus10","btnAllIn"].forEach(id=>{
    const el=document.getElementById(id);
    if(el){ el.disabled=!en; el.style.opacity=en?"1":"0.4"; }
  });
}
document.getElementById("btnMinus").addEventListener("click",  ()=>{ if(roundState.freezeBet)return; bet=Math.max(0,bet-1);  updateHUD(); });
document.getElementById("btnPlus").addEventListener("click",   ()=>{ if(roundState.freezeBet)return; bet=Math.min(coins,bet+1); updateHUD(); });
document.getElementById("btnMinus10").addEventListener("click",()=>{ if(roundState.freezeBet)return; bet=Math.max(0,bet-10); updateHUD(); });
document.getElementById("btnPlus10").addEventListener("click", ()=>{ if(roundState.freezeBet)return; bet=Math.min(coins,bet+10); updateHUD(); });
document.getElementById("btnAllIn").addEventListener("click",  ()=>{ if(roundState.freezeBet)return; bet=coins; updateHUD(); });

// ============================================================
// HUD
// ============================================================
function updateHUD() {
  elCoins.textContent = coins;
  elScore.textContent = score;
  if (!roundState.blindBet) elBet.textContent = bet;

  // Aggiorna winStreak corrente nei stats
  _state_winStreak = winStreak;

  saveData({
    coins, score, bet,
    deck: currentDeck, backDeck: currentBack, background: currentBackground,
    stats: {
      totalRounds,
      wins:          _stats_wins,
      losses:        _stats_losses,
      winStreak:     winStreak,
      bestWinStreak: Math.max(winStreak, loadData().stats.bestWinStreak || 0),
    }
  });
  generateChips(bet);
}

// ============================================================
// ROUND
// ============================================================
function resolveRound(wantHigher) {
  if (isAnimating) return;
  isAnimating = true;

  if (roundState.bleedInterval) clearInterval(roundState.bleedInterval);

  // Effetto visivo: rimane finché ci sono round residui (tickVisualFx lo gestisce)
  // Per single-round clear:
  if (persistentFxRounds <= 1 && persistentFxClass) {
    getWrapper().classList.remove(persistentFxClass);
    persistentFxClass = null;
    persistentFxRounds = 0;
  }

  const effectiveHigher = roundState.swapButtons ? !wantHigher : wantHigher;
  const revealed = roundState.ghostCard ? currentValue : nextValue;

  elNextImg.src = cardImgPath(revealed);
  elNextLabel.textContent = CARD_NAMES[revealed]||"";
  animateEl(elNextImg);
  hideEventBadge();

  let isWin = effectiveHigher?(revealed>currentValue):(revealed<currentValue);
  if (roundState.mirrorRound)   isWin = !isWin;
  if (roundState.ghostCard && revealed===currentValue) isWin = false;
  if (roundState.reversePayout) isWin = !isWin;

  // Hot Potato
  if (roundState.hotPotato) {
    if (isWin) { score=Math.max(0,score-1); showMessage("🥔 Hot Potato: win = score loss!","#ff8800"); }
    else       { score+=1;                  showMessage("🥔 Hot Potato: loss = score gain!","#88ff00"); }
  }

  roundState.blindBet = false;

  // Lucky Streak buff
  if (isWin && hasActiveBuff("lucky_streak") && roundState.betMultiplier < 3) roundState.betMultiplier = 3;

  if (isWin && !roundState.hotPotato) {
    score+=1; winStreak++; loseStreak=0; _stats_wins++;
    const mult = roundState.betMultiplier||2;
    let gain = bet>0 ? bet*mult : 0;
    if (roundState.winTax && gain>0) gain = Math.floor(gain*(1-roundState.winTax));
    if (bet>0) coins += gain;
    showMessage(`✓ Correct! +${gain}${mult>2?` (×${mult})`:""}`, "#00ff88");
  } else if (!isWin && !roundState.hotPotato) {
    score=Math.max(0,score-1); loseStreak++; winStreak=0; _stats_losses++;
    if (roundState.doubleOrNothing) {
      const shieldBuff = activeBuffs.find(b=>b.id==="shield");
      if (shieldBuff && shieldBuff.stateData.shieldCharges>0) {
        shieldBuff.stateData.shieldCharges--;
        if (shieldBuff.stateData.shieldCharges<=0) activeBuffs=activeBuffs.filter(b=>b.id!=="shield");
        showMessage("🛡️ Shield absorbed DOUBLE OR NOTHING!","#4488ff"); renderBuffs();
      } else { const lost=coins; coins=0; showMessage(`✗ DOUBLE OR NOTHING — Lost everything! −${lost}`,"#ff2222"); }
    } else if (bet>0) {
      const shieldBuff = activeBuffs.find(b=>b.id==="shield");
      if (shieldBuff && shieldBuff.stateData.shieldCharges>0) {
        shieldBuff.stateData.shieldCharges--;
        if (shieldBuff.stateData.shieldCharges<=0) activeBuffs=activeBuffs.filter(b=>b.id!=="shield");
        showMessage("🛡️ Shield absorbed the loss!","#4488ff"); renderBuffs();
      } else { coins=Math.max(0,coins-bet); showMessage(`✗ Wrong! −${bet}`,"#ff4444"); }
    } else { showMessage("✗ Wrong!","#ff4444"); }
  }

  totalRounds++;
  bet=0;
  updateHUD();
  // Salvataggio immediato a fine round — non aspetta il debounce
  if (typeof saveNow === "function") saveNow();
  tickBuffs();
  tickVisualFx();
  tickDebuffs();

  setTimeout(()=>{
    currentValue=revealed;
    document.getElementById("btnHigher").innerHTML="▲<br>HIGHER";
    document.getElementById("btnLower").innerHTML ="▼<br>LOWER";

    if (roundState.blindRounds>0) {
      roundState.blindRounds--;
      elCurrentImg.src=backImgPath(); elCurrentLabel.textContent="???";
    } else {
      elCurrentImg.src=cardImgPath(currentValue);
      elCurrentLabel.textContent=CARD_NAMES[currentValue]||"";
    }
    animateEl(elCurrentImg);

    const prevBlind=roundState.blindRounds;
    roundState={
      mirrorRound:false, doubleOrNothing:false, blindRounds:prevBlind,
      betMultiplier:2, ghostCard:false, freezeBet:false, forcedBet:false,
      swapButtons:false, reversePayout:false, bleedInterval:null,
      activeVisualFx:null, blindBet:false, winTax:0, hotPotato:false, darioShield:false,
    };
    setBetControlsEnabled(true);

    nextValue=pickNextCardHard(currentValue);
    elNextImg.src=backImgPath();
    elNextLabel.textContent="?";

    tryLSDEvent();
    isAnimating=false;
  },900);
}

// ============================================================
// ANIMATIONS & MESSAGES
// ============================================================
function animateEl(el) { el.classList.remove("animate"); void el.offsetWidth; el.classList.add("animate"); }
let msgTimer=null;
function showMessage(text, color="white") {
  elResult.textContent=text; elResult.style.color=color;
  elResult.classList.remove("hidden");
  if(msgTimer) clearTimeout(msgTimer);
  msgTimer=setTimeout(()=>elResult.classList.add("hidden"),2800);
}

// ============================================================
// CHIPS
// ============================================================
function generateChips(count) {
  chipBox.innerHTML="";
  const bw=chipBox.offsetWidth||100, bh=chipBox.offsetHeight||80;
  const cs=Math.min(bw*0.13,52);
  const display=Math.min(count,40);
  for(let i=0;i<display;i++){
    const chip=document.createElement("div");
    chip.classList.add("chip");
    const t=Math.floor(Math.random()*6)+1;
    chip.style.backgroundImage=`url("data_cg/fish/CasinoChip${t}.png")`;
    chip.style.cssText+=`;width:${cs}px;height:${cs}px;left:${Math.random()*Math.max(0,bw-cs-4)}px;top:${Math.random()*Math.max(0,bh-cs-4)}px;transform:rotate(${Math.floor(Math.random()*360)}deg)`;
    chipBox.appendChild(chip);
  }
  if(count>40){
    const lbl=document.createElement("div");
    lbl.style.cssText="position:absolute;bottom:2px;right:4px;color:gold;font-size:11px;font-weight:bold;font-family:'Cinzel',serif;";
    lbl.textContent="×"+count; chipBox.appendChild(lbl);
  }
}
window.addEventListener("resize",()=>generateChips(bet));

// ============================================================
// BUTTONS
// ============================================================
document.getElementById("btnHigher").addEventListener("click",()=>resolveRound(true));
document.getElementById("btnLower").addEventListener("click", ()=>resolveRound(false));

// ============================================================
// FULLSCREEN
// ============================================================
function tryFullscreen() {
  const el=document.documentElement;
  if(el.requestFullscreen)            el.requestFullscreen().catch(()=>{});
  else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}
document.body.addEventListener("click",()=>tryFullscreen(),{once:true});

// ============================================================
// INIT
// ============================================================
function init() {
  applyBackground();
  currentValue=pickRandom();
  nextValue=pickNextCardHard(currentValue);
  elCurrentImg.src=cardImgPath(currentValue);
  elCurrentLabel.textContent=CARD_NAMES[currentValue]||"";
  elNextImg.src=backImgPath();
  elNextLabel.textContent="?";
  updateHUD();
  showRulesIfFirst();
  setTimeout(tryLSDEvent, 4000);
}
document.addEventListener("DOMContentLoaded", async () => {
  // FIX: aspetta il caricamento dal server PRIMA di qualsiasi altra cosa.
  // initStorage() imposta _serverReady=true solo quando i dati reali arrivano.
  // Fino ad allora, _push() è bloccato e non può sovrascrivere il DB.
  await initStorage();

  // Ora i dati sono affidabili (dal server o da localStorage come fallback)
  const data    = loadData();
  coins         = data.coins;
  score         = data.score;
  bet           = 0;  // il bet non si porta tra sessioni
  currentDeck       = data.deck;
  currentBack       = data.backDeck;
  currentBackground = data.background;

  // Ripristina contatori locali dalle stats salvate
  _stats_wins   = data.stats?.wins         || 0;
  _stats_losses = data.stats?.losses       || 0;
  totalRounds   = data.stats?.totalRounds  || 0;
  winStreak     = data.stats?.winStreak    || 0;

  // Solo ora avvia il gioco — updateHUD() dentro init() chiamerà saveData()
  // che a sua volta chiamerà _push(), che ora è abilitato correttamente
  init();
});
