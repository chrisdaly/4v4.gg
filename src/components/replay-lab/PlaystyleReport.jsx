import React from "react";
import styled from "styled-components";

// Map WC3 hero IDs to /heroes/ image filenames
const HERO_IMAGES = {
  Hamg: "archmage", Hmkg: "mountainking", Hpal: "paladin", Hblm: "bloodmage",
  Obla: "blademaster", Ofar: "farseer", Otch: "taurenchieftain", Oshd: "shadowhunter",
  Ekee: "keeperofthegrove", Emoo: "priestessofthemoon", Edem: "demonhunter", Ewar: "warden",
  Udea: "deathknight", Udre: "dreadlord", Ulic: "lich", Ucrl: "cryptlord",
  Nplh: "pitlord", Npbm: "pandarenbrewmaster", Nbst: "beastmaster",
  Ntin: "tinker", Nalc: "alchemist", Nfir: "avatarofflame",
  Nngs: "seawitch", Nbrn: "bansheeranger",
};

// Short unit names (same as TransitionGlyph)
const SHORT_NAMES = {
  Hamg: 'AM', Hmkg: 'MK', Hpal: 'Pala', Hblm: 'BM',
  Obla: 'BM', Ofar: 'FS', Otch: 'TC', Oshd: 'SH',
  Ekee: 'KotG', Emoo: 'PotM', Edem: 'DH', Ewar: 'Ward',
  Udea: 'DK', Udre: 'DL', Ulic: 'Lich', Ucrl: 'CL',
  Nplh: 'PL', Nngs: 'Naga', Npbm: 'Panda', Nbrn: 'DR',
  Nbst: 'Beast', Ntin: 'Tink', Nfir: 'Fire', Nalc: 'Alch',
  hfoo: 'Foot', hrif: 'Rifle', hkni: 'Knight', hspt: 'Breaker',
  hmtm: 'Mortar', hgyr: 'Gyro', hdhw: 'Hawk', hmpr: 'Priest',
  hsor: 'Sorc', hgry: 'Gryph', hsie: 'Tank', hmil: 'Militia', hpea: 'Peon',
  ogru: 'Grunt', ohun: 'HH', orai: 'Raider', otau: 'Tauren',
  oshm: 'Shaman', odoc: 'WD', osp1: 'SW', owvy: 'WR',
  okod: 'Kodo', ocat: 'Demo', otbr: 'Bat', otbk: 'Zerk', opeo: 'Peon',
  earc: 'Archer', ehun: 'Hunt', edry: 'Dryad', emtg: 'MG',
  edot: 'DotT', edoc: 'DotC', ehip: 'Hippo', efdr: 'Faerie',
  echm: 'Chim', edcm: 'Bear', edtm: 'Crow', edos: 'Bear', ewsp: 'Wisp',
  ugho: 'Ghoul', ucry: 'Fiend', ugar: 'Garg', uabo: 'Abom',
  umtw: 'Wagon', uobs: 'Statue', unec: 'Necro', uban: 'Banshee',
  ufro: 'Wyrm', udth: 'Dest', ubsp: 'Dest', ushd: 'Shade', uaco: 'Aco',
  hwat: 'WE', hwt2: 'WE', hwt3: 'WE',
  efon: 'Treant', osw1: 'Wolf', osw2: 'Wolf', osw3: 'Wolf',
  uske: 'Skel', uskm: 'Skel', uske1: 'Skel', uske2: 'Skel',
  ucs1: 'Beetle', ucs2: 'Beetle', ucs3: 'Beetle',
  // Alternate IDs / upgraded forms
  owyv: 'WR', ehpr: 'HippoR', ospw: 'SW', ospm: 'SW',
  ucrm: 'Fiend', esen: 'Hunt', ebal: 'Glaive', hphx: 'Phoenix',
  nzep: 'Zep', nass: 'Assassin', nftb: 'Troll',
  nnwl: 'Spider', emrc: 'Spider',
};

const BUILDINGS = new Set([
  'htow','hkee','hcas','halt','hbar','hbla','hars','hlum','hwtw','hatw','hgtw','hctw',
  'harm','hgra','hvlt','hhou','hrtt',
  'ogre','ostr','ofrt','oalt','obar','ofor','osld','obea','otrb','otto','owtw','ovln','ohou',
  'etol','etoa','etoe','eate','eaom','eaow','eaoe','edob','emow','etrp','eden',
  'unpl','unp1','unp2','uaod','usep','ugrv','utod','uslh','ubon','utom','uzig','uzg1','uzg2','ugol',
  'ngme','ntav','ngad','ngsp',
]);

