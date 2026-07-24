// Shared state, populated by loadData() in data.js.
export const state = {
  players: [], // [{ summoner, updatedAt, avatar, tag, championsById: Map<id, done>, rankClass }]
  champions: [], // [{ id, name }]
};
