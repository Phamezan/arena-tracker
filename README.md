# Arena God Tracker

Shared "which champions have we won an Arena game with" tracker for a friend
group. Shows a combined champion x player grid on a free static dashboard
hosted on GitHub Pages.

## How it works

Three pieces:

1. **[ArenaWatcher](https://github.com/Phamezan/ArenaWatcher)** — a bot you
   run centrally (VPS), already polling the Riot API per tracked player for
   Discord win posts. Extended here to also POST each detected Arena win
   (`{ summoner, championName }`) to the sync Worker below, so the dashboard
   updates automatically going forward. Friends do nothing for this to work.
2. **`worker/sync-worker.js`** (Cloudflare Worker) — receives that POST and
   commits `data/<player>.json` + `data/manifest.json` in this repo via the
   GitHub Contents API. Holds the GitHub token server-side; nothing that
   touches a friend's machine ever sees it.
3. **`index.html` / `app.js`** — static dashboard on GitHub Pages, reads
   `data/manifest.json` and every file it lists, renders the grid. No
   backend on the read side.

**One-time backfill per friend:** ArenaWatcher only sees wins from whenever
it started polling — the public Riot API has no "every champion this player
has ever won an Arena game with" aggregate, only recent match history. That
aggregate only exists via the League client's own local LCU API. So
`reader/lcu_export.py` (built into `ArenaGodSync.exe`) exists purely to seed
that historical data once per friend, by POSTing a full snapshot to the same
Worker. After that one run, ArenaWatcher keeps their file updated
automatically — no need to run the exe again unless progress somehow drifts.

## Setup

### 1. One-time setup (repo owner only)

**Deploy the sync Worker:**

```
cd worker
npm install
npx wrangler deploy
npx wrangler secret put GITHUB_TOKEN   # fine-grained PAT, Contents: Read/write, this repo only
npx wrangler secret put SYNC_KEY       # any random string, e.g. `openssl rand -hex 16`
```

Set `GITHUB_OWNER`, `GITHUB_REPO`, and optionally `GITHUB_BRANCH` as plain
vars in `wrangler.toml`. Note the Worker URL `wrangler deploy` prints (e.g.
`https://arena-tracker-sync.<you>.workers.dev`).

**Wire up ArenaWatcher:**

In the ArenaWatcher deployment env, set `ARENA_TRACKER_WEBHOOK_URL` to the
Worker URL above and `ARENA_TRACKER_SYNC_KEY` to the same `SYNC_KEY` value.
Redeploy the bot. See that repo's own README/DEPLOYMENT docs for specifics.

**Build the friend-facing backfill exe:**

1. `cd reader`, copy `local_config.example.py` to `local_config.py`, fill in
   the same `WEBHOOK_URL` / `SYNC_KEY` as above. `local_config.py` is
   gitignored — real values never land in the public repo.
2. `pip install -r requirements.txt pyinstaller`, then:
   `pyinstaller --onefile --name ArenaGodSync lcu_export.py`
3. Share the resulting `dist/ArenaGodSync.exe` with friends (Discord, Drive,
   wherever) as a one-time backfill step.

**Enable GitHub Pages:**

1. Push this repo to GitHub.
2. In the repo's Settings > Pages, set source to deploy from the `main`
   branch, root folder.
3. Site will be live at `https://<owner>.github.io/<repo>/`.

### 2. Friends

1. Open the League client and log in, once.
2. Double-click `ArenaGodSync.exe`, once — this backfills your history.
3. Done. From here on, every Arena win you play is picked up automatically
   by ArenaWatcher and reflected on the dashboard within seconds. Nothing
   further to run.

No Python, git, or GitHub account required on their end.

## Notes

- Champion names/icons come from Riot's public Data Dragon / Community
  Dragon CDNs, not from any tracker site.
- If Riot ever renumbers the Arena God challenge ID, update
  `ARENA_GOD_CHALLENGE_ID` in `reader/lcu_export.py`.
- ArenaWatcher's win events use Riot's internal champion id (e.g.
  `MonkeyKing`); the Worker resolves that to Data Dragon's numeric champion
  id/display name before writing.
