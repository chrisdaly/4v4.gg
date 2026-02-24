import React from "react";
import { GOLD, GREY, GREY_MID } from "../../pages/signatures/vizUtils";

const ASSIGN_COLOR = "#7eb8da";
const MIN_NODE_R_FULL = 20;
const MIN_NODE_R_MINI = 10;
const FONT = "Inconsolata, monospace";
const DISPLAY_FONT = "Friz_Quadrata_Bold, Georgia, serif";

// Short display names for WC3 unit IDs
const SHORT_NAMES = {
  // Human heroes
  Hamg: 'AM', Hmkg: 'MK', Hpal: 'Pala', Hblm: 'BM',
  // Orc heroes
  Obla: 'BM', Ofar: 'FS', Otch: 'TC', Oshd: 'SH',
  // NE heroes
  Ekee: 'KotG', Emoo: 'PotM', Edem: 'DH', Ewar: 'Ward',
  // UD heroes
  Udea: 'DK', Udre: 'DL', Ulic: 'Lich', Ucrl: 'CL',
  // Neutral heroes
  Nplh: 'PL', Nngs: 'Naga', Npbm: 'Panda', Nbrn: 'DR',
  Nbst: 'Beast', Ntin: 'Tink', Nfir: 'Fire', Nalc: 'Alch',
  // Human units
  hfoo: 'Foot', hrif: 'Rifle', hkni: 'Knight', hspt: 'Breaker',
  hmtm: 'Mortar', hgyr: 'Gyro', hdhw: 'Hawk', hmpr: 'Priest',
  hsor: 'Sorc', hgry: 'Gryph', hsie: 'Tank', hmil: 'Militia',
  hpea: 'Peon',
  // Orc units
  ogru: 'Grunt', ohun: 'HH', orai: 'Raider', otau: 'Tauren',
  oshm: 'Shaman', odoc: 'WD', osp1: 'SW', owvy: 'WR',
  okod: 'Kodo', ocat: 'Demo', otbr: 'Bat', otbk: 'Zerk',
  opeo: 'Peon',
  // NE units
  earc: 'Archer', ehun: 'Hunt', edry: 'Dryad', emtg: 'MG',
  edot: 'DotT', edoc: 'DotC', ehip: 'Hippo', efdr: 'Faerie',
  echm: 'Chim', edcm: 'Bear', edtm: 'Crow', edos: 'Bear',
  ewsp: 'Wisp',
  // UD units
  ugho: 'Ghoul', ucry: 'Fiend', ugar: 'Garg', uabo: 'Abom',
  umtw: 'Wagon', uobs: 'Statue', unec: 'Necro', uban: 'Banshee',
  ufro: 'Wyrm', udth: 'Dest', ubsp: 'Dest', ushd: 'Shade',
  uaco: 'Aco',
  // Summons
  hwat: 'WE', hwt2: 'WE', hwt3: 'WE',
  efon: 'Treant', osw1: 'Wolf', osw2: 'Wolf', osw3: 'Wolf',
  uske: 'Skel', uskm: 'Skel',
  ucs1: 'Beetle', ucs2: 'Beetle', ucs3: 'Beetle',
  // Alternate IDs / upgraded forms
  owyv: 'WR', ehpr: 'HippoR', ospw: 'SW', ospm: 'SW',
  ucrm: 'Fiend', esen: 'Hunt', ebal: 'Glaive', hphx: 'Phoenix',
  nzep: 'Zep', nass: 'Assassin',
};

// Detect if a unit ID is a building
const BUILDINGS = new Set([
  'htow','hkee','hcas','halt','hbar','hbla','hars','hlum','hwtw','hatw','hgtw','hctw',
  'harm','hgra','hvlt','hhou','hrtt',
  'ogre','ostr','ofrt','oalt','obar','ofor','osld','obea','otrb','otto','owtw','ovln','ohou',
  'etol','etoa','etoe','eate','eaom','eaow','eaoe','edob','emow','etrp','eden',
  'unpl','unp1','unp2','uaod','usep','ugrv','utod','uslh','ubon','utom','uzig','uzg1','uzg2','ugol',
  'ngme','ntav','ngad','ngsp',
]);

