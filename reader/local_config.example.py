"""
Copy this file to local_config.py (gitignored, never committed) and fill in
the real values before building the friend-facing .exe with PyInstaller.

WEBHOOK_URL comes from `npx wrangler deploy` output in worker/.
SYNC_KEY is whatever random string you set via `wrangler secret put SYNC_KEY`.
"""

WEBHOOK_URL = ""
SYNC_KEY = ""
