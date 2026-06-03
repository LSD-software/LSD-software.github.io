// ============================================================
// audio.js — shuffle playlist + persistenza volume/mute tra pagine
// Usa localStorage diretto per volume/mute — indipendente da storage.js
// ============================================================

const PLAYLIST = [
  "data_cg/song.mp3",
  "data_cg/song2.mp3",
  "data_cg/song3.mp3",
  "data_cg/song4.mp3",
  "data_cg/song5.mp3",
  "data_cg/song6.mp3",
];

const AUDIO_VOL_KEY   = "lsd_audio_volume";
const AUDIO_MUTE_KEY  = "lsd_audio_muted";
const AUDIO_TRACK_KEY = "lsd_track_index";

function _getVolume()  { try { const v = localStorage.getItem(AUDIO_VOL_KEY);  return v !== null ? parseFloat(v) : 0.5; } catch(e) { return 0.5; } }
function _getMuted()   { try { const m = localStorage.getItem(AUDIO_MUTE_KEY); return m === "true"; } catch(e) { return false; } }
function _saveVolume(v){ try { localStorage.setItem(AUDIO_VOL_KEY,  String(v)); } catch(e) {} }
function _saveMuted(m) { try { localStorage.setItem(AUDIO_MUTE_KEY, String(m)); } catch(e) {} }

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
try {
  const saved = localStorage.getItem(AUDIO_TRACK_KEY);
  if (saved !== null) _trackIndex = parseInt(saved) % _shuffledPlaylist.length;
} catch(e) {}

let audio = new Audio();
audio.preload = "auto";

function _loadTrack(idx) {
  audio.src = _shuffledPlaylist[idx % _shuffledPlaylist.length];
  audio.load();
}

_loadTrack(_trackIndex);

audio.addEventListener("ended", () => {
  _trackIndex = (_trackIndex + 1) % _shuffledPlaylist.length;
  try { localStorage.setItem(AUDIO_TRACK_KEY, _trackIndex); } catch(e) {}
  _loadTrack(_trackIndex);
  if (!audio.muted) audio.play().catch(() => {});
});

audio.addEventListener("error", () => {
  console.warn("Audio error, skipping:", _shuffledPlaylist[_trackIndex]);
  _trackIndex = (_trackIndex + 1) % _shuffledPlaylist.length;
  try { localStorage.setItem(AUDIO_TRACK_KEY, _trackIndex); } catch(e) {}
  _loadTrack(_trackIndex);
  if (!audio.muted) audio.play().catch(() => {});
});

function applyAudioSettings() {
  audio.volume = _getVolume();
  audio.muted  = _getMuted();
  if (!audio.muted) tryPlay();
}

function tryPlay() {
  audio.play().catch(() => {
    const unlock = () => {
      audio.play().catch(() => {});
      document.removeEventListener("click",    unlock);
      document.removeEventListener("touchend", unlock);
      document.removeEventListener("keydown",  unlock);
    };
    document.addEventListener("click",    unlock, { once: true });
    document.addEventListener("touchend", unlock, { once: true });
    document.addEventListener("keydown",  unlock, { once: true });
  });
}

// Salva volume e mute ogni 500ms
setInterval(() => {
  _saveVolume(audio.volume);
  _saveMuted(audio.muted);
}, 500);

// Riprendi se la tab torna in foreground
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !audio.muted) tryPlay();
});

document.addEventListener("DOMContentLoaded", applyAudioSettings);
