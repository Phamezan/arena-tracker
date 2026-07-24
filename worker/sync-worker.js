/**
 * Cloudflare Worker: commits Arena God progress into this repo's data/
 * folder via the GitHub Contents API, so the static dashboard (which reads
 * data/manifest.json + data/<player>.json) picks it up. Two callers, two
 * payload shapes:
 *
 * 1. Full snapshot (from reader/lcu_export.py, run manually/once per
 *    friend to seed historical progress from the local LCU challenge data
 *    — the public Riot API has no per-champion "ever won with" aggregate):
 *      { summoner, updatedAt, completedCount, totalChampions,
 *        champions: [{ id, name, done }, ...] }
 *    Overwrites the player's file wholesale.
 *
 * 2. Win event (from the ArenaWatcher bot, polling Riot's match API and
 *    firing this on every detected Arena win going forward):
 *      { summoner, championName }
 *    championName is Riot's internal champion id (participant.championName
 *    in the match API), not the display name. Bootstraps the player's file
 *    from Data Dragon (all champions done:false) if it doesn't exist yet,
 *    then flips just that one champion to done:true.
 *
 * Required secrets/vars (set with `wrangler secret put <NAME>` for secrets,
 * or in wrangler.toml [vars] for the rest):
 *   GITHUB_TOKEN   - fine-grained PAT, Contents: Read and write, scoped to
 *                    this one repo only. Secret.
 *   SYNC_KEY       - shared secret sent in the X-Sync-Key header by both
 *                    callers. Secret.
 *   GITHUB_OWNER   - your GitHub username.
 *   GITHUB_REPO    - repo name, e.g. "arena-tracker".
 *   GITHUB_BRANCH  - defaults to "main" if unset.
 *
 * Win events are gated on data/players.json in the repo (a plain JSON
 * array of "Name#Tag" Riot IDs): events from anyone else are rejected
 * with 403 so lobby randoms can't get data files bootstrapped for them.
 * Full snapshots are unaffected — they're run manually, one per player.
 */

const GITHUB_API = "https://api.github.com";
const DDRAGON_VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";

function slugify(name) {
  return (
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "unknown-summoner"
  );
}

function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function base64ToUtf8(str) {
  return decodeURIComponent(escape(atob(str)));
}

async function githubRequest(env, path, options = {}) {
  return fetch(`${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "arena-tracker-sync-worker",
      ...(options.headers || {}),
    },
  });
}

async function getFile(env, path, branch) {
  const resp = await githubRequest(env, `/contents/${path}?ref=${branch}`);
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`GET ${path} failed: ${resp.status} ${await resp.text()}`);
  return resp.json(); // { sha, content (base64), ... }
}

async function putFile(env, path, branch, contentStr, sha, message) {
  const resp = await githubRequest(env, `/contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: utf8ToBase64(contentStr),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!resp.ok) throw new Error(`PUT ${path} failed: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

/** Map Riot's internal champion id (e.g. "MonkeyKing") to { id: numericId, name: displayName }. */
async function fetchChampionMap() {
  const versions = await (await fetch(DDRAGON_VERSIONS_URL)).json();
  const latest = versions[0];
  const championData = await (
    await fetch(`https://ddragon.leagueoflegends.com/cdn/${latest}/data/en_US/champion.json`)
  ).json();

  const map = new Map();
  for (const champ of Object.values(championData.data)) {
    map.set(champ.id, { id: Number(champ.key), name: champ.name });
  }
  return map;
}

async function ensureManifestHasFile(env, branch, filename) {
  const manifestPath = "data/manifest.json";
  const existingManifest = await getFile(env, manifestPath, branch);
  const manifestFiles = existingManifest
    ? new Set(JSON.parse(base64ToUtf8(existingManifest.content)))
    : new Set();
  if (manifestFiles.has(filename)) return;

  manifestFiles.add(filename);
  await putFile(
    env,
    manifestPath,
    branch,
    JSON.stringify([...manifestFiles].sort(), null, 2),
    existingManifest?.sha,
    `sync: add ${filename} to manifest`
  );
}

