import { app } from "./store.svelte";
import type { Champion, LiveWinMessage, Player } from "./types";

const DATA_DIR = "data";

interface ChampionEntry {
  id: number;
  name: string;
  done: boolean;
}

interface PlayerDocument {
  summoner: string;
  updatedAt?: string;
  avatar?: string | null;
  tag?: string | null;
  champions: ChampionEntry[];
}

export async function loadDocuments(): Promise<{ players: Player[]; champions: Champion[] }> {
  const manifestResp = await fetch(`${DATA_DIR}/manifest.json`, { cache: "no-store" });
  if (!manifestResp.ok) {
    throw new Error(
      "Could not load data/manifest.json. Run the reader script at least once, " +
        "then commit the generated data/ files."
    );
  }
  const files = (await manifestResp.json()) as string[];

  if (!files.length) {
    throw new Error("data/manifest.json is empty. Run the reader script first.");
  }

  const playerDocs = await Promise.all(
    files.map((name) =>
      fetch(`${DATA_DIR}/${name}`, { cache: "no-store" }).then((r) => r.json() as Promise<PlayerDocument>)
    )
  );

  const championMap = new Map<number, string>();
  const players = playerDocs.map((doc) => {
    const championsById = new Map<number, boolean>();
    for (const champ of doc.champions) {
      championsById.set(champ.id, champ.done);
      if (!championMap.has(champ.id)) {
        championMap.set(champ.id, champ.name);
      }
    }
    return {
      summoner: doc.summoner,
      updatedAt: doc.updatedAt,
      avatar: doc.avatar || null,
      tag: doc.tag || null,
      championsById,
      rankClass: null,
    };
  });

  const champions = [...championMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { players, champions };
}

const RANK_CLASSES = ["rank-gold", "rank-silver", "rank-bronze"];

export function assignRankClasses(players: Player[]) {
  const ranked = [...players].sort((a, b) => winCount(b) - winCount(a));
  const rankBySummoner = new Map<string, string>();
  ranked.forEach((p, index) => {
    if (RANK_CLASSES[index]) rankBySummoner.set(p.summoner, RANK_CLASSES[index]);
  });
  for (const player of players) {
    player.rankClass = rankBySummoner.get(player.summoner) || null;
  }
}

export function championIconUrl(id: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${id}.png`;
}

export function winCount(player: Player): number {
  return [...player.championsById.values()].filter(Boolean).length;
}

/** Fold a live win into state; returns true if state changed in place. */
export function applyLiveWin(message: LiveWinMessage): boolean {
  const { champion, win } = message;
  const player = app.players.find((entry) => entry.summoner === win.summoner);
  if (!player) return false;

  player.championsById.set(champion.id, true);
  if (!app.champions.some((entry) => entry.id === champion.id)) {
    app.champions.push(champion);
    app.champions.sort((a, b) => a.name.localeCompare(b.name));
  }
  assignRankClasses(app.players);
  return true;
}