const BUILDING_NAMES = {
  // Human
  htow: 'Town Hall', hkee: 'Keep', hcas: 'Castle',
  halt: 'Altar', hbar: 'Rax', hbla: 'Smith', hars: 'Sanctum',
  hlum: 'Mill', hwtw: 'Tower', hatw: 'G.Tower', hgtw: 'G.Tower', hctw: 'C.Tower',
  harm: 'Workshop', hgra: 'Aviary', hvlt: 'Vault', hhou: 'Farm', hrtt: 'Arcane',
  // Orc
  ogre: 'G.Hall', ostr: 'Stronghold', ofrt: 'Fortress',
  oalt: 'Altar', obar: 'Rax', ofor: 'WF', osld: 'Lodge',
  obea: 'Bestiary', otrb: 'Totem', otto: 'Totem', owtw: 'Tower', ovln: 'Voodoo', ohou: 'Burrow',
  // Night Elf
  etol: 'Tree', etoa: 'Tree', etoe: 'Tree',
  eate: 'Altar', eaom: 'Moon', eaow: 'Wind', eaoe: 'Lore',
  edob: 'Den', emow: 'Roost', etrp: 'Wisp', eden: 'Den',
  // Undead
  unpl: 'Necro', unp1: 'Halls', unp2: 'Citadel',
  uaod: 'Altar', usep: 'Crypt', ugrv: 'Yard', utod: 'Temple',
  uslh: 'Slaughter', ubon: 'Boneyard', utom: 'Tomb',
  uzig: 'Zig', uzg1: 'S.Tower', uzg2: 'N.Tower', ugol: 'Mine',
  // Neutral
  ngme: 'Mine', ntav: 'Tavern', ngad: 'Shop', ngsp: 'Shipyard',
};

// IDs that have icons in /units/
const UNIT_ICONS = new Set([
  // NE units + buildings
  'eaoe','eaom','eaow','earc','eate','echm','Edem','eden','edob','edoc','edot','edry','edtm','edcm','edos','efdr','ehip','ehun',
  'Ekee','Emoo','emow','emtg','etoa','etoe','etol','etrp','Ewar','ewsp',
  // Human units + buildings
  'halt','Hamg','harm','hars','hatw','hbar','hbla','Hblm','hcas','hctw','hdhw','hfoo',
  'hgra','hgry','hgtw','hgyr','hhou','hkee','hkni','hlum','hmil','Hmkg','hmpr','hmtm',
  'Hpal','hpea','hrif','hsie','hsor','hspt','htow','hvlt','hwat','hwt2','hwt3','hwtw',
  // Neutral heroes + mercs
  'Nalc','Nbrn','Nbst','Nfir','Nngs','Npbm','Nplh','Ntin','nftb','ngsp',
  // Orc units + buildings
  'oalt','obar','obea','Obla','ocat','odoc','Ofar','ofor','ofrt','ogre','ogru','ohou','ohun','okod','opeo',
  'orai','Oshd','oshm','osld','osp1','ostr','osw1','osw2','osw3','otau','otbk','otbr','Otch','otrb','otto','ovln','owtw','owvy',
  // UD units + buildings
  'uabo','uaco','uaod','uban','ubon','ubsp','Ucrl','ucry','ucs1','ucs2','ucs3',
  'Udea','Udre','udth','ufro','ugar','ugho','ugrv','Ulic','umtw','unec','unp1','unp2','unpl',
  'uobs','usep','ushd','uslh','utod','utom','uzg1','uzg2','uzig',
]);

/**
 * PlaystyleReport — Scouting dossier derived from fingerprint profile data.
 * Shows loop pattern, group roster, speed profile, and action mix.
 */
export default function PlaystyleReport({ profileData }) {
  if (!profileData?.averaged?.segments) return null;

  const { segments } = profileData.averaged;
  const { transitionPairs = [], groupUsage = [], groupCompositions = {}, actionCounts } = profileData;

  return (
    <Wrap>
      <GroupRoster groupUsage={groupUsage} groupCompositions={groupCompositions} />
      <LoopInfo transitionPairs={transitionPairs} actionCounts={actionCounts} />
      <SpeedProfile segments={segments} actionCounts={actionCounts} />
    </Wrap>
  );
}

/* ── Section 0: Scouting Notes ───────────────────────── */

/**
 * Analyze all profile data and return an array of human-readable observations.
 * Each note: { text: string, tone: 'gold' | 'green' | 'neutral' | 'red' }
 */
