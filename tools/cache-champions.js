import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex');
const isPng = (bytes) => bytes.length > 8 && bytes.subarray(0, 8).equals(pngSignature);

// Keep downloads bounded; existing icons require no network access.
export async function cacheChampionIcons(ids, {
  outputDir = join(root, 'assets', 'champions'),
  refresh = false,
  fetchImage = fetch,
} = {}) {
  const pending = [...new Set(ids)];
  if (pending.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error('Champion IDs must be positive integers');
  }
  await mkdir(outputDir, { recursive: true });
  const failures = [];
  let downloaded = 0;
  let cached = 0;
  let fallbackUrls;
  async function request(url) {
    const response = await fetchImage(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  }
  async function download(url) {
    const bytes = Buffer.from(await (await request(url)).arrayBuffer());
    if (!isPng(bytes)) throw new Error('Response is not a PNG image');
    return bytes;
  }
  async function dataDragonUrl(id) {
    // Share metadata across concurrent fallback downloads; never load it for cache hits.
    fallbackUrls ??= (async () => {
      const [version] = await (await request('https://ddragon.leagueoflegends.com/api/versions.json')).json();
      const base = `https://ddragon.leagueoflegends.com/cdn/${version}`;
      const champions = await (await request(`${base}/data/en_US/champion.json`)).json();
      return new Map(Object.values(champions.data).map((champion) =>
        [Number(champion.key), `${base}/img/champion/${champion.image.full}`],
      ));
    })();
    const url = (await fallbackUrls).get(id);
    if (!url) throw new Error(`No Data Dragon icon for champion ${id}`);
    return url;
  }
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (pending.length) {
      const id = pending.shift();
      const path = join(outputDir, `${id}.png`);
      try {
        if (!refresh) {
          const existing = await readFile(path).catch((error) => {
            if (error.code === 'ENOENT') return Buffer.alloc(0);
            throw error;
          });
          if (isPng(existing)) {
            cached++;
            continue;
          }
        }
        let bytes;
        try {
          bytes = await download(`https://cdn.communitydragon.org/latest/champion/${id}/square`);
        } catch {
          bytes = await download(await dataDragonUrl(id));
        }
        // Only replace a good cached image after a complete, validated download.
        await writeFile(`${path}.tmp`, bytes);
        await rename(`${path}.tmp`, path);
        downloaded++;
      } catch (error) {
        failures.push(`${id}: ${error.message}`);
      }
    }
  }));
  if (failures.length) throw new Error(`Champion downloads failed:\n${failures.join('\n')}`);
  return { downloaded, cached };
}

async function main() {
  const files = JSON.parse(await readFile(join(root, 'data', 'manifest.json'), 'utf8'));
  const ids = [];
  for (const file of files) {
    const player = JSON.parse(await readFile(join(root, 'data', file), 'utf8'));
    ids.push(...player.champions.map((champion) => champion.id));
  }
  const wins = JSON.parse(await readFile(join(root, 'data', 'recent-wins.json'), 'utf8'));
  ids.push(...wins.map((win) => win.championId));
  const result = await cacheChampionIcons(ids, { refresh: process.argv.includes('--refresh') });
  console.log(`Champion icons: ${result.downloaded} downloaded, ${result.cached} already cached.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
