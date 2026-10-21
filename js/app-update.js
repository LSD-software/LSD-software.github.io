/* LSD Software — silent web updates, discreet PWA update status on Hub only. */
(() => {
  if (!('serviceWorker' in navigator)) return;

  const SW_URL = new URL('/sw.js', location.origin).href;
  const isInstalledPwa = () => {
    try {
      return window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        navigator.standalone === true;
    } catch (_) { return navigator.standalone === true; }
  };
  const showHubUpdateStatus = isInstalledPwa() &&
    /(?:^|\/)hub\.html$/.test(location.pathname);
  let reloading = false;
  let statusEl = null;
  let statusTimer = null;
  const hadController = !!navigator.serviceWorker.controller;

  function showStatus(message) {
    if (!showHubUpdateStatus) return;
    if (!statusEl) {
      statusEl = document.getElementById('pwaUpdateStatus');
      if (!statusEl) return;
    }
    statusEl.textContent = message;
    statusEl.hidden = false;
    if (statusTimer) clearTimeout(statusTimer);
  }

  function hideStatusSoon(delay = 1800) {
    if (!showHubUpdateStatus || !statusEl) return;
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { if (statusEl) statusEl.hidden = true; }, delay);
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloading) {
      reloading = true;
      if (showHubUpdateStatus) showStatus('Update complete — refreshing Hub…');
      location.reload();
    }
  });

  async function checkForUpdate() {
    try {
      const registration = await navigator.serviceWorker.register(SW_URL, {
        scope: '/', updateViaCache: 'none'
      });

      const activateWaiting = () => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          showStatus('Installing LSD Hub update…');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      };

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        // Only installed PWA users see an update indicator, and only on Hub.
        showStatus('Downloading LSD Hub update…');
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') {
            if (navigator.serviceWorker.controller) activateWaiting();
            else hideStatusSoon(1200); // first installation: no disruptive reload
          }
          if (worker.state === 'redundant') hideStatusSoon(1200);
        });
      });

      if (registration.waiting && navigator.serviceWorker.controller) activateWaiting();
      // Explicit network check on app opening; failures must never block startup.
      await registration.update().catch(() => {});
      // Check again when the app is brought back to foreground, without UI unless an update exists.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      }, { passive: true, once: false });
    } catch (error) {
      // Silent failure: browsing experience remains unaffected, including offline.
      console.debug('LSD update check unavailable:', error?.message || error);
      hideStatusSoon(500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkForUpdate, { once: true });
  } else checkForUpdate();
})();
