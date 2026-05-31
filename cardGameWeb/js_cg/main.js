// js_cg/main.js — menu principale

document.addEventListener("DOMContentLoaded", async function () {
  // ✅ FIX: Carica dati dal server prima di applicare lo sfondo
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
  const idx  = Math.max(1, Math.min(data.background, bgFiles.length)) - 1;
  const body = document.getElementById("gameBody");
  if (body) {
    body.style.backgroundImage    = `url("data_cg/${bgFiles[idx]}")`;
    body.style.backgroundSize     = "cover";
    body.style.backgroundPosition = "center";
    body.style.backgroundRepeat   = "no-repeat";
  }
});
