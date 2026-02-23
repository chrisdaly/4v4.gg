/**
 * Probe script: Extract control group compositions from a .w3g replay file.
 *
 * Reconstructs game state by:
 * 1. Tracking 0x19 (Select Subgroup) to build ObjectID → ItemID mappings
 * 2. Tracking 0x17 (Assign Group Hotkey) to capture group compositions
 * 3. Cross-referencing to resolve unit types in each group
 *
 * Usage: node scripts/probe-control-groups.mjs [replay-file]
 */

import { readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';
import w3gjs from 'w3gjs';

const W3GReplay = w3gjs.default;

function fourCCToString(arr) {
  if (!arr || arr.length !== 4) return '????';
  // WC3 FourCC stored little-endian — reverse to get standard ID
  return String.fromCharCode(arr[3], arr[2], arr[1], arr[0]);
}

function netTagKey(tag) {
  return `${tag[0]}:${tag[1]}`;
}

// Known WC3 unit type codes → human-readable names
const UNIT_NAMES = {
  // Human heroes
  Hamg: 'Archmage', Hmkg: 'Mountain King', Hpal: 'Paladin', Hblm: 'Blood Mage',
  // Human units
  hpea: 'Peasant', hfoo: 'Footman', hrif: 'Rifleman', hkni: 'Knight',
  hmtm: 'Mortar Team', hgyr: 'Flying Machine', hspt: 'Spell Breaker',
  hdhw: 'Dragonhawk Rider', hmpr: 'Priest', hsor: 'Sorceress',
  hgry: 'Gryphon Rider', hsie: 'Siege Engine',
  // Human buildings
  htow: 'Town Hall', hkee: 'Keep', hcas: 'Castle',
  halt: 'Altar of Kings', hbar: 'Barracks', hbla: 'Blacksmith',
  hars: 'Arcane Sanctum', hlum: 'Lumber Mill', hwtw: 'Scout Tower',
  hatw: 'Arcane Tower', hgtw: 'Guard Tower', hctw: 'Cannon Tower',
  harm: 'Workshop', hgra: 'Gryphon Aviary', hvlt: 'Arcane Vault',
  hhou: 'Farm',
  // Orc heroes
  Obla: 'Blademaster', Ofar: 'Far Seer', Otch: 'Tauren Chieftain', Oshd: 'Shadow Hunter',
  // Orc units
  opeo: 'Peon', ogru: 'Grunt', ohun: 'Headhunter', orai: 'Raider',
  otau: 'Tauren', oshm: 'Shaman', odoc: 'Witch Doctor', osp1: 'Spirit Walker',
  owvy: 'Wind Rider', okod: 'Kodo Beast', ocat: 'Demolisher',
  otbr: 'Troll Batrider', oberz: 'Berserker',
  // Orc buildings
  ogre: 'Great Hall', ostr: 'Stronghold', ofrt: 'Fortress',
  oalt: 'Altar of Storms', obar: 'Barracks', ofor: 'War Mill',
  osld: 'Spirit Lodge', obea: 'Beastiary', otrb: 'Tauren Totem',
  owtw: 'Watch Tower', ovln: 'Voodoo Lounge',
  ohou: 'Orc Burrow',
  // Night Elf heroes
  Ekee: 'Keeper of the Grove', Emoo: 'Priestess of the Moon',
  Edem: 'Demon Hunter', Ewar: 'Warden',
  // Night Elf units
  ewsp: 'Wisp', earc: 'Archer', ehun: 'Huntress', edry: 'Dryad',
  emtg: 'Mountain Giant', edot: 'Druid of the Talon', edoc: 'Druid of the Claw',
  ehip: 'Hippogryph', efdr: 'Faerie Dragon', esen: 'Huntress',
  echm: 'Chimaera',
  // NE buildings
  etol: 'Tree of Life', etoa: 'Tree of Ages', etoe: 'Tree of Eternity',
  eate: 'Altar of Elders', eaom: 'Ancient of War', eaow: 'Ancient of Wind',
  eaoe: 'Ancient of Lore', edob: 'Hunter\'s Hall', emow: 'Moon Well',
  etrp: 'Ancient Protector', eden: 'Chimaera Roost',
  // Undead heroes
  Udea: 'Death Knight', Udre: 'Dread Lord', Ulic: 'Lich', Ucry: 'Crypt Lord',
  // Undead units
  uaco: 'Acolyte', ugho: 'Ghoul', ucry: 'Crypt Fiend', ugar: 'Gargoyle',
  uabo: 'Abomination', umtw: 'Meat Wagon', uobs: 'Obsidian Statue',
  ushd: 'Shade', unec: 'Necromancer', uban: 'Banshee', ufro: 'Frost Wyrm',
  udth: 'Destroyer',
  // Undead buildings
  unpl: 'Necropolis', unp1: 'Halls of the Dead', unp2: 'Black Citadel',
  uaod: 'Altar of Darkness', usep: 'Crypt', ugrv: 'Graveyard',
  utod: 'Temple of the Damned', uslh: 'Slaughterhouse',
  ubon: 'Boneyard', utom: 'Tomb of Relics', uzig: 'Ziggurat',
  uzg1: 'Spirit Tower', uzg2: 'Nerubian Tower',
  // Neutral tavern heroes
  Nplh: 'Pit Lord', Nngs: 'Naga Sea Witch', Npbm: 'Pandaren Brewmaster',
  Nbrn: 'Dark Ranger', Nbst: 'Beastmaster', Ntin: 'Goblin Tinker',
  Nfir: 'Firelord', Nalc: 'Goblin Alchemist',
  // Morphed / alternate forms
  edcm: 'Bear (Druid)', edtm: 'Storm Crow (Druid)', edos: 'Bear (Elder)',
  osp2: 'Spirit Walker (Ethereal)', ohun: 'Headhunter', otbk: 'Berserker (Troll)',
  // Summons / special units
  efon: 'Treant', even: 'Spirit of Vengeance', espv: 'Spirit of Vengeance',
  uske: 'Skeleton Warrior', ucs1: 'Carrion Beetle', ucs2: 'Carrion Beetle (Lv2)',
  ucs3: 'Carrion Beetle (Lv3)',
  hwat: 'Water Elemental', hphx: 'Phoenix', hpxe: 'Phoenix Egg',
  osw1: 'Spirit Wolf', osw2: 'Dire Wolf', osw3: 'Shadow Wolf',
  ogrk: 'Healing Ward', oshy: 'Sentry Ward', oeye: 'Far Sight (Eye)',
  emtg: 'Mountain Giant',
  // Human extra
  hmil: 'Militia', hkee: 'Keep', hcas: 'Castle',
  hspt: 'Spell Breaker', hdhw: 'Dragonhawk Rider',
  // Map objects / neutral buildings
  ngme: 'Gold Mine', ngol: 'Gold', ntav: 'Tavern',
  nzep: 'Goblin Zeppelin', ngad: 'Goblin Laboratory',
  // Common creeps (ones that can be charmed/converted)
  ndtp: 'Dark Troll Priest', ndtb: 'Dark Troll Berserker', ndtw: 'Dark Troll Warlord',
  nndr: 'Nether Drake', ndro: 'Dragon (Neutral)', ndrn: 'Green Dragon',
  nmrk: 'Murloc King', nmr5: 'Murloc Huntsman',
  nbrg: 'Brigand', nsrh: 'Stormreaver Hermit',
  nplb: 'Polar Bear', ntkt: 'Tuskarr Knight',
  ntrt: 'Sea Turtle', nogr: 'Ogre', nrdk: 'Red Dragon',
  nvul: 'Vulture',
  // More NE
  ehpr: 'Hippogryph Rider',
  // More Human
  hrtt: 'Rifle Tower',
  hpea: 'Peasant',
  // Items (show up in subgroup for heroes carrying them)
  // More UD
  ugol: 'Haunted Gold Mine', uaod: 'Altar of Darkness',
};

async function probeReplay(filePath) {
  const buffer = readFileSync(filePath);
  const parser = new W3GReplay();

  // State tracking per player
  const playerState = {}; // playerId -> { objectMap, groups, groupHistory }

  const getPlayer = (id) => {
    if (!playerState[id]) {
      playerState[id] = {
        objectMap: new Map(),   // netTagKey -> itemIdString
        groups: {},             // groupNum -> [netTagKey, ...]
        groupHistory: [],       // [{ ms, group, units: [{tag, itemId}] }]
        selectionLog: [],       // recent selections for debugging
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
        // 0x19: Select Subgroup — reveals ItemID ↔ ObjectID association
        if (action.id === 0x19 && action.itemId && action.object) {
          const itemStr = fourCCToString(action.itemId);
          const objKey = netTagKey(action.object);
          // Don't map null/zero objects
          if (action.object[0] !== 0 || action.object[1] !== 0) {
            ps.objectMap.set(objKey, itemStr);
          }
        }

        // 0x17: Assign Group Hotkey — full unit list for group
        if (action.id === 0x17 && action.units) {
          const groupNum = (action.groupNumber + 1) % 10;
          const unitKeys = action.units.map(u => netTagKey(u));
          ps.groups[groupNum] = unitKeys;

          // Resolve what we can
          const resolved = unitKeys.map(key => ({
            tag: key,
            itemId: ps.objectMap.get(key) || null,
          }));

          ps.groupHistory.push({
            ms: elapsed,
            group: groupNum,
            units: resolved,
          });
        }

        // 0x16: Selection change — track for context
        if (action.id === 0x16 && action.units) {
          // Just note the selection happened (for debugging)
        }
      }
    }
  };

  parser.on('gamedatablock', onBlock);
  const result = await parser.parse(buffer);
  parser.removeListener('gamedatablock', onBlock);

  // Now do a second pass: resolve any group compositions that were assigned
  // before we learned the unit types (backfill)
  for (const [playerId, ps] of Object.entries(playerState)) {
    for (const entry of ps.groupHistory) {
      for (const unit of entry.units) {
        if (!unit.itemId) {
          unit.itemId = ps.objectMap.get(unit.tag) || null;
        }
      }
    }
  }

  // Print results
  console.log('='.repeat(70));
  console.log(`REPLAY: ${path.basename(filePath)}`);
  console.log(`Duration: ${Math.round((result.duration || 0) / 1000)}s`);
  console.log(`Map: ${result.map?.file || 'unknown'}`);
  console.log('='.repeat(70));

  for (const player of result.players || []) {
    const ps = playerState[player.id];
    if (!ps) continue;

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`PLAYER: ${player.name} (${player.raceDetected || player.race}) [ID: ${player.id}]`);
    console.log(`ObjectID→ItemID mappings learned: ${ps.objectMap.size}`);
    console.log(`Group assignments total: ${ps.groupHistory.length}`);

    // Show final group state
    console.log('\nFINAL CONTROL GROUPS:');
    for (let g = 1; g <= 9; g++) {
      const units = ps.groups[g];
      if (!units || units.length === 0) continue;

      const resolved = units.map(key => {
        const itemId = ps.objectMap.get(key);
        const name = itemId ? (UNIT_NAMES[itemId] || itemId) : '???';
        return name;
      });

      // Count by type
      const counts = {};
      for (const name of resolved) {
        counts[name] = (counts[name] || 0) + 1;
      }
      const summary = Object.entries(counts)
        .map(([name, count]) => count > 1 ? `${count}x ${name}` : name)
        .join(', ');

      const unknowns = resolved.filter(r => r === '???').length;
      console.log(`  Group ${g}: ${summary}${unknowns > 0 ? ` (${unknowns} unresolved)` : ''}`);
    }

    // Show group assignment timeline (first 10)
    console.log('\nGROUP ASSIGNMENT TIMELINE (first 15):');
    for (const entry of ps.groupHistory.slice(0, 15)) {
      const timeStr = `${Math.floor(entry.ms / 60000)}:${String(Math.floor((entry.ms % 60000) / 1000)).padStart(2, '0')}`;
      const resolved = entry.units.map(u => {
        const name = u.itemId ? (UNIT_NAMES[u.itemId] || u.itemId) : '???';
        return name;
      });
      const counts = {};
      for (const name of resolved) {
        counts[name] = (counts[name] || 0) + 1;
      }
      const summary = Object.entries(counts)
        .map(([name, count]) => count > 1 ? `${count}x ${name}` : name)
        .join(', ');
      console.log(`  [${timeStr}] Group ${entry.group} = ${summary}`);
    }

    // Show the ObjectID map for debugging
    console.log('\nOBJECT MAP (all learned unit types):');
    const typeCounts = {};
    for (const [key, itemId] of ps.objectMap) {
      const name = UNIT_NAMES[itemId] || itemId;
      typeCounts[name] = (typeCounts[name] || 0) + 1;
    }
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sorted) {
      console.log(`  ${name}: ${count} instances`);
    }
  }
}

// Run
const replayDir = path.resolve('data/replays');
let targetFile = process.argv[2];

if (!targetFile) {
  // Pick the first replay in the directory
  const files = await readdir(replayDir);
  const w3gFiles = files.filter(f => f.endsWith('.w3g')).sort();
  if (w3gFiles.length === 0) {
    console.error('No .w3g files found in', replayDir);
    process.exit(1);
  }
  targetFile = path.join(replayDir, w3gFiles[0]);
  console.log(`Using first replay: ${w3gFiles[0]}`);
  console.log(`(${w3gFiles.length} total replays available)\n`);
}

await probeReplay(targetFile);