// IDs that have icons in /units/
const UNIT_ICONS = new Set([
  // NE units + buildings
  'eaoe','eaom','eaow','earc','eate','echm','Edem','eden','edob','edoc','edot','edry','edtm','edcm','edos','efdr','ehip','ehun',
  'Ekee','Emoo','emow','emtg','etoa','etoe','etol','etrp','Ewar','ewsp',
  // Human units + buildings
  'halt','Hamg','harm','hars','hatw','hbar','hbla','Hblm','hcas','hctw','hdhw','hfoo',
  'hgra','hgry','hgtw','hgyr','hhou','hkee','hkni','hlum','hmil','Hmkg','hmpr','hmtm',
  'Hpal','hpea','hrif','hsie','hsor','hspt','htow','hvlt','hwtw',
  // Neutral heroes
  'Nalc','Nbrn','Nbst','Nfir','Nngs','Npbm','Nplh','Ntin','ngsp',
  // Orc units + buildings
  'oalt','obar','obea','Obla','ocat','odoc','Ofar','ofor','ofrt','ogre','ogru','ohou','ohun','okod','opeo',
  'orai','Oshd','oshm','osld','osp1','ostr','otau','otbk','otbr','Otch','otrb','otto','ovln','owtw','owvy',
  // UD units + buildings
  'uabo','uaco','uaod','uban','ubon','ubsp','Ucrl','ucry','ucs1','ucs2','ucs3',
  'Udea','Udre','udth','ufro','ugar','ugho','ugrv','Ulic','umtw','unec','unp1','unp2','unpl',
  'uobs','usep','ushd','uslh','utod','utom','uzg1','uzg2','uzig',
]);

const HERO_IDS = new Set([
  'Hamg','Hmkg','Hpal','Hblm','Obla','Ofar','Otch','Oshd',
  'Ekee','Emoo','Edem','Ewar','Udea','Udre','Ulic','Ucrl',
  'Nplh','Npbm','Nbst','Ntin','Nalc','Nfir','Nngs','Nbrn',
]);

// Altar building IDs (one per race)
const ALTARS = new Set(['halt', 'oalt', 'eate', 'uaod']);

// Caster / support unit IDs
const SUPPORT_UNITS = new Set([
  'hmpr', 'hsor', 'hdhw',         // Human: Priest, Sorceress, Dragonhawk
  'oshm', 'odoc', 'osp1', 'owvy', // Orc: Shaman, Witch Doctor, Spirit Walker, Wind Rider
  'edry', 'edoc', 'efdr',         // NE: Dryad, DotC, Faerie Dragon
  'unec', 'uban', 'uobs',         // UD: Necromancer, Banshee, Statue
]);

