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
  uske: 'Skel', uskm: 'Skel',
  ucs1: 'Beetle', ucs2: 'Beetle', ucs3: 'Beetle',
  // Alternate IDs / upgraded forms
  owyv: 'WR', ehpr: 'HippoR', ospw: 'SW', ospm: 'SW',
  ucrm: 'Fiend', esen: 'Hunt', ebal: 'Glaive', hphx: 'Phoenix',
  nzep: 'Zep', nass: 'Assassin',
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

/**
 * PlaystyleReport — Scouting dossier derived from fingerprint profile data.
 * Shows loop pattern, group roster, speed profile, and action mix.
 */
export default function PlaystyleReport({ profileData }) {
  if (!profileData?.averaged?.segments) return null;

  const { segments } = profileData.averaged;
  const { transitionPairs = [], groupUsage = [], groupCompositions = {}, actionCounts } = profileData;

  const notes = buildNotes({ segments, transitionPairs, groupUsage, actionCounts });

  return (
    <Wrap>
      {notes.length > 0 && <NotesSection notes={notes} />}
      <LoopInfo transitionPairs={transitionPairs} />
      <GroupRoster groupUsage={groupUsage} groupCompositions={groupCompositions} />
      <SpeedProfile segments={segments} actionCounts={actionCounts} />
      <SignalSection actionCounts={actionCounts} />
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

/* ── Section 1: Loop Info (tick vs functional) ─────── */

function LoopInfo({ transitionPairs }) {
  if (!transitionPairs || transitionPairs.length === 0) return null;

  const total = transitionPairs.reduce((s, t) => s + t.count, 0);
  if (total === 0) return null;

  const top = transitionPairs[0];
  const reverse = transitionPairs.find(
    (t, i) => i > 0 && t.from === top.to && t.to === top.from
  );
  const isOscillation = reverse && transitionPairs.indexOf(reverse) <= 2;
  if (!isOscillation) return null;

  const oscPct = Math.round(((top.count + reverse.count) / total) * 100);
  const hasRapid = top.rapidPct != null || (reverse && reverse.rapidPct != null);
  const avgRapidPct = hasRapid
    ? Math.round(((top.rapidPct || 0) + ((reverse && reverse.rapidPct) || 0)) / 2)
    : null;
  const medGap = top.medianGapMs || (reverse && reverse.medianGapMs) || null;

  // Only show if we have the tick/functional breakdown — that's the signal
  if (avgRapidPct == null) return null;

  return (
    <LoopSection>
      <SectionLabel>LOOP</SectionLabel>
      <LoopContent>
        <LoopBreakdown>
          <LoopBar>
            <LoopBarRapid style={{ width: `${avgRapidPct}%` }} />
          </LoopBar>
          <LoopLabels>
            <LoopLabel $color={avgRapidPct >= 40 ? "var(--gold)" : "var(--grey-light)"}>
              {avgRapidPct}% nervous tick
            </LoopLabel>
            <LoopLabel $color="var(--grey-mid)">
              {100 - avgRapidPct}% functional
            </LoopLabel>
            {medGap != null && (
              <LoopLabel $color="var(--grey-mid)">
                ~{medGap}ms gap
              </LoopLabel>
            )}
            <LoopLabel $color="var(--grey-mid)">
              {oscPct}% of switches
            </LoopLabel>
          </LoopLabels>
        </LoopBreakdown>
      </LoopContent>
    </LoopSection>
  );
}

/* ── Section 2: Group Roster ─────────────────────────── */

/**
 * Infer group role from composition. Binary: Units or Buildings.
 */
function inferRole(units) {
  if (units && units.length > 0) {
    const buildingCount = units.filter(u => u.isBuilding).reduce((s, u) => s + u.count, 0);
    const totalCount = units.reduce((s, u) => s + u.count, 0);
    if (totalCount > 0 && buildingCount / totalCount > 0.5) {
      return { label: "Buildings", color: "var(--grey-mid)" };
    }
  }
  return { label: "Units", color: "var(--gold)" };
}

function getUnitImage(id) {
  if (UNIT_ICONS.has(id)) return `/units/${id}.png`;
  return null;
}

function getGroupUnits(items) {
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

  const sorted = [...active].sort((a, b) => a.group - b.group);
  const topTotal = Math.max(...sorted.map(g => g.used + g.assigned));

  return (
    <GroupSection>
      <SectionLabel>GROUPS</SectionLabel>
      <GroupGrid>
        {sorted.map((g) => {
          const total = g.used + g.assigned;
          const selectPct = total > 0 ? Math.round((g.used / total) * 100) : 0;
          const volumePct = Math.round((total / topTotal) * 100);
          const compItems = groupCompositions[String(g.group)];
          const units = getGroupUnits(compItems);
          const role = inferRole(units);
          const displayUnits = units.slice(0, 4);

          return (
            <GroupRow key={g.group}>
              <GroupNum>{g.group}</GroupNum>
              <BarTrack>
                <BarFill style={{ width: `${volumePct}%` }} />
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
    </GroupSection>
  );
}

/* ── Section 3: Speed Profile ────────────────────────── */

function SpeedProfile({ segments, actionCounts }) {
  const { apm = [0, 0, 0], tempo = [] } = segments;

  const meanApm = Math.round(apm[0] * 300);
  const burstRatio = apm[0] > 0 ? apm[2] / apm[0] : 0;
  const burstLabel =
    burstRatio >= 2.5 ? "Very bursty" :
    burstRatio >= 1.5 ? "Bursty" :
    "Steady";

  const fastPct = tempo.length >= 3
    ? Math.round((tempo[0] + tempo[1] + tempo[2]) * 100)
    : null;

  // Simple filled bar: 0–300 APM range
  const barMax = 300;
  const fillPct = Math.min((meanApm / barMax) * 100, 100);

  const rhythm = actionCounts?.rhythmMedianMs;
  const rhythmStd = actionCounts?.rhythmStdMs;

  return (
    <SpeedSection>
      <SectionLabel>SPEED</SectionLabel>
      <SpeedContent>
        <SpeedRow>
          <ApmValue>{meanApm}</ApmValue>
          <ApmUnit>APM</ApmUnit>
          <ApmBar>
            <ApmBarFill style={{ width: `${fillPct}%` }} />
          </ApmBar>
        </SpeedRow>
        <SpeedMeta>
          <span>{burstLabel} ({burstRatio.toFixed(1)}x)</span>
          {fastPct != null && <><Muted> · </Muted><span>{fastPct}% sub-200ms</span></>}
          {rhythm != null && <><Muted> · </Muted><span>{rhythm}ms rhythm</span></>}
          {rhythmStd != null && <><Muted> ±</Muted><span>{rhythmStd}ms</span></>}
        </SpeedMeta>
      </SpeedContent>
    </SpeedSection>
  );
}

/* ── Section 4: Signal Metrics ────────────────────────── */

function SignalSection({ actionCounts }) {
  if (!actionCounts) return null;

  const items = [
    { label: "Rebind", value: actionCounts.assignPerMin, desc: "group reassigns/min", quality: 6.93 },
    { label: "Tab", value: actionCounts.tabPerMin, desc: "subgroup cycles/min", quality: 2.38 },
    { label: "Reassign %", value: actionCounts.reassignRatio, desc: "of group actions", suffix: "%", quality: 0.96 },
    { label: "A-move", value: actionCounts.attackMovePerMin, desc: "/min", quality: null },
  ].filter(i => i.value > 0);

  if (items.length === 0) return null;

  return (
    <Row>
      <SectionLabel>HABITS</SectionLabel>
      <HabitPills>
        {items.map(item => (
          <HabitPill key={item.label}>
            <HabitVal>{item.value}{item.suffix || "/min"}</HabitVal>
            <HabitLabel>{item.label}</HabitLabel>
          </HabitPill>
        ))}
      </HabitPills>
    </Row>
  );
}

/* ── Styled Components ───────────────────────────────── */

const Wrap = styled.div`
  background: var(--surface-1);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--grey-light);
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--gold);
  }
`;

const Row = styled.div`
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
`;

/* Loop breakdown */

const LoopSection = styled.div`
  display: flex;
  gap: var(--space-4);
`;

const LoopContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const LoopBreakdown = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const LoopBar = styled.div`
  width: 180px;
  height: 5px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
`;

const LoopBarRapid = styled.div`
  height: 100%;
  background: var(--gold);
  border-radius: 3px;
  opacity: 0.7;
`;

const LoopLabels = styled.div`
  display: flex;
  gap: 8px;
  font-size: var(--text-xs);
`;

const LoopLabel = styled.span`
  color: ${p => p.$color || "var(--grey-light)"};
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

const GroupSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const GroupGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-left: 80px;
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
  border-radius: 3px;
  overflow: hidden;
`;

const BarFill = styled.div`
  height: 100%;
  background: var(--gold);
  border-radius: 3px;
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
  border-radius: 4px;
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

const SpeedSection = styled.div`
  display: flex;
  gap: var(--space-4);
`;

const SpeedContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
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

const ApmBar = styled.div`
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
`;

const ApmBarFill = styled.div`
  height: 100%;
  background: var(--gold);
  border-radius: 3px;
  opacity: 0.7;
`;

const SpeedMeta = styled.div`
  font-size: var(--text-xs);
  color: var(--grey-light);
  padding-left: 0;
`;

/* Habit Pills */

const HabitPills = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const HabitPill = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 5px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-sm);
`;

const HabitKey = styled.span`
  font-size: 11px;
  color: var(--grey-mid);
  line-height: 1;
`;

const HabitVal = styled.span`
  font-size: var(--text-xs);
  color: #fff;
  font-weight: 600;
`;

const HabitLabel = styled.span`
  font-size: var(--text-xs);
  color: var(--grey-mid);
`;

/* Action Mix */