function buildNotes({ segments, transitionPairs, groupUsage, actionCounts }) {
  const notes = [];
  const { apm = [0, 0, 0], action = [] } = segments;
  const meanApm = Math.round(apm[0] * 300);
  const burst = apm[0] > 0 ? apm[2] / apm[0] : 0;
  const actionTotal = action.reduce((s, v) => s + v, 0);
  const active = (groupUsage || []).filter(g => (g.used + g.assigned) > 0);

  // ── Behavioral tells — things that matter for scouting ──

  // Selection spam — a strong fingerprint if extreme
  if (actionTotal > 0) {
    const selectPct = (action[4] / actionTotal) * 100;
    if (selectPct >= 50) notes.push({ text: `Selection addict — ${Math.round(selectPct)}% of all actions are re-selects`, tone: "gold" });
    else if (selectPct >= 40) notes.push({ text: `Selection-heavy — re-selects units constantly (${Math.round(selectPct)}%)`, tone: "neutral" });
  }

  // Strong loop pattern — distinguish nervous tick from functional switching
  if (transitionPairs.length > 0) {
    const total = transitionPairs.reduce((s, t) => s + t.count, 0);
    const top = transitionPairs[0];
    const reverse = transitionPairs.find((t, i) => i > 0 && t.from === top.to && t.to === top.from);
    if (reverse && transitionPairs.indexOf(reverse) <= 2) {
      const oscPct = Math.round(((top.count + reverse.count) / total) * 100);
      const avgRapid = Math.round(((top.rapidPct || 0) + (reverse.rapidPct || 0)) / 2);
      if (oscPct >= 40 && avgRapid >= 40) {
        notes.push({ text: `Nervous tick — ${top.from}↔${top.to} spam, ${avgRapid}% are instant switches with no actions between`, tone: "gold" });
      } else if (oscPct >= 60) {
        notes.push({ text: `Locked loop — ${top.from}↔${top.to} is ${oscPct}% of all switches (mostly functional)`, tone: "neutral" });
      } else if (oscPct >= 40) {
        notes.push({ text: `${top.from}↔${top.to} loop accounts for ${oscPct}% of switches`, tone: "neutral" });
      }
    }
  }

  // Dominant group — one group absorbs most attention
  if (active.length >= 2) {
    const sorted = [...active].sort((a, b) => (b.used + b.assigned) - (a.used + a.assigned));
    const topTotal = sorted[0].used + sorted[0].assigned;
    const allTotal = sorted.reduce((s, g) => s + g.used + g.assigned, 0);
    const topPct = allTotal > 0 ? (topTotal / allTotal) * 100 : 0;
    if (topPct >= 75) notes.push({ text: `Group ${sorted[0].group} hog — ${Math.round(topPct)}% of all hotkey traffic`, tone: "neutral" });
  }

  // Extreme hotkey usage
  if (active.length <= 2 && active.length > 0) notes.push({ text: `Only uses ${active.length} control group${active.length === 1 ? "" : "s"}`, tone: "neutral" });

  // Group rebinding — THE strongest fingerprint signal (Quality 6.93)
  if (actionCounts?.assignPerMin >= 20) {
    notes.push({ text: `Compulsive rebinder — ${actionCounts.assignPerMin}/min group reassigns (${actionCounts.reassignRatio}% of group actions)`, tone: "gold" });
  } else if (actionCounts?.reassignRatio <= 3 && actionCounts?.selectPerMin > 0) {
    notes.push({ text: `Set-and-forget — binds groups once, almost never rebinds (${actionCounts.reassignRatio}%)`, tone: "neutral" });
  }

  // Tab cycling — strong signal (Quality 2.38)
  if (actionCounts?.tabPerMin >= 50) {
    notes.push({ text: `Tab masher — cycles subgroups ${actionCounts.tabPerMin}/min`, tone: "green" });
  }

  // Rhythm — reveals mechanical fingerprint (Quality 2.9)
  if (actionCounts?.rhythmMedianMs != null && actionCounts?.rhythmStdMs != null) {
    const ratio = actionCounts.rhythmStdMs / actionCounts.rhythmMedianMs;
    if (ratio < 0.8 && actionCounts.rhythmMedianMs < 150) {
      notes.push({ text: `Metronome — extremely consistent rhythm (${actionCounts.rhythmMedianMs}ms ±${actionCounts.rhythmStdMs}ms)`, tone: "gold" });
    } else if (ratio >= 3.0) {
      notes.push({ text: `Burst/idle cycles — erratic rhythm (${actionCounts.rhythmMedianMs}ms ±${actionCounts.rhythmStdMs}ms)`, tone: "neutral" });
    }
  }

  // Surround habit — meaningful smurf signal (skilled players surround constantly)
  if (actionCounts?.surroundPerMin >= 8) {
    const sizeNote = actionCounts.surroundAvgSize >= 4 ? `, avg ${actionCounts.surroundAvgSize} clicks per burst` : "";
    notes.push({ text: `Active surrounder — ${actionCounts.surroundPerMin}/min move bursts${sizeNote}`, tone: "green" });
  } else if (actionCounts?.surroundPerMin > 0 && actionCounts.surroundPerMin < 2 && actionCounts.replayCount >= 3) {
    notes.push({ text: `Rarely surrounds — only ${actionCounts.surroundPerMin} move bursts/min`, tone: "neutral" });
  }

  // Speed + tempo combos
  if (meanApm >= 250 && burst < 1.3) notes.push({ text: "Machine-gun pace — extremely fast AND steady", tone: "gold" });
  else if (meanApm >= 250 && burst >= 2.0) notes.push({ text: "Explosive — extremely fast with huge fight-mode spikes", tone: "gold" });
  else if (meanApm <= 80 && meanApm > 0) notes.push({ text: "Very slow pace — macro/turtle style", tone: "neutral" });

  return notes;
}

