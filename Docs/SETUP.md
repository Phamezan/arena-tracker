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

## 2. Wire up ArenaWatcher (optional, Discord only)

In your [ArenaWatcher](https://github.com/Phamezan/ArenaWatcher) deployment,
set `ARENA_TRACKER_WEBHOOK_URL` to the Worker URL above and
`ARENA_TRACKER_SYNC_KEY` to the same `SYNC_KEY` value, then restart it. See
that repo's `DEPLOYMENT.md`. Set its `RosterUrl` to this repo's
`data/players.json` (raw GitHub URL) so the tracked-player list lives in
one place.

## 3. Add players

Edit `data/players.json` (a plain JSON array of `"Name#Tag"` Riot IDs)
and commit. The worker only accepts win data for players on this roster.

## 4. Enable GitHub Pages

1. Push this repo to GitHub.
2. Settings > Pages > deploy from the `main` branch, root folder.
3. Site is live at `https://<owner>.github.io/<repo>/`.

## Notes

- Season rollover: when a new Arena season starts, pin its start date with
  the watcher's `--calibrate-season "Name#Tag"` flag (prints unique-win
  counts per candidate cutoff — match it against the client's Season
  Journey number), put the date in `data/season.json`, and restart the
  watcher. It re-scans everyone and the board resets like the client.
- ArenaWatcher's win events use Riot's internal champion id (e.g.
  `MonkeyKing`); the Worker resolves that to Data Dragon's numeric champion
  id/display name before writing.
