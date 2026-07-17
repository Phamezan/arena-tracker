/**
 * Cloudflare Worker: receives Arena God progress JSON from friends' local
 * reader script (no git/GitHub required on their end) and commits it into
 * this repo's data/ folder via the GitHub Contents API, so the existing
 * static dashboard (which reads data/manifest.json + data/<player>.json)
 * picks it up unchanged.
 *
 * Required secrets/vars (set with `wrangler secret put <NAME>` for secrets,
 * or in wrangler.toml [vars] for the rest):
 *   GITHUB_TOKEN   - fine-grained PAT, Contents: Read and write, scoped to
 *                    this one repo only. Secret.
 *   SYNC_KEY       - shared secret the reader script sends in the
 *                    X-Sync-Key header. Not a real security boundary
 *                    (it ships inside the exe), just keeps random internet
 *                    traffic off your GitHub token. Secret.
 *   GITHUB_OWNER   - your GitHub username.
 *   GITHUB_REPO    - repo name, e.g. "arena-tracker".
 *   GITHUB_BRANCH  - defaults to "main" if unset.
 */

const GITHUB_API = "https://api.github.com";

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
  const resp = await fetch(`${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "arena-tracker-sync-worker",
      ...(options.headers || {}),
    },
  });
  return resp;
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

function validatePayload(body) {
  if (!body || typeof body !== "object") return "Body must be a JSON object";
  if (typeof body.summoner !== "string" || !body.summoner.trim()) return "Missing summoner";
  if (!Array.isArray(body.champions)) return "Missing champions array";
  for (const c of body.champions) {
    if (typeof c.id !== "number" || typeof c.name !== "string" || typeof c.done !== "boolean") {
      return "Malformed champion entry";
    }
  }
  return null;
}

async function handleSync(request, env) {
  if (request.headers.get("X-Sync-Key") !== env.SYNC_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const validationError = validatePayload(body);
  if (validationError) return new Response(validationError, { status: 400 });

  const branch = env.GITHUB_BRANCH || "main";
  const filename = `${slugify(body.summoner)}.json`;
  const dataPath = `data/${filename}`;
  const manifestPath = "data/manifest.json";

  const existingFile = await getFile(env, dataPath, branch);
  const fileContent = JSON.stringify(body, null, 2);
  await putFile(
    env,
    dataPath,
    branch,
    fileContent,
    existingFile?.sha,
    `sync: update ${filename} via reader`
  );

  const existingManifest = await getFile(env, manifestPath, branch);
  const manifestFiles = existingManifest
    ? new Set(JSON.parse(base64ToUtf8(existingManifest.content)))
    : new Set();
  if (!manifestFiles.has(filename)) {
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

  return new Response(JSON.stringify({ ok: true, filename }), {
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    try {
      return await handleSync(request, env);
    } catch (err) {
      return new Response(`Sync failed: ${err.message}`, { status: 500 });
    }
  },
};
