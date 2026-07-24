import { state } from "./state.js";

const summaryEl = document.getElementById("summary");

export function renderSummary() {
  summaryEl.innerHTML = "";

  const totalChamps = state.champions.length;
  const everyoneCount = state.champions.filter((c) =>
    state.players.every((p) => p.championsById.get(c.id))
  ).length;
  const nobodyCount = state.champions.filter((c) =>
    state.players.every((p) => !p.championsById.get(c.id))
  ).length;

  const cards = [
    { label: "Champions", value: totalChamps },
    { label: "Players", value: state.players.length },
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
