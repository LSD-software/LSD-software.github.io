/* LSD Software — robust Lucide icon initializer. */
(function () {
  const CDN_URLS = [
    "https://cdnjs.cloudflare.com/ajax/libs/lucide/0.383.0/umd/lucide.min.js",
    "https://unpkg.com/lucide@0.383.0/dist/umd/lucide.min.js"
  ];
  let loading = false;
  let observerStarted = false;

  function renderIcons(root) {
    if (!window.lucide || typeof window.lucide.createIcons !== "function") return false;
    try {
      window.lucide.createIcons({ attrs: { "aria-hidden": "true", focusable: "false" } });
      return true;
    } catch (error) {
      console.warn("[LSDIcons] Lucide rendering failed:", error);
      return false;
    }
  }

  function loadFallback(index) {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      renderIcons();
      return;
    }
    if (index >= CDN_URLS.length || loading) return;
    loading = true;
    const script = document.createElement("script");
    script.src = CDN_URLS[index];
    script.crossOrigin = "anonymous";
    script.onload = function () {
      loading = false;
      if (!renderIcons()) loadFallback(index + 1);
    };
    script.onerror = function () { loading = false; loadFallback(index + 1); };
    document.head.appendChild(script);
  }

  function replace() {
    if (!renderIcons()) loadFallback(0);
  }

  function startObserver() {
    if (observerStarted || !document.body || !window.MutationObserver) return;
    observerStarted = true;
    let scheduled = false;
    const observer = new MutationObserver(function (mutations) {
      if (!mutations.some(m => m.addedNodes && m.addedNodes.length)) return;
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () { scheduled = false; renderIcons(); });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { replace(); startObserver(); }, { once: true });
  } else {
    replace(); startObserver();
  }
  window.LSDIcons = { replace: replace };
})();
