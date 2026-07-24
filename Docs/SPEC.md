# Arena Tracker — Architecture Spec

Status: decided 2026-07-24, implementation in progress.
This document records what we learned investigating the win-count
discrepancy and the architecture that follows from it.

## 1. The problem

The dashboard showed more wins than the League client: Phamezan 131 vs
108, SimonSuper 73 vs ~23. Suspected bug in the counting pipeline; turned
out the pipeline was faithfully mirroring its source — it was reading a
*different counter* than the one the users look at.

## 2. Key finding: two different "wins per champion" counters

The League client exposes two distinct counts of "champions you've placed
first with in Arena":

- **LCU challenge `602002` ("Adapt to All Situations")** — *all-time*,
  accumulated across every Arena rotation since 2023. This is the
  challenge that grants the **Arena God** title (Master threshold: 60
  champions; currentValue can far exceed that). Category: `LEGACY`.
  This is what `reader/lcu_export.py` backfilled from.
- **The Arena hub's "Season Journey" screen** — *current season only*.
  This is the number players actually quote ("I have 108").

Proof (live LCU query + match history): Phamezan's challenge says 132,
his Season Journey says 108. Per-champion evidence: Kha'Zix and Kayn are
`done` in the challenge data but unchecked on the Season Journey — won
in a previous Arena rotation, not this season.

Consequence: any tracker seeded from challenge 602002 overstates the
season number by exactly the champions won in previous rotations.

## 3. Season-scoped reconstruction via the Riot match API

The seasonal set can be rebuilt from match-v5 alone — no client, no
install, works for any player:

- Arena queue ids: **1700, 1710, 1740, 1750** (the current Arena run
  happens almost entirely on **1750**; 1700 was the 2023/2024 queue).
- A win for this purpose is **`subteamPlacement == 1`** on the player's
  participant (not `win`, whose Arena semantics are unreliable). This is
  the same condition the ArenaWatcher bot uses.
- Validated against ground truth: reconstructing Phamezan's set from
  match history reproduces the client's **108 exactly**.

Season start date, pinned empirically from win data:

- Any cutoff 2025-07-15 → 2026-04-15 reproduces Phamezan's 108 (flat).
- SimonSuper's history (6 unique champs won 2025-07-12–14, then nothing
  until 2026-06) rules out a start before ~2025-08: his count is 30 from
  2025-07-11 but **23 from 2025-08-01 onward — matching his client's ~23**.
- Remaining candidates: **2025-08-26** (LoL Season 3 2025) or
  **2026-01-08** (LoL 2026 Season 1; Riot teased an Arena "progression
  reset in early 2026"). Phamezan's data rules out any reset after
  2026-04-15. Sole known discriminator: Poisom's client showing 33
  (→ Aug 2025) vs 32 (→ Jan 2026). **To be confirmed, then recorded in
  `data/season.json`.**

Rate limits: a dev API key (100 req / 2 min) handles a full-season
backfill of ~500 matches per player in ~15 min at 1.3 s request pacing.
Fine for per-season runs; steady-state sync needs only the few new
matches per poll.

## 4. Target architecture (no installs, no extra infra)

- **`data/players.json`** — single roster of tracked Riot IDs
  ("Name#Tag"). Read by the sync worker (gates win events, 403 for
  non-roster) and by ArenaWatcher (`RosterUrl`, falls back to its
  appsettings `TrackedPlayers`). Adding a friend = one line here.
- **`data/season.json`** — the current season start date. Bumping it is
  the season rollover.
- **ArenaWatcher** (existing 24/7 .NET service, holds the Riot key) —
  does all Riot API work. Steady state: detects first-place wins while
  polling for Discord posts and syncs them. Season sync: at startup it
  compares `data/season.json` against its stored state; on change it
  re-scans every roster player's matches since `seasonStart` and pushes
  full snapshots (`SeasonBackfillService`, also runnable via
  `--backfill-season`). Snapshots overwrite player files, so the board
  resets to 0 exactly like the client's Season Journey.
- **Cloudflare Worker** (`worker/`) — dumb commit pipe into the repo +
  roster gate. No cron, no Riot key outside the VPS.
- **Dashboard** — static site, ES modules under `js/` (split from the
  old monolithic `app.js`), reads `data/manifest.json` + player files.

Retired by this design: the friend-facing reader EXE, its Inno
installer, the PyInstaller artifacts, and the LCU-based backfill
(`reader/lcu_export.py`) — all deleted.

## 5. Player data file format

```json
{
  "summoner": "Name#Tag",
  "updatedAt": "2026-07-24T20:37:28.000Z",
  "seasonStart": "2026-01-08T00:00:00.000Z",
  "source": "match-v5-season",
  "completedCount": 108,
  "totalChampions": 173,
  "champions": [{ "id": 1, "name": "Annie", "done": false }, ...]
}
```

`seasonStart` + `source` are new; older files without them are the
legacy all-time format. The worker passes unknown fields through on
snapshots and preserves manually-set fields (e.g. `avatar`).

## 6. Season rollover procedure

Everything lives in the ArenaWatcher — this repo carries no code besides
the worker and the static site.

1. When a new Arena season starts, run the watcher's calibration on one or
   two players: `--calibrate-season "Name#Tag" [--since YYYY-MM-DD]`. It
   scans their match history and prints unique first-place champion counts
   per candidate cutoff date.
2. Match the count against the client's Season Journey screen to pin the
   exact season start (same method used to pin 2026-01-08 for the current
   season).
3. Put the date in `data/season.json` and restart the watcher: it detects
   the change, re-scans every roster player, and overwrites their files —
   the board resets to zero exactly like the client.
