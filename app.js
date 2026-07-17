const DATA_DIR = "data";

const statusEl = document.getElementById("status");
const leaderboardEl = document.getElementById("leaderboard");
const controlsEl = document.getElementById("controls");
const summaryEl = document.getElementById("summary");
const gridWrapEl = document.getElementById("gridWrap");
const gridEl = document.getElementById("grid");
const searchEl = document.getElementById("search");
const hideDoneEl = document.getElementById("hideDone");
const onlyMissingEl = document.getElementById("onlyMissing");
const focusEl = document.getElementById("focusPlayer");
const groupByWinsEl = document.getElementById("groupByWins");

const FOCUS_STORAGE_KEY = "arena-tracker-focus-player";
const GROUP_BY_WINS_STORAGE_KEY = "arena-tracker-group-by-wins";

let players = []; // [{ summoner, championsById: Map<id, done> }]
let champions = []; // [{ id, name }]

async function loadData() {
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
  players = playerDocs.map((doc) => {
    const championsById = new Map();
    for (const champ of doc.champions) {
      championsById.set(champ.id, champ.done);
      if (!championMap.has(champ.id)) {
        championMap.set(champ.id, champ.name);
      }
    }
    return { summoner: doc.summoner, updatedAt: doc.updatedAt, championsById };
  });

  champions = [...championMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function populateFocusOptions() {
  focusEl.innerHTML = "";

  for (const player of players) {
    const opt = document.createElement("option");
    opt.value = player.summoner;
    opt.textContent = player.summoner;
    focusEl.appendChild(opt);
  }

  const savedFocus = localStorage.getItem(FOCUS_STORAGE_KEY);
  if (savedFocus && players.some((p) => p.summoner === savedFocus)) {
    focusEl.value = savedFocus;
  }

  const savedGroupByWins = localStorage.getItem(GROUP_BY_WINS_STORAGE_KEY);
  if (savedGroupByWins !== null) {
    groupByWinsEl.checked = savedGroupByWins === "true";
  }
}

function renderSummary() {
  summaryEl.innerHTML = "";

  const totalChamps = champions.length;
  const everyoneCount = champions.filter((c) =>
    players.every((p) => p.championsById.get(c.id))
  ).length;
  const nobodyCount = champions.filter((c) =>
    players.every((p) => !p.championsById.get(c.id))
  ).length;

  const cards = [
    { label: "Champions", value: totalChamps },
    { label: "Players", value: players.length },
    { label: "Everyone has", value: everyoneCount },
    { label: "Nobody has", value: nobodyCount },
  ];

  for (const card of cards) {
    const div = document.createElement("div");
    div.className = "summary-card";
    div.innerHTML = `<div class="value">${card.value}</div><div class="label">${card.label}</div>`;
    summaryEl.appendChild(div);
  }
}

function renderLeaderboard() {
  leaderboardEl.innerHTML = "";

  const ranked = players
    .map((p) => ({
      summoner: p.summoner,
      wins: [...p.championsById.values()].filter(Boolean).length,
    }))
    .sort((a, b) => b.wins - a.wins);

  const rankClasses = ["rank-gold", "rank-silver", "rank-bronze"];

  ranked.forEach((entry, index) => {
    const item = document.createElement("div");
    item.className = "leaderboard-item";
    if (rankClasses[index]) item.classList.add(rankClasses[index]);

    const crown = index === 0 ? `<span class="leaderboard-crown">👑</span>` : "";
    item.innerHTML = `${crown}<span class="leaderboard-name">${entry.summoner}</span><span class="leaderboard-wins">${entry.wins}</span>`;
    leaderboardEl.appendChild(item);
  });
}

function championIconUrl(id) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${id}.png`;
}

function isChampionDoneForFocus(champId, focus) {
  const player = players.find((p) => p.summoner === focus);
  return player ? !!player.championsById.get(champId) : false;
}

function buildChampCard(champ, done) {
  const card = document.createElement("div");
  card.className = "champ-card";

  const img = document.createElement("img");
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

  const dots = document.createElement("div");
  dots.className = "player-dots";
  for (const player of players) {
    const dot = document.createElement("span");
    const has = !!player.championsById.get(champ.id);
    dot.className = `dot ${has ? "dot-done" : "dot-missing"}`;
    dot.title = `${player.summoner}: ${has ? "done" : "missing"}`;
    dots.appendChild(dot);
  }
  card.appendChild(dots);

  return card;
}

function buildGridSection(champsWithDone) {
  const section = document.createElement("div");
  section.className = "champ-grid";
  for (const { champ, done } of champsWithDone) {
    section.appendChild(buildChampCard(champ, done));
  }
  return section;
}

function renderGrid() {
  gridEl.innerHTML = "";

  const query = searchEl.value.trim().toLowerCase();
  const hideDone = hideDoneEl.checked;
  const onlyMissing = onlyMissingEl.checked;
  const focus = focusEl.value;
  const groupByWins = groupByWinsEl.checked;

  const filtered = [];
  for (const champ of champions) {
    if (query && !champ.name.toLowerCase().includes(query)) continue;

    const everyoneHas = players.every((p) => p.championsById.get(champ.id));
    const nobodyHas = players.every((p) => !p.championsById.get(champ.id));

    if (hideDone && everyoneHas) continue;
    if (onlyMissing && !nobodyHas) continue;

    filtered.push({ champ, done: isChampionDoneForFocus(champ.id, focus) });
  }

  if (!groupByWins) {
    gridEl.appendChild(buildGridSection(filtered));
    return;
  }

  const wins = filtered.filter((c) => c.done);
  const missing = filtered.filter((c) => !c.done);

  const winsHeading = document.createElement("h3");
  winsHeading.className = "grid-section-heading";
  winsHeading.textContent = `Wins (${wins.length})`;
  gridEl.appendChild(winsHeading);
  gridEl.appendChild(buildGridSection(wins));

  const missingHeading = document.createElement("h3");
  missingHeading.className = "grid-section-heading";
  missingHeading.textContent = `Missing (${missing.length})`;
  gridEl.appendChild(missingHeading);
  gridEl.appendChild(buildGridSection(missing));
}

function renderAll() {
  renderLeaderboard();
  renderSummary();
  renderGrid();
}

[searchEl, hideDoneEl, onlyMissingEl, focusEl, groupByWinsEl].forEach((el) =>
  el.addEventListener("input", renderGrid)
);

focusEl.addEventListener("input", () => {
  localStorage.setItem(FOCUS_STORAGE_KEY, focusEl.value);
});

groupByWinsEl.addEventListener("input", () => {
  localStorage.setItem(GROUP_BY_WINS_STORAGE_KEY, String(groupByWinsEl.checked));
});

async function init() {
  try {
    await loadData();
    statusEl.classList.add("hidden");
    leaderboardEl.classList.remove("hidden");
    controlsEl.classList.remove("hidden");
    summaryEl.classList.remove("hidden");
    gridWrapEl.classList.remove("hidden");
    populateFocusOptions();
    renderAll();
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.classList.add("error");
    console.error(err);
  }
}

init();
