/**
 * Batch probe: Process all replays, find players with multiple appearances,
 * and show their control group compositions across games.
 *
 * Usage: node scripts/probe-player-groups.mjs
 */

import { readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';
import w3gjs from 'w3gjs';
import Database from 'better-sqlite3';

const W3GReplay = w3gjs.default;

function fourCCToString(arr) {
  if (!arr || arr.length !== 4) return '????';
  return String.fromCharCode(arr[3], arr[2], arr[1], arr[0]);
}

function netTagKey(tag) {
  return `${tag[0]}:${tag[1]}`;
}

// Unit type codes → human-readable names
const UNIT_NAMES = {
  // Human heroes
  Hamg: 'Archmage', Hmkg: 'Mountain King', Hpal: 'Paladin', Hblm: 'Blood Mage',
  // Human units
  hpea: 'Peasant', hfoo: 'Footman', hrif: 'Rifleman', hkni: 'Knight',
  hmtm: 'Mortar Team', hgyr: 'Flying Machine', hspt: 'Spell Breaker',
  hdhw: 'Dragonhawk Rider', hmpr: 'Priest', hsor: 'Sorceress',
  hgry: 'Gryphon Rider', hsie: 'Siege Engine', hmil: 'Militia',
  // Human buildings
  htow: 'Town Hall', hkee: 'Keep', hcas: 'Castle',
  halt: 'Altar', hbar: 'Barracks', hbla: 'Blacksmith',
  hars: 'Arcane Sanctum', hlum: 'Lumber Mill', hwtw: 'Scout Tower',
  hatw: 'Arcane Tower', hgtw: 'Guard Tower', hctw: 'Cannon Tower',
  harm: 'Workshop', hgra: 'Gryphon Aviary', hvlt: 'Arcane Vault',
  hhou: 'Farm', hrtt: 'Rifle Tower',
  // Orc heroes
  Obla: 'Blademaster', Ofar: 'Far Seer', Otch: 'Tauren Chieftain', Oshd: 'Shadow Hunter',
  // Orc units
  opeo: 'Peon', ogru: 'Grunt', ohun: 'Headhunter', orai: 'Raider',
  otau: 'Tauren', oshm: 'Shaman', odoc: 'Witch Doctor', osp1: 'Spirit Walker',
  owvy: 'Wind Rider', okod: 'Kodo Beast', ocat: 'Demolisher',
  otbr: 'Troll Batrider', otbk: 'Berserker',
  // Orc buildings
  ogre: 'Great Hall', ostr: 'Stronghold', ofrt: 'Fortress',
  oalt: 'Altar', obar: 'Barracks', ofor: 'War Mill',
  osld: 'Spirit Lodge', obea: 'Beastiary', otrb: 'Tauren Totem',
  owtw: 'Watch Tower', ovln: 'Voodoo Lounge', ohou: 'Orc Burrow',
  // Night Elf heroes
  Ekee: 'Keeper', Emoo: 'Priestess', Edem: 'Demon Hunter', Ewar: 'Warden',
  // Night Elf units
  ewsp: 'Wisp', earc: 'Archer', ehun: 'Huntress', edry: 'Dryad',
  emtg: 'Mountain Giant', edot: 'Druid of the Talon', edoc: 'Druid of the Claw',
  ehip: 'Hippogryph', efdr: 'Faerie Dragon', echm: 'Chimaera',
  ehpr: 'Hippogryph Rider',
  // NE morphed
  edcm: 'Bear', edtm: 'Storm Crow', edos: 'Elder Bear',
  // NE buildings
  etol: 'Tree of Life', etoa: 'Tree of Ages', etoe: 'Tree of Eternity',
  eate: 'Altar', eaom: 'Ancient of War', eaow: 'Ancient of Wind',
  eaoe: 'Ancient of Lore', edob: "Hunter's Hall", emow: 'Moon Well',
  etrp: 'Ancient Protector', eden: 'Chimaera Roost',
  // Undead heroes
  Udea: 'Death Knight', Udre: 'Dread Lord', Ulic: 'Lich', Ucrl: 'Crypt Lord',
  // Undead units
  uaco: 'Acolyte', ugho: 'Ghoul', ucry: 'Crypt Fiend', ugar: 'Gargoyle',
  uabo: 'Abomination', umtw: 'Meat Wagon', uobs: 'Obsidian Statue',
  ushd: 'Shade', unec: 'Necromancer', uban: 'Banshee', ufro: 'Frost Wyrm',
  udth: 'Destroyer', ubsp: 'Destroyer',
  // Undead buildings
  unpl: 'Necropolis', unp1: 'Halls of the Dead', unp2: 'Black Citadel',
  uaod: 'Altar', usep: 'Crypt', ugrv: 'Graveyard',
  utod: 'Temple of the Damned', uslh: 'Slaughterhouse',
  ubon: 'Boneyard', utom: 'Tomb of Relics', uzig: 'Ziggurat',
  uzg1: 'Spirit Tower', uzg2: 'Nerubian Tower', ugol: 'Haunted Gold Mine',
  // Neutral heroes
  Nplh: 'Pit Lord', Nngs: 'Naga Sea Witch', Npbm: 'Pandaren Brewmaster',
  Nbrn: 'Dark Ranger', Nbst: 'Beastmaster', Ntin: 'Goblin Tinker',
  Nfir: 'Firelord', Nalc: 'Alchemist',
  // Summons
  efon: 'Treant', even: 'Spirit of Vengeance', espv: 'Spirit of Vengeance',
  uske: 'Skeleton', uskm: 'Skeleton Mage',
  ucs1: 'Carrion Beetle', ucs2: 'Carrion Beetle', ucs3: 'Carrion Beetle',
  hwat: 'Water Elemental', hwt2: 'Water Elemental', hwt3: 'Water Elemental',
  hphx: 'Phoenix', hpxe: 'Phoenix Egg',
  osw1: 'Spirit Wolf', osw2: 'Dire Wolf', osw3: 'Shadow Wolf',
  ogrk: 'Healing Ward', oshy: 'Sentry Ward', oeye: 'Far Sight',
  // Map/neutral
  ngme: 'Gold Mine', ngol: 'Gold', ntav: 'Tavern', nzep: 'Zeppelin',
  ngad: 'Goblin Lab',
  // Common creeps
  ndtp: 'Dark Troll Priest', ndtb: 'Dark Troll Berserker', ndtw: 'Dark Troll Warlord',
  nndr: 'Nether Drake', ndro: 'Dragon', nmrk: 'Murloc King', nmr5: 'Murloc',
  nbrg: 'Brigand', ntkt: 'Tuskarr', ntrt: 'Sea Turtle', nogr: 'Ogre',
  nvul: 'Vulture', nfsh: 'Forest Troll', nomg: 'Ogre Magi',
  nsrh: 'Stormreaver', nplb: 'Polar Bear',
};

function isHero(itemId) {
  return itemId && /^[A-Z]/.test(itemId);
}
function isBuilding(itemId) {
  if (!itemId) return false;
  const buildings = new Set([
    'htow','hkee','hcas','halt','hbar','hbla','hars','hlum','hwtw','hatw','hgtw','hctw',
    'harm','hgra','hvlt','hhou','hrtt',
    'ogre','ostr','ofrt','oalt','obar','ofor','osld','obea','otrb','owtw','ovln','ohou',
    'etol','etoa','etoe','eate','eaom','eaow','eaoe','edob','emow','etrp','eden',
    'unpl','unp1','unp2','uaod','usep','ugrv','utod','uslh','ubon','utom','uzig','uzg1','uzg2','ugol',
    'ngme','ntav','ngad',
  ]);
  return buildings.has(itemId);
}
function isSummon(itemId) {
  if (!itemId) return false;
  const summons = new Set([
    'efon','even','espv','uske','uskm','ucs1','ucs2','ucs3',
    'hwat','hwt2','hwt3','hphx','hpxe','osw1','osw2','osw3','ogrk','oshy','oeye',
  ]);
  return summons.has(itemId);
}

async function extractControlGroups(buffer) {
  const parser = new W3GReplay();
  const playerState = {};

  const getPlayer = (id) => {
    if (!playerState[id]) {
      playerState[id] = {
        objectMap: new Map(),
        groups: {},
        assignCounts: {},
        selectCounts: {},
      };
    }
    return playerState[id];
  };

  let elapsed = 0;
  const onBlock = (block) => {
    if (block.id !== 0x1f && block.id !== 0x1e) return;
    elapsed += block.timeIncrement;
    for (const cmd of block.commandBlocks || []) {
      const ps = getPlayer(cmd.playerId);
      for (const action of cmd.actions || []) {
        if (action.id === 0x19 && action.itemId && action.object) {
          const itemStr = fourCCToString(action.itemId);
          const objKey = netTagKey(action.object);
          if (action.object[0] !== 0 || action.object[1] !== 0) {
            ps.objectMap.set(objKey, itemStr);
          }
        }
        if (action.id === 0x17 && action.units) {
          const g = (action.groupNumber + 1) % 10;
          const unitKeys = action.units.map(u => netTagKey(u));
          ps.groups[g] = unitKeys;
          ps.assignCounts[g] = (ps.assignCounts[g] || 0) + 1;
        }
        if (action.id === 0x18) {
          const g = (action.groupNumber + 1) % 10;
          ps.selectCounts[g] = (ps.selectCounts[g] || 0) + 1;
        }
      }
    }
  };

  parser.on('gamedatablock', onBlock);
  const result = await parser.parse(buffer);
  parser.removeListener('gamedatablock', onBlock);

  return { result, playerState };
}

// Match replay players to battle tags via DB
const db = new Database(path.resolve('data/chat.db'), { readonly: true });

async function main() {
  const replayDir = path.resolve('data/replays');
  const files = (await readdir(replayDir)).filter(f => f.endsWith('.w3g')).sort();
  console.log(`Processing ${files.length} replays...\n`);

  // playerData: battleTag -> [{ replayFile, race, groups: { g: { units, assigned, used } } }]
  const playerData = {};

  // Get battle tag mapping from DB
  const replayRows = db.prepare(`
    SELECT r.id as replay_id, r.w3c_match_id, r.filename, rp.player_id, rp.battle_tag, rp.race,
           r.game_duration, r.map_name
    FROM replays r
    JOIN replay_players rp ON rp.replay_id = r.id
    WHERE rp.battle_tag IS NOT NULL
  `).all();

  // Map: filename -> { playerId -> battleTag }
  const tagMap = {};
  const replayMeta = {};
  for (const row of replayRows) {
    if (!tagMap[row.filename]) tagMap[row.filename] = {};
    tagMap[row.filename][row.player_id] = row.battle_tag;
    if (!replayMeta[row.filename]) replayMeta[row.filename] = { duration: row.game_duration, map: row.map_name };
  }

  // Debug: check first file mapping
  const firstFile = files[0];
  console.log(`\nDEBUG tagMap for ${firstFile}:`, tagMap[firstFile] ? Object.keys(tagMap[firstFile]).length + ' players' : 'NOT FOUND');
  if (tagMap[firstFile]) {
    for (const [pid, tag] of Object.entries(tagMap[firstFile])) {
      console.log(`  pid=${pid} -> ${tag}`);
    }
  }

  let processed = 0;
  for (const file of files) {
    const filePath = path.join(replayDir, file);
    try {
      const buffer = readFileSync(filePath);
      const { result, playerState } = await extractControlGroups(buffer);

      for (const player of result.players || []) {
        const ps = playerState[player.id];
        if (!ps) continue;

        // Try to get battle tag via filename
        let battleTag = null;
        if (tagMap[file]) {
          battleTag = tagMap[file][player.id];
        }
        if (!battleTag) continue;

        if (!playerData[battleTag]) playerData[battleTag] = [];

        // Build final group compositions
        const groups = {};
        for (const [g, unitKeys] of Object.entries(ps.groups)) {
          const resolved = unitKeys.map(key => ps.objectMap.get(key) || null);
          const named = resolved.map(id => id ? (UNIT_NAMES[id] || id) : '???');

          // Categorize
          const heroes = [];
          const units = [];
          const buildings = [];
          const summons = [];
          const unknown = [];
          for (let i = 0; i < resolved.length; i++) {
            const id = resolved[i];
            const name = named[i];
            if (name === '???') { unknown.push(name); continue; }
            if (isHero(id)) heroes.push(name);
            else if (isBuilding(id)) buildings.push(name);
            else if (isSummon(id)) summons.push(name);
            else units.push(name);
          }

          groups[g] = {
            heroes, units, buildings, summons, unknown,
            assigned: ps.assignCounts[g] || 0,
            used: ps.selectCounts[g] || 0,
            total: unitKeys.length,
          };
        }

        const meta = replayMeta[file] || null;
        playerData[battleTag].push({
          file,
          race: player.raceDetected || player.race,
          map: meta?.map || result.map?.file || '?',
          duration: meta?.duration || Math.round((result.duration || 0) / 1000),
          groups,
        });
      }
      processed++;
    } catch (e) {
      // skip bad replays
    }
  }

  console.log(`Processed ${processed}/${files.length} replays`);

  // Show stats
  const allCounts = Object.entries(playerData).map(([t, g]) => [t, g.length]).sort((a, b) => b[1] - a[1]);
  console.log(`\nUnique players identified: ${allCounts.length}`);
  console.log(`Top 10 by appearances: ${allCounts.slice(0, 10).map(([t, c]) => `${t}(${c})`).join(', ')}`);

  // Find players with 2+ appearances
  const multiPlayers = Object.entries(playerData)
    .filter(([_, games]) => games.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);

  console.log(`Players with 2+ games: ${multiPlayers.length}\n`);

  // Show top 5 most active players
  for (const [battleTag, games] of multiPlayers.slice(0, 5)) {
    console.log('═'.repeat(70));
    console.log(`  ${battleTag}  (${games.length} games, plays ${games[0].race})`);
    console.log('═'.repeat(70));

    // Aggregate group patterns across games
    const groupPatterns = {}; // group -> [composition strings per game]

    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      const mapName = (game.map || '').replace(/^\d+_w3c_\d+_\d+_/, '').replace(/\.w3x$/, '');
      console.log(`\n  Game ${i + 1}: ${mapName} (${Math.floor(game.duration / 60)}m)`);

      // Sort groups by usage
      const sortedGroups = Object.entries(game.groups)
        .sort((a, b) => (b[1].used + b[1].assigned) - (a[1].used + a[1].assigned));

      for (const [g, data] of sortedGroups) {
        const parts = [];
        if (data.heroes.length) parts.push(data.heroes.join(', '));
        if (data.units.length) {
          const counts = {};
          data.units.forEach(u => counts[u] = (counts[u] || 0) + 1);
          parts.push(Object.entries(counts).map(([n, c]) => c > 1 ? `${c}x ${n}` : n).join(', '));
        }
        if (data.summons.length) {
          const counts = {};
          data.summons.forEach(u => counts[u] = (counts[u] || 0) + 1);
          parts.push(Object.entries(counts).map(([n, c]) => c > 1 ? `${c}x ${n}` : n).join(', '));
        }
        if (data.buildings.length) {
          const counts = {};
          data.buildings.forEach(u => counts[u] = (counts[u] || 0) + 1);
          parts.push('🏠 ' + Object.entries(counts).map(([n, c]) => c > 1 ? `${c}x ${n}` : n).join(', '));
        }
        if (data.unknown.length) parts.push(`${data.unknown.length}x ???`);

        const label = parts.join(' + ') || '(empty)';
        const useBar = '█'.repeat(Math.min(20, Math.round(data.used / 50)));
        console.log(`    [${g}] ${label}`);
        console.log(`        used: ${data.used} ${useBar}  assigned: ${data.assigned}`);

        // Track pattern
        if (!groupPatterns[g]) groupPatterns[g] = [];
        // Simplified pattern: just heroes + unit types (no counts)
        const typeSet = [...new Set([...data.heroes, ...data.units])].sort().join('+');
        groupPatterns[g].push(typeSet || '(buildings/empty)');
      }
    }

    // Consistency analysis
    console.log(`\n  ${'─'.repeat(50)}`);
    console.log(`  CONSISTENCY ANALYSIS (fingerprint signal):`);
    for (const [g, patterns] of Object.entries(groupPatterns).sort((a, b) => a[0] - b[0])) {
      if (patterns.length < 2) continue;
      const counts = {};
      patterns.forEach(p => counts[p] = (counts[p] || 0) + 1);
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const topPattern = sorted[0];
      const consistency = Math.round((topPattern[1] / patterns.length) * 100);

      if (consistency >= 50) {
        const bar = consistency >= 80 ? '🟢' : consistency >= 60 ? '🟡' : '🔴';
        console.log(`    Group ${g}: ${bar} ${consistency}% consistent → "${topPattern[0]}" (${topPattern[1]}/${patterns.length} games)`);
        if (sorted.length > 1) {
          for (const [pat, c] of sorted.slice(1)) {
            console.log(`              also: "${pat}" (${c}/${patterns.length})`);
          }
        }
      }
    }
    console.log('');
  }
}

await main();
db.close();
