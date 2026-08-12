import { loadData } from "./data.js";
import { assignRankClasses, renderLeaderboard } from "./leaderboard.js";
import { renderSummary } from "./summary.js";
import { renderGrid } from "./grid.js";
import { renderWinBanner } from "./winbanner.js";
import { populateFocusOptions, STORAGE_KEYS } from "./controls.js";
import { startLiveUpdates } from "./live.js";

const statusEl = document.getElementById("status");
const leaderboardEl = document.getElementById("leaderboard");
const controlsEl = document.getElementById("controls");
const summaryEl = document.getElementById("summary");
const gridWrapEl = document.getElementById("gridWrap");
const searchEl = document.getElementById("search");
const hideIconsEl = document.getElementById("hideIcons");
const onlyMissingEl = document.getElementById("onlyMissing");
const focusEl = document.getElementById("focusPlayer");
const groupByWinsEl = document.getElementById("groupByWins");

function renderAll() {
  renderLeaderboard();
  renderSummary();
  renderGrid();
}

async function refreshData() {
  await loadData();
  assignRankClasses();
  populateFocusOptions();
  renderAll();
  await renderWinBanner();
}

function applyLiveWin({ champion, win }) {
  const player = state.players.find((entry) => entry.summoner === win.summoner);
  if (!player) {
    // A newly added player needs the complete static document, not just a win.
    refreshData().catch((err) => console.warn("Could not refresh after live update", err));
    return;
  }

  player.championsById.set(champion.id, true);
  if (!state.champions.some((entry) => entry.id === champion.id)) {
    state.champions.push(champion);
    state.champions.sort((a, b) => a.name.localeCompare(b.name));
  }
  assignRankClasses();
  renderAll();
  renderWinBanner(win);
}

[searchEl, hideIconsEl, onlyMissingEl, focusEl, groupByWinsEl].forEach((el) =>
  el.addEventListener("input", renderGrid)
);

focusEl.addEventListener("input", () => {
  localStorage.setItem(STORAGE_KEYS.focus, focusEl.value);
});

groupByWinsEl.addEventListener("input", () => {
  localStorage.setItem(STORAGE_KEYS.groupByWins, String(groupByWinsEl.checked));
});

hideIconsEl.addEventListener("input", () => {
  localStorage.setItem(STORAGE_KEYS.hideIcons, String(hideIconsEl.checked));
});

async function init() {
  try {
    await loadData();
    statusEl.classList.add("hidden");
    leaderboardEl.classList.remove("hidden");
    controlsEl.classList.remove("hidden");
    summaryEl.classList.remove("hidden");
    gridWrapEl.classList.remove("hidden");
    assignRankClasses();
    populateFocusOptions();
    renderAll();
    await renderWinBanner();
    startLiveUpdates({
      onWin: applyLiveWin,
      onVisible: () => refreshData().catch((err) => console.warn("Could not refresh dashboard", err)),
    });
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.classList.add("error");
    console.error(err);
  }
}

init();
