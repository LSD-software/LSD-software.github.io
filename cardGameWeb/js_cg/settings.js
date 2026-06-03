// js_cg/settings.js

const _AUDIO_VOL_KEY  = "lsd_audio_volume";
const _AUDIO_MUTE_KEY = "lsd_audio_muted";

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof initStorage === "function") {
    await initStorage();
  }

  const data = loadData();

  const bgFiles = [
    "SfondoTavolata.png",
    "SfondoTavolata1.png",
    "SfondoTavolata2.png",
    "SfondoTavolata3.png"
  ];
  const index = Math.max(1, Math.min(data.background, bgFiles.length)) - 1;
  document.body.style.backgroundImage = `url("data_cg/${bgFiles[index]}")`;

  // Leggi volume e mute direttamente da localStorage (stesso sistema di audio.js)
  const currentVolume = localStorage.getItem(_AUDIO_VOL_KEY) !== null
    ? parseFloat(localStorage.getItem(_AUDIO_VOL_KEY)) : 0.5;
  const currentMuted = localStorage.getItem(_AUDIO_MUTE_KEY) === "true";

  const slider = document.getElementById("volumeSlider");
  if (slider) {
    slider.value = currentVolume;
    slider.addEventListener("input", () => {
      const v = Number(slider.value);
      localStorage.setItem(_AUDIO_VOL_KEY, String(v));
      if (typeof audio !== "undefined") audio.volume = v;
    });
  }

  const muteBtn = document.getElementById("muteBtn");
  if (muteBtn) {
    muteBtn.textContent = currentMuted ? "Unmute" : "Mute";
    muteBtn.addEventListener("click", () => {
      const nowMuted = localStorage.getItem(_AUDIO_MUTE_KEY) === "true";
      const newMuted = !nowMuted;
      localStorage.setItem(_AUDIO_MUTE_KEY, String(newMuted));
      if (typeof audio !== "undefined") {
        audio.muted = newMuted;
        if (!newMuted) audio.play().catch(() => {});
      }
      muteBtn.textContent = newMuted ? "Unmute" : "Mute";
    });
  }
});
