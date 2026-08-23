import type { Win } from "./types";

const MAX_CARDS = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE = 50;
const DDRAGON_VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";

function sameWin(a: Win, b: Win): boolean {
  if (a.matchId && b.matchId) {
    return a.matchId === b.matchId && a.summoner === b.summoner;
  }
  return a.summoner === b.summoner && a.championId === b.championId && a.gameEnd === b.gameEnd;
}

let winsCache = $state<Win[]>([]);

const ddragon = $state({ version: "15.16.1", loaded: false });

/** Kick off the ddragon version fetch once; the version updates reactively. */
export function loadDdragonVersion(): void {
  if (ddragon.loaded) return;
  ddragon.loaded = true;
  fetch(DDRAGON_VERSIONS_URL)
    .then((r) => r.json() as Promise<string[]>)
    .then((versions) => {
      if (versions[0]) ddragon.version = versions[0];
    })
    .catch(() => {}); // stale-but-close fallback stays in place
}

export function ddragonVersion(): string {
  return ddragon.version;
}

export async function fetchRecentWins(): Promise<void> {
  try {
    const resp = await fetch("data/recent-wins.json", { cache: "no-store" });
    if (!resp.ok) return; // file not deployed yet — stay hidden
    const parsed = await resp.json();
    if (Array.isArray(parsed)) winsCache = parsed;
  } catch {
    // stay hidden
  }
}

export function addLiveWin(win: Win) {
  winsCache = [win, ...winsCache.filter((w) => !sameWin(w, win))].slice(0, MAX_CACHE);
}

export function recentWins(): Win[] {
  return [...winsCache]
    .filter((w) => Number.isFinite(w.gameEnd) && Date.now() - w.gameEnd <= WINDOW_MS)
    .sort((a, b) => b.gameEnd - a.gameEnd)
    .slice(0, MAX_CARDS);
}

export function relativeTime(gameEnd: number, now: number): string {
  const diffMs = Math.max(0, now - gameEnd);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function playerDisplayName(summoner: string): string {
  return summoner.split("#")[0];
}
