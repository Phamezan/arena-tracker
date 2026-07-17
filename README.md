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

Progress updates automatically, with nothing for players to install or run
day-to-day:

- **[ArenaWatcher](https://github.com/Phamezan/ArenaWatcher)** polls the
  Riot API for each tracked player and detects new Arena wins as they
  happen, posting results to Discord and syncing them here.
- A small **Cloudflare Worker** (`worker/`) receives that sync and commits
  the update straight into this repo's `data/` folder.
- The dashboard (`index.html` / `app.js`) is a static site hosted on GitHub
  Pages that reads `data/` and renders the grid. No backend on the read
  side — it's just files.

One exception: a player's *historical* Arena wins (from before they were
being tracked) can't be reconstructed from the public Riot API — that data
only exists in the League client itself. `reader/` is a small one-time tool
a player can run locally to backfill that history; after that, everything
is automatic.

## Running your own

This is built to be forked and pointed at your own friend group. You'll
need:

1. A GitHub repo with Pages enabled (serves the dashboard).
2. A Cloudflare Worker deployed from `worker/` (syncs data into the repo).
3. An [ArenaWatcher](https://github.com/Phamezan/ArenaWatcher) instance
   somewhere always-on, configured to point at your Worker.

Full setup walkthrough in [`SETUP.md`](SETUP.md).

## Notes

- Champion names/icons come from Riot's public Data Dragon / Community
  Dragon CDNs.
- Not affiliated with Riot Games.
