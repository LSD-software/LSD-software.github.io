// ============================================================
// HAMBURGER MENU — mobile nav toggle
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const menu = document.getElementById("menu");

  if (!hamburger || !menu) return;

  // Toggle al click
  hamburger.addEventListener("click", function () {
    hamburger.classList.toggle("active");
    menu.classList.toggle("active");
    hamburger.setAttribute("aria-expanded", menu.classList.contains("active"));
  });

  // Keyboard accessibility: apri con Enter/Space
  hamburger.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      hamburger.click();
    }
  });

  // Chiudi menu se si clicca su un link (mobile)
  menu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      hamburger.classList.remove("active");
      menu.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");
    });
  });

  // Chiudi menu se si clicca fuori
  document.addEventListener("click", function (e) {
    if (!hamburger.contains(e.target) && !menu.contains(e.target)) {
      hamburger.classList.remove("active");
      menu.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");
    }
  });
});
