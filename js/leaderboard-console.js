// ============================================================
// leaderboard-console.js  v3
// LSD CONSOLE tab: sub-filtri AFUE | Target Shooting | Ball
// ============================================================

const BACKEND = "https://lsd-backend-4phu.onrender.com";

(function () {
  let activeConsoleGame = "afue";

  // ── Bind tab principale Console ──────────────────────────
  document.querySelectorAll(".game-tab[data-game='console']").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".game-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("consoleSubBar").classList.remove("hidden");
      document.getElementById("sortBar").classList.add("hidden");
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

  // ── Torna a Card Game ────────────────────────────────────
  document.querySelectorAll(".game-tab[data-game='cardgame']").forEach(tab => {
    tab.addEventListener("click", () => {
      document.getElementById("consoleSubBar").classList.add("hidden");
      document.getElementById("sortBar").classList.remove("hidden");
      hidePodium();
      // Restore sort buttons
      document.querySelectorAll(".sort-btn").forEach(b => {
        b.classList.remove("hidden");
        if (b.classList.contains("console-only")) b.classList.add("hidden");
      });
      // Restore CG thead columns
      restoreCGHead();
    });
  });

  // ── Load classifica per minigioco ───────────────────────
  async function loadConsoleGame(game) {
    showLoading(true);
    hideError();
    hideTables();
    hidePodium();
    buildConsoleHead(game);

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

  // ── Ricostruisce thead per il gioco console scelto ──────
  function buildConsoleHead(game) {
    const isAFUE = game === "afue";
    const headRow = document.getElementById("lbHeadRow");
    if (!headRow) return;
    headRow.innerHTML = `
      <th class="col-rank">RANK</th>
      <th class="col-name">PLAYER</th>
      ${isAFUE
        ? `<th style="text-align:right;color:#4EC600;">WINS</th>
           <th style="text-align:right;color:#ff6666;">LOSSES</th>`
        : `<th style="text-align:right;color:gold;">BEST SCORE</th>`
      }
    `;
  }

  function restoreCGHead() {
    const headRow = document.getElementById("lbHeadRow");
    if (!headRow) return;
    headRow.innerHTML = `
      <th class="col-rank">RANK</th>
      <th class="col-name">PLAYER</th>
      <th class="col-score cg-col">SCORE</th>
      <th class="col-coins cg-col">COINS</th>
      <th class="col-streak cg-col">WIN STREAK</th>
      <th class="col-wins console-col hidden">WINS</th>
      <th class="col-losses console-col hidden">LOSSES</th>
      <th class="col-bestscore console-col hidden">BEST SCORE</th>
    `;
  }

  // ── Render tabella console ───────────────────────────────
  function renderConsoleTable(rows, game) {
    const isAFUE = game === "afue";
    const tbody = document.getElementById("lbBody");
    const table = document.getElementById("lbTable");
    tbody.innerHTML = "";

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="4"
        style="text-align:center;color:rgba(255,255,255,0.3);padding:32px;
               font-family:'Cinzel',serif;letter-spacing:2px;">
        NO DATA YET — BE THE FIRST
      </td></tr>`;
      table.classList.remove("hidden");
      return;
    }

    // Podio top 3
    if (rows.length >= 2) renderPodium(rows, isAFUE);

    // Righe dal 4° posto in poi
    rows.slice(3).forEach(row => {
      const cells = isAFUE
        ? `<td style="text-align:right;color:#4EC600;">${row.wins || 0}</td>
           <td style="text-align:right;color:#ff6666;">${row.losses || 0}</td>`
        : `<td style="text-align:right;color:gold;">${row.bestScore || 0}</td>`;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-rank"><span class="rank-medal medal-n">${row.rank}</span></td>
        <td><span class="player-name">${escHtml(row.username)}</span></td>
        ${cells}`;
      tbody.appendChild(tr);
    });

    table.classList.remove("hidden");
  }

  // ── Podio top 3 ─────────────────────────────────────────
  function renderPodium(rows, isAFUE) {
    const el = ensurePodium();
    el.innerHTML = "";
    el.style.display = "flex";

    const order   = rows.length >= 3 ? [rows[1], rows[0], rows[2]] : rows;
    const heights = ["180px", "220px", "150px"];
    const colors  = ["#C0C0C0", "#FFD700", "#CD7F32"];
    const medals  = ["🥈", "🥇", "🥉"];

    order.forEach((entry, pi) => {
      if (!entry) return;
      const val = isAFUE
        ? `${entry.wins || 0}W / ${entry.losses || 0}L`
        : String(entry.bestScore || 0);
      const div = document.createElement("div");
      div.className = "podium-block";
      div.style.cssText = `height:${heights[pi]};border-color:${colors[pi]};`;
      div.innerHTML = `
        <div class="podium-rank" style="color:${colors[pi]};">${medals[pi]}</div>
        <div class="podium-name">${escHtml(entry.username)}</div>
        <div class="podium-val" style="color:${colors[pi]};">${val}</div>`;
      el.appendChild(div);
    });
  }

  // ── My rank ──────────────────────────────────────────────
  function renderConsoleMyRank(myRank, game) {
    const isAFUE = game === "afue";
    const panel  = document.getElementById("myRankPanel");
    const tbody  = document.getElementById("myRankBody");
    const note   = document.getElementById("notLoggedNote");
    panel.classList.remove("hidden");
    tbody.innerHTML = "";
    note.classList.add("hidden");

    const user = typeof Api !== "undefined" ? Api.getUser() : null;
    if (!user || user.isGuest) {
      note.classList.remove("hidden");
      return;
    }
    if (!myRank) {
      tbody.innerHTML = `<tr><td colspan="3"
        style="text-align:center;color:rgba(255,255,255,0.3);font-size:0.85rem;">
        Play some rounds to appear in the ranking!
      </td></tr>`;
      return;
    }

    const rankEmoji = myRank.rank <= 3
      ? ["🥇", "🥈", "🥉"][myRank.rank - 1]
      : `#${myRank.rank}`;
    const cells = isAFUE
      ? `<td style="color:#4EC600;text-align:right;">${myRank.wins || 0}W</td>
         <td style="color:#ff6666;text-align:right;">${myRank.losses || 0}L</td>`
      : `<td style="color:gold;text-align:right;">${myRank.bestScore || 0}</td>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-rank" style="font-weight:700;color:gold;">${rankEmoji}</td>
      <td><span class="player-name is-me">${escHtml(myRank.username)}</span></td>
      ${cells}`;
    tbody.appendChild(tr);
  }

  // ── Podium DOM helper ────────────────────────────────────
  function ensurePodium() {
    let el = document.getElementById("consolePodium");
    if (!el) {
      el = document.createElement("div");
      el.id = "consolePodium";
      el.className = "podium-container";
      const lbPanel = document.getElementById("lbPanel");
      lbPanel.insertBefore(el, lbPanel.firstChild);
    }
    return el;
  }

  // ── Helpers ──────────────────────────────────────────────
  function showLoading(show) {
    const el = document.getElementById("lbLoading");
    if (el) el.style.display = show ? "flex" : "none";
  }
  function hideError() {
    const el = document.getElementById("lbError");
    if (el) el.classList.add("hidden");
  }
  function showError(msg) {
    const el = document.getElementById("lbError");
    if (el) { el.textContent = msg; el.classList.remove("hidden"); }
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
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
