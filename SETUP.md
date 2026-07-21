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

### 3a. Build the EXE

```bash
cd reader
cp local_config.example.py local_config.py   # fill in WEBHOOK_URL / SYNC_KEY from step 1
pip install -r requirements.txt pyinstaller
pyinstaller ArenaSync.spec                    # name + version metadata baked in
```

`local_config.py` is gitignored — real values never land in the public
repo. This produces `dist/ArenaSync.exe` with embedded version info so
Windows properties show "ArenaSync 1.0.0.0 / Phamezan" instead of
"Unknown".

### 3b. Wrap in the installer (recommended)

Bare `.exe` files trigger Chrome's unsafe-download wall and Microsoft
SmartScreen's "unknown publisher" because they're unsigned and have zero
reputation. Wrapping the EXE in an Inno Setup installer gives friends a
proper "Install ArenaSync 1.0.0" wizard, Start Menu shortcut, uninstaller,
and is flagged noticeably less aggressively than a raw EXE.

```bash
# Install Inno Setup 6 once: https://jrsoftware.org/isdl.php
iscc reader\installer\ArenaSync.iss
# Output: reader\installer\Output\ArenaSyncSetup-1.0.0.exe
```

Ship that installer (not the bare EXE). See `reader/installer/README.txt`
for what the end-user experience looks like.

### 3c. Reduce SmartScreen / Chrome warnings (ongoing)

Even with the installer, the first downloads will still get flagged
because the file is unsigned and Microsoft has no reputation for the
hash. Three things help, in order of impact:

1. **Submit the built installer to Microsoft for reputation review**
   (free): <https://www.microsoft.com/en-us/wdsi/filesubmission>.
   After a few days SmartScreen usually stops flagging it.
2. **Publish the SHA256 checksum** next to the download so friends can
   verify they got the file you built:
   `certutil -hashfile ArenaSyncSetup-1.0.0.exe SHA256`.
3. **Code-signing certificate** ($100–400/yr OV; $300+ EV) is the only
   thing that fully removes "Unknown publisher". OV clears SmartScreen
   in weeks once reputation builds; EV bypasses it immediately.



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
