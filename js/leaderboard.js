// ============================================================
// leaderboard.js — dashboard classifiche LSD Software
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

  let currentSort = "score";
  let currentGame = "cardgame";
  const myUser    = typeof Api !== "undefined" ? Api.getUser() : null;

  // ── INIT ────────────────────────────────────────────────
  loadLeaderboard();

  // Mostra CTA se non loggato
  if (!myUser) {
    document.getElementById("lbCta").classList.remove("hidden");
  }

  // ── GAME TABS ───────────────────────────────────────────
  document.querySelectorAll(".game-tab:not(.locked)").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".game-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentGame = tab.dataset.game;
      loadLeaderboard();
    });
  });

  // ── SORT BUTTONS ────────────────────────────────────────
  document.querySelectorAll(".sort-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sort-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.dataset.sort;
      loadLeaderboard();
    });
  });

  // ── LOAD ────────────────────────────────────────────────
  async function loadLeaderboard() {
    showLoading(true);
    hideError();
    document.getElementById("lbTable").classList.add("hidden");
    document.getElementById("myRankPanel").classList.add("hidden");

    try {
      // Solo Card Game per ora
      if (currentGame !== "cardgame") return;

      const data = await Api.getLeaderboard(currentSort);
      renderTable(data.leaderboard || []);
      renderMyRank(data.myRank);

    } catch (err) {
      showError(err.message || "Could not load leaderboard. Make sure you're connected.");
    } finally {
      showLoading(false);
    }
  }

  // ── RENDER TABLE ────────────────────────────────────────
  function renderTable(rows) {
    const tbody = document.getElementById("lbBody");
    tbody.innerHTML = "";

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.3);padding:32px;font-family:'Cinzel',serif;letter-spacing:2px;">NO DATA YET — BE THE FIRST</td></tr>`;
      document.getElementById("lbTable").classList.remove("hidden");
      return;
    }

    rows.forEach((row, i) => {
      const isMe = myUser && !myUser.isGuest && myUser.username === row.username;
      const rankClass = i < 3 ? `rank-${i+1}` : "";

      const medalHtml = i === 0 ? `<span class="rank-medal medal-1">🥇</span>`
                      : i === 1 ? `<span class="rank-medal medal-2">🥈</span>`
                      : i === 2 ? `<span class="rank-medal medal-3">🥉</span>`
                      : `<span class="rank-medal medal-n">${row.rank}</span>`;

      const scoreClass  = currentSort === "score"     ? "val-score col-active"  : "val-score";
      const coinsClass  = currentSort === "coins"     ? "val-coins col-active"  : "val-coins";
      const streakClass = currentSort === "winStreak" ? "val-streak col-active" : "val-streak";

      const tr = document.createElement("tr");
      tr.className = rankClass;
      tr.innerHTML = `
        <td class="col-rank">${medalHtml}</td>
        <td><span class="player-name ${isMe ? "is-me" : ""}">${escHtml(row.username)}</span></td>
        <td class="col-score" style="text-align:right"><span class="${scoreClass}">${fmt(row.score)}</span></td>
        <td class="col-coins" style="text-align:right"><span class="${coinsClass}">${fmt(row.coins)}</span></td>
        <td class="col-streak" style="text-align:right"><span class="${streakClass}">${fmt(row.winStreak)}</span></td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById("lbTable").classList.remove("hidden");
  }

  // ── RENDER MY RANK ──────────────────────────────────────
  function renderMyRank(myRank) {
    const panel   = document.getElementById("myRankPanel");
    const tbody   = document.getElementById("myRankBody");
    const noteEl  = document.getElementById("notLoggedNote");
    panel.classList.remove("hidden");
    tbody.innerHTML = "";

    if (!myUser || myUser.isGuest) {
      noteEl.classList.remove("hidden");
      return;
    }

    if (!myRank) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5" style="text-align:center;color:rgba(255,255,255,0.3);font-family:'Cinzel',serif;font-size:0.82rem;letter-spacing:1px;">Play some rounds to appear in the ranking!</td>`;
      tbody.appendChild(tr);
      return;
    }

    const scoreClass  = currentSort === "score"     ? "val-score col-active"  : "val-score";
    const coinsClass  = currentSort === "coins"     ? "val-coins col-active"  : "val-coins";
    const streakClass = currentSort === "winStreak" ? "val-streak col-active" : "val-streak";

    const rankEmoji = myRank.rank <= 3 ? ["🥇","🥈","🥉"][myRank.rank-1] : `#${myRank.rank}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-rank" style="font-family:'Cinzel',serif;font-weight:700;color:gold;">${rankEmoji}</td>
      <td><span class="player-name is-me">${escHtml(myRank.username)}</span></td>
      <td class="col-score" style="text-align:right"><span class="${scoreClass}">${fmt(myRank.score)}</span></td>
      <td class="col-coins" style="text-align:right"><span class="${coinsClass}">${fmt(myRank.coins)}</span></td>
      <td class="col-streak" style="text-align:right"><span class="${streakClass}">${fmt(myRank.winStreak)}</span></td>
    `;
    tbody.appendChild(tr);
  }

  // ── HELPERS ─────────────────────────────────────────────
  function showLoading(show) {
    document.getElementById("lbLoading").style.display = show ? "flex" : "none";
  }
  function showError(msg) {
    const el = document.getElementById("lbError");
    el.textContent = msg;
    el.classList.remove("hidden");
  }
  function hideError() {
    document.getElementById("lbError").classList.add("hidden");
  }
  function fmt(n) {
    return typeof n === "number" ? n.toLocaleString() : "—";
  }
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
});
