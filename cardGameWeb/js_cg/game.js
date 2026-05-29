// ============================================================
// LSD CARD GAME — game.js  v4.0
// ============================================================

// --- STATE ---
let data = loadData();
let coins      = data.coins;
let score      = data.score;
let bet        = data.bet;
let currentDeck       = data.deck;
let currentBack       = data.backDeck;
let currentBackground = data.background;

const CARD_NAMES = ["","Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten"];

function cardImgPath(v)  { return `data_cg/deck_base/${(currentDeck-1)*10+v}.png`; }
function backImgPath()   { return `data_cg/backDeck/back${currentBack}.png`; }

function applyBackground() {
  const bgs = ["SfondoTavolata.png","SfondoTavolata1.png","SfondoTavolata2.png","SfondoTavolata3.png"];
  const url = `url("data_cg/${bgs[Math.max(1,Math.min(currentBackground,bgs.length))-1]}")`;
  // Background sul wrapper 16:9, non sul body
  const wrapper = document.getElementById("gameWrapper");
  if (wrapper) {
    wrapper.style.backgroundImage = url;
    wrapper.style.backgroundSize = "100% 100%";
  }
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

let roundState = {
  mirrorRound:false, doubleOrNothing:false, blindRounds:0,
  betMultiplier:2, ghostCard:false, freezeBet:false,
  forcedBet:false, swapButtons:false, reversePayout:false,
  bleedInterval:null, activeVisualFx:null,
};

// --- ACTIVE BUFFS (accumulabili, durano N round) ---
let activeBuffs = [];  // [{id, icon, label, desc, roundsLeft, onRound, onWin}]

// ============================================================
// BUFFS POOL — 4 tipi, rari (prob bassa), accumulabili
// ============================================================
const BUFF_DEFS = [
  {
    id:"shield",
    icon:"🛡️",
    label:"COIN SHIELD",
    desc:"Your coins are protected from the next 2 loss deductions.",
    color:"#0044aa",
    rounds:8,
    prob:0.04,
    state:{ shieldCharges:2 },
    // usato in resolveRound: blocca deduzione coins
  },
  {
    id:"oracle",
    icon:"🔮",
    label:"ORACLE SIGHT",
    desc:"The hidden card glows faintly — you get a subtle hint about its direction.",
    color:"#6600aa",
    rounds:5,
    prob:0.035,
    // Mostra un indizio visivo sulla carta coperta ogni round
    onRound: () => {
      // freccia sottile sopra la carta coperta (hint)
      showOracleHint();
    }
  },
  {
    id:"double_win",
    icon:"✨",
    label:"LUCKY STREAK",
    desc:"For the next 6 rounds, winning pays ×3 instead of ×2.",
    color:"#886600",
    rounds:6,
    prob:0.03,
    // applicato in resolveRound come betMultiplier override
  },
  {
    id:"heal",
    icon:"💚",
    label:"SCORE REGEN",
    desc:"You recover +1 score per round for the next 7 rounds, win or lose.",
    color:"#006622",
    rounds:7,
    prob:0.035,
    onRound: () => {
      score = Math.max(0, score + 1);
      updateHUD();
    }
  },
];

function trySpawnBuff() {
  const baseMod = Math.min(totalRounds * 0.002, 0.06);
  for (const def of BUFF_DEFS) {
    if (Math.random() < def.prob + baseMod) {
      // Non aggiungere duplicati dello stesso tipo
      if (activeBuffs.find(b => b.id === def.id)) return;
      const buff = {
        ...def,
        roundsLeft: def.rounds,
        stateData: def.state ? JSON.parse(JSON.stringify(def.state)) : {},
      };
      activeBuffs.push(buff);
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
  // rimuovi scaduti
  activeBuffs = activeBuffs.filter(b => b.roundsLeft > 0);
  renderBuffs();
}

function renderBuffs() {
  buffsList.innerHTML = "";
  activeBuffs.forEach(b => {
    const el = document.createElement("div");
    el.className = "buff-item";
    el.innerHTML = `${b.icon}<span class="buff-rounds">${b.roundsLeft}</span>`;
    el.title = b.label;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      showInfoModal(b.icon, b.label, b.desc, `${b.roundsLeft} round${b.roundsLeft!==1?"s":""} remaining`, b.color);
    });
    buffsList.appendChild(el);
  });
}

function hasActiveBuff(id) { return !!activeBuffs.find(b => b.id === id); }

// Oracle hint
function showOracleHint() {
  if (!nextValue || !currentValue) return;
  const hint = nextValue > currentValue ? "▲" : nextValue < currentValue ? "▼" : "≈";
  const hintEl = document.createElement("div");
  hintEl.style.cssText = `position:absolute;top:-28px;left:50%;transform:translateX(-50%);
    font-size:clamp(16px,3vw,26px);color:rgba(180,0,255,0.6);font-weight:900;
    animation:iconFloat 1s ease-in-out infinite alternate;pointer-events:none;z-index:25;`;
  hintEl.textContent = hint;
  const cardBox = document.querySelector(".card-box.right");
  cardBox.appendChild(hintEl);
  setTimeout(() => hintEl.remove(), 3500);
}

// ============================================================
// LSD EVENTS — debuff (comuni) + nuovi infami + visivi
// ============================================================
const LSD_EVENTS = [
  // --- DEBUFF CLASSICI ---
  { id:"mirror",       icon:"🪞", label:"MIRROR WORLD",     desc:"Results INVERTED this round. Higher means lower!",                        color:"#8800ff", prob:0.08, type:"debuff",
    apply:(s)=>{ s.mirrorRound=true; } },
  { id:"acid_tax",     icon:"💸", label:"ACID TAX",         desc:"The Dealer takes 30% of your coins. Right now.",                          color:"#cc0000", prob:0.07, type:"debuff", needsCoins:true,
    apply:()=>{ coins=Math.max(0,coins-Math.floor(coins*0.30)); updateHUD(); } },
  { id:"double_nothing",icon:"⚡",label:"DOUBLE OR NOTHING", desc:"WIN → ×3 coins. LOSE → you lose EVERYTHING.",                            color:"#ff6600", prob:0.06, type:"debuff",
    apply:(s)=>{ s.doubleOrNothing=true; } },
  { id:"trip_blind",   icon:"🕶️",label:"TRIP BLIND",        desc:"Your current card is hidden for 3 rounds.",                              color:"#004488", prob:0.09, type:"debuff",
    apply:(s)=>{ s.blindRounds=3; } },
  { id:"deck_shuffle", icon:"🌀", label:"DECK SHUFFLE",      desc:"The deck reshuffles. Your current card changed.",                         color:"#006644", prob:0.10, type:"debuff",
    apply:(s)=>{ currentValue=pickRandom(); nextValue=pickNextCardHard(currentValue);
                 elCurrentImg.src=s.blindRounds>0?backImgPath():cardImgPath(currentValue);
                 elCurrentLabel.textContent=s.blindRounds>0?"???":(CARD_NAMES[currentValue]||""); } },
  { id:"jackpot",      icon:"🎰", label:"JACKPOT CHANCE",    desc:"Win this round → bet pays ×4. But odds are against you.",                color:"#886600", prob:0.07, type:"debuff",
    apply:(s)=>{ s.betMultiplier=4; } },
  { id:"coin_bomb",    icon:"💣", label:"COIN BOMB",         desc:"BOOM. Half your coins vanish. Instantly.",                                color:"#880000", prob:0.06, type:"debuff", needsCoins:true,
    apply:()=>{ coins=Math.max(0,Math.floor(coins/2)); updateHUD(); } },
  { id:"ghost_card",   icon:"👻", label:"GHOST CARD",        desc:"Next card mirrors current. You cannot win.",                             color:"#334455", prob:0.07, type:"debuff",
    apply:(s)=>{ s.ghostCard=true; } },
  { id:"mind_melt",    icon:"🧠", label:"MIND MELT",         desc:"3 score points dissolve. Just like that.",                               color:"#550055", prob:0.06, type:"debuff", needsScore:true,
    apply:()=>{ score=Math.max(0,score-3); updateHUD(); } },
  { id:"freeze",       icon:"🧊", label:"BET FREEZE",        desc:"Bet controls locked this round.",                                        color:"#003366", prob:0.07, type:"debuff",
    apply:(s)=>{ s.freezeBet=true; setBetControlsEnabled(false); } },
  { id:"swap_buttons", icon:"🔀", label:"CONTROLS SWAPPED",  desc:"HIGHER and LOWER buttons are swapped.",                                  color:"#993300", prob:0.08, type:"debuff",
    apply:(s)=>{ s.swapButtons=true; document.getElementById("btnHigher").innerHTML="▼<br>LOWER"; document.getElementById("btnLower").innerHTML="▲<br>HIGHER"; } },
  { id:"forced_allin", icon:"🎭", label:"ALL IN FORCED",     desc:"Your entire wallet is the bet. No choice.",                              color:"#660000", prob:0.05, type:"debuff", needsCoins:true,
    apply:(s)=>{ bet=coins; s.forcedBet=true; s.freezeBet=true; setBetControlsEnabled(false); updateHUD(); } },
  { id:"score_steal",  icon:"🦹", label:"SCORE BANDIT",      desc:"The Dealer steals HALF your score.",                                     color:"#440066", prob:0.05, type:"debuff", needsScore:true,
    apply:()=>{ score=Math.max(0,Math.floor(score/2)); updateHUD(); } },
  { id:"reverse_pay",  icon:"🔄", label:"REVERSE PAYOUT",    desc:"Win this round and you still lose your bet.",                            color:"#004400", prob:0.05, type:"debuff",
    apply:(s)=>{ s.reversePayout=true; } },
  { id:"bleed",        icon:"🩸", label:"COIN BLEED",        desc:"You lose 5 coins/second until this round ends. Hurry.",                  color:"#550000", prob:0.05, type:"debuff", needsCoins:true,
    apply:(s)=>{ s.bleedInterval=setInterval(()=>{ coins=Math.max(0,coins-5); updateHUD(); },1000); } },

  // --- NUOVI DEBUFF INFAMI ---
  { id:"bet_floor",    icon:"📉", label:"MINIMUM BET",       desc:"You must bet at least 10 coins this round.",                             color:"#660033", prob:0.06, type:"debuff", needsCoins:true,
    apply:(s)=>{ if(bet<10){ bet=Math.min(10,coins); } s.freezeBet=true; setBetControlsEnabled(false); updateHUD(); } },
  { id:"flip_score",   icon:"🔃", label:"SCORE FLIP",        desc:"Your score is reset to zero. Start over.",                               color:"#440000", prob:0.03, type:"debuff", needsScore:true,
    apply:()=>{ score=0; updateHUD(); } },
  { id:"joker",        icon:"🃏", label:"WILD JOKER",        desc:"ALL your active buffs are wiped. The house always wins.",                color:"#222200", prob:0.04, type:"debuff",
    apply:()=>{ activeBuffs=[]; renderBuffs(); } },
  { id:"drunk",        icon:"🍺", label:"DRUNK DEALER",      desc:"Buttons move randomly for 6 seconds. Can you still click?",             color:"#663300", prob:0.06, type:"debuff",
    apply:()=>{ drunkButtons(6000); } },
  { id:"blind_bet",    icon:"🙈", label:"BLIND BET",         desc:"Your bet display is hidden. You don't know how much you're wagering.",   color:"#2a0044", prob:0.06, type:"debuff",
    apply:(s)=>{ s.blindBet=true; elBet.textContent="???"; } },
  { id:"coin_tax_win", icon:"💰", label:"WIN TAX",           desc:"If you win, the house takes 50% of your winnings.",                      color:"#aa4400", prob:0.05, type:"debuff",
    apply:(s)=>{ s.winTax=0.5; } },

  // --- EFFETTI VISIVI (attivi fino al prossimo click) ---
  { id:"redvision",    icon:"🔴", label:"RED EYES",          desc:"Your vision burns red until you play the next card.",                    color:"#660000", prob:0.09, type:"visual",
    apply:(s)=>{ activatePersistentFx("fx-redvision",s); } },
  { id:"blur_vision",  icon:"😵", label:"BLURRED VISION",    desc:"Everything blurs until you guess.",                                      color:"#220044", prob:0.09, type:"visual",
    apply:(s)=>{ activatePersistentFx("fx-blur",s); } },
  { id:"negative",     icon:"☯️", label:"NEGATIVE REALITY",  desc:"Colors invert until your next guess.",                                   color:"#111111", prob:0.06, type:"visual",
    apply:(s)=>{ activatePersistentFx("fx-negative",s); } },
  { id:"dark_room",    icon:"🌑", label:"LIGHTS OUT",        desc:"Almost total darkness until you play.",                                  color:"#000011", prob:0.06, type:"visual",
    apply:(s)=>{ activatePersistentFx("fx-dark",s); } },
  { id:"rainbow",      icon:"🌈", label:"RAINBOW TRIP",      desc:"Acid rainbow until your next guess. Fun? Maybe.",                        color:"#330033", prob:0.07, type:"visual",
    apply:(s)=>{ activatePersistentFx("fx-rainbow",s); } },
  { id:"dizzy",        icon:"💫", label:"DIZZY SPELL",       desc:"The room spins once.",                                                   color:"#004466", prob:0.08, type:"visual",
    apply:(s)=>{ activatePersistentFx("fx-dizzy-loop",s); } },
  { id:"shake",        icon:"💥", label:"TABLE QUAKE",       desc:"The table shakes violently.",                                            color:"#663300", prob:0.08, type:"visual",
    apply:(s)=>{ activatePersistentFx("fx-shake-loop",s); } },
  { id:"glitch",       icon:"👾", label:"MATRIX GLITCH",     desc:"Reality glitches for a moment.",                                        color:"#003300", prob:0.07, type:"visual",
    apply:(s)=>{ activatePersistentFx("fx-glitch-loop",s); } },
  { id:"zoom_loop",    icon:"🔭", label:"ZOOM LOOP",         desc:"The screen breathes in and out until you play.",                        color:"#001133", prob:0.06, type:"visual",
    apply:(s)=>{ activatePersistentFx("fx-zoom",s); } },
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
  if (s.activeVisualFx) {
    getWrapper().classList.remove(s.activeVisualFx);
    s.activeVisualFx = null;
  }
}
function applyTempFx(cls, ms) {
  const el = getWrapper();
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

// ============================================================
// DRUNK BUTTONS
// ============================================================
function drunkButtons(duration) {
  const btns = [
    document.getElementById("btnHigher"),
    document.getElementById("btnLower"),
    document.getElementById("btnAllIn"),
  ];
  const interval = setInterval(() => {
    btns.forEach(b => {
      const dx = (Math.random()-0.5)*60;
      const dy = (Math.random()-0.5)*40;
      b.style.transform = `translate(${dx}px,${dy}px) rotate(${(Math.random()-0.5)*20}deg)`;
    });
  }, 300);
  setTimeout(() => {
    clearInterval(interval);
    btns.forEach(b => b.style.transform = "");
  }, duration);
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
    if      (current<=3) { w += i<current?(current-i)*2.0*difficulty:(i-current)*0.15; w+=Math.random()*1.0; }
    else if (current>=8) { w += i>current?(i-current)*2.0*difficulty:(current-i)*0.15; w+=Math.random()*1.0; }
    else if (current===5||current===6) { w+=Math.random()*7; }
    else { w += Math.abs(current-i)<2?2.8*difficulty:0.6; w+=Math.random()*1.5; }
    if (winStreak>=3 && Math.abs(current-i)===1) w+=4;
    if (loseStreak>=4) { if(current<=5?(i>current):(i<current)) w+=1.5; }
    for (let k=0;k<Math.max(1,Math.floor(w));k++) pool.push(i);
  }
  return pool[Math.floor(Math.random()*pool.length)];
}

// ============================================================
// EVENT SYSTEM
// ============================================================
let activeEventDef = null;  // per il badge click

function tryLSDEvent() {
  const baseMod = Math.min(totalRounds*0.006, 0.18);
  const shuffled = [...LSD_EVENTS].sort(()=>Math.random()-0.5);
  for (const ev of shuffled) {
    // Filtri condizionali
    if (ev.needsCoins && coins<=0) continue;
    if (ev.needsScore && score<=0) continue;
    if (Math.random() < ev.prob+baseMod) {
      showLSDModal(ev, () => {
        ev.apply(roundState);
        activeEventDef = ev;
        showEventBadge(ev);
      });
      return;
    }
  }
  // prova a spawnare un buff
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
  applyTempFx("fx-shake",400);

  let cd = 3;
  timerEl.textContent = `Tap anywhere or wait ${cd}s…`;
  if (modalCountdown) clearInterval(modalCountdown);
  modalCountdown = setInterval(()=>{
    cd--;
    if (cd<=0) { closeModal(); }
    else timerEl.textContent = `Tap anywhere or wait ${cd}s…`;
  },1000);

  function closeModal() {
    clearInterval(modalCountdown);
    modal.classList.remove("active");
    if (onClose) onClose();
    // rimuovi listener tap
    modal.removeEventListener("click", onTap);
  }
  function onTap(e) { closeModal(); }
  modal.addEventListener("click", onTap, {once:true});
}

// --- EVENT BADGE ---
function showEventBadge(ev) {
  if (!eventBadge) return;
  eventBadge.textContent = `${ev.icon} ${ev.label}`;
  eventBadge.classList.remove("hidden");
}
function hideEventBadge() {
  if (eventBadge) eventBadge.classList.add("hidden");
  activeEventDef = null;
}

// Badge click → info modal
eventBadge.addEventListener("click", (e)=>{
  e.stopPropagation();
  if (!activeEventDef) return;
  showInfoModal(activeEventDef.icon, activeEventDef.label, activeEventDef.desc, "Active this round", activeEventDef.color);
});

// ============================================================
// INFO MODAL (badge click / buff click)
// ============================================================
function showInfoModal(icon, title, desc, sub, borderColor) {
  const modal = document.getElementById("infoModal");
  document.getElementById("infoModalIcon").textContent  = icon;
  document.getElementById("infoModalTitle").textContent = title;
  document.getElementById("infoModalDesc").textContent  = desc;
  document.getElementById("infoModalRounds").textContent = sub||"";
  document.getElementById("infoModalBox").style.borderColor = borderColor||"#00ff88";
  modal.classList.add("active");

  function close(){ modal.classList.remove("active"); }
  document.getElementById("infoModalClose").onclick = (e)=>{ e.stopPropagation(); close(); };
  // click fuori dalla box chiude
  modal.onclick = (e)=>{ if(e.target===modal) close(); };
}

// ============================================================
// RULES MODAL (prima volta)
// ============================================================
function showRulesIfFirst() {
  const seen = localStorage.getItem("LSD_RULES_SEEN");
  if (seen) return;
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
document.getElementById("btnMinus").addEventListener("click",()=>{ if(roundState.freezeBet)return; bet=Math.max(0,bet-1); updateHUD(); });
document.getElementById("btnPlus").addEventListener("click",()=>{ if(roundState.freezeBet)return; bet=Math.min(coins,bet+1); updateHUD(); });
document.getElementById("btnMinus10").addEventListener("click",()=>{ if(roundState.freezeBet)return; bet=Math.max(0,bet-10); updateHUD(); });
document.getElementById("btnPlus10").addEventListener("click",()=>{ if(roundState.freezeBet)return; bet=Math.min(coins,bet+10); updateHUD(); });
document.getElementById("btnAllIn").addEventListener("click",()=>{ if(roundState.freezeBet)return; bet=coins; updateHUD(); });

// ============================================================
// HUD
// ============================================================
function updateHUD() {
  elCoins.textContent = coins;
  elScore.textContent = score;
  // blind bet: nasconde il valore
  if (!roundState.blindBet) elBet.textContent = bet;
  const d=loadData();
  d.coins=coins; d.score=score; d.bet=bet;
  d.deck=currentDeck; d.backDeck=currentBack; d.background=currentBackground;
  saveData(d);
  generateChips(bet);
}

// ============================================================
// ROUND
// ============================================================
function resolveRound(wantHigher) {
  if (isAnimating) return;
  isAnimating = true;

  // Ferma bleed
  if (roundState.bleedInterval) clearInterval(roundState.bleedInterval);

  // Rimuovi effetti visivi persistenti
  clearPersistentFx(roundState);

  const effectiveHigher = roundState.swapButtons ? !wantHigher : wantHigher;
  const revealed = roundState.ghostCard ? currentValue : nextValue;

  elNextImg.src = cardImgPath(revealed);
  elNextLabel.textContent = CARD_NAMES[revealed]||"";
  animateEl(elNextImg);
  hideEventBadge();

  let isWin = effectiveHigher?(revealed>currentValue):(revealed<currentValue);
  if (roundState.mirrorRound) isWin=!isWin;
  if (roundState.ghostCard && revealed===currentValue) isWin=false;
  if (roundState.reversePayout) isWin=!isWin;

  // Reveal blind bet
  roundState.blindBet = false;

  // LUCKY STREAK buff override
  if (isWin && hasActiveBuff("double_win") && roundState.betMultiplier<3) {
    roundState.betMultiplier = 3;
  }

  if (isWin) {
    score+=1; winStreak++; loseStreak=0;
    const mult = roundState.betMultiplier||2;
    let gain = bet>0 ? bet*mult : 0;
    // Win Tax debuff
    if (roundState.winTax && gain>0) gain = Math.floor(gain*(1-roundState.winTax));
    if (bet>0) coins += gain;
    showMessage(`✓ Correct! +${gain}${mult>2?` (×${mult})`:""}`, "#00ff88");
  } else {
    score=Math.max(0,score-1); loseStreak++; winStreak=0;
    // COIN SHIELD buff
    if (roundState.doubleOrNothing) {
      const shieldBuff = activeBuffs.find(b=>b.id==="shield");
      if (shieldBuff && shieldBuff.stateData.shieldCharges>0) {
        shieldBuff.stateData.shieldCharges--;
        if (shieldBuff.stateData.shieldCharges<=0) activeBuffs=activeBuffs.filter(b=>b.id!=="shield");
        showMessage("🛡️ Shield absorbed the hit!", "#4488ff");
        renderBuffs();
      } else {
        const lost=coins; coins=0;
        showMessage(`✗ DOUBLE OR NOTHING — Lost everything! −${lost}`,"#ff2222");
      }
    } else if (bet>0) {
      const shieldBuff = activeBuffs.find(b=>b.id==="shield");
      if (shieldBuff && shieldBuff.stateData.shieldCharges>0) {
        shieldBuff.stateData.shieldCharges--;
        if (shieldBuff.stateData.shieldCharges<=0) activeBuffs=activeBuffs.filter(b=>b.id!=="shield");
        showMessage("🛡️ Shield absorbed the loss!", "#4488ff");
        renderBuffs();
      } else {
        coins=Math.max(0,coins-bet);
        showMessage(`✗ Wrong! −${bet}`,"#ff4444");
      }
    } else {
      showMessage("✗ Wrong!","#ff4444");
    }
  }

  totalRounds++;
  bet=0;
  updateHUD();
  tickBuffs();

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
      activeVisualFx:null, blindBet:false, winTax:0,
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
function showMessage(text,color="white") {
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
// FULLSCREEN helper (mobile)
// ============================================================
function tryFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen)            el.requestFullscreen().catch(()=>{});
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  // iOS Safari non supporta fullscreen API — usiamo posizionamento fixed nel CSS
}
// Tenta fullscreen al primo tap utente (richiesto dai browser)
document.body.addEventListener("click", ()=>{ tryFullscreen(); }, {once:true});

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
  setTimeout(tryLSDEvent,4000);
}

document.addEventListener("DOMContentLoaded",init);
