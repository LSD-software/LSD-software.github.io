// footer.js — aggiorna automaticamente l'anno nel footer
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("footYear");
  if (el) el.textContent = new Date().getFullYear();
});
