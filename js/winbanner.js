import { state } from "./state.js";
import { championIconUrl } from "./data.js";

const bannerEl = document.getElementById("winBanner");

const MAX_CARDS = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const DDRAGON_VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";

let ddragonVersionPromise = null;
let winsCache = null;

function sameWin(a, b) {
  if (a.matchId && b.matchId) {
    return a.matchId === b.matchId && a.summoner === b.summoner;
  }
  return a.summoner === b.summoner && a.championId === b.championId && a.gameEnd === b.gameEnd;
}

function getDdragonVersion() {
  if (!ddragonVersionPromise) {
    ddragonVersionPromise = fetch(DDRAGON_VERSIONS_URL)
      .then((r) => r.json())
      .then((versions) => versions[0])
      .catch(() => "15.16.1"); // stale-but-close fallback if ddragon is unreachable
  }
  return ddragonVersionPromise;
}

function relativeTime(gameEnd, now) {
  const diffMs = Math.max(0, now - gameEnd);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function playerDisplayName(summoner) {
  return summoner.split("#")[0];
}

function buildCard(win, playerBySummoner, ddragonVersion, now) {
  const player = playerBySummoner.get(win.summoner);

  const card = document.createElement("div");
  card.className = "win-card";

  const ribbon = document.createElement("span");
  ribbon.className = "win-card-ribbon";
  ribbon.textContent = "WIN";
  card.appendChild(ribbon);

  const icon = document.createElement("img");
  icon.className = "champ-icon";
  icon.src = championIconUrl(win.championId);
  icon.alt = "";
  icon.loading = "lazy";
  card.appendChild(icon);

  const body = document.createElement("div");
  body.className = "win-card-body";

  const name = document.createElement("span");
  name.className = "win-card-name";
  if (player?.avatar) {
    const orb = document.createElement("img");
    orb.className = `orb ${player.rankClass || "rank-default"}`;
    orb.src = `assets/orbs/${player.avatar}`;
    orb.alt = "";
    name.appendChild(orb);
  }
  const playerName = document.createElement("span");
  playerName.className = "win-card-player";
  playerName.textContent = playerDisplayName(win.summoner);
  name.appendChild(playerName);
  body.appendChild(name);

  const sub = document.createElement("span");
  sub.className = "win-card-sub";
  const ago = document.createElement("span");
  ago.textContent = relativeTime(win.gameEnd, now);
  ago.title = new Date(win.gameEnd).toLocaleString();
  sub.appendChild(ago);
  if (win.kda) {
    const kda = document.createElement("span");
    kda.className = "kda";
    kda.textContent = ` · ${win.kda.kills}/${win.kda.deaths}/${win.kda.assists}`;
    sub.appendChild(kda);
  }
  body.appendChild(sub);

  if (Array.isArray(win.items) && win.items.length) {
    const items = document.createElement("span");
    items.className = "win-card-items";
    for (const id of win.items) {
      const img = document.createElement("img");
      img.className = "item-icon";
      img.src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/item/${id}.png`;
      img.alt = "";
      img.loading = "lazy";
      img.onerror = () => img.remove();
      items.appendChild(img);
    }
    body.appendChild(items);
  }

  card.appendChild(body);
  return card;
}

export async function renderWinBanner(liveWin = null) {
  if (liveWin) {
    const existing = winsCache || [];
    winsCache = [liveWin, ...existing.filter((win) => !sameWin(win, liveWin))].slice(0, 50);
  } else {
    try {
      const resp = await fetch("data/recent-wins.json", { cache: "no-store" });
      if (!resp.ok) return; // file not deployed yet — stay hidden
      winsCache = await resp.json();
    } catch {
      return;
    }
  }
  if (!Array.isArray(winsCache) || !winsCache.length) return;

  const now = Date.now();
  const recent = winsCache
    .filter((w) => Number.isFinite(w.gameEnd) && now - w.gameEnd <= WINDOW_MS)
    .sort((a, b) => b.gameEnd - a.gameEnd)
    .slice(0, MAX_CARDS);
  if (!recent.length) return;

  const playerBySummoner = new Map(state.players.map((p) => [p.summoner, p]));
  const ddragonVersion = await getDdragonVersion();

  bannerEl.innerHTML = "";
  for (const win of recent) {
    bannerEl.appendChild(buildCard(win, playerBySummoner, ddragonVersion, now));
  }
  bannerEl.classList.remove("hidden");
}
