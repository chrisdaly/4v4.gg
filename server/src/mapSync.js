import config from './config.js';

const W3C_API = 'https://website-backend.w3champions.com/api';

// "Feralas LV" → "FeralasLV"  (strip (4) prefix, remove spaces + apostrophes)
function cleanMapName(name) {
  return name.replace(/^\(\d+\)\s*/, '').replace(/\s/g, '').replace(/'/g, '');
}

// "Feralas LV" → "Feralas_LV"  (for the Liquipedia page slug)
function liquipediaSlug(name) {
  return name.replace(/^\(\d+\)\s*/, '').replace(/\s+/g, '_');
}

async function fetchCurrentMaps() {
  const res = await fetch(`${W3C_API}/matches?gameMode=4&gateway=20&pageSize=100`);
  if (!res.ok) throw new Error(`W3C API ${res.status}`);
  const data = await res.json();
  const matches = Array.isArray(data) ? data : (data.matches || []);
  return [...new Set(matches.map(m => m.mapName).filter(Boolean))];
}

async function fetchCurrentSeason() {
  try {
    const res = await fetch(`${W3C_API}/ladder/seasons`);
    if (!res.ok) return null;
    const seasons = await res.json();
    return seasons?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function fileExistsOnGitHub(path) {
  const [owner, repo] = config.GITHUB_REPO.split('/');
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${config.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });
  return res.status === 200;
}

async function findLiquipediaImageUrl(mapName) {
  const slug = liquipediaSlug(mapName);
  const res = await fetch(`https://liquipedia.net/warcraft/${encodeURIComponent(slug)}`, {
    headers: { 'User-Agent': '4v4.gg/map-sync' },
  });
  if (!res.ok) return null;
  const html = await res.text();
  // Match any /commons/images/.../Wc3*.png — the filename varies (underscores, suffixes)
  const match = html.match(/\/commons\/images\/[a-f0-9/]+\/Wc3[^"']+\.png/i);
  return match ? `https://liquipedia.net${match[0]}` : null;
}

async function commitFile(path, buffer, mapName) {
  const [owner, repo] = config.GITHUB_REPO.split('/');
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `feat(maps): add minimap for ${mapName}`,
      content: buffer.toString('base64'),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API ${res.status}: ${err}`);
  }
  return await res.json();
}

export async function runMapSync() {
  if (!config.GITHUB_TOKEN) {
    console.log('[MapSync] No GITHUB_TOKEN, skipping');
    return;
  }

  console.log('[MapSync] Checking map pool...');

  const [mapNames, season] = await Promise.all([fetchCurrentMaps(), fetchCurrentSeason()]);
  console.log(`[MapSync] Season ${season ?? '?'} — ${mapNames.length} maps in pool`);

  const missing = [];
  for (const name of mapNames) {
    const path = `public/maps/${cleanMapName(name)}.png`;
    if (!(await fileExistsOnGitHub(path))) missing.push(name);
  }

  if (missing.length === 0) {
    console.log('[MapSync] All map images present');
    return { checked: mapNames.length, added: 0 };
  }

  console.log(`[MapSync] Missing: ${missing.join(', ')}`);

  const added = [];
  for (const name of missing) {
    try {
      const imageUrl = await findLiquipediaImageUrl(name);
      if (!imageUrl) {
        console.warn(`[MapSync] ${name}: not found on Liquipedia`);
        continue;
      }

      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        console.warn(`[MapSync] ${name}: image download failed (${imgRes.status})`);
        continue;
      }

      const buffer = Buffer.from(await imgRes.arrayBuffer());
      if (buffer.length < 10_000) {
        console.warn(`[MapSync] ${name}: image too small (${buffer.length} bytes), skipping`);
        continue;
      }

      const path = `public/maps/${cleanMapName(name)}.png`;
      await commitFile(path, buffer, name);
      added.push(name);
      console.log(`[MapSync] ✓ ${name} (${Math.round(buffer.length / 1024)}KB)`);

      await new Promise(r => setTimeout(r, 1000)); // be nice to Liquipedia
    } catch (err) {
      console.error(`[MapSync] ${name}: ${err.message}`);
    }
  }

  console.log(`[MapSync] Done — added ${added.length}/${missing.length}`);
  return { checked: mapNames.length, missing: missing.length, added: added.length };
}

let lastRunDate = '';

export function startMapSync() {
  // Run once at startup to catch anything missed during downtime
  runMapSync().catch(err => console.error('[MapSync] Startup error:', err.message));

  // Daily check at 03:00 UTC
  setInterval(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (now.getUTCHours() === 3 && todayStr !== lastRunDate) {
      lastRunDate = todayStr;
      runMapSync().catch(err => console.error('[MapSync] Scheduled error:', err.message));
    }
  }, 60_000);

  console.log('[MapSync] Scheduler started (daily at 03:00 UTC + startup)');
}
