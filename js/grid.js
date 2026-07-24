import { state } from "./state.js";
import { championIconUrl } from "./data.js";

const gridEl = document.getElementById("grid");
const searchEl = document.getElementById("search");
const hideIconsEl = document.getElementById("hideIcons");
const onlyMissingEl = document.getElementById("onlyMissing");
const focusEl = document.getElementById("focusPlayer");
const groupByWinsEl = document.getElementById("groupByWins");

function isChampionDoneForFocus(champId, focus) {
  const player = state.players.find((p) => p.summoner === focus);
  return player ? !!player.championsById.get(champId) : false;
}

function buildOrbWrap(player) {
  const wrap = document.createElement("div");
  wrap.className = "orb-wrap";
  wrap.title = `${player.tag || player.summoner} (${player.summoner})`;

  const orb = document.createElement("img");
  orb.className = `orb ${player.rankClass || "rank-default"}`;
  orb.src = `assets/orbs/${player.avatar}`;
  orb.alt = player.summoner;
  orb.loading = "lazy";
  wrap.appendChild(orb);

  const label = document.createElement("span");
  label.className = "orb-label";
  label.textContent = player.tag || player.summoner;
  wrap.appendChild(label);

  return wrap;
}

function buildChampCard(champ, done) {
  const card = document.createElement("div");
  card.className = "champ-card";

  const img = document.createElement("img");
  img.className = "champ-icon";
  img.src = championIconUrl(champ.id);
  img.alt = champ.name;
  img.loading = "lazy";
  if (!done) img.classList.add("greyed");
  card.appendChild(img);

  if (done) {
    const check = document.createElement("div");
    check.className = "check-mark";
    check.textContent = "✓";
    card.appendChild(check);
  }

  const name = document.createElement("div");
  name.className = "champ-name";
  name.textContent = champ.name;
  card.appendChild(name);

  const rankOrder = { "rank-gold": 0, "rank-silver": 1, "rank-bronze": 2 };
  const doneFriends = state.players
    .filter((p) => p.championsById.get(champ.id) && p.avatar)
    .sort((a, b) => (rankOrder[a.rankClass] ?? 3) - (rankOrder[b.rankClass] ?? 3));

  card.appendChild(buildFanDisplay(doneFriends));

  return card;
}

function buildOverflowChip(overflowCount, allFriends) {
  const overflow = document.createElement("div");
  overflow.className = "orb-wrap orb-overflow";

  const chip = document.createElement("div");
  chip.className = "orb orb-overflow-chip";
  chip.textContent = `+${overflowCount}`;
  overflow.appendChild(chip);

  const panel = document.createElement("div");
  panel.className = "overflow-panel";
  for (const player of allFriends) {
    panel.appendChild(buildOrbWrap(player));
  }
  overflow.appendChild(panel);

  return overflow;
}

function buildFanDisplay(doneFriends) {
  const wrap = document.createElement("div");
  wrap.className = "fan";

  const top3 = doneFriends.slice(0, 3);
  const rotations = ["-10deg", "0deg", "10deg"];

  top3.forEach((player, i) => {
    const slot = buildOrbWrap(player);
    slot.classList.add("fan-slot");
    slot.style.setProperty("--rotate", rotations[i] || "0deg");
    wrap.appendChild(slot);
  });

  const overflowCount = doneFriends.length - 3;
  if (overflowCount > 0) {
    const chip = buildOverflowChip(overflowCount, doneFriends);
    chip.classList.add("fan-slot", "fan-overflow");
    chip.style.setProperty("--rotate", "0deg");
    wrap.appendChild(chip);
  }

  return wrap;
}

function buildGridSection(champsWithDone) {
  const section = document.createElement("div");
  section.className = "champ-grid";
  for (const { champ, done } of champsWithDone) {
    section.appendChild(buildChampCard(champ, done));
  }
  return section;
}

export function renderGrid() {
  gridEl.innerHTML = "";

  const query = searchEl.value.trim().toLowerCase();
  const onlyMissing = onlyMissingEl.checked;
  const focus = focusEl.value;
  const groupByWins = groupByWinsEl.checked;

  gridEl.classList.toggle("hide-icons", hideIconsEl.checked);

  const filtered = [];
  for (const champ of state.champions) {
    if (query && !champ.name.toLowerCase().includes(query)) continue;

    const nobodyHas = state.players.every((p) => !p.championsById.get(champ.id));

    if (onlyMissing && !nobodyHas) continue;

    filtered.push({ champ, done: isChampionDoneForFocus(champ.id, focus) });
  }

  if (!groupByWins) {
    gridEl.appendChild(buildGridSection(filtered));
    return;
  }

  const wins = filtered.filter((c) => c.done);
  const missing = filtered.filter((c) => !c.done);

  const columns = document.createElement("div");
  columns.className = "grid-columns";

  const missingColumn = document.createElement("div");
  missingColumn.className = "grid-column";
  const missingHeading = document.createElement("h3");
  missingHeading.className = "grid-section-heading";
  missingHeading.textContent = `Missing (${missing.length})`;
  missingColumn.appendChild(missingHeading);
  missingColumn.appendChild(buildGridSection(missing));
  columns.appendChild(missingColumn);

  const winsColumn = document.createElement("div");
  winsColumn.className = "grid-column";
  const winsHeading = document.createElement("h3");
  winsHeading.className = "grid-section-heading";
  winsHeading.textContent = `Wins (${wins.length})`;
  winsColumn.appendChild(winsHeading);
  winsColumn.appendChild(buildGridSection(wins));
  columns.appendChild(winsColumn);

  gridEl.appendChild(columns);
}
