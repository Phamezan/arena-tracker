const DATA_DIR = "data";

const statusEl = document.getElementById("status");
const controlsEl = document.getElementById("controls");
const summaryEl = document.getElementById("summary");
const gridWrapEl = document.getElementById("gridWrap");
const gridEl = document.getElementById("grid");
const searchEl = document.getElementById("search");
const hideDoneEl = document.getElementById("hideDone");
const onlyMissingEl = document.getElementById("onlyMissing");
const focusEl = document.getElementById("focusPlayer");

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

function championIconUrl(id) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${id}.png`;
}

function isChampionDoneForFocus(champId, focus) {
  const player = players.find((p) => p.summoner === focus);
  return player ? !!player.championsById.get(champId) : false;
}

function renderGrid() {
  gridEl.innerHTML = "";

  const query = searchEl.value.trim().toLowerCase();
  const hideDone = hideDoneEl.checked;
  const onlyMissing = onlyMissingEl.checked;
  const focus = focusEl.value;

  for (const champ of champions) {
    if (query && !champ.name.toLowerCase().includes(query)) continue;

    const everyoneHas = players.every((p) => p.championsById.get(champ.id));
    const nobodyHas = players.every((p) => !p.championsById.get(champ.id));

    if (hideDone && everyoneHas) continue;
    if (onlyMissing && !nobodyHas) continue;

    const done = isChampionDoneForFocus(champ.id, focus);

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

    gridEl.appendChild(card);
  }
}

function renderAll() {
  renderSummary();
  renderGrid();
}

[searchEl, hideDoneEl, onlyMissingEl, focusEl].forEach((el) =>
  el.addEventListener("input", renderGrid)
);

async function init() {
  try {
    await loadData();
    statusEl.classList.add("hidden");
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
