# Arena God Tracker

Shared "which champions have we won an Arena game with" tracker for a friend
group. Reads each person's progress straight from their own League client
(no fan-site account, nothing to lose if a site goes down) and shows it on a
free static dashboard hosted on GitHub Pages.

## How it works

1. Each friend runs a small `ArenaGodSync.exe` locally while their League
   client is open (double-click, no install). It talks to the client's local
   LCU API, reads the "Arena God" challenge (id `602002`) — the same one
   shown in-client under Profile > Challenges — and POSTs the result to a
   small Cloudflare Worker.
2. The Worker commits/updates `data/<friend>.json` and `data/manifest.json`
   in this repo via the GitHub API. Friends never touch git or GitHub.
3. The static site (`index.html` / `app.js`) reads `data/manifest.json`
   and every file it lists, straight from GitHub Pages, and renders a
   combined champion x player grid. No backend involved on the read side.

Nothing here depends on any third-party tracker site. The source of truth is
each friend's own League client / Riot account.

## Setup

### 1. One-time setup (repo owner only)

**Deploy the sync Worker:**

```
cd worker
wrangler deploy sync-worker.js --name arena-tracker-sync
wrangler secret put GITHUB_TOKEN   # fine-grained PAT, Contents: Read/write, this repo only
wrangler secret put SYNC_KEY       # any random string, e.g. `openssl rand -hex 16`
```

Set `GITHUB_OWNER`, `GITHUB_REPO`, and optionally `GITHUB_BRANCH` as plain
vars in `wrangler.toml` or via `wrangler deploy --var`. Note the Worker URL
`wrangler deploy` prints (e.g. `https://arena-tracker-sync.<you>.workers.dev`).

**Build the friend-facing exe:**

1. In `reader/lcu_export.py`, set `WEBHOOK_URL` to the Worker URL and
   `SYNC_KEY` to the same value used above.
2. `pip install pyinstaller` then, from `reader/`:
   `pyinstaller --onefile --name ArenaGodSync lcu_export.py`
3. Share the resulting `dist/ArenaGodSync.exe` with friends (Discord, Drive,
   wherever). Rebuild and re-share only if `WEBHOOK_URL`/`SYNC_KEY` change.

**Enable GitHub Pages:**

1. Push this repo to GitHub.
2. In the repo's Settings > Pages, set source to deploy from the `main`
   branch, root folder.
3. Site will be live at `https://<owner>.github.io/<repo>/`.

### 2. Friends

1. Open the League client and log in.
2. Double-click `ArenaGodSync.exe`.
3. Done — the shared dashboard updates within seconds. Re-run anytime
   progress changes.

No Python, git, or GitHub account required on their end.

## Notes

- The GitHub contents API used to list `data/` files is unauthenticated and
  rate-limited to 60 requests/hour per visitor IP. Fine for a small friend
  group; if it becomes a problem, switch to a static `data/manifest.json`
  listing filenames instead.
- Champion names/icons come from Riot's public Data Dragon / Community
  Dragon CDNs, not from any tracker site.
- If Riot ever renumbers the Arena God challenge ID, update
  `ARENA_GOD_CHALLENGE_ID` in `reader/lcu_export.py`.
