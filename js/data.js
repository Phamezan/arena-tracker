import { state } from "./state.js";

const DATA_DIR = "data";

export async function loadData() {
  const manifestResp = await fetch(`${DATA_DIR}/manifest.json`, { cache: "no-store" });
  if (!manifestResp.ok) {
    throw new Error(
      "Could not load data/manifest.json. Run the reader script at least once, " +
        "then commit the generated data/ files."
    );
  }
  const files = await manifestResp.json();

  if (!files.length) {
    throw new Error("data/manifest.json is empty. Run the reader script first.");
  }

  const playerDocs = await Promise.all(
    files.map((name) => fetch(`${DATA_DIR}/${name}`, { cache: "no-store" }).then((r) => r.json()))
  );

  const championMap = new Map();
  state.players = playerDocs.map((doc) => {
    const championsById = new Map();
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
    };
  });

  state.champions = [...championMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function championIconUrl(id) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${id}.png`;
}

export function winCount(player) {
  return [...player.championsById.values()].filter(Boolean).length;
}
