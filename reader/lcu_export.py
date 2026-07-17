"""
Reads your local League client's Arena God challenge progress (which champions
you've won an Arena game with) via the LCU (League Client Update) local API,
and writes it to a JSON file in ../data/ for the shared dashboard to pick up.

Usage:
    python lcu_export.py [--league-path "C:\\Path\\To\\League of Legends"]

Requires the League client to be running and logged in.
After running, commit + push the generated file in ../data/ so the shared
dashboard picks up your progress.
"""

import argparse
import base64
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import psutil
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

ARENA_GOD_CHALLENGE_ID = "602002"

# Filled in by the repo owner before building the friend-facing .exe.
# When set, the script POSTs progress to this Worker instead of writing
# files locally + requiring git. Leave blank to keep the old local-file /
# git workflow (useful for the repo owner's own testing).
WEBHOOK_URL = ""
SYNC_KEY = ""

COMMON_LOCKFILE_PATHS = [
    r"C:\Riot Games\League of Legends\lockfile",
    r"C:\Program Files\Riot Games\League of Legends\lockfile",
    r"C:\Program Files (x86)\Riot Games\League of Legends\lockfile",
    r"D:\Riot Games\League of Legends\lockfile",
    r"E:\Riot Games\League of Legends\lockfile",
]


def find_credentials_from_process():
    """Scan running processes for the League client's LCU port + auth token."""
    for proc in psutil.process_iter(["name", "cmdline"]):
        name = (proc.info.get("name") or "").lower()
        if name not in ("leagueclientux.exe", "leagueclientux"):
            continue
        cmdline = proc.info.get("cmdline") or []
        args = " ".join(cmdline)

        port_match = re.search(r"--app-port=(\d+)", args)
        token_match = re.search(r"--remoting-auth-token=([\w-]+)", args)
        if port_match and token_match:
            return {
                "port": int(port_match.group(1)),
                "password": token_match.group(1),
            }
    return None


def parse_lockfile(path: Path):
    if not path.exists():
        return None
    parts = path.read_text(encoding="utf-8").strip().split(":")
    if len(parts) != 5:
        return None
    _process_name, _pid, port, password, _protocol = parts
    return {"port": int(port), "password": password}


def find_credentials(custom_league_path: str | None):
    creds = find_credentials_from_process()
    if creds:
        return creds

    candidates = list(COMMON_LOCKFILE_PATHS)
    if custom_league_path:
        candidates.insert(0, str(Path(custom_league_path) / "lockfile"))

    for candidate in candidates:
        creds = parse_lockfile(Path(candidate))
        if creds:
            return creds

    return None


def make_session(password: str) -> requests.Session:
    session = requests.Session()
    session.verify = False
    session.auth = ("riot", password)
    session.headers.update({"Accept": "application/json"})
    return session


def slugify(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", normalized).strip("-").lower()
    return slug or "unknown-summoner"


def fetch_champion_names() -> dict[str, str]:
    """Map champion numeric id (as string) -> display name, via Data Dragon."""
    versions = requests.get(
        "https://ddragon.leagueoflegends.com/api/versions.json", timeout=10
    ).json()
    latest = versions[0]
    champion_data = requests.get(
        f"https://ddragon.leagueoflegends.com/cdn/{latest}/data/en_US/champion.json",
        timeout=10,
    ).json()

    id_to_name = {}
    for champ in champion_data["data"].values():
        id_to_name[champ["key"]] = champ["name"]
    return id_to_name


def update_manifest(data_dir: Path, filename: str) -> None:
    """Keep data/manifest.json listing every player file, so the static
    dashboard can find them without directory listing or a GitHub API call."""
    manifest_path = data_dir / "manifest.json"
    if manifest_path.exists():
        files = set(json.loads(manifest_path.read_text(encoding="utf-8")))
    else:
        files = set()
    files.add(filename)
    manifest_path.write_text(
        json.dumps(sorted(files), indent=2), encoding="utf-8"
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--league-path",
        help=r'Custom League of Legends install path, e.g. "D:\Riot Games\League of Legends"',
        default=None,
    )
    args = parser.parse_args()

    creds = find_credentials(args.league_path)
    if not creds:
        print(
            "Could not find a running League client. Make sure the client is "
            "open and logged in, then try again. If installed to a custom "
            "location, pass --league-path."
        )
        sys.exit(1)

    port = creds["port"]
    session = make_session(creds["password"])
    base = f"https://127.0.0.1:{port}"

    summoner_resp = session.get(f"{base}/lol-summoner/v1/current-summoner", timeout=10)
    summoner_resp.raise_for_status()
    summoner = summoner_resp.json()
    display_name = summoner.get("gameName") or summoner.get("displayName") or "Unknown"
    tag_line = summoner.get("tagLine")
    full_name = f"{display_name}#{tag_line}" if tag_line else display_name

    challenges_resp = session.get(
        f"{base}/lol-challenges/v1/challenges/local-player", timeout=10
    )
    challenges_resp.raise_for_status()
    all_challenges = challenges_resp.json()

    arena_challenge = all_challenges.get(ARENA_GOD_CHALLENGE_ID)
    if not arena_challenge:
        print(
            f"Challenge {ARENA_GOD_CHALLENGE_ID} (Arena God) was not returned by "
            "the client. It may have been renumbered by Riot in a later patch."
        )
        sys.exit(1)

    completed_ids = {str(cid) for cid in arena_challenge.get("completedIds", [])}

    print("Fetching champion name list from Data Dragon...")
    id_to_name = fetch_champion_names()

    champions = [
        {"id": int(champ_id), "name": name, "done": champ_id in completed_ids}
        for champ_id, name in id_to_name.items()
    ]
    champions.sort(key=lambda c: c["name"])

    output = {
        "summoner": full_name,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "completedCount": len(completed_ids),
        "totalChampions": len(champions),
        "champions": champions,
    }

    print(f"{full_name}: {len(completed_ids)}/{len(champions)} champions done")

    if WEBHOOK_URL:
        resp = requests.post(
            WEBHOOK_URL,
            json=output,
            headers={"X-Sync-Key": SYNC_KEY},
            timeout=15,
        )
        if resp.ok:
            print("Synced. The shared dashboard will update in a few seconds.")
        else:
            print(f"Sync failed ({resp.status_code}): {resp.text}")
            sys.exit(1)
    else:
        data_dir = Path(__file__).resolve().parent.parent / "data"
        data_dir.mkdir(exist_ok=True)
        filename = f"{slugify(full_name)}.json"
        out_path = data_dir / filename
        out_path.write_text(json.dumps(output, indent=2), encoding="utf-8")
        update_manifest(data_dir, filename)
        print(f"Wrote {out_path}")
        print(
            "\nNext: commit + push this file (git add, commit, push) so the shared "
            "dashboard picks up your progress."
        )


if __name__ == "__main__":
    main()
