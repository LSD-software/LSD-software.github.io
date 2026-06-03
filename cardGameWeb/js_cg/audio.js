// ============================================================
// audio.js — shuffle playlist + persistenza volume/mute tra pagine
// ============================================================

const PLAYLIST = [
  "data_cg/song.mp3",
  "data_cg/song2.mp3",
  "data_cg/song3.mp3",
  "data_cg/song4.mp3",
  "data_cg/song5.mp3",
  "data_cg/song6.mp3",
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let _shuffledPlaylist = shuffleArray(PLAYLIST);
let _trackIndex = 0;

(function() {
  try {
    const saved = localStorage.getItem("lsd_track_index");
    if (saved !== null) _trackIndex = parseInt(saved) % _shuffledPlaylist.length;
  } catch(e) {}
})();

let audio = new Audio();
audio.preload = "auto";

function _loadTrack(idx) {
  audio.src = _shuffledPlaylist[idx % _shuffledPlaylist.length];
  audio.load();
}

_loadTrack(_trackIndex);

audio.addEventListener("ended", () => {
  _trackIndex = (_trackIndex + 1) % _shuffledPlaylist.length;
  try { localStorage.setItem("lsd_track_index", _trackIndex); } catch(e) {}
  _loadTrack(_trackIndex);
  if (!audio.muted) audio.play().catch(() => {});
});

audio.addEventListener("error", () => {
  console.warn("Audio error, skipping:", _shuffledPlaylist[_trackIndex]);
  _trackIndex = (_trackIndex + 1) % _shuffledPlaylist.length;
  try { localStorage.setItem("lsd_track_index", _trackIndex); } catch(e) {}
  _loadTrack(_trackIndex);
  if (!audio.muted) audio.play().catch(() => {});
});

function applyAudioSettings() {
  const data = loadData();
  audio.volume = data.audioVolume ?? 0.5;
  audio.muted  = data.audioMuted  ?? false;
  if (!audio.muted) tryPlay();
}

function tryPlay() {
  audio.play().catch(() => {
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

setInterval(()=>{
  try {
    const data = loadData();
    data.audioVolume = audio.volume;
    data.audioMuted  = audio.muted;
    saveData(data);
  } catch(e) {}
}, 500);

document.addEventListener("visibilitychange", ()=>{
  if (!document.hidden) {
    const data = loadData();
    if (!data.audioMuted) tryPlay();
  }
});

document.addEventListener("DOMContentLoaded", applyAudioSettings);