// ── Role icon SVG paths (game-icons.net, CC BY 3.0) ──
// Each path is from a 512×512 viewBox, white fill on transparent.
const ROLE_ICONS = {
  main:    "M19.75 14.438c59.538 112.29 142.51 202.35 232.28 292.718l3.626 3.75.063-.062c21.827 21.93 44.04 43.923 66.405 66.25-18.856 14.813-38.974 28.2-59.938 40.312l28.532 28.53 68.717-68.717c42.337 27.636 76.286 63.646 104.094 105.81l28.064-28.06c-42.47-27.493-79.74-60.206-106.03-103.876l68.936-68.938-28.53-28.53c-11.115 21.853-24.413 42.015-39.47 60.593-43.852-43.8-86.462-85.842-130.125-125.47-.224-.203-.432-.422-.656-.625C183.624 122.75 108.515 63.91 19.75 14.437zm471.875 0c-83.038 46.28-154.122 100.78-221.97 161.156l22.814 21.562 56.81-56.812 13.22 13.187-56.438 56.44 24.594 23.186c61.802-66.92 117.6-136.92 160.97-218.72zm-329.53 125.906 200.56 200.53a402.965 402.965 0 0 1-13.405 13.032L148.875 153.53l13.22-13.186zm-76.69 113.28-28.5 28.532 68.907 68.906c-26.29 43.673-63.53 76.414-106 103.907l28.063 28.06c27.807-42.164 61.758-78.174 104.094-105.81l68.718 68.717 28.53-28.53c-20.962-12.113-41.08-25.5-59.937-40.313 17.865-17.83 35.61-35.433 53.157-52.97l-24.843-25.655-55.47 55.467c-4.565-4.238-9.014-8.62-13.374-13.062l55.844-55.844-24.53-25.374c-18.28 17.856-36.602 36.06-55.158 54.594-15.068-18.587-28.38-38.758-39.5-60.625z",  // crossed-swords
  second:  "M256 26.2 52 135h408L256 26.2zM73 153v14h366v-14H73zm16 32v206h30V185H89zm101.334 0v206h30V185h-30zm101.332 0v206h30V185h-30zM393 185v206h30V185h-30zM73 409v30h366v-30H73zm-32 48v30h430v-30H41z",  // greek-temple (reused as generic secondary)
  hero:    "m408.256 119.46-37.7 52.165 19.57 44.426 34.8-37.214-16.67-59.375zm86.074 12.513L384.44 249.498 334.01 135.02l-75.162 132.947-86.948-131.78-33.334 114.122L17.922 132.83l39.3 127.6c1.945-.348 3.94-.54 5.98-.54 18.812 0 34.26 15.452 34.26 34.262 0 13.823-8.346 25.822-20.235 31.22l5.337 17.33c12.425 25.466 71.863 45.152 176.582 47.206 110.805 2.174 178.12-17.54 189.854-47.207h-.002l4.357-20.26c-16.836-2.114-30.02-16.612-30.02-33.986 0-18.81 15.45-34.262 34.263-34.262 3.513 0 6.91.54 10.11 1.54l26.622-123.762zm-391.77 2.04 1.22 56.337 25.56 24.89 9.592-32.842-36.37-48.386zm150.585 2.91-24.483 51.36 28.955 43.885 24.922-44.08-29.395-51.166zm204.453 135.962c-8.712 0-15.575 6.862-15.575 15.572 0 8.71 6.863 15.574 15.575 15.574s15.572-6.863 15.572-15.573-6.86-15.572-15.572-15.572zM63.2 278.58c-8.71 0-15.573 6.864-15.573 15.574s6.862 15.573 15.574 15.573c8.713 0 15.573-6.862 15.573-15.573 0-8.71-6.86-15.574-15.572-15.574zm130.33 17.842c18.812 0 34.26 15.45 34.26 34.262 0 18.81-15.448 34.26-34.26 34.26-18.813 0-34.262-15.45-34.262-34.26s15.45-34.262 34.26-34.262zm131.234 0c18.812 0 34.26 15.45 34.26 34.262 0 18.81-15.448 34.26-34.26 34.26-18.813 0-34.262-15.45-34.262-34.26s15.45-34.262 34.262-34.262zm-131.235 18.69c-8.713 0-15.573 6.86-15.573 15.572 0 8.71 6.86 15.574 15.572 15.574 8.71 0 15.572-6.864 15.572-15.574s-6.86-15.573-15.573-15.573zm131.234 0c-8.712 0-15.573 6.86-15.573 15.572 0 8.71 6.862 15.574 15.574 15.574s15.574-6.864 15.574-15.574-6.862-15.573-15.574-15.573z",  // crown
  support: "M263.375 19.375c-11.768 0-22.676 6.137-31.156 17.22-7.267 9.494-12.397 22.54-13.72 37.25 11.14-4.926 22.473-7.91 33.813-9V83.25c-10.965 1.377-22.008 5.008-33.157 11.03 1.968 12.487 6.703 23.502 13.063 31.814 8.48 11.082 19.387 17.22 31.155 17.22s22.707-6.138 31.188-17.22c6.167-8.06 10.783-18.667 12.843-30.688-12.07-6.832-24.194-10.997-36.406-12.344V64.75c12.676 1.087 25.22 4.516 37.344 10.188-1.155-15.158-6.336-28.614-13.78-38.344-8.482-11.082-19.42-17.22-31.19-17.22zm-46.594 117.25c-10.442 4.8-18.39 11.182-22.593 18.47l-.375-.095-41.625 64.438-50.656-21.97c-29.375-16.118-61.574 24-30.624 41.688l94.47 44.063 38.03-50.064c18.7 33.703 16.77 67.43-10.97 101.156-8.344-.642-16.37-.958-23.967-.906-40.312.278-68.942 10.254-73.907 28.78l.03.002c-4.44 16.58 10.992 36.67 39.126 55.28 55.675 29.297 95.38 38.468 156.968 42.344h1.562l.438.125c.424.026.823.07 1.25.094l-.032.314 92.063 28.72-22.19-53.72L183.595 375.5l5.875-17.72 71.81 23.845 71.845-23.844L339 375.5l-48.094 15.97 94.438 31.374c33.494-20.046 52.528-42.468 47.656-60.656-5.95-22.21-45.925-32.107-99.25-27.782-26.392-33.215-26.196-66.41-9.53-99.625L361 283.22l94.47-44.064c30.95-17.687-1.25-57.806-30.626-41.687l-50.688 21.968L332.562 155h-.062c-4.217-7.246-12.135-13.596-22.53-18.375-.2.27-.392.547-.595.813-11.268 14.725-27.633 24.562-46 24.562s-34.732-9.837-46-24.563c-.203-.265-.394-.543-.594-.812zm-63.686 311-16.72 40.5 69.876-21.78c-17.624-4.574-34.93-10.634-53.156-18.72z",  // meditation
  production: "M256 26.2 52 135h408L256 26.2zM73 153v14h366v-14H73zm16 32v206h30V185H89zm101.334 0v206h30V185h-30zm101.332 0v206h30V185h-30zM393 185v206h30V185h-30zM73 409v30h366v-30H73zm-32 48v30h430v-30H41z",  // greek-temple
  altar:   "M256 26.2 52 135h408L256 26.2zM73 153v14h366v-14H73zm16 32v206h30V185H89zm101.334 0v206h30V185h-30zm101.332 0v206h30V185h-30zM393 185v206h30V185h-30zM73 409v30h366v-30H73zm-32 48v30h430v-30H41z",  // greek-temple
};

