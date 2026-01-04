// js/main.js

// Carica i dati salvati
const data = loadData();

// Ottieni lo sfondo equipaggiato
const currentBackground = data.background; // 1–4

function aggiornaSfondo() {
  const body = document.getElementById("gameBody");

  const bgFiles = [
    "SfondoTavolata.png",   // 1
    "SfondoTavolata1.png",  // 2
    "SfondoTavolata2.png",  // 3
    "SfondoTavolata3.png"   // 4
  ];

  // Sicurezza: evita errori se il valore è fuori range
  const index = Math.max(1, Math.min(currentBackground, bgFiles.length)) - 1;

  body.style.backgroundImage = `url("data_cg/${bgFiles[index]}")`;
  body.style.backgroundSize = "contain";
  body.style.backgroundPosition = "center";
  body.style.backgroundRepeat = "no-repeat";
  body.style.backgroundColor = "#000";
}

document.addEventListener("DOMContentLoaded", aggiornaSfondo);
