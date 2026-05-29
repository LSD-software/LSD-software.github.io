// ============================================================
// audio.js — forza musica su tutti i device + unlock autoplay
// ============================================================

let audio = new Audio("data_cg/song.mp3");
audio.loop = true;

function applyAudioSettings() {
  const data = loadData();
  audio.volume = data.audioVolume ?? 0.5;
  audio.muted  = data.audioMuted  ?? false;
  audio.currentTime = data.audioTime || 0;
  if (!audio.muted) tryPlay();
}

function tryPlay() {
  audio.play().catch(() => {
    // Autoplay bloccato: aspetta il primo gesto utente
    const unlock = () => {
      audio.play().catch(()=>{});
      document.removeEventListener("click",    unlock);
      document.removeEventListener("touchend", unlock);
      document.removeEventListener("keydown",  unlock);
    };
    document.addEventListener("click",    unlock, {once:true});
    document.addEventListener("touchend", unlock, {once:true});
    document.addEventListener("keydown",  unlock, {once:true});
  });
}

// Salva posizione ogni mezzo secondo
setInterval(()=>{
  const data = loadData();
  data.audioTime = audio.currentTime;
  saveData(data);
}, 500);

// Riprendi se la tab torna in foreground
document.addEventListener("visibilitychange", ()=>{
  if (!document.hidden) {
    const data = loadData();
    if (!data.audioMuted) tryPlay();
  }
});

document.addEventListener("DOMContentLoaded", applyAudioSettings);
