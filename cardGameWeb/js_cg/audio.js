// js/audio.js

let audio = new Audio("data_cg/song.mp3");
audio.loop = true;

function applyAudioSettings() {
  const data = loadData();

  audio.volume = data.audioVolume;
  audio.muted = data.audioMuted;

  // Riprende dal punto salvato
  audio.currentTime = data.audioTime || 0;

  if (!data.audioMuted) {
    audio.play().catch(() => {});
  }
}

// Salva continuamente il tempo della musica
setInterval(() => {
  const data = loadData();
  data.audioTime = audio.currentTime;
  saveData(data);
}, 500); // ogni mezzo secondo

document.addEventListener("DOMContentLoaded", () => {
  applyAudioSettings();
});