function NotesSection({ notes }) {
  return (
    <NotesWrap>
      <SectionLabel>NOTES</SectionLabel>
      <NotesList>
        {notes.map((n, i) => (
          <Note key={i} $tone={n.tone}>{n.text}</Note>
        ))}
      </NotesList>
    </NotesWrap>
  );
}

/* ── Section 1: Loop Info — visual mini glyph ───────── */

function LoopGlyph({ nodeA, nodeB, rapidPct }) {
  const W = 130, H = 64, r = 16;
  const ax = r + 4, ay = H / 2;
  const bx = W - r - 4, by = H / 2;
  const midX = (ax + bx) / 2;
  const BOW = 18;
  const gold = "#eab308";

  return (
    <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
      {/* A→B arc bowing up */}
      <path d={`M${ax},${ay} Q${midX},${ay - BOW} ${bx},${by}`}
        fill="none" stroke={gold} strokeWidth={2} opacity={0.8} strokeLinecap="round" />
      {/* B→A arc bowing down */}
      <path d={`M${bx},${by} Q${midX},${ay + BOW} ${ax},${ay}`}
        fill="none" stroke={gold} strokeWidth={1.5} opacity={0.45} strokeLinecap="round" />
      {/* Node A */}
      <circle cx={ax} cy={ay} r={r} fill="#0f172a" />
      <circle cx={ax} cy={ay} r={r} fill="none" stroke={gold} strokeWidth={2.5} opacity={0.85} />
      <text x={ax} y={ay} textAnchor="middle" dominantBaseline="central"
        fill={gold} fontSize="14" fontFamily="Inconsolata,monospace" fontWeight="700">{nodeA}</text>
      {/* Node B */}
      <circle cx={bx} cy={by} r={r} fill="#0f172a" />
      <circle cx={bx} cy={by} r={r} fill="none" stroke={gold} strokeWidth={2.5} opacity={0.85} />
      <text x={bx} y={by} textAnchor="middle" dominantBaseline="central"
        fill={gold} fontSize="14" fontFamily="Inconsolata,monospace" fontWeight="700">{nodeB}</text>
    </svg>
  );
}

function detectLoops(transitionPairs, total) {
  const seen = new Set();
  const loops = [];
  for (const t of transitionPairs) {
    const key = `${Math.min(t.from, t.to)}-${Math.max(t.from, t.to)}`;
    if (seen.has(key)) continue;
    const rev = transitionPairs.find(r => r.from === t.to && r.to === t.from);
    if (!rev) continue;
    seen.add(key);
    const oscPct = Math.round(((t.count + rev.count) / total) * 100);
    if (oscPct < 5) continue;
    const avgRapidPct = (t.rapidPct != null || rev.rapidPct != null)
      ? Math.round(((t.rapidPct || 0) + (rev.rapidPct || 0)) / 2)
      : null;
    const medGap = t.medianGapMs || rev.medianGapMs || null;
    loops.push({ a: t.from, b: t.to, oscPct, avgRapidPct, medGap });
  }
  return loops;
}

