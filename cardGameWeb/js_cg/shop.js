// js_cg/shop.js — LSD Card Game Shop (FIXED)
//
// BUG FIXES:
// 1. Aggiunto await initStorage() — senza questo lo shop caricava coins=10/score=0
// 2. Chiavi corrette: unlockedDecks/unlockedBacks/unlockedBgs (erano ownedDecks etc.)

document.addEventListener("DOMContentLoaded", async () => {
  // FIX: carica i dati reali dal server prima di mostrare lo shop
  if (typeof initStorage === "function") {
    await initStorage();
  }

  updateStatsUI();
  setupBuyButtons();
  setupEquipButtons();
  setupConvert();
  updateEquipUI();
});

function setupBuyButtons() {
  document.querySelectorAll(".buy").forEach(btn => {
    const type  = btn.dataset.type;
    const id    = Number(btn.dataset.id);
    const price = Number(btn.dataset.price);

    if (isOwned(type, id)) {
      btn.style.display = "none";
    }

    btn.addEventListener("click", () => {
      let data = loadData();

      if (data.coins < price) {
        alert("You don't have enough coins!");
        return;
      }

      data.coins -= price;

      // FIX: chiavi corrette (unlockedDecks, non ownedDecks)
      if (type === "deck"       && !data.unlockedDecks.includes(id)) data.unlockedDecks.push(id);
      if (type === "back"       && !data.unlockedBacks.includes(id)) data.unlockedBacks.push(id);
      if (type === "background" && !data.unlockedBgs.includes(id))   data.unlockedBgs.push(id);

      saveData(data);

      btn.style.display = "none";
      updateStatsUI();
      updateEquipUI();
    });
  });
}

function setupEquipButtons() {
  document.querySelectorAll(".equip").forEach(btn => {
    const type = btn.dataset.type;
    const id   = Number(btn.dataset.id);

    btn.addEventListener("click", () => {
      if (!isOwned(type, id)) {
        alert("You must buy it first!");
        return;
      }
      equip(type, id);
      updateEquipUI();
    });
  });
}

function setupConvert() {
  const btn = document.getElementById("converti");
  if (!btn) return;

  btn.addEventListener("click", () => {
    let data = loadData();
    const rate = 50;

    const coinsEarned = Math.floor(data.score / rate);
    if (coinsEarned <= 0) {
      alert("You don't have enough points.");
      return;
    }

    const scoreUsed = coinsEarned * rate;
    data.score -= scoreUsed;
    data.coins += coinsEarned;

    saveData(data);
    updateStatsUI();

    alert(`You have converted ${scoreUsed} points into ${coinsEarned} coins!`);
  });
}

// FIX: chiavi corrette
function isOwned(type, id) {
  const data = loadData();
  if (type === "deck")       return data.unlockedDecks.includes(id);
  if (type === "back")       return data.unlockedBacks.includes(id);
  if (type === "background") return data.unlockedBgs.includes(id);
  return false;
}

function equip(type, id) {
  const data = loadData();
  if (type === "deck")       data.deck       = id;
  if (type === "back")       data.backDeck   = id;
  if (type === "background") data.background = id;
  saveData(data);
}

function updateStatsUI() {
  const data = loadData();
  const el1 = document.getElementById("shopScore");
  const el2 = document.getElementById("shopCoins");
  if (el1) el1.textContent = "Score: " + data.score;
  if (el2) el2.textContent = "Coins: " + data.coins;
}

function updateEquipUI() {
  const data = loadData();

  document.querySelectorAll(".equip").forEach(btn => {
    const type = btn.dataset.type;
    const id   = Number(btn.dataset.id);

    let equipped = false;
    if (type === "deck")       equipped = (data.deck       === id);
    if (type === "back")       equipped = (data.backDeck   === id);
    if (type === "background") equipped = (data.background === id);

    if (equipped) {
      btn.textContent      = "EQUIPPED";
      btn.style.background = "#03a9f4";
      btn.style.color      = "#fff";
    } else {
      btn.textContent      = "EQUIP";
      btn.style.background = "";
      btn.style.color      = "";
    }
  });
}
