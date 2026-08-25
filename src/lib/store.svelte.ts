import type { Champion, Player } from "./types";

// Global reactive state (Svelte 5 runes). Mutate properties; never reassign.
export const app = $state({
  ready: false,
  error: "",
  players: [] as Player[],
  champions: [] as Champion[],
});

export const controls = $state({
  search: "",
  focus: "",
  groupByWins: false,
  hideIcons: false,
});

export const STORAGE_KEYS = {
  focus: "arena-tracker-focus-player",
  groupByWins: "arena-tracker-group-by-wins",
  hideIcons: "arena-tracker-hide-icons",
} as const;

export function setFocus(summoner: string) {
  controls.focus = summoner;
  localStorage.setItem(STORAGE_KEYS.focus, summoner);
}

export function setGroupByWins(value: boolean) {
  controls.groupByWins = value;
  localStorage.setItem(STORAGE_KEYS.groupByWins, String(value));
}

export function setHideIcons(value: boolean) {
  controls.hideIcons = value;
  localStorage.setItem(STORAGE_KEYS.hideIcons, String(value));
}

/** Restore saved control preferences from localStorage. */
export function restoreControls(playerNames: string[]) {
  const savedFocus = localStorage.getItem(STORAGE_KEYS.focus);
  if (savedFocus && playerNames.includes(savedFocus)) {
    controls.focus = savedFocus;
  }

  const savedGroupByWins = localStorage.getItem(STORAGE_KEYS.groupByWins);
  if (savedGroupByWins !== null) {
    controls.groupByWins = savedGroupByWins === "true";
  }

  const savedHideIcons = localStorage.getItem(STORAGE_KEYS.hideIcons);
  if (savedHideIcons !== null) {
    controls.hideIcons = savedHideIcons === "true";
  }
}