function LoopInfo({ transitionPairs }) {
  if (!transitionPairs || transitionPairs.length === 0) return null;
  const total = transitionPairs.reduce((s, t) => s + t.count, 0);
  if (total === 0) return null;

  const loops = detectLoops(transitionPairs, total);
  if (loops.length === 0) return null;

  const [primary, ...secondary] = loops;
  const { a, b, oscPct, avgRapidPct, medGap } = primary;

  return (
    <Section>
      <SectionLabel>LOOP{loops.length > 1 ? `S` : ""}</SectionLabel>
      <SectionBody>
        {/* Primary loop — full detail */}
        <PrimaryLoopRow>
          <LoopLeft>
            <LoopPct>{oscPct}%</LoopPct>
            <LoopPctLabel>of switches</LoopPctLabel>
          </LoopLeft>
          <LoopGlyph nodeA={a} nodeB={b} />
          {avgRapidPct != null && (
            <LoopBreakdown>
              <LoopRow>
                <LoopRowLabel $color="var(--gold)">SPAM</LoopRowLabel>
                <LoopRowTrack>
                  <LoopRowFill $color="var(--gold)" style={{ width: `${avgRapidPct}%` }} />
                </LoopRowTrack>
                <LoopRowVal>{avgRapidPct}%</LoopRowVal>
              </LoopRow>
              <LoopRow>
                <LoopRowLabel $color="var(--green)">FUNC</LoopRowLabel>
                <LoopRowTrack>
                  <LoopRowFill $color="var(--green)" style={{ width: `${100 - avgRapidPct}%` }} />
                </LoopRowTrack>
                <LoopRowVal>{100 - avgRapidPct}%</LoopRowVal>
              </LoopRow>
            </LoopBreakdown>
          )}
        </PrimaryLoopRow>
        {medGap != null && <LoopGapLabel>~{medGap}ms avg gap</LoopGapLabel>}
        {/* Secondary loops — compact single line each */}
        {secondary.length > 0 && (
          <SecondaryLoops>
            {secondary.map(l => (
              <SecondaryLoop key={`${l.a}-${l.b}`}>
                <SecondaryPct>{l.oscPct}%</SecondaryPct>
                <SecondaryNodes>{l.a} ↔ {l.b}</SecondaryNodes>
              </SecondaryLoop>
            ))}
          </SecondaryLoops>
        )}
      </SectionBody>
    </Section>
  );
}

/* ── Section 2: Group Roster ─────────────────────────── */

// Kept in sync with TransitionGlyph.jsx SUPPORT_UNITS
const SUPPORT_IDS = new Set([
  'hmpr', 'hsor', 'hdhw',
  'oshm', 'odoc', 'osp1', 'owvy',
  'edry', 'edoc', 'efdr',
  'unec', 'uban', 'uobs', 'umtw',
  'hpea', 'opeo', 'uaco', 'ewsp',
  'nzep', 'ushd',
]);

const VIOLET = "#a78bfa";

function inferRole(units) {
  if (!units || units.length === 0) return { label: "Units", color: "var(--gold)" };
  const totalCount = units.reduce((s, u) => s + u.count, 0);
  if (totalCount === 0) return { label: "Units", color: "var(--gold)" };

  const buildingCount = units.filter(u => u.isBuilding).reduce((s, u) => s + u.count, 0);
  if (buildingCount / totalCount > 0.5) return { label: "Buildings", color: "var(--grey-light)" };

  const supportCount = units.filter(u => SUPPORT_IDS.has(u.id)).reduce((s, u) => s + u.count, 0);
  const nonBuildingCount = totalCount - buildingCount;
  if (nonBuildingCount > 0 && supportCount / nonBuildingCount > 0.3) {
    return { label: "Support", color: VIOLET };
  }

  return { label: "Units", color: "var(--gold)" };
}

// Alternate unit IDs that map to the same icon file
const ICON_ALIASES = {
  owyv: 'owvy',  // Wind Rider alternate ID → owvy.png
  ospw: 'osp1',  // Spirit Walker upgraded → osp1.png
  ospm: 'osp1',  // Spirit Walker variant → osp1.png
};

export function getUnitImage(id) {
  const resolved = ICON_ALIASES[id] || id;
  if (UNIT_ICONS.has(resolved)) return `/units/${resolved}.png`;
  return null;
}

export { HERO_IMAGES, BUILDINGS, SHORT_NAMES, UNIT_ICONS };

export function getGroupUnits(items) {
  if (!items || items.length === 0) return [];
  const units = [];
  for (const { id, count } of items) {
    const isBuilding = BUILDINGS.has(id);
    const isHero = !!HERO_IMAGES[id];
    const name = SHORT_NAMES[id] || BUILDING_NAMES[id] || id;
    const img = getUnitImage(id);
    units.push({ id, name, count, isBuilding, isHero, img });
  }
  // Check if this is a building-dominated group
  const buildingCount = units.filter(u => u.isBuilding).reduce((s, u) => s + u.count, 0);
  const totalCount = units.reduce((s, u) => s + u.count, 0);
  const isBuildingGroup = totalCount > 0 && buildingCount / totalCount > 0.5;
  if (isBuildingGroup) {
    // Building groups: just sort by count desc
    units.sort((a, b) => b.count - a.count);
  } else {
    // Unit groups: heroes first, then units, then buildings; within each tier by count desc
    units.sort((a, b) => {
      if (a.isHero !== b.isHero) return a.isHero ? -1 : 1;
      if (a.isBuilding !== b.isBuilding) return a.isBuilding ? 1 : -1;
      return b.count - a.count;
    });
  }
  return units;
}