/**
 * Classify a hotkey group's role from its composition data.
 * Returns: 'hero' | 'altar' | 'production' | 'support' | 'main' | 'second'
 */
function classifyGroupRole(compItems, isTopUnitGroup) {
  if (!compItems || compItems.length === 0) return isTopUnitGroup ? 'main' : 'second';

  const byId = {};
  let totalCount = 0;
  for (const { id, count } of compItems) {
    byId[id] = (byId[id] || 0) + count;
    totalCount += count;
  }
  if (totalCount === 0) return 'main';

  // Check for altar
  let altarCount = 0;
  for (const id of Object.keys(byId)) {
    if (ALTARS.has(id)) altarCount += byId[id];
  }
  if (altarCount / totalCount > 0.3) return 'altar';

  // Check for hero-dominant group
  let heroCount = 0;
  for (const id of Object.keys(byId)) {
    if (HERO_IDS.has(id)) heroCount += byId[id];
  }
  if (heroCount / totalCount > 0.4) return 'hero';

  // Check building-dominant → production
  let buildingCount = 0;
  for (const id of Object.keys(byId)) {
    if (BUILDINGS.has(id)) buildingCount += byId[id];
  }
  if (buildingCount / totalCount > 0.5) return 'production';

  // Check support/caster-dominant
  let supportCount = 0;
  for (const id of Object.keys(byId)) {
    if (SUPPORT_UNITS.has(id)) supportCount += byId[id];
  }
  if (supportCount / totalCount > 0.3) return 'support';

  // Default: main or secondary army
  return isTopUnitGroup ? 'main' : 'second';
}

/**
 * Get top unit IDs with icons for a group composition.
 * Returns array of { id, hasIcon } sorted: heroes first, then units, then buildings.
 */
function getCompUnits(items) {
  if (!items || items.length === 0) return [];
  // Deduplicate by id, sum counts
  const byId = {};
  for (const { id, count } of items) {
    byId[id] = (byId[id] || 0) + count;
  }
  const sorted = Object.entries(byId)
    .map(([id, count]) => ({
      id, count,
      isHero: HERO_IDS.has(id),
      isBuilding: BUILDINGS.has(id),
      hasIcon: UNIT_ICONS.has(id),
    }))
    .sort((a, b) => {
      if (a.isHero !== b.isHero) return a.isHero ? -1 : 1;
      if (a.isBuilding !== b.isBuilding) return a.isBuilding ? 1 : -1;
      return b.count - a.count;
    });
  return sorted.slice(0, 4);
}

function getNodeR(sizeFactor, mini = false) {
  if (mini) return Math.max(MIN_NODE_R_MINI, 8 + sizeFactor * 14);
  return Math.max(MIN_NODE_R_FULL, 16 + sizeFactor * 28);
}

