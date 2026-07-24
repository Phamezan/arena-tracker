# Arena God Tracker

A shared dashboard that tracks which League of Legends champions a friend
group has each won an Arena game with — the same "Arena God" challenge
shown in-client under Profile > Challenges, aggregated across everyone into
one grid.

No accounts, no login, no third-party tracker site. Progress comes straight
from each player's own Riot account, and the whole thing runs on free static
hosting.

## What it looks like

A champion x player grid: every champion down one axis, every tracked
player across the other, a checkmark wherever someone's won an Arena game
with that champion. Filter by search, by player, or toggle "hide champions
everyone already has."

## How it stays up to date

Progress updates automatically, with nothing for players to install or run:

- A **Cloudflare Worker** (`worker/`) polls the Riot match API on a
  schedule for every player in `data/players.json`, detects new Arena
  first-place finishes, and commits updates straight into this repo's
  `data/` folder. It tracks the current Arena season and resets when a
  new season starts, matching the client's Season Journey.
- The dashboard (`index.html` / `js/`) is a static site hosted on GitHub
  Pages that reads `data/` and renders the grid. No backend on the read
  side — it's just files.
- **[ArenaWatcher](https://github.com/Phamezan/ArenaWatcher)** (optional)
  posts Arena results to Discord; it reads the same `data/players.json`
  roster.

See [`Docs/SPEC.md`](Docs/SPEC.md) for the full architecture and how the seasonal
count works.

## Running your own

This is built to be forked and pointed at your own friend group. You'll
need:

1. A GitHub repo with Pages enabled (serves the dashboard).
2. A Cloudflare Worker deployed from `worker/` (syncs data into the repo).
3. An [ArenaWatcher](https://github.com/Phamezan/ArenaWatcher) instance
   somewhere always-on, configured to point at your Worker.

Full setup walkthrough in [`Docs/SETUP.md`](Docs/SETUP.md).

## Notes

- Champion names/icons come from Riot's public Data Dragon / Community
  Dragon CDNs.
- Not affiliated with Riot Games.
