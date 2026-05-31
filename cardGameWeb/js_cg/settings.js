// js_cg/settings.js — LSD Card Game Settings (fixed)

document.addEventListener("DOMContentLoaded", async () => {
  // ✅ FIX: Carica dati dal server prima di mostrare settings
  if (typeof initStorage === "function") {
    await initStorage();
  }

  const data = loadData();

  // Imposta sfondo attuale
  const bgFiles = [
    "SfondoTavolata.png",
    "SfondoTavolata1.png",
    "SfondoTavolata2.png",
    "SfondoTavolata3.png"
  ];
  const index = Math.max(1, Math.min(data.background, bgFiles.length)) - 1;
  document.body.style.backgroundImage = `url("data_cg/${bgFiles[index]}")`;

  // Slider volume
  const slider = document.getElementById("volumeSlider");
  if (slider) {
    slider.value = data.audioVolume;

    slider.addEventListener("input", () => {
      let d = loadData();
      d.audioVolume = Number(slider.value);
      saveData(d);
      if (typeof audio !== "undefined") audio.volume = d.audioVolume;
    });
  }

  // Mute
  const muteBtn = document.getElementById("muteBtn");
  if (muteBtn) {
    muteBtn.textContent = data.audioMuted ? "Unmute" : "Mute";

    muteBtn.addEventListener("click", () => {
      let d = loadData();
      d.audioMuted = !d.audioMuted;
      saveData(d);
      if (typeof audio !== "undefined") {
        audio.muted = d.audioMuted;
        if (!d.audioMuted) audio.play().catch(() => {});
      }
      muteBtn.textContent = d.audioMuted ? "Unmute" : "Mute";
    });
  }
});