export default function TransitionGlyph({
  transitionPairs = [], groupUsage = [], groupCompositions = {},
  segments = null, playerName = "", replayCount = null,
  mini = false,
}) {
  const W = mini ? 240 : 520, H = mini ? 240 : 520;
  const cx = W / 2, cy = H / 2;
  const R = mini ? 70 : 150;
  const pad = 12;
  const elements = [];

  const activeGroups = groupUsage
    .filter(g => (g.used + g.assigned) > 0)
    .sort((a, b) => a.group - b.group);

  if (activeGroups.length === 0 || transitionPairs.length === 0) {
    // Fallback: show muted ghost nodes for groups 0-9 + APM in center
    const fallbackEls = [];
    const { apm: fallbackApm = [0, 0, 0] } = segments || {};
    const fallbackMeanApm = Math.round(fallbackApm[0] * 300);
    const fallbackDisplayName = playerName ? playerName.split("#")[0] : "";
    const ghostCount = 10;
    const ghostR = mini ? 70 : 150;
    const nodeR = mini ? 8 : 14;

    // Outer ring
    if (!mini) {
      fallbackEls.push(
        <circle key="ring" cx={cx} cy={cy} r={ghostR + 18}
          fill="none" stroke={GREY_MID} strokeWidth="0.5" opacity="0.08" />
      );
    }

    // Ghost nodes
    for (let i = 0; i < ghostCount; i++) {
      const angle = (i / ghostCount) * Math.PI * 2 - Math.PI / 2;
      const nx = cx + Math.cos(angle) * ghostR;
      const ny = cy + Math.sin(angle) * ghostR;

      fallbackEls.push(
        <circle key={`ghost-bg-${i}`} cx={nx} cy={ny} r={nodeR + 2}
          fill="#111" stroke="none" />
      );
      fallbackEls.push(
        <circle key={`ghost-${i}`} cx={nx} cy={ny} r={nodeR}
          fill="#0a0a0a" stroke={GREY_MID} strokeWidth={mini ? 1 : 1.5} opacity="0.2" />
      );
      fallbackEls.push(
        <text key={`ghost-label-${i}`} x={nx} y={ny}
          textAnchor="middle" dominantBaseline="central"
          fill={GREY_MID} fontSize={mini ? "9" : "14"} fontFamily={FONT} fontWeight="700"
          opacity="0.2">
          {i}
        </text>
      );
    }

    // Center: name + APM
    if (!mini && fallbackDisplayName) {
      fallbackEls.push(
        <text key="fb-name" x={cx} y={cy - 24}
          textAnchor="middle" dominantBaseline="central"
          fill={GOLD} fontSize="16" fontFamily={DISPLAY_FONT} opacity="0.45">
          {fallbackDisplayName}
        </text>
      );
    }
    if (fallbackMeanApm > 0) {
      if (mini) {
        fallbackEls.push(
          <text key="fb-apm" x={cx} y={cy - 2}
            textAnchor="middle" dominantBaseline="central"
            fill="#fff" fontSize="20" fontFamily={FONT} fontWeight="700" opacity="0.65">
            {fallbackMeanApm}
          </text>
        );
        fallbackEls.push(
          <text key="fb-apm-label" x={cx} y={cy + 14}
            textAnchor="middle" dominantBaseline="central"
            fill={GREY} fontSize="8" fontFamily={FONT} opacity="0.4">
            APM
          </text>
        );
      } else {
        fallbackEls.push(
          <text key="fb-apm" x={cx} y={cy + (fallbackDisplayName ? 6 : -2)}
            textAnchor="middle" dominantBaseline="central"
            fill="#fff" fontSize="38" fontFamily={FONT} fontWeight="700" opacity="0.65">
            {fallbackMeanApm}
          </text>
        );
        fallbackEls.push(
          <text key="fb-apm-label" x={cx} y={cy + (fallbackDisplayName ? 28 : 22)}
            textAnchor="middle" dominantBaseline="central"
            fill={GREY} fontSize="11" fontFamily={FONT} opacity="0.4">
            APM
          </text>
        );
      }
    }

    // Bottom-right: replay count
    if (!mini && replayCount != null && replayCount > 0) {
      fallbackEls.push(
        <text key="fb-games" x={W - pad} y={H - pad}
          textAnchor="end" dominantBaseline="auto"
          fill={GREY} fontSize="10" fontFamily={FONT} opacity="0.35">
          {replayCount} game{replayCount !== 1 ? "s" : ""}
        </text>
      );
    }

    return <svg viewBox={`0 0 ${W} ${H}`} width="100%">{fallbackEls}</svg>;
  }

  const totalUsage = Math.max(1, activeGroups.reduce((s, g) => s + g.used + g.assigned, 0));
  const topTotal = Math.max(...activeGroups.map(g => g.used + g.assigned));

  const groupAngles = {};
  activeGroups.forEach((g, i) => {
    const angle = (i / activeGroups.length) * Math.PI * 2 - Math.PI / 2;
    groupAngles[g.group] = angle;
  });

  const { apm = [0, 0, 0] } = segments || {};

  // Outer ring (hidden in mini mode)
  if (!mini) {
    elements.push(
      <circle key="ring" cx={cx} cy={cy} r={R + 18}
        fill="none" stroke={GREY_MID} strokeWidth="0.5" opacity="0.15" />
    );
  }

  // ── Merge bidirectional pairs into single arcs ──
  const merged = [];
  const seen = new Set();
  for (const t of transitionPairs) {
    const key = Math.min(t.from, t.to) + "-" + Math.max(t.from, t.to);
    if (seen.has(key)) {
      const existing = merged.find(m => m.key === key);
      if (existing) existing.count += t.count;
      continue;
    }
    seen.add(key);
    merged.push({ from: t.from, to: t.to, count: t.count, key });
  }
  merged.sort((a, b) => a.count - b.count);

  const maxCount = Math.max(1, ...merged.map(t => t.count));
  const topCount = merged.length > 0 ? merged[merged.length - 1].count : 0;

  // ── Arcs (drawn first, nodes cover endpoints) ──
  for (let i = 0; i < merged.length; i++) {
    const t = merged[i];
    const fromAngle = groupAngles[t.from];
    const toAngle = groupAngles[t.to];
    if (fromAngle === undefined || toAngle === undefined) continue;

    const intensity = t.count / maxCount;
    const isTop = t.count === topCount;

    const x1 = cx + Math.cos(fromAngle) * R;
    const y1 = cy + Math.sin(fromAngle) * R;
    const x2 = cx + Math.cos(toAngle) * R;
    const y2 = cy + Math.sin(toAngle) * R;

    const pull = 0.15 + intensity * 0.15;
    const cpx = cx + (x1 + x2 - 2 * cx) * pull;
    const cpy = cy + (y1 + y2 - 2 * cy) * pull;

    const strokeWidth = mini
      ? (isTop ? 3 + intensity * 2 : 0.5 + intensity * 2)
      : (isTop ? 5 + intensity * 3 : 1 + intensity * 3);
    const opacity = isTop ? 0.9 : 0.2 + intensity * 0.45;

    elements.push(
      <path key={`arc-${t.key}`}
        d={`M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`}
        fill="none" stroke={GOLD} strokeWidth={strokeWidth}
        opacity={opacity} strokeLinecap="round" />
    );
  }

  // ── Nodes ──
  for (const g of activeGroups) {
    const angle = groupAngles[g.group];
    const nx = cx + Math.cos(angle) * R;
    const ny = cy + Math.sin(angle) * R;
    const usage = g.used + g.assigned;
    const sizeFactor = usage / totalUsage;
    const nR = getNodeR(sizeFactor, mini);
    const selectPct = usage > 0 ? Math.round((g.used / usage) * 100) : 100;
    const ringR = nR + (mini ? 2 : 3.5);
    const ringStroke = mini ? 2.5 : 4;
    const circumference = 2 * Math.PI * ringR;
    const selectFrac = selectPct / 100;
    const selectLen = circumference * selectFrac;
    const assignLen = circumference - selectLen;

    if (!mini && sizeFactor > 0.15) {
      elements.push(
        <circle key={`glow-${g.group}`} cx={nx} cy={ny} r={nR + 9}
          fill={GOLD} opacity={0.05} />
      );
    }

    // Node background — solid fill to fully mask arcs underneath
    elements.push(
      <circle key={`node-bg-${g.group}`} cx={nx} cy={ny} r={ringR + 2}
        stroke="none" fill="#111" />
    );
    elements.push(
      <circle key={`node-${g.group}`} cx={nx} cy={ny} r={nR}
        fill="#0a0a0a" stroke="none" />
    );

    // Assign ring (full circle, underneath)
    elements.push(
      <circle key={`ring-assign-${g.group}`} cx={nx} cy={ny} r={ringR}
        fill="none" stroke={ASSIGN_COLOR} strokeWidth={ringStroke}
        opacity={0.4} />
    );

    // Select ring (gold, starts at top)
    if (selectFrac > 0.01) {
      elements.push(
        <circle key={`ring-select-${g.group}`} cx={nx} cy={ny} r={ringR}
          fill="none" stroke={GOLD} strokeWidth={ringStroke}
          opacity={0.7 + sizeFactor * 0.3}
          strokeDasharray={`${selectLen} ${assignLen}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          style={{ transform: `rotate(-90deg)`, transformOrigin: `${nx}px ${ny}px` }} />
      );
    }

    // Classify group role from composition
    const compItems = groupCompositions[String(g.group)];
    // Determine if this is the highest-usage non-building group (for main vs second)
    const unitGroups = activeGroups
      .map(ag => {
        const ci = groupCompositions[String(ag.group)];
        const bldg = ci ? ci.reduce((s, u) => s + (BUILDINGS.has(u.id) ? u.count : 0), 0) : 0;
        const tot = ci ? ci.reduce((s, u) => s + u.count, 0) : 1;
        return { group: ag.group, usage: ag.used + ag.assigned, isBldg: tot > 0 && bldg / tot > 0.5 };
      })
      .filter(x => !x.isBldg)
      .sort((a, b) => b.usage - a.usage);
    const isTopUnitGroup = unitGroups.length > 0 && unitGroups[0].group === g.group;
    const role = classifyGroupRole(compItems, isTopUnitGroup);
    const iconPath = ROLE_ICONS[role];

    // Group number — shift up slightly to make room for role icon
    const numOffset = mini ? -3 : -5;
    elements.push(
      <text key={`label-${g.group}`} x={nx} y={ny + numOffset}
        textAnchor="middle" dominantBaseline="central"
        fill={GOLD} fontSize={mini ? "11" : "20"} fontFamily={FONT} fontWeight="700"
        opacity={0.85 + sizeFactor * 0.15}>
        {g.group}
      </text>
    );

    // Role icon — tiny silhouette below the number
    if (iconPath) {
      const iconS = mini ? 10 : 16;
      const iconY = ny + (mini ? 6 : 10);
      const scale = iconS / 512;
      elements.push(
        <path key={`role-${g.group}`}
          d={iconPath}
          fill={GREY}
          opacity="0.45"
          transform={`translate(${nx - iconS / 2}, ${iconY - iconS / 2}) scale(${scale})`}
        />
      );
    }
  }

  // ── Center: Name + APM ──
  const meanApm = Math.round(apm[0] * 300);
  const displayName = playerName ? playerName.split("#")[0] : "";

  if (!mini && displayName) {
    elements.push(
      <text key="player-name" x={cx} y={cy - 24}
        textAnchor="middle" dominantBaseline="central"
        fill={GOLD} fontSize="16" fontFamily={DISPLAY_FONT}
        opacity="0.65">
        {displayName}
      </text>
    );
  }

  if (meanApm > 0) {
    if (mini) {
      elements.push(
        <text key="apm-val" x={cx} y={cy - 2}
          textAnchor="middle" dominantBaseline="central"
          fill="#fff" fontSize="20" fontFamily={FONT} fontWeight="700"
          opacity="0.85">
          {meanApm}
        </text>
      );
      elements.push(
        <text key="apm-label" x={cx} y={cy + 14}
          textAnchor="middle" dominantBaseline="central"
          fill={GREY} fontSize="8" fontFamily={FONT}
          opacity="0.6">
          APM
        </text>
      );
    } else {
      elements.push(
        <text key="apm-val" x={cx} y={cy + (displayName ? 6 : -2)}
          textAnchor="middle" dominantBaseline="central"
          fill="#fff" fontSize="38" fontFamily={FONT} fontWeight="700"
          opacity="0.85">
          {meanApm}
        </text>
      );
      elements.push(
        <text key="apm-label" x={cx} y={cy + (displayName ? 28 : 22)}
          textAnchor="middle" dominantBaseline="central"
          fill={GREY} fontSize="11" fontFamily={FONT}
          opacity="0.6">
          APM
        </text>
      );
    }
  }


  // Bottom-right: Replay count
  if (!mini && replayCount != null && replayCount > 0) {
    elements.push(
      <text key="corner-games" x={W - pad} y={H - pad}
        textAnchor="end" dominantBaseline="auto"
        fill={GREY} fontSize="10" fontFamily={FONT} opacity="0.5">
        {replayCount} game{replayCount !== 1 ? "s" : ""}
      </text>
    );
  }


  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
