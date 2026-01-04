// js/settings.js

document.addEventListener("DOMContentLoaded", () => {
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
  slider.value = data.audioVolume;

  slider.addEventListener("input", () => {
    let d = loadData();
    d.audioVolume = Number(slider.value);
    saveData(d);

    audio.volume = d.audioVolume;
  });

  // Mute
  const muteBtn = document.getElementById("muteBtn");
  muteBtn.textContent = data.audioMuted ? "Unmute" : "Mute";

  muteBtn.addEventListener("click", () => {
    let d = loadData();
    d.audioMuted = !d.audioMuted;
    saveData(d);

    audio.muted = d.audioMuted;
    muteBtn.textContent = d.audioMuted ? "Unmute" : "Mute";

    if (!d.audioMuted) audio.play().catch(() => {});
  });
});
