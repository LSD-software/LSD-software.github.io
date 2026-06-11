// ============================================================
// leaderboard-console.js  v4
// LSD CONSOLE tab: AFUE | Target Shooting | Ball
// ============================================================

const BACKEND_CONSOLE = "https://lsd-backend-4phu.onrender.com";

(function () {
  let activeConsoleGame = "afue";

  document.querySelectorAll(".game-tab[data-game='console']").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".game-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("consoleSubBar").classList.remove("hidden");
      document.getElementById("sortBar").classList.add("hidden");
      loadConsoleGame(activeConsoleGame);
    });
  });

  document.querySelectorAll(".console-game-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".console-game-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeConsoleGame = btn.dataset.consoleGame;
      loadConsoleGame(activeConsoleGame);
    });
  });

  document.querySelectorAll(".game-tab[data-game='cardgame']").forEach(tab => {
    tab.addEventListener("click", () => {
      document.getElementById("consoleSubBar").classList.add("hidden");
      document.getElementById("sortBar").classList.remove("hidden");
      hidePodium();
      restoreCGHead();
    });
  });

  async function loadConsoleGame(game) {
    showLoading(true); hideError(); hideTables(); hidePodium(); buildConsoleHead(game);
    try {
      const token = localStorage.getItem("lsd_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${BACKEND_CONSOLE}/console/leaderboard/${game}`, { headers });
      if (!res.ok) throw new Error("Server error " + res.status);
      const data = await res.json();
      let rows = data.leaderboard || [];
      if (game === "afue") {
        rows.sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : (a.losses||0)-(b.losses||0));
        rows.forEach((r, i) => r.rank = i + 1);
      }
      renderConsoleTable(rows, game);
      renderConsoleMyRank(data.myRank, game);
    } catch (err) {
      showError(err.message || "Could not load leaderboard.");
    } finally { showLoading(false); }
  }

  function buildConsoleHead(game) {
    const headRow = document.getElementById("lbHeadRow");
    if (!headRow) return;
    headRow.innerHTML = game === "afue"
      ? `<th class="col-rank">RANK</th><th class="col-name">PLAYER</th>
         <th class="col-wins-afue">WINS</th><th class="col-losses-afue">LOSSES</th><th class="col-ratio-afue">W/L %</th>`
      : `<th class="col-rank">RANK</th><th class="col-name">PLAYER</th>
         <th class="col-bestscore-afue">BEST SCORE</th>`;
  }

  function restoreCGHead() {
    const headRow = document.getElementById("lbHeadRow");
    if (!headRow) return;
    headRow.innerHTML = `
      <th class="col-rank">RANK</th><th class="col-name">PLAYER</th>
      <th class="col-score cg-col">SCORE</th><th class="col-coins cg-col">COINS</th>
      <th class="col-streak cg-col">WIN STREAK</th>`;
  }

  function renderConsoleTable(rows, game) {
    const isAFUE = game === "afue";
    const tbody  = document.getElementById("lbBody");
    const table  = document.getElementById("lbTable");
    tbody.innerHTML = "";
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.3);padding:32px;font-family:'Cinzel',serif;letter-spacing:2px;">NO DATA YET — BE THE FIRST</td></tr>`;
      table.classList.remove("hidden"); return;
    }
    if (rows.length >= 2) renderPodium(rows, isAFUE);
    rows.slice(3).forEach(row => {
      const wl = (row.wins||0)+(row.losses||0);
      const pct = wl>0 ? ((row.wins/wl)*100).toFixed(0)+"%" : "—";
      const cells = isAFUE
        ? `<td class="col-wins-afue">${row.wins||0}</td><td class="col-losses-afue">${row.losses||0}</td><td class="col-ratio-afue">${pct}</td>`
        : `<td class="col-bestscore-afue">${row.bestScore||0}</td>`;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="col-rank"><span class="rank-medal medal-n">${row.rank}</span></td><td><span class="player-name">${escHtml(row.username)}</span></td>${cells}`;
      tbody.appendChild(tr);
    });
    table.classList.remove("hidden");
  }

  function renderPodium(rows, isAFUE) {
    const el = ensurePodium();
    el.innerHTML = ""; el.style.display = "flex";
    const order = [
      {entry:rows[1],rank:2,color:"#C0C0C0",medal:"🥈",height:"175px"},
      {entry:rows[0],rank:1,color:"#FFD700",medal:"🥇",height:"220px"},
      {entry:rows[2],rank:3,color:"#CD7F32",medal:"🥉",height:"145px"},
    ];
    order.forEach(({entry,rank,color,medal,height}) => {
      if (!entry) return;
      const wl  = (entry.wins||0)+(entry.losses||0);
      const pct = wl>0 ? ((entry.wins/wl)*100).toFixed(0)+"%" : "—";
      const val = isAFUE
        ? `<span style="color:#4EC600">${entry.wins||0}W</span> <span style="color:#ff6666">${entry.losses||0}L</span><br><span style="color:#aaa;font-size:0.8em">${pct} W/L</span>`
        : `<span style="color:gold">${entry.bestScore||0}</span>`;
      const div = document.createElement("div");
      div.className = "podium-block";
      div.style.cssText = `height:${height};border-color:${color};`;
      div.innerHTML = `
        <div class="podium-medal">${medal}</div>
        <div class="podium-rank-num" style="color:${color}">#${rank}</div>
        <div class="podium-name">${escHtml(entry.username)}</div>
        <div class="podium-val">${val}</div>`;
      el.appendChild(div);
    });
  }

  function renderConsoleMyRank(myRank, game) {
    const isAFUE = game === "afue";
    const panel  = document.getElementById("myRankPanel");
    const tbody  = document.getElementById("myRankBody");
    const note   = document.getElementById("notLoggedNote");
    panel.classList.remove("hidden"); tbody.innerHTML = ""; note.classList.add("hidden");
    const user = typeof Api !== "undefined" ? Api.getUser() : null;
    if (!user || user.isGuest) { note.classList.remove("hidden"); return; }
    if (!myRank) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.3);font-size:0.85rem;padding:16px;">Play some online rounds to appear here!</td></tr>`;
      return;
    }
    const rankEmoji = myRank.rank <= 3 ? ["🥇","🥈","🥉"][myRank.rank-1] : `#${myRank.rank}`;
    const wl  = (myRank.wins||0)+(myRank.losses||0);
    const pct = wl>0 ? ((myRank.wins/wl)*100).toFixed(0)+"%" : "—";
    const cells = isAFUE
      ? `<td class="col-wins-afue" style="color:#4EC600">${myRank.wins||0}W</td>
         <td class="col-losses-afue" style="color:#ff6666">${myRank.losses||0}L</td>
         <td class="col-ratio-afue">${pct}</td>`
      : `<td class="col-bestscore-afue" style="color:gold">${myRank.bestScore||0}</td>`;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="col-rank" style="font-weight:700;color:gold;">${rankEmoji}</td><td><span class="player-name is-me">${escHtml(myRank.username)}</span></td>${cells}`;
    tbody.appendChild(tr);
  }

  function ensurePodium() {
    let el = document.getElementById("consolePodium");
    if (!el) {
      el = document.createElement("div"); el.id = "consolePodium"; el.className = "podium-container";
      document.getElementById("lbPanel").insertBefore(el, document.getElementById("lbPanel").firstChild);
    }
    return el;
  }

  function showLoading(show) { const el=document.getElementById("lbLoading"); if(el) el.style.display=show?"flex":"none"; }
  function hideError() { document.getElementById("lbError")?.classList.add("hidden"); }
  function showError(msg) { const el=document.getElementById("lbError"); if(el){el.textContent=msg;el.classList.remove("hidden");} }
  function hideTables() { document.getElementById("lbTable")?.classList.add("hidden"); document.getElementById("myRankPanel")?.classList.add("hidden"); }
  function hidePodium() { const p=document.getElementById("consolePodium"); if(p) p.style.display="none"; }
  function escHtml(s) { return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
})();


// ============================================================
// PESCA TAB  —  LSD P-E-S-C-A global leaderboard
// Sort: pescaTotali → pescaMiticiTotali → vhsTotali
// ============================================================
(function () {
  const BACKEND_PESCA = "https://lsd-backend-4phu.onrender.com";

  // ── Bind tab click ────────────────────────────────────────
  document.querySelectorAll(".game-tab[data-game='pesca']").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".game-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("consoleSubBar").classList.add("hidden");
      document.getElementById("sortBar").classList.add("hidden");
      hidePodium();
      loadPesca();
    });
  });

  // Restore sortBar when switching back to Card Game
  document.querySelectorAll(".game-tab[data-game='cardgame']").forEach(tab => {
    tab.addEventListener("click", () => {
      document.getElementById("sortBar").classList.remove("hidden");
    });
  });

  // ── Load data ─────────────────────────────────────────────
  async function loadPesca() {
    showLoading(true);
    hideError();
    hideTables();
    hidePodium();
    buildPescaHead();

    try {
      const token = localStorage.getItem("lsd_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BACKEND_PESCA}/pesca/leaderboard`, { headers });
      if (!res.ok) throw new Error("Server error " + res.status);
      const data = await res.json();

      renderPescaTable(data.leaderboard || []);
      renderPescaMyRank(data.myRank);
    } catch (err) {
      showError(err.message || "Could not load P-E-S-C-A leaderboard.");
    } finally {
      showLoading(false);
    }
  }

  // ── Build thead ───────────────────────────────────────────
  function buildPescaHead() {
    const headRow = document.getElementById("lbHeadRow");
    if (!headRow) return;
    headRow.innerHTML = `
      <th class="col-rank">RANK</th>
      <th class="col-name">PLAYER</th>
      <th style="text-align:right">🐟 TOTAL FISH</th>
      <th style="text-align:right;color:#ce93d8">★ MYTHIC</th>
      <th style="text-align:right;color:#FFD700">📼 VHS</th>
      <th style="text-align:right;color:#FFD700">◈ DOBLONI</th>`;
  }

  // ── Render table ──────────────────────────────────────────
  function renderPescaTable(rows) {
    const tbody = document.getElementById("lbBody");
    const table = document.getElementById("lbTable");
    tbody.innerHTML = "";

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6"
        style="text-align:center;color:rgba(255,255,255,0.25);padding:36px;
               font-family:'Cinzel',serif;letter-spacing:2px;">
        NO DATA YET — CAST YOUR LINE
      </td></tr>`;
      table.classList.remove("hidden");
      return;
    }

    // Top 3 → podium
    if (rows.length >= 2) renderPescaPodium(rows);

    // 4th onwards → table rows
    rows.slice(3).forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-rank"><span class="rank-medal medal-n">${row.rank}</span></td>
        <td><span class="player-name">${escHtml(row.username)}</span></td>
        <td style="text-align:right">${(row.pescaTotali||0).toLocaleString()}</td>
        <td style="text-align:right;color:#ce93d8">${row.pescaMiticiTotali||0}</td>
        <td style="text-align:right;color:#FFD700">${row.vhsTotali||0}</td>
        <td style="text-align:right;color:#FFD700">${(row.dobloniTotali||0).toLocaleString()}</td>`;
      tbody.appendChild(tr);
    });

    table.classList.remove("hidden");
  }

  // ── Podium top 3 ──────────────────────────────────────────
  function renderPescaPodium(rows) {
    const el = ensurePodium();
    el.innerHTML = "";
    el.style.display = "flex";

    const order = [
      { entry: rows[1], rank: 2, color: "#C0C0C0", medal: "🥈", height: "175px" },
      { entry: rows[0], rank: 1, color: "#FFD700", medal: "🥇", height: "220px" },
      { entry: rows[2], rank: 3, color: "#CD7F32", medal: "🥉", height: "145px" }
    ];

    order.forEach(({ entry, rank, color, medal, height }) => {
      if (!entry) return;
      const div = document.createElement("div");
      div.className = "podium-block";
      div.style.cssText = `height:${height};border-color:${color};`;
      div.innerHTML = `
        <div class="podium-medal">${medal}</div>
        <div class="podium-rank-num" style="color:${color}">#${rank}</div>
        <div class="podium-name">${escHtml(entry.username)}</div>
        <div class="podium-val">
          🐟 <span style="color:#fff">${(entry.pescaTotali||0).toLocaleString()}</span>
        </div>
        <div class="podium-val" style="font-size:0.8em">
          <span style="color:#ce93d8">★ ${entry.pescaMiticiTotali||0}</span>
          &nbsp;
          <span style="color:#FFD700">📼 ${entry.vhsTotali||0}</span>
        </div>`;
      el.appendChild(div);
    });
  }

  // ── My rank panel ─────────────────────────────────────────
  function renderPescaMyRank(myRank) {
    const panel = document.getElementById("myRankPanel");
    const tbody = document.getElementById("myRankBody");
    const note  = document.getElementById("notLoggedNote");
    panel.classList.remove("hidden");
    tbody.innerHTML = "";
    note.classList.add("hidden");

    const user = typeof Api !== "undefined" ? Api.getUser() : null;
    if (!user || user.isGuest) { note.classList.remove("hidden"); return; }

    if (!myRank) {
      tbody.innerHTML = `<tr><td colspan="6"
        style="text-align:center;color:rgba(255,255,255,0.3);font-size:0.85rem;padding:16px;">
        Go fishing to appear in the ranking!
      </td></tr>`;
      return;
    }

    const rankEmoji = myRank.rank <= 3
      ? ["🥇","🥈","🥉"][myRank.rank - 1]
      : `#${myRank.rank}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-rank" style="font-weight:700;color:#FFD700">${rankEmoji}</td>
      <td><span class="player-name is-me">${escHtml(myRank.username)}</span></td>
      <td style="text-align:right">${(myRank.pescaTotali||0).toLocaleString()}</td>
      <td style="text-align:right;color:#ce93d8">${myRank.pescaMiticiTotali||0}</td>
      <td style="text-align:right;color:#FFD700">${myRank.vhsTotali||0}</td>
      <td style="text-align:right;color:#FFD700">${(myRank.dobloniTotali||0).toLocaleString()}</td>`;
    tbody.appendChild(tr);
  }

  // ── helpers (mirror existing in-scope functions) ──────────
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]
    ));
  }

  function ensurePodium() {
    let el = document.getElementById("consolePodium");
    if (!el) {
      el = document.createElement("div");
      el.id = "consolePodium";
      el.className = "podium-container";
      document.getElementById("lbPanel").insertBefore(
        el, document.getElementById("lbPanel").firstChild
      );
    }
    return el;
  }

  function showLoading(show) {
    const el = document.getElementById("lbLoading");
    if (el) el.style.display = show ? "flex" : "none";
  }
  function hideError() { document.getElementById("lbError")?.classList.add("hidden"); }
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

})();
