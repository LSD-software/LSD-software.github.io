// js/storage.js

const STORAGE_KEY = "LSD_GAME_DATA";

const defaultData = {
  coins: 0,
  score: 0,
  bet: 0,

  deck: 1,
  backDeck: 1,
  background: 1,

  ownedDecks: [1],
  ownedBacks: [1],
  ownedBackgrounds: [1],

  audioVolume: 0.5,   // volume iniziale 50%
  audioMuted: false,  // musica attiva
  audioTime: 0,
};

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : structuredClone(defaultData);
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function updateData(key, value) {
  const data = loadData();
  data[key] = value;
  saveData(data);
}

function updateMany(obj) {
  const data = loadData();

  for (let key in obj) {
    // NON sovrascrivere gli owned
    if (key === "ownedDecks" || key === "ownedBacks" || key === "ownedBackgrounds") continue;
    data[key] = obj[key];
  }

  saveData(data);
}
