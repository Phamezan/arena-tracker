import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cacheChampionIcons } from '../tools/cache-champions.js';

const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082', 'hex');

async function directory(t) {
  const path = await mkdtemp(join(tmpdir(), 'champion-cache-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

test('downloads numeric champion icons and reuses them with the network unavailable', async (t) => {
  const outputDir = await directory(t);
  await cacheChampionIcons([266, 799, 266], { outputDir, fetchImage: async (url) => {
    assert.match(url, /^https:\/\/cdn\.communitydragon\.org\/latest\/champion\/(266|799)\/square$/);
    return new Response(png);
  } });
  await cacheChampionIcons([266, 799], { outputDir, fetchImage: async () => {
    throw new Error('Network unavailable');
  } });
  assert.deepEqual(await readFile(join(outputDir, '266.png')), png);
  assert.deepEqual(await readFile(join(outputDir, '799.png')), png);
});

test('failed refresh preserves the cached icon and reports the failure', async (t) => {
  const outputDir = await directory(t);
  await writeFile(join(outputDir, '1.png'), png);
  await assert.rejects(cacheChampionIcons([1], { outputDir, refresh: true,
    fetchImage: async () => new Response('Unavailable', { status: 503 }),
  }), /1/);
  assert.deepEqual(await readFile(join(outputDir, '1.png')), png);
});

test('rejects non-image responses without saving them', async (t) => {
  const outputDir = await directory(t);
  await assert.rejects(cacheChampionIcons([893], { outputDir,
    fetchImage: async () => new Response('<html>Error</html>'),
  }), /893/);
  await assert.rejects(readFile(join(outputDir, '893.png')), { code: 'ENOENT' });
});

test('refresh replaces an existing icon and repairs an invalid cached file', async (t) => {
  const outputDir = await directory(t);
  await writeFile(join(outputDir, '1.png'), 'broken');
  await cacheChampionIcons([1], { outputDir, fetchImage: async () => new Response(png) });
  const updated = Buffer.concat([png, Buffer.from('updated')]);
  await cacheChampionIcons([1], { outputDir, refresh: true,
    fetchImage: async () => new Response(updated),
  });
  assert.deepEqual(await readFile(join(outputDir, '1.png')), updated);
});

test('falls back to Data Dragon using the numeric ID mapping when CommunityDragon fails', async (t) => {
  const outputDir = await directory(t);
  await cacheChampionIcons([34], { outputDir, fetchImage: async (url) => {
    if (url.includes('communitydragon.org')) return new Response('Unavailable', { status: 502 });
    if (url.endsWith('/api/versions.json')) return Response.json(['16.19.1']);
    if (url.endsWith('/data/en_US/champion.json')) {
      return Response.json({ data: { Anivia: { key: '34', image: { full: 'Anivia.png' } } } });
    }
    assert.equal(url, 'https://ddragon.leagueoflegends.com/cdn/16.19.1/img/champion/Anivia.png');
    return new Response(png);
  } });
  assert.deepEqual(await readFile(join(outputDir, '34.png')), png);
});
