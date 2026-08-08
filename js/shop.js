// ============================================================
// shop.js — Negozio cosmetici LSD Software
// ------------------------------------------------------------
// Si attiva da solo se trova #shopRoot in pagina (tab Profilo dell'Hub).
// Tre categorie (icon/background/border), ognuna con la propria griglia,
// compra/equipaggia via API, e un'anteprima live dell'avatar che riflette
// subito ciò che è equipaggiato.
// ============================================================
(function () {
  const API = "https://lsd-backend-4phu.onrender.com";
  let CATALOG = null;
  let PROFILE = null; // { owned:[], equipped:{icon,background,border}, lsdDust }
  let activeCategory = "icon";

  function getAuth() {
    const token = localStorage.getItem("lsd_token");
    const user  = JSON.parse(localStorage.getItem("lsd_user") || "null");
    if (!token || !user || user.isGuest) return null;
    return token;
  }

  async function init() {
    const root = document.getElementById("shopRoot");
    if (!root) return; // pagina senza negozio, non fare nulla

    const token = getAuth();
    if (!token) return; // il gate di login della pagina gestisce già questo caso

    try {
      const [catRes, profRes] = await Promise.all([
        fetch(`${API}/shop/catalog`),
        fetch(`${API}/shop/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      CATALOG = await catRes.json();
      PROFILE = await profRes.json();
      renderAll();
    } catch (e) {
      console.warn("Shop: could not load", e.message);
      root.innerHTML = `<p style="color:rgba(255,255,255,0.4); text-align:center; padding:30px;">Could not load the shop. Try refreshing the page.</p>`;
    }
  }

  // ── Rendering ────────────────────────────────────────────
  function renderAll() {
    renderAvatarPreview();
    renderDustLabel();
    renderTabs();
    renderGrid();
  }

  function categoryItems(cat) {
    return { icon: CATALOG.icons, background: CATALOG.backgrounds, border: CATALOG.borders }[cat] || [];
  }
  function categoryPropKey(cat) { return cat; } // equipped.icon / .background / .border

  function renderAvatarPreview() {
    const wrap = document.getElementById("shopAvatarPreview");
    if (!wrap) return;
    const iconItem   = CATALOG.icons.find(i => i.id === PROFILE.equipped.icon);
    const borderItem = CATALOG.borders.find(i => i.id === PROFILE.equipped.border);
    const bgItem     = CATALOG.backgrounds.find(i => i.id === PROFILE.equipped.background);

    wrap.className = `lsd-avatar-wrap ${borderItem?.css || "border-default"}`;
    wrap.innerHTML = `
      ${borderItem?.css === "border-spin" ? '<div class="lsd-avatar-ring"></div>' : ""}
      ${borderItem?.css === "border-orbit" ? '<div class="lsd-avatar-particles"><span></span><span></span><span></span><span></span><span></span><span></span></div>' : ""}
      <div class="lsd-avatar-inner">${iconItem?.icon || "🙂"}</div>
    `;

    const card = document.getElementById("shopProfileCard");
    if (card) card.className = `hub-card lsd-profile-card ${bgItem?.css || "bg-midnight"}`;
  }

  function renderDustLabel() {
    const el = document.getElementById("shopDustLabel");
    if (el) el.textContent = `✨ ${PROFILE.lsdDust.toLocaleString("en-US")}`;
  }

  function renderTabs() {
    const el = document.getElementById("shopTabs");
    if (!el) return;
    const tabs = [
      { id: "icon",       label: "🙂 Icons" },
      { id: "background",  label: "🖼️ Backgrounds" },
      { id: "border",      label: "💍 Borders" },
    ];
    el.innerHTML = tabs.map(t => `
      <button class="shop-tab-btn ${t.id === activeCategory ? "active" : ""}" data-cat="${t.id}">${t.label}</button>
    `).join("");
    el.querySelectorAll("[data-cat]").forEach(btn => {
      btn.addEventListener("click", () => { activeCategory = btn.dataset.cat; renderTabs(); renderGrid(); });
    });
  }

  function itemPreviewHtml(cat, item) {
    if (cat === "icon") {
      return `<div class="lsd-avatar-wrap sm border-default"><div class="lsd-avatar-inner" style="width:34px;height:34px;font-size:1rem;">${item.icon}</div></div>`;
    }
    if (cat === "border") {
      return `
        <div class="lsd-avatar-wrap sm ${item.css}">
          ${item.css === "border-spin" ? '<div class="lsd-avatar-ring"></div>' : ""}
          ${item.css === "border-orbit" ? '<div class="lsd-avatar-particles"><span></span><span></span><span></span><span></span><span></span><span></span></div>' : ""}
          <div class="lsd-avatar-inner" style="width:34px;height:34px;font-size:1rem;">✨</div>
        </div>`;
    }
    // background
    return `<div class="${item.css}" style="width:52px;height:36px;border-radius:8px;margin:0 auto;"></div>`;
  }

  function renderGrid() {
    const el = document.getElementById("shopGrid");
    if (!el) return;
    const items = categoryItems(activeCategory);
    const equippedId = PROFILE.equipped[categoryPropKey(activeCategory)];

    el.innerHTML = items.map(item => {
      const owned = PROFILE.owned.includes(item.id);
      const equipped = item.id === equippedId;
      const affordable = PROFILE.lsdDust >= item.price;
      return `
        <div class="shop-item ${owned ? "owned" : ""} ${equipped ? "equipped" : ""}" data-id="${item.id}">
          ${item.tier !== "default" ? `<span class="item-badge tier-${item.tier}">${item.tier}</span>` : ""}
          ${owned && !equipped ? `<span class="item-badge owned-tag">OWNED</span>` : ""}
          <div class="item-preview">${itemPreviewHtml(activeCategory, item)}</div>
          <div class="item-name">${item.name}</div>
          <div class="item-price ${affordable ? "affordable" : ""}">
            ${equipped ? "✓ Equipped" : owned ? "Tap to equip" : item.price === 0 ? "Free" : `✨ ${item.price}`}
          </div>
        </div>
      `;
    }).join("");

    el.querySelectorAll(".shop-item").forEach(card => {
      card.addEventListener("click", () => handleItemClick(card.dataset.id));
    });
  }

  // ── Azioni ───────────────────────────────────────────────
  async function handleItemClick(itemId) {
    const cat = activeCategory;
    const item = categoryItems(cat).find(i => i.id === itemId);
    if (!item) return;
    const token = getAuth();
    if (!token) return;

    const owned = PROFILE.owned.includes(itemId);
    const equipped = PROFILE.equipped[categoryPropKey(cat)] === itemId;
    if (equipped) return; // già equipaggiato, nulla da fare

    try {
      if (!owned) {
        if (PROFILE.lsdDust < item.price) {
          showToast(`Not enough LSD Dust — need ${item.price}, you have ${PROFILE.lsdDust}.`, "error");
          return;
        }
        const res = await fetch(`${API}/shop/buy`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ itemId, category: cat }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.error || "Purchase failed.", "error"); return; }
        PROFILE.owned.push(itemId);
        PROFILE.lsdDust = data.lsdDust;
        showToast(`Purchased "${item.name}"!`, "success");
      }

      // Equipaggia (sia appena comprato, sia già posseduto)
      const eqRes = await fetch(`${API}/shop/equip`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId, category: cat }),
      });
      const eqData = await eqRes.json();
      if (!eqRes.ok) { showToast(eqData.error || "Could not equip.", "error"); return; }
      PROFILE.equipped = eqData.equipped;

      renderAll();
      window.dispatchEvent(new CustomEvent("lsd-cosmetics-changed", { detail: PROFILE.equipped }));
      if (window.LSDDust) window.LSDDust.load();
      const homeDustEl = document.getElementById("homeDust");
      const navDustEl  = document.getElementById("hubDustNum");
      if (homeDustEl) homeDustEl.textContent = PROFILE.lsdDust.toLocaleString("en-US");
      if (navDustEl)  navDustEl.textContent  = PROFILE.lsdDust.toLocaleString("en-US");
    } catch (e) {
      showToast("Network error, try again.", "error");
    }
  }

  function showToast(text, type) {
    const el = document.getElementById("shopToast");
    if (!el) return;
    el.textContent = text;
    el.className = `auth-msg ${type}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ""; el.className = "auth-msg"; }, 3500);
  }

  document.addEventListener("DOMContentLoaded", init);
  window.LSDShop = { reload: init };
})();
