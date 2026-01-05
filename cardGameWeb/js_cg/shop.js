// js/shop.js

document.addEventListener("DOMContentLoaded", () => {
  updateStatsUI();
  setupBuyButtons();
  setupEquipButtons();
  setupConvert();
  updateEquipUI();
});

// BUY
function setupBuyButtons() {
  document.querySelectorAll(".buy").forEach(btn => {
    const type = btn.dataset.type;
    const id = Number(btn.dataset.id);
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

      // aggiorno coins
      data.coins -= price;

      // aggiorno owned nello stesso oggetto
      if (type === "deck" && !data.ownedDecks.includes(id)) data.ownedDecks.push(id);
      if (type === "back" && !data.ownedBacks.includes(id)) data.ownedBacks.push(id);
      if (type === "background" && !data.ownedBackgrounds.includes(id)) data.ownedBackgrounds.push(id);

      // salvo tutto insieme
      saveData(data);

      btn.style.display = "none";
      updateStatsUI();
      updateEquipUI();
    });
  });
}

// EQUIP
function setupEquipButtons() {
  document.querySelectorAll(".equip").forEach(btn => {
    const type = btn.dataset.type;
    const id = Number(btn.dataset.id);

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

// CONVERT
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

// OWNED
function isOwned(type, id) {
  const data = loadData();
  if (type === "deck") return data.ownedDecks.includes(id);
  if (type === "back") return data.ownedBacks.includes(id);
  if (type === "background") return data.ownedBackgrounds.includes(id);
}

function equip(type, id) {
  const data = loadData();

  if (type === "deck") data.deck = id;
  if (type === "back") data.backDeck = id;
  if (type === "background") data.background = id;

  saveData(data);
}

// UI
function updateStatsUI() {
  const data = loadData();
  document.getElementById("shopScore").textContent = "Score: " + data.score;
  document.getElementById("shopCoins").textContent = "Coins: " + data.coins;
}

function updateEquipUI() {
  const data = loadData();

  document.querySelectorAll(".equip").forEach(btn => {
    const type = btn.dataset.type;
    const id = Number(btn.dataset.id);

    let equipped = false;
    if (type === "deck") equipped = (data.deck === id);
    if (type === "back") equipped = (data.backDeck === id);
    if (type === "background") equipped = (data.background === id);

    if (equipped) {
      btn.textContent = "EQUIPPED";
      btn.style.background = "#03a9f4";
      btn.style.color = "#fff";
    } else {
      btn.textContent = "EQUIP";
      btn.style.background = "";
      btn.style.color = "";
    }
  });
}