function GroupRoster({ groupUsage, groupCompositions }) {
  const active = (groupUsage || []).filter(g => (g.used + g.assigned) > 0);
  if (active.length === 0) return null;

  const sorted = [...active].sort((a, b) => {
    if (a.group === 0) return 1;
    if (b.group === 0) return -1;
    return a.group - b.group;
  });
  const grandTotal = sorted.reduce((s, g) => s + g.used + g.assigned, 0) || 1;
  const topTotal = Math.max(...sorted.map(g => g.used + g.assigned));

  return (
    <Section>
      <SectionLabel>GROUPS</SectionLabel>
      <GroupGrid>
        {sorted.map((g) => {
          const total = g.used + g.assigned;
          const volumePct = Math.round((total / grandTotal) * 100);
          const barPct = Math.round((total / topTotal) * 100);
          const compItems = groupCompositions[String(g.group)];
          const units = getGroupUnits(compItems);
          const role = inferRole(units);
          const displayUnits = units.slice(0, 4);

          return (
            <GroupRow key={g.group}>
              <GroupNum>{g.group}</GroupNum>
              <BarTrack>
                <BarFill style={{ width: `${barPct}%` }} />
              </BarTrack>
              <GroupPct>{volumePct}%</GroupPct>
              <RoleBadge $color={role.color}>{role.label}</RoleBadge>
              <CompWrap>
                {displayUnits.map((u) => (
                  <UnitChip key={u.id} title={u.name}>
                    {u.img ? (
                      <UnitPic src={u.img} alt={u.name} />
                    ) : (
                      <UnitName $dim={u.isBuilding}>{u.name}</UnitName>
                    )}
                  </UnitChip>
                ))}
              </CompWrap>
            </GroupRow>
          );
        })}
      </GroupGrid>
    </Section>
  );
}

/* ── Section 3: Speed Profile ────────────────────────── */

function SpeedProfile({ segments, actionCounts }) {
  const { apm = [0, 0, 0] } = segments;

  const meanApm = Math.round(apm[0] * 300);
  const stdApm = Math.round(apm[2] * 300);
  const lowApm = Math.max(0, meanApm - stdApm);
  const highApm = meanApm + stdApm;
  const barMax = Math.max(highApm + 20, 300);

  const lowPct = (lowApm / barMax) * 100;
  const avgPct = (meanApm / barMax) * 100;
  const highPct = (highApm / barMax) * 100;

  const rhythm = actionCounts?.rhythmMedianMs;

  return (
    <Section>
      <SectionLabel>SPEED</SectionLabel>
      <SectionBody>
        <SpeedRow>
          <ApmValue>{meanApm}</ApmValue>
          <ApmUnit>APM avg</ApmUnit>
        </SpeedRow>
        <ApmRangeWrap>
          <ApmRangeBar>
            <ApmRangeFill style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }} />
            <ApmRangeMarker style={{ left: `${avgPct}%` }} />
          </ApmRangeBar>
          <ApmRangeLabels>
            <ApmRangeLabel style={{ left: `${lowPct}%` }}>{lowApm}</ApmRangeLabel>
            <ApmRangeLabel style={{ left: `${avgPct}%`, color: "#fff", fontWeight: 700 }}>{meanApm}</ApmRangeLabel>
            <ApmRangeLabel style={{ left: `${highPct}%` }}>{highApm}</ApmRangeLabel>
          </ApmRangeLabels>
        </ApmRangeWrap>
        {rhythm != null && <SpeedMeta>{rhythm}ms median between actions</SpeedMeta>}
      </SectionBody>
    </Section>
  );
}

/* ── Section 4: Signal Metrics ────────────────────────── */

function SignalSection({ actionCounts }) {
  if (!actionCounts) return null;

  const surroundDesc = actionCounts.surroundAvgSize > 0
    ? `surround bursts (avg ${actionCounts.surroundAvgSize} clicks)`
    : "surround bursts";
  const items = [
    { label: "Tab", value: actionCounts.tabPerMin, icon: "⇥", desc: "subgroup cycles" },
    { label: "A-move", value: actionCounts.attackMovePerMin, icon: "⚔", desc: "attack-move" },
    { label: "Surround", value: actionCounts.surroundPerMin, icon: "⟳", desc: surroundDesc },
  ].filter(i => i.value > 0);

  if (items.length === 0) return null;

  return (
    <Section>
      <SectionLabel>HABITS</SectionLabel>
      <SectionBody>
        <HabitList>
          {items.map(item => (
            <HabitRow key={item.label}>
              <HabitIcon>{item.icon}</HabitIcon>
              <HabitVal>{item.value}/min</HabitVal>
              <HabitLabel>{item.desc}</HabitLabel>
            </HabitRow>
          ))}
        </HabitList>
      </SectionBody>
    </Section>
  );
}

/* ── Section 5: Hero Builds ──────────────────────────── */

