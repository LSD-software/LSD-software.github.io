// ============================================================
// HAMBURGER MENU — mobile nav toggle
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const menu = document.getElementById("menu");

  if (!hamburger || !menu) return;

  const setOpen = (open) => {
    hamburger.classList.toggle("active", open);
    menu.classList.toggle("active", open);
    hamburger.setAttribute("aria-expanded", String(open));
    hamburger.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
  };

  hamburger.addEventListener("click", function () {
    setOpen(hamburger.getAttribute("aria-expanded") !== "true");
  });

  // Mark the current page and close the menu after navigation.
  menu.querySelectorAll("a[href]").forEach(function (link) {
    const url = new URL(link.href, window.location.href);
    const currentPath = window.location.pathname.replace(/\/$/, "");
    const linkPath = url.pathname.replace(/\/$/, "");
    if (linkPath === currentPath || (linkPath.endsWith("/index.html") && currentPath === linkPath.replace(/\/index\.html$/, ""))) {
      link.setAttribute("aria-current", "page");
    }
    link.addEventListener("click", function () { setOpen(false); });
  });

  document.addEventListener("pointerdown", function (e) {
    if (!hamburger.contains(e.target) && !menu.contains(e.target)) setOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && hamburger.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      hamburger.focus();
    }
  });

  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width: 861px)").matches) setOpen(false);
  }, { passive: true });
});
