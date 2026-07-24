import { state } from "./state.js";

export const STORAGE_KEYS = {
  focus: "arena-tracker-focus-player",
  groupByWins: "arena-tracker-group-by-wins",
  hideIcons: "arena-tracker-hide-icons",
};

const focusEl = document.getElementById("focusPlayer");
const groupByWinsEl = document.getElementById("groupByWins");
const hideIconsEl = document.getElementById("hideIcons");

export function populateFocusOptions() {
  focusEl.innerHTML = "";

  for (const player of state.players) {
    const opt = document.createElement("option");
    opt.value = player.summoner;
    opt.textContent = player.summoner;
    focusEl.appendChild(opt);
  }

  const savedFocus = localStorage.getItem(STORAGE_KEYS.focus);
  if (savedFocus && state.players.some((p) => p.summoner === savedFocus)) {
    focusEl.value = savedFocus;
  }

  const savedGroupByWins = localStorage.getItem(STORAGE_KEYS.groupByWins);
  if (savedGroupByWins !== null) {
    groupByWinsEl.checked = savedGroupByWins === "true";
  }

  const savedHideIcons = localStorage.getItem(STORAGE_KEYS.hideIcons);
  if (savedHideIcons !== null) {
    hideIconsEl.checked = savedHideIcons === "true";
  }
}
