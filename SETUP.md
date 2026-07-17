# Setup (repo owner)

Deploying your own instance of the dashboard. One-time setup; after this,
everything updates itself.

## 1. Deploy the sync Worker

```bash
cd worker
npm install
npx wrangler deploy
npx wrangler secret put GITHUB_TOKEN   # fine-grained PAT, Contents: Read/write, this repo only
npx wrangler secret put SYNC_KEY       # any random string, e.g. `openssl rand -hex 16`
```

Set `GITHUB_OWNER`, `GITHUB_REPO`, and optionally `GITHUB_BRANCH` as plain
vars in `wrangler.toml`. Note the Worker URL `wrangler deploy` prints (e.g.
`https://arena-tracker-sync.<you>.workers.dev`) — you'll need it in the next
two steps.

## 2. Wire up ArenaWatcher

In your [ArenaWatcher](https://github.com/Phamezan/ArenaWatcher) deployment,
set `ARENA_TRACKER_WEBHOOK_URL` to the Worker URL above and
`ARENA_TRACKER_SYNC_KEY` to the same `SYNC_KEY` value, then restart it. See
that repo's `DEPLOYMENT.md`.

## 3. Build the friend-facing backfill tool

Only needed if a player wants to seed pre-existing Arena progress (the
public Riot API can't reconstruct history ArenaWatcher didn't personally
observe).

```bash
cd reader
cp local_config.example.py local_config.py   # fill in WEBHOOK_URL / SYNC_KEY from step 1
pip install -r requirements.txt pyinstaller
pyinstaller --onefile --name ArenaGodSync lcu_export.py
```

`local_config.py` is gitignored — real values never land in the public
repo. Share the resulting `dist/ArenaGodSync.exe` with players (Discord,
Drive, wherever). They run it once, with League open, while logged in.

## 4. Enable GitHub Pages

1. Push this repo to GitHub.
2. Settings > Pages > deploy from the `main` branch, root folder.
3. Site is live at `https://<owner>.github.io/<repo>/`.

## Notes

- If Riot ever renumbers the Arena God challenge ID (currently `602002`),
  update `ARENA_GOD_CHALLENGE_ID` in `reader/lcu_export.py`.
- ArenaWatcher's win events use Riot's internal champion id (e.g.
  `MonkeyKing`); the Worker resolves that to Data Dragon's numeric champion
  id/display name before writing.
