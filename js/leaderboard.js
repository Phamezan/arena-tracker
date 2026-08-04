import { state } from "./state.js";
import { winCount } from "./data.js";

const leaderboardEl = document.getElementById("leaderboard");

export function assignRankClasses() {
  const rankClasses = ["rank-gold", "rank-silver", "rank-bronze"];
  const ranked = [...state.players].sort((a, b) => winCount(b) - winCount(a));
  const rankBySummoner = new Map();
  ranked.forEach((p, index) => {
    if (rankClasses[index]) rankBySummoner.set(p.summoner, rankClasses[index]);
  });
  for (const player of state.players) {
    player.rankClass = rankBySummoner.get(player.summoner) || null;
  }
}

export function renderLeaderboard() {
  leaderboardEl.innerHTML = "";

  const ranked = state.players
    .map((p) => ({
      summoner: p.summoner,
      rankClass: p.rankClass,
      wins: winCount(p),
    }))
    .sort((a, b) => b.wins - a.wins);

  ranked.forEach((entry, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "leaderboard-item";
    if (entry.rankClass) item.classList.add(entry.rankClass);
    item.title = `Grey the grid based on ${entry.summoner}`;

    const crown = index === 0 ? `<span class="leaderboard-crown">👑</span>` : "";
    item.innerHTML = `${crown}<span class="leaderboard-name">${entry.summoner}</span><span class="leaderboard-wins">${entry.wins}</span>`;

    // Clicking a name switches the "Greyed based on" focus to that player.
    item.addEventListener("click", () => {
      const focusEl = document.getElementById("focusPlayer");
      if (focusEl.value === entry.summoner) return;
      focusEl.value = entry.summoner;
      focusEl.dispatchEvent(new Event("input", { bubbles: true }));
    });

    leaderboardEl.appendChild(item);
  });
}
