// ============================================================
// leaderboard-console.js  v2
// Gestisce il tab "LSD CONSOLE" con sub-filtri per minigioco:
//   AFUE (wins/losses) | Target Shooting (bestScore) | Ball (bestScore)
// ============================================================

const BACKEND = "https://lsd-backend-4phu.onrender.com";

(function () {
  const GAME_MAP = { afue: "afue", target: "target", ball: "ball" };
  let activeConsoleGame = "afue"; // default quando si entra in Console

  // ── Bind main Console tab ────────────────────────────────
  document.querySelectorAll(".game-tab[data-game='console']").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".game-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      showConsoleSubBar(true);
      hideSortBar();
      // Carica subito il minigioco attivo
      loadConsoleGame(activeConsoleGame);
    });
  });

  // ── Bind sub-tabs minigioco ──────────────────────────────
  document.querySelectorAll(".console-game-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".console-game-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeConsoleGame = btn.dataset.consoleGame;
      loadConsoleGame(activeConsoleGame);
    });
  });

  // ── Torna a Card Game → nascondi console bar ────────────
  document.querySelectorAll(".game-tab[data-game='cardgame']").forEach(tab => {
    tab.addEventListener("click", () => {
      showConsoleSubBar(false);
      showSortBar();
      hidePodium();
    });
  });

  // ── UI helpers ───────────────────────────────────────────
  function showConsoleSubBar(show) {
    const bar = document.getElementById("consoleSubBar");
    if (bar) bar.classList.toggle("hidden", !show);
  }
  function hideSortBar() {
    const sb = document.getElementById("sortBar");
    if (sb) sb.classList.add("hidden");
  }
  function showSortBar() {
    const sb = document.getElementById("sortBar");
    if (sb) sb.classList.remove("hidden");
    // Restore sort button visibility
    document.querySelectorAll(".sort-btn").forEach(b => {
      b.classList.remove("hidden");
      if (b.classList.contains("console-only")) b.classList.add("hidden");
    });
  }

  // ── Main loader ──────────────────────────────────────────
  async function loadConsoleGame(game) {
    setConsoleColumns(game);
    showLoading(true);
    hideError();
    hideTables();
    hidePodium();

    try {
      const token = localStorage.getItem("lsd_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BACKEND}/console/leaderboard/${game}`, { headers });
      if (!res.ok) throw new Error("Server error " + res.status);
      const data = await res.json();

      renderConsoleTable(data.leaderboard || [], game);
      renderConsoleMyRank(data.myRank, game);
    } catch (err) {
      showError(err.message || "Could not load leaderboard.");
    } finally {
      showLoading(false);
    }
  }

  // ── Column setup ─────────────────────────────────────────
  function setConsoleColumns(game) {
    const isAFUE = game === "afue";
    document.querySelectorAll(".cg-col").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".console-col").forEach(el => el.classList.remove("hidden"));
    document.querySelectorAll(".col-wins, .col-losses").forEach(el =>
      el.classList.toggle("hidden", !isAFUE));
    document.querySelectorAll(".col-bestscore").forEach(el =>
      el.classList.toggle("hidden", isAFUE));

    // Sort bar: nascondi tutto, per AFUE mostra wins
    document.querySelectorAll(".sort-btn:not(.console-only)").forEach(b => b.classList.add("hidden"));
    document.querySelectorAll(".sort-btn.console-only").forEach(b =>
      b.classList.toggle("hidden", !isAFUE));
  }

  // ── Render table ─────────────────────────────────────────
  function renderConsoleTable(rows, game) {
    const isAFUE = game === "afue";
    const tbody = document.getElementById("lbBody");
    tbody.innerHTML = "";

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:rgba(255,255,255,0.3);padding:32px;font-family:'Cinzel',serif;letter-spacing:2px;">NO DATA YET — BE THE FIRST</td></tr>`;
      document.getElementById("lbTable").classList.remove("hidden");
      return;
    }

    // Podio top 3
    if (rows.length >= 2) renderPodium(rows, isAFUE);

    // Tabella dal 4° posto in poi
    rows.slice(3).forEach(row => {
      const val = isAFUE
        ? `<td class="col-wins console-col" style="text-align:right;color:#4EC600;">${row.wins||0}</td><td class="col-losses console-col" style="text-align:right;color:#ff6666;">${row.losses||0}</td><td class="col-bestscore console-col hidden"></td>`
        : `<td class="col-wins console-col hidden"></td><td class="col-losses console-col hidden"></td><td class="col-bestscore console-col" style="text-align:right;color:gold;">${row.bestScore||0}</td>`;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-rank"><span class="rank-medal medal-n">${row.rank}</span></td>
        <td><span class="player-name">${escHtml(row.username)}</span></td>
        ${val}`;
      tbody.appendChild(tr);
    });

    document.getElementById("lbTable").classList.remove("hidden");
  }

  // ── Podio ────────────────────────────────────────────────
  function renderPodium(rows, isAFUE) {
    const el = getPodium();
    el.innerHTML = "";
    el.style.display = "flex";

    const order = rows.length >= 3 ? [rows[1], rows[0], rows[2]] : rows;
    const heights = ["180px", "220px", "150px"];
    const colors  = ["#C0C0C0", "#FFD700", "#CD7F32"];
    const medals  = ["🥈","🥇","🥉"];

    order.forEach((entry, pi) => {
      if (!entry) return;
      const val = isAFUE
        ? `${entry.wins||0}W / ${entry.losses||0}L`
        : (entry.bestScore||0);
      el.innerHTML += `
        <div class="podium-block" style="height:${heights[pi]};border-color:${colors[pi]};">
          <div class="podium-rank" style="color:${colors[pi]};">${medals[pi]}</div>
          <div class="podium-name">${escHtml(entry.username)}</div>
          <div class="podium-val" style="color:${colors[pi]};">${val}</div>
        </div>`;
    });
  }

  // ── My Rank ──────────────────────────────────────────────
  function renderConsoleMyRank(myRank, game) {
    const isAFUE = game === "afue";
    const panel  = document.getElementById("myRankPanel");
    const tbody  = document.getElementById("myRankBody");
    const note   = document.getElementById("notLoggedNote");
    panel.classList.remove("hidden");
    tbody.innerHTML = "";

    const user = typeof Api !== "undefined" ? Api.getUser() : null;
    if (!user || user.isGuest) { note.classList.remove("hidden"); return; }

    if (!myRank) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:rgba(255,255,255,0.3);font-size:0.85rem;">Play some rounds to appear in the ranking!</td></tr>`;
      return;
    }

    const rankEmoji = myRank.rank <= 3 ? ["🥇","🥈","🥉"][myRank.rank-1] : `#${myRank.rank}`;
    const val = isAFUE
      ? `<td style="color:#4EC600;text-align:right;">${myRank.wins||0}W</td><td style="color:#ff6666;text-align:right;">${myRank.losses||0}L</td>`
      : `<td style="color:gold;text-align:right;">${myRank.bestScore||0}</td>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-rank" style="font-weight:700;color:gold;">${rankEmoji}</td>
      <td><span class="player-name is-me">${escHtml(myRank.username)}</span></td>
      ${val}`;
    tbody.appendChild(tr);
  }

  // ── Podium element ───────────────────────────────────────
  function getPodium() {
    let el = document.getElementById("consolePodium");
    if (!el) {
      el = document.createElement("div");
      el.id = "consolePodium";
      el.style.cssText = "display:none;justify-content:center;align-items:flex-end;gap:16px;margin:24px auto 0;max-width:700px;";
      const lbPanel = document.getElementById("lbPanel");
      lbPanel.insertBefore(el, lbPanel.firstChild);

      const style = document.createElement("style");
      style.textContent = `
        .podium-block{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;width:180px;border:2px solid gold;border-radius:10px 10px 0 0;padding:12px 8px;background:rgba(0,0,0,0.5);}
        .podium-rank{font-size:2rem;margin-bottom:6px;}
        .podium-name{font-family:'Cinzel',serif;color:#fff;font-size:0.85rem;text-align:center;word-break:break-word;}
        .podium-val{font-family:'Courier Prime',monospace;font-size:1rem;font-weight:700;margin-top:4px;}
        #consoleTitleBar{font-family:'Cinzel',serif;font-size:clamp(1rem,3vw,1.5rem);font-weight:900;color:gold;text-align:center;letter-spacing:3px;text-shadow:0 0 18px gold;padding:10px 0 6px;text-transform:uppercase;}
        #consoleGameTabs{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;padding:0 12px 12px;}
        .console-game-btn{background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,215,0,0.4);color:rgba(255,255,255,0.8);font-family:'Cinzel',serif;font-size:clamp(0.72rem,1.8vw,0.9rem);font-weight:700;letter-spacing:1px;padding:7px 18px;border-radius:8px;cursor:pointer;transition:all 0.2s;text-transform:uppercase;}
        .console-game-btn:hover{background:rgba(255,215,0,0.15);border-color:gold;color:gold;}
        .console-game-btn.active{background:linear-gradient(145deg,rgba(255,215,0,0.25),rgba(255,150,0,0.15));border-color:gold;color:gold;box-shadow:0 0 12px rgba(255,215,0,0.4);}
        #consoleSubBar{margin-bottom:8px;}
      `;
      document.head.appendChild(style);
    }
    return el;
  }

  // ── Helpers ──────────────────────────────────────────────
  function showLoading(show) {
    const el = document.getElementById("lbLoading");
    if (el) el.style.display = show ? "flex" : "none";
  }
  function showError(msg) {
    const el = document.getElementById("lbError");
    if (el) { el.textContent = msg; el.classList.remove("hidden"); }
  }
  function hideError() {
    const el = document.getElementById("lbError");
    if (el) el.classList.add("hidden");
  }
  function hideTables() {
    document.getElementById("lbTable")?.classList.add("hidden");
    document.getElementById("myRankPanel")?.classList.add("hidden");
  }
  function hidePodium() {
    const p = document.getElementById("consolePodium");
    if (p) p.style.display = "none";
  }
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
})();
