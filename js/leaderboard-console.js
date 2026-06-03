// ============================================================
// leaderboard-console.js
// Handles LSD Console tabs on the leaderboard page:
// AFUE Online (wins/losses), Target Shooting (bestScore), Ball (bestScore)
// ============================================================

const BACKEND = "https://lsd-backend-4phu.onrender.com";

(function () {
  const CONSOLE_GAMES = ["console-afue", "console-target", "console-ball"];
  const GAME_MAP = {
    "console-afue":   "afue",
    "console-target": "target",
    "console-ball":   "ball"
  };

  let activeConsoleGame = null;

  // Attach click handlers to the new console tabs
  document.querySelectorAll(".game-tab[data-game^='console-']").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".game-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeConsoleGame = tab.dataset.game;
      switchToConsole(activeConsoleGame);
    });
  });

  // When cardgame tab is clicked — restore CG columns
  document.querySelectorAll(".game-tab[data-game='cardgame']").forEach(tab => {
    tab.addEventListener("click", restoreCGLayout);
  });

  // ── Switch to console game leaderboard ─────────────────
  async function switchToConsole(gameKey) {
    const apiGame = GAME_MAP[gameKey];
    setConsoleLayout(apiGame === "afue");

    showLoading(true);
    hideError();
    hideTables();

    try {
      const token = localStorage.getItem("lsd_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BACKEND}/console/leaderboard/${apiGame}`, { headers });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();

      renderConsoleTable(data.leaderboard || [], apiGame);
      renderConsoleMyRank(data.myRank, apiGame);
    } catch (err) {
      showError(err.message || "Could not load leaderboard.");
    } finally {
      showLoading(false);
    }
  }

  // ── Layout switch ───────────────────────────────────────
  function setConsoleLayout(isAFUE) {
    // Hide CG columns
    document.querySelectorAll(".cg-col").forEach(el => el.classList.add("hidden"));
    // Show console columns
    document.querySelectorAll(".console-col").forEach(el => el.classList.remove("hidden"));

    // wins/losses only for AFUE; bestScore for target/ball
    document.querySelectorAll(".col-wins, .col-losses").forEach(el => {
      el.classList.toggle("hidden", !isAFUE);
    });
    document.querySelectorAll(".col-bestscore").forEach(el => {
      el.classList.toggle("hidden", isAFUE);
    });

    // Sort bar: show WINS button only for AFUE, hide score/coins/streak
    document.querySelectorAll(".sort-btn:not(.console-only)").forEach(b => b.classList.add("hidden"));
    document.querySelectorAll(".sort-btn.console-only").forEach(b => {
      b.classList.toggle("hidden", !isAFUE);
    });
  }

  function restoreCGLayout() {
    activeConsoleGame = null;
    document.querySelectorAll(".cg-col").forEach(el => el.classList.remove("hidden"));
    document.querySelectorAll(".console-col").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".sort-btn").forEach(b => {
      b.classList.remove("hidden");
      if (b.classList.contains("console-only")) b.classList.add("hidden");
    });
  }

  // ── Render console table ────────────────────────────────
  function renderConsoleTable(rows, game) {
    const isAFUE = game === "afue";
    const tbody = document.getElementById("lbBody");
    tbody.innerHTML = "";

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:rgba(255,255,255,0.3);padding:32px;font-family:'Cinzel',serif;letter-spacing:2px;">NO DATA YET — BE THE FIRST</td></tr>`;
      document.getElementById("lbTable").classList.remove("hidden");
      return;
    }

    // Podium top 3
    const podiumContainer = getPodium();
    podiumContainer.innerHTML = "";
    podiumContainer.style.display = "flex";

    const podOrder = rows.length >= 3 ? [rows[1], rows[0], rows[2]] : rows;
    const podHeights = ["180px", "220px", "150px"];
    const podColors  = ["#C0C0C0", "#FFD700", "#CD7F32"];
    const podRanks   = [2, 1, 3];

    podOrder.forEach((entry, pi) => {
      if (!entry) return;
      const val = isAFUE ? `${entry.wins||0}W / ${entry.losses||0}L` : (entry.bestScore||0);
      podiumContainer.innerHTML += `
        <div class="podium-block" style="height:${podHeights[pi]};border-color:${podColors[pi]};">
          <div class="podium-rank" style="color:${podColors[pi]};">${["🥈","🥇","🥉"][pi]}</div>
          <div class="podium-name">${escHtml(entry.username)}</div>
          <div class="podium-val" style="color:${podColors[pi]};">${val}</div>
        </div>`;
    });

    // Rest of table (4+)
    rows.slice(3).forEach(row => {
      const val = isAFUE ? `${row.wins||0}W / ${row.losses||0}L` : (row.bestScore||0);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-rank"><span class="rank-medal medal-n">${row.rank}</span></td>
        <td><span class="player-name">${escHtml(row.username)}</span></td>
        ${isAFUE
          ? `<td class="col-wins" style="text-align:right;color:#4EC600;">${row.wins||0}</td><td class="col-losses" style="text-align:right;color:#ff6666;">${row.losses||0}</td>`
          : `<td class="col-bestscore" style="text-align:right;color:gold;">${row.bestScore||0}</td>`
        }`;
      tbody.appendChild(tr);
    });

    document.getElementById("lbTable").classList.remove("hidden");
  }

  // ── Render my rank ──────────────────────────────────────
  function renderConsoleMyRank(myRank, game) {
    const isAFUE = game === "afue";
    const panel  = document.getElementById("myRankPanel");
    const tbody  = document.getElementById("myRankBody");
    const note   = document.getElementById("notLoggedNote");
    panel.classList.remove("hidden");
    tbody.innerHTML = "";

    const user = typeof Api !== "undefined" ? Api.getUser() : null;
    if (!user || user.isGuest) {
      note.classList.remove("hidden");
      return;
    }

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

  // ── Podium element ──────────────────────────────────────
  function getPodium() {
    let el = document.getElementById("consolePodium");
    if (!el) {
      el = document.createElement("div");
      el.id = "consolePodium";
      el.style.cssText = "display:none;justify-content:center;align-items:flex-end;gap:16px;margin:24px auto 0;max-width:700px;";
      const lbPanel = document.getElementById("lbPanel");
      lbPanel.insertBefore(el, lbPanel.firstChild);

      // Inject podium styles
      const style = document.createElement("style");
      style.textContent = `
        .podium-block{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;width:180px;border:2px solid gold;border-radius:10px 10px 0 0;padding:12px 8px;background:rgba(0,0,0,0.5);}
        .podium-rank{font-size:2rem;margin-bottom:6px;}
        .podium-name{font-family:'Cinzel',serif;color:#fff;font-size:0.85rem;text-align:center;word-break:break-word;}
        .podium-val{font-family:'Courier Prime',monospace;font-size:1rem;font-weight:700;margin-top:4px;}
      `;
      document.head.appendChild(style);
    }
    return el;
  }

  // ── Helpers ─────────────────────────────────────────────
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
    const p = document.getElementById("consolePodium");
    if (p) p.style.display = "none";
  }
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
})();