function validateSnapshotPayload(body) {
  if (typeof body.summoner !== "string" || !body.summoner.trim()) return "Missing summoner";
  if (!Array.isArray(body.champions)) return "Missing champions array";
  for (const c of body.champions) {
    if (typeof c.id !== "number" || typeof c.name !== "string" || typeof c.done !== "boolean") {
      return "Malformed champion entry";
    }
  }
  return null;
}

async function handleSnapshot(body, env) {
  const validationError = validateSnapshotPayload(body);
  if (validationError) return new Response(validationError, { status: 400 });

  const branch = env.GITHUB_BRANCH || "main";
  const filename = `${slugify(body.summoner)}.json`;
  const dataPath = `data/${filename}`;

  const existingFile = await getFile(env, dataPath, branch);
  const existingDoc = existingFile ? JSON.parse(base64ToUtf8(existingFile.content)) : null;

  // Manually-set fields (e.g. avatar) aren't sent by the reader script — carry
  // them over instead of letting a re-sync silently wipe them.
  const doc = existingDoc?.avatar && !body.avatar ? { ...body, avatar: existingDoc.avatar } : body;

  await putFile(
    env,
    dataPath,
    branch,
    JSON.stringify(doc, null, 2),
    existingFile?.sha,
    `sync: update ${filename} via reader (full snapshot)`
  );

  await ensureManifestHasFile(env, branch, filename);

  return new Response(JSON.stringify({ ok: true, filename }), {
    headers: { "Content-Type": "application/json" },
  });
}

function validateWinPayload(body) {
  if (typeof body.summoner !== "string" || !body.summoner.trim()) return "Missing summoner";
  if (typeof body.championName !== "string" || !body.championName.trim()) return "Missing championName";
  return null;
}

async function handleWin(body, env) {
  const validationError = validateWinPayload(body);
  if (validationError) return new Response(validationError, { status: 400 });

  // Gate win events on the roster in data/players.json — the watcher can
  // see lobby randoms and we don't want data files bootstrapped for them.
  // Adding a friend = one edit to that file; snapshots stay unrestricted.
  const rosterFile = await getFile(env, "data/players.json", env.GITHUB_BRANCH || "main");
  if (rosterFile) {
    const roster = JSON.parse(base64ToUtf8(rosterFile.content));
    if (!roster.includes(body.summoner)) {
      return new Response(`Summoner "${body.summoner}" is not on the roster`, { status: 403 });
    }
  }

  const championMap = await fetchChampionMap();
  const champion = championMap.get(body.championName);
  if (!champion) {
    return new Response(`Unknown championName "${body.championName}"`, { status: 400 });
  }

  const branch = env.GITHUB_BRANCH || "main";
  const filename = `${slugify(body.summoner)}.json`;
  const dataPath = `data/${filename}`;

  const existingFile = await getFile(env, dataPath, branch);
  const doc = existingFile
    ? JSON.parse(base64ToUtf8(existingFile.content))
    : {
        summoner: body.summoner,
        completedCount: 0,
        totalChampions: championMap.size,
        champions: [...championMap.values()]
          .map((c) => ({ id: c.id, name: c.name, done: false }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };

  const entry = doc.champions.find((c) => c.id === champion.id);
  if (entry) {
    entry.done = true;
  } else {
    doc.champions.push({ id: champion.id, name: champion.name, done: true });
  }
  doc.completedCount = doc.champions.filter((c) => c.done).length;
  doc.updatedAt = new Date().toISOString();

  await putFile(
    env,
    dataPath,
    branch,
    JSON.stringify(doc, null, 2),
    existingFile?.sha,
    `sync: ${body.summoner} won on ${champion.name}`
  );

  await ensureManifestHasFile(env, branch, filename);

  return new Response(
    JSON.stringify({ ok: true, filename, championName: champion.name, done: true }),
    { headers: { "Content-Type": "application/json" } }
  );
}

async function handleRequest(request, env) {
  if (request.headers.get("X-Sync-Key") !== env.SYNC_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return new Response("Body must be a JSON object", { status: 400 });
  }

  return Array.isArray(body.champions) ? handleSnapshot(body, env) : handleWin(body, env);
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    try {
      return await handleRequest(request, env);
    } catch (err) {
      return new Response(`Sync failed: ${err.message}`, { status: 500 });
    }
  },
};