// Ability FourCC → short display name. Codes verified against
// github.com/jcfieldsdev/warcraft3-hotkey-editor (lowercase → capitalize first two chars)
const ABILITY_NAMES = {
  // Death Knight
  AUdc: 'Coil', AUau: 'Aura', AUdp: 'Pact', AUan: 'Animate',
  // Lich
  AUfn: 'Nova', AUfu: 'Armor', AUdr: 'Ritual', AUdd: 'Decay',
  // Dread Lord
  AUcs: 'Swarm', AUsl: 'Sleep', AUav: 'Vampiric', AUin: 'Inferno',
  // Crypt Lord
  AUim: 'Impale', AUcb: 'Beetles', AUts: 'Carapace', AUls: 'Locusts',
  // Blademaster
  AOmi: 'Mirror', AOcr: 'Crit', AOwk: 'Wind Walk', AOww: 'Bladestorm',
  // Far Seer
  AOcl: 'Chain', AOfs: 'Far Sight', AOsf: 'Wolves', AOeq: 'Earthquake',
  // Tauren Chieftain
  AOws: 'War Stomp', AOae: 'Endurance', AOsh: 'Shockwave', AOre: 'Reincarnate',
  // Shadow Hunter
  AOhx: 'Hex', AOhw: 'Wave', AOsw: 'Serpent Ward', AOvd: 'Big Bad',
  // Archmage
  AHbz: 'Blizzard', AHab: 'Brilliance', AHwe: 'Water Ele', AHmt: 'Mass TP',
  // Mountain King
  AHtb: 'Storm Bolt', AHtc: 'Thunder', AHbh: 'Bash', AHav: 'Avatar',
  // Paladin
  AHhb: 'Holy', AHad: 'Devotion', AHre: 'Resurrect', AHds: 'Divine Shield',
  // Blood Mage
  AHfs: 'Flame Strike', AHbn: 'Banish', AHdr: 'Siphon', AHpe: 'Phoenix',
  // Keeper of the Grove
  AEfn: 'Force', AEer: 'Roots', AEah: 'Thorns', AEtq: 'Tranquility',
  // Priestess of the Moon
  AEsn: 'Sentinel', AEar: 'Trueshot', AEev: 'Evasion', AEsf: 'Starfall',
  // Demon Hunter
  AEmb: 'Mana Burn', AEim: 'Immolation', AEll: 'Metamorphosis',
  // Warden
  AEfk: 'Fan', AEbl: 'Blink', AEsh: 'Shadow Strike', AEsv: 'Vengeance',
};

function formatBuild(path) {
  if (!path) return '';
  return path.split('-').map(code => ABILITY_NAMES[code] || code).join(' → ');
}

function HeroBuildsSection({ heroBuilds }) {
  const entries = Object.entries(heroBuilds || {});
  if (entries.length === 0) return null;

  return (
    <Section>
      <SectionLabel>HERO BUILDS</SectionLabel>
      <SectionBody>
        <HeroBuildList>
          {entries.map(([heroId, build]) => (
            <HeroBuildRow key={heroId}>
              <HeroBuildHero>{heroId}</HeroBuildHero>
              <HeroBuildPath>{formatBuild(build.mostCommon)}</HeroBuildPath>
              <HeroBuildMeta>
                {build.consistency}% consistent
                {build.games > 1 && ` · ${build.games} games`}
              </HeroBuildMeta>
            </HeroBuildRow>
          ))}
        </HeroBuildList>
      </SectionBody>
    </Section>
  );
}

/* ── Styled Components ───────────────────────────────── */

const Wrap = styled.div`
  background: var(--surface-1);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--grey-light);
`;

const Row = styled.div`
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
`;

/* Shared section layout */

const Section = styled.div`
  padding: var(--space-4) 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  &:last-child { border-bottom: none; }
`;

const SectionBody = styled.div`
  padding-top: var(--space-2);
`;

/* Loop */

const PrimaryLoopRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-4);
  min-height: 64px;
`;

const SecondaryLoops = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  padding-top: var(--space-2);
  padding-left: 4px;
`;

const SecondaryLoop = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
`;

const SecondaryPct = styled.span`
  font-size: var(--text-xs);
  font-weight: 700;
  color: #fff;
`;

const SecondaryNodes = styled.span`
  font-size: var(--text-xs);
  color: var(--grey-light);
`;

const LoopLeft = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 48px;
`;

const LoopPct = styled.div`
  font-size: var(--text-lg);
  font-weight: 700;
  color: #fff;
  line-height: 1;
`;

const LoopPctLabel = styled.div`
  font-size: 10px;
  color: var(--grey-light);
  white-space: nowrap;
`;

const LoopBreakdown = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const LoopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const LoopRowLabel = styled.span`
  font-size: 10px;
  font-family: var(--font-mono);
  color: ${p => p.$color || "var(--grey-light)"};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  width: 72px;
  flex-shrink: 0;
`;

