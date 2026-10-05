// ============================================================
// icons.js — Inizializza Lucide Icons su tutta la pagina
// ------------------------------------------------------------
// Incluso dopo lucide.min.js (dal CDN). Trasforma ogni elemento
// con data-lucide="nome-icona" nell'SVG corrispondente.
// Richiamabile anche manualmente con window.LSDIcons.replace()
// dopo che JS ha iniettato nuovo markup in pagina (es. la lista
// amici, il negozio, i messaggi).
// ============================================================
(function () {
  function replace() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
  document.addEventListener("DOMContentLoaded", replace);
  window.LSDIcons = { replace };
})();
