// cookie-banner.js — lightweight GDPR/ePrivacy notice
(function () {
  if (localStorage.getItem("cookie_consent") === "1") return;

  const banner = document.createElement("div");
  banner.id = "cookie-banner";
  banner.style.cssText = [
    "position:fixed","bottom:0","left:0","right:0","z-index:99999",
    "background:rgba(10,10,10,0.97)","border-top:2px solid rgba(186,167,1,0.6)",
    "padding:14px 20px","display:flex","flex-wrap:wrap",
    "align-items:center","justify-content:space-between","gap:12px",
    "font-family:'Courier Prime',monospace","font-size:0.88rem","color:rgba(255,255,255,0.85)",
    "box-shadow:0 -4px 24px rgba(0,0,0,0.7)"
  ].join(";");

  banner.innerHTML = `
    <span style="flex:1;min-width:260px;line-height:1.6;">
      🍪 We use only essential cookies and localStorage to keep you logged in and save your game progress.
      No advertising or analytics tracking.
      <a href="cookies.html" style="color:gold;text-decoration:underline;">Cookie Policy</a> &nbsp;·&nbsp;
      <a href="privacy.html" style="color:gold;text-decoration:underline;">Privacy Policy</a>
    </span>
    <div style="display:flex;gap:10px;flex-shrink:0;">
      <button id="cookie-accept" style="background:#a10000;color:#baa701;border:none;padding:9px 22px;cursor:pointer;font-family:inherit;font-size:0.88rem;border-radius:5px;letter-spacing:1px;">
        ✓ ACCEPT
      </button>
      <button id="cookie-decline" style="background:transparent;color:rgba(255,255,255,0.45);border:1px solid rgba(255,255,255,0.2);padding:9px 16px;cursor:pointer;font-family:inherit;font-size:0.82rem;border-radius:5px;">
        Decline optional
      </button>
    </div>`;

  document.body.appendChild(banner);

  function dismiss(accepted) {
    localStorage.setItem("cookie_consent", accepted ? "1" : "0");
    banner.style.transition = "opacity 0.3s";
    banner.style.opacity = "0";
    setTimeout(() => banner.remove(), 320);
  }

  document.getElementById("cookie-accept").addEventListener("click", () => dismiss(true));
  document.getElementById("cookie-decline").addEventListener("click", () => dismiss(false));
})();