const LoopRowTrack = styled.div`
  width: 120px;
  height: 5px;
  background: rgba(255,255,255,0.08);
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex-shrink: 0;
`;

const LoopRowFill = styled.div`
  height: 100%;
  background: ${p => p.$color || "var(--gold)"};
  border-radius: var(--radius-sm);
  opacity: 0.75;
`;

const LoopRowVal = styled.span`
  font-size: var(--text-xs);
  color: #fff;
  font-weight: 600;
  width: 28px;
  text-align: right;
`;

const LoopGapLabel = styled.div`
  font-size: var(--text-xs);
  color: var(--grey-light);
  padding-top: 3px;
  padding-left: 78px;
`;


const SectionLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
  min-width: 64px;
  flex-shrink: 0;
`;

const Value = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
`;

const Muted = styled.span`
  color: var(--grey-light);
`;


/* Scouting Notes */

const NotesWrap = styled.div`
  display: flex;
  gap: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const NotesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const TONE_COLORS = {
  gold: "var(--gold)",
  green: "var(--green)",
  red: "var(--red)",
  neutral: "var(--grey-light)",
};

const Note = styled.div`
  font-size: var(--text-xs);
  color: ${p => TONE_COLORS[p.$tone] || TONE_COLORS.neutral};
  line-height: 1.5;
  padding: var(--space-1) 0;

  &::before {
    content: "•";
    margin-right: var(--space-2);
    opacity: 0.6;
    color: var(--gold);
  }
`;

/* Group Roster */

const GroupGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: var(--space-2);
`;

const GroupRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const GroupNum = styled.span`
  font-size: var(--text-xs);
  color: var(--gold);
  font-weight: 600;
  width: 14px;
  text-align: right;
`;

const BarTrack = styled.div`
  width: 120px;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-sm);
  overflow: hidden;
`;

const BarFill = styled.div`
  height: 100%;
  background: var(--gold);
  border-radius: var(--radius-sm);
  opacity: 0.7;
`;

const GroupPct = styled.span`
  font-size: var(--text-xs);
  color: var(--grey-light);
  width: 32px;
  text-align: right;
`;

const RoleBadge = styled.span`
  font-size: var(--text-xs);
  color: ${p => p.$color || "var(--grey-light)"};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  width: 72px;
`;

const CompWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const UnitChip = styled.div`
  flex-shrink: 0;
`;

const UnitPic = styled.img`
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--grey-mid);
  object-fit: cover;
  display: block;
`;

const UnitName = styled.span`
  font-size: 10px;
  color: ${p => p.$dim ? "var(--grey-mid)" : "var(--grey-light)"};
  font-family: var(--font-mono);
  white-space: nowrap;
`;

/* Speed */

const SpeedContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SpeedRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ApmValue = styled.span`
  font-size: var(--text-lg);
  font-weight: 700;
  color: #fff;
  line-height: 1;
`;

const ApmUnit = styled.span`
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const ApmRangeWrap = styled.div`
  position: relative;
  padding-bottom: 16px;
  margin-top: var(--space-2);
`;

const ApmRangeBar = styled.div`
  position: relative;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-sm);
`;

const ApmRangeFill = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--gold);
  opacity: 0.45;
  border-radius: var(--radius-sm);
`;

const ApmRangeMarker = styled.div`
  position: absolute;
  top: -3px;
  width: 3px;
  height: 12px;
  background: var(--gold);
  border-radius: 2px;
  transform: translateX(-50%);
`;

const ApmRangeLabels = styled.div`
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  height: 14px;
`;

const ApmRangeLabel = styled.span`
  position: absolute;
  font-size: 10px;
  color: var(--grey-light);
  transform: translateX(-50%);
  white-space: nowrap;
`;

const SpeedMeta = styled.div`
  font-size: var(--text-xs);
  color: var(--grey-light);
  padding-left: 0;
`;

/* Habits */

const HabitList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const HabitRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const HabitIcon = styled.span`
  font-size: 28px;
  line-height: 1;
  color: var(--gold);
  width: 32px;
  text-align: center;
  flex-shrink: 0;
`;

const HabitVal = styled.span`
  font-size: var(--text-base);
  color: #fff;
  font-weight: 700;
  min-width: 72px;
`;

const HabitLabel = styled.span`
  font-size: var(--text-xs);
  color: var(--grey-light);
  letter-spacing: 0.04em;
`;

/* Hero Builds */

const HeroBuildList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const HeroBuildRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const HeroBuildHero = styled.span`
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const HeroBuildPath = styled.span`
  font-size: var(--text-xs);
  color: var(--gold);
  font-family: var(--font-mono);
`;

const HeroBuildMeta = styled.span`
  font-size: var(--text-xxs);
  color: var(--grey-mid);
`;

/* Action Mix */
