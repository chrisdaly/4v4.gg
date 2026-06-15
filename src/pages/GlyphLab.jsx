import React, { useState, useEffect } from "react";
import styled from "styled-components";

const RELAY_URL = import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

// ── Colors ────────────────────────────────────────────────────────────────────
const GOLD   = "#eab308";
const HERO_C = "#fcd34d"; // brighter amber for hero groups
const VIOLET = "#a78bfa";
const GREY_N = "#6b7280";
const ASSIGN = "#7eb8da";

// ── WC3 unit data ─────────────────────────────────────────────────────────────
const SHORT_NAMES = {
  Hamg:"AM",Hmkg:"MK",Hpal:"Pala",Hblm:"BM",
  Obla:"BM",Ofar:"FS",Otch:"TC",Oshd:"SH",
  Ekee:"KotG",Emoo:"PotM",Edem:"DH",Ewar:"Ward",
  Udea:"DK",Udre:"DL",Ulic:"Lich",Ucrl:"CL",
  Nplh:"PL",Nngs:"Naga",Npbm:"Panda",Nbrn:"DR",
  Nbst:"Beast",Ntin:"Tink",Nfir:"Fire",Nalc:"Alch",
  hfoo:"Foot",hrif:"Rifle",hkni:"Knight",hspt:"Breaker",
  hmtm:"Mortar",hgyr:"Gyro",hdhw:"Hawk",hmpr:"Priest",
  hsor:"Sorc",hgry:"Gryph",hsie:"Tank",hmil:"Militia",hpea:"Peon",
  ogru:"Grunt",ohun:"HH",orai:"Raider",otau:"Tauren",
  oshm:"Shaman",odoc:"WD",osp1:"SW",owvy:"WR",
  okod:"Kodo",ocat:"Demo",otbr:"Bat",otbk:"Zerk",opeo:"Peon",
  earc:"Archer",ehun:"Hunt",edry:"Dryad",emtg:"MG",
  edot:"DotT",edoc:"DotC",ehip:"Hippo",efdr:"Faerie",
  echm:"Chim",edcm:"Bear",edtm:"Crow",edos:"Bear",ewsp:"Wisp",
  ugho:"Ghoul",ucry:"Fiend",ugar:"Garg",uabo:"Abom",
  umtw:"Wagon",uobs:"Statue",unec:"Necro",uban:"Banshee",
  ufro:"Wyrm",udth:"Dest",ubsp:"Dest",ushd:"Shade",uaco:"Aco",
  hwat:"W.Elem",hwt2:"W.Elem",hwt3:"W.Elem",
  efon:"Treant",osw1:"Wolf",osw2:"Wolf",osw3:"Wolf",
  uske:"Skel",uskm:"Skel",
  owyv:"WR",owyc:"WR",ehpr:"HippoR",ospw:"SW",ospm:"SW",
  ucrm:"Fiend",esen:"Hunt",ebal:"Glaive",hphx:"Phoenix",
  nzep:"Zep",nass:"Nass",ucs1:"Beetle",ucs2:"Beetle",ucs3:"Beetle",
  htow:"Town Hall",hkee:"Keep",hcas:"Castle",halt:"Altar",
  hbar:"Barracks",hbla:"Blacksmith",hars:"Workshop",hlum:"Lumber Mill",
  ogre:"Great Hall",ostr:"Stronghold",ofrt:"Fortress",oalt:"Altar",
  obar:"Barracks",ofor:"Bestiary",
  etol:"Tree of Life",etoa:"Tree of Ages",etoe:"Tree of Eternity",
  eate:"Altar",eaom:"Moon Well",eaow:"Ancient of War",eaoe:"Ancient of Wonders",
  unpl:"Necropolis",unp1:"Halls of Dead",unp2:"Black Citadel",
  uaod:"Altar",usep:"Crypt",ugrv:"Graveyard",utod:"Temple of Damned",
};

const UNIT_ICONS_SET = new Set([
  "eaoe","eaom","eaow","earc","eate","echm","Edem","eden","edob","edoc","edot","edry","edtm","edcm","edos","efdr","ehip","ehun",
  "Ekee","Emoo","emow","emtg","etoa","etoe","etol","etrp","Ewar","ewsp",
  "halt","Hamg","harm","hars","hatw","hbar","hbla","Hblm","hcas","hctw","hdhw","hfoo",
  "hgra","hgry","hgtw","hgyr","hhou","hkee","hkni","hlum","hmil","Hmkg","hmpr","hmtm",
  "Hpal","hpea","hrif","hsie","hsor","hspt","htow","hvlt","hwtw",
  "hwat","hwt2","hwt3",
  "Nalc","Nbrn","Nbst","Nfir","Nngs","Npbm","Nplh","Ntin","ngsp","nftb",
  "oalt","obar","obea","Obla","ocat","odoc","Ofar","ofor","ofrt","ogre","ogru","ohou","ohun","okod","opeo",
  "orai","Oshd","oshm","osld","osp1","ostr","otau","otbk","otbr","Otch","otrb","otto","ovln","owtw","owvy",
  "osw1","osw2","osw3",
  "uabo","uaco","uaod","uban","ubon","ubsp","Ucrl","ucry","ucs1","ucs2","ucs3",
  "Udea","Udre","udth","ufro","ugar","ugho","ugrv","Ulic","umtw","unec","unp1","unp2","unpl",
  "uobs","usep","ushd","uslh","utod","utom","uzg1","uzg2","uzig",
]);

const BUILDINGS = new Set([
  "htow","hkee","hcas","halt","hbar","hbla","hars","hlum","hwtw","hatw","hgtw","hctw","harm","hgra","hvlt","hhou","hrtt",
  "ogre","ostr","ofrt","oalt","obar","ofor","osld","obea","otrb","otto","owtw","ovln","ohou",
  "etol","etoa","etoe","eate","eaom","eaow","eaoe","edob","emow","etrp","eden",
  "unpl","unp1","unp2","uaod","usep","ugrv","utod","uslh","ubon","utom","uzig","uzg1","uzg2","ugol",
]);

const HERO_IDS = new Set([
  "Hamg","Hmkg","Hpal","Hblm","Obla","Ofar","Otch","Oshd",
  "Ekee","Emoo","Edem","Ewar","Udea","Udre","Ulic","Ucrl",
  "Nplh","Npbm","Nbst","Ntin","Nalc","Nfir","Nngs","Nbrn",
]);

const SUPPORT_UNITS = new Set([
  "hmpr","hsor","hdhw","oshm","odoc","osp1","owvy","edry","edoc","efdr","unec","uban","uobs",
]);

// ── Role detection ────────────────────────────────────────────────────────────
function getRole(group, groupUsage, groupCompositions = {}) {
  const g = groupUsage.find(g => g.group === group);
  if (!g) return "unused";
  const total = g.used + g.assigned;
  if (total === 0) return "unused";

  const comp = groupCompositions[String(group)] || [];
  if (comp.length > 0) {
    const tot = comp.reduce((s, u) => s + u.count, 0);
    if (tot > 0) {
      const heroes = comp.filter(u => HERO_IDS.has(u.id)).reduce((s, u) => s + u.count, 0);
      if (heroes / tot > 0.4) return "hero";
      const bldg = comp.filter(u => BUILDINGS.has(u.id)).reduce((s, u) => s + u.count, 0);
      if (bldg / tot > 0.5) return "production";
      const supp = comp.filter(u => SUPPORT_UNITS.has(u.id)).reduce((s, u) => s + u.count, 0);
      if (supp / tot > 0.3) return "support";
      return "army";
    }
  }
  return g.assigned / total > 0.5 ? "production" : "army";
}

function roleColor(role) {
  if (role === "hero")       return HERO_C;
  if (role === "support")    return VIOLET;
  if (role === "production") return GREY_N;
  return GOLD;
}

// ── Glyph (full + mini via prop) ──────────────────────────────────────────────
export function GlyphScaled({
  transitionPairs = [], groupUsage = [], groupCompositions = {}, apm = 0,
  mini = false,
}) {
  const [hoveredGroup, setHoveredGroup] = useState(null);

  const W = mini ? 200 : 480;
  const H = mini ? 200 : 480;
  const CX = W / 2, CY = H / 2;
  const R  = mini ? 68 : 180;

  const active = groupUsage.filter(g => g.used + g.assigned > 0);
  if (active.length === 0) {
    return (
      <svg width={W} height={H}>
        <text x={CX} y={CY} textAnchor="middle" fill="#374151" fontSize="12" fontFamily="var(--font-mono)">no data</text>
      </svg>
    );
  }

  const maxUsage = Math.max(1, ...active.map(g => g.used + g.assigned));
  const maxTrans = Math.max(1, ...transitionPairs.map(t => t.count));

  const sorted = [...active].sort((a, b) => a.group - b.group);
  const n = sorted.length;
  const anchorIdx = sorted.findIndex(g => g.group === 1);
  const pinIdx = anchorIdx >= 0 ? anchorIdx : 0;
  const pos = {};
  sorted.forEach((g, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * ((i - pinIdx + n) % n)) / n;
    pos[g.group] = { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
  });

  const nodeR = (usage) => mini
    ? 7 + 9 * Math.sqrt(usage / maxUsage)
    : 14 + 18 * Math.sqrt(usage / maxUsage);

  // Tooltip data
  const tooltipGroup = hoveredGroup !== null ? sorted.find(g => g.group === hoveredGroup) : null;
  const tooltipUnits = tooltipGroup
    ? [...(groupCompositions[String(hoveredGroup)] || [])]
        .sort((a, b) => {
          const ah = HERO_IDS.has(a.id) ? 1 : 0, bh = HERO_IDS.has(b.id) ? 1 : 0;
          if (ah !== bh) return bh - ah;
          return b.count - a.count;
        }).slice(0, 8)
    : [];

  return (
    <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
      {/* Transition arcs */}
      {transitionPairs.map((t, i) => {
        const from = pos[t.from], to = pos[t.to];
        if (!from || !to) return null;
        const w = (mini ? 0.8 : 1.5) + (mini ? 3 : 6) * (t.count / maxTrans);
        const op = 0.15 + 0.75 * (t.count / maxTrans);
        const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
        const dx = to.x - from.x, dy = to.y - from.y;
        const cpx = mx - dy * 0.35, cpy = my + dx * 0.35;
        return (
          <path key={i} d={`M${from.x},${from.y} Q${cpx},${cpy} ${to.x},${to.y}`}
            fill="none" stroke={GOLD} strokeWidth={w} opacity={op} />
        );
      })}

      {/* Nodes */}
      {sorted.map(g => {
        const p = pos[g.group];
        const usage = g.used + g.assigned;
        const r = nodeR(usage);
        const role = getRole(g.group, groupUsage, groupCompositions);
        const color = roleColor(role);
        const isHero = role === "hero";

        const usedRatio = usage > 0 ? g.used / usage : 0;
        const C = 2 * Math.PI * r;
        const usedLen = usedRatio * C;

        return (
          <g key={g.group} transform={`translate(${p.x},${p.y})`}
            style={{ cursor: mini ? "default" : "pointer" }}
            onMouseEnter={() => !mini && setHoveredGroup(g.group)}
            onMouseLeave={() => !mini && setHoveredGroup(null)}>
            {/* Hero glow ring (outside the background clear circle) */}
            {isHero && <circle r={r + 9} fill="none" stroke={HERO_C} strokeWidth={2.5} opacity={0.35} />}
            <circle r={r + 5} fill="#0d1117" />
            <circle r={r} fill="#0f172a" />
            {/* Selected arc */}
            <g transform="rotate(-90)">
              <circle r={r} fill="none" stroke={color} strokeWidth={mini ? 3 : 5}
                strokeDasharray={`${usedLen} ${C - usedLen}`}
                strokeLinecap="round" opacity={0.9} />
            </g>
            {/* Group number */}
            <text textAnchor="middle" dy={isHero && !mini ? 1 : 5}
              fill={color} fontSize={mini ? (r > 12 ? "10" : "8") : (r > 24 ? "15" : "12")}
              fontFamily="var(--font-mono)" fontWeight="700">
              {g.group}
            </text>
            {/* Hero star */}
            {isHero && !mini && (
              <text textAnchor="middle" dy={r > 24 ? 16 : 14}
                fill={HERO_C} fontSize="9" opacity={0.8}>★</text>
            )}
          </g>
        );
      })}

      {/* APM center (full only) */}
      {!mini && apm > 0 && (
        <g>
          <text x={CX} y={CY - 5} textAnchor="middle"
            fill="white" fontSize="22" fontFamily="var(--font-mono)" fontWeight="700" opacity={0.85}>
            {apm}
          </text>
          <text x={CX} y={CY + 14} textAnchor="middle"
            fill="#6b7280" fontSize="10" fontFamily="var(--font-mono)">APM</text>
        </g>
      )}

      {/* Hover tooltip */}
      {!mini && tooltipGroup && (() => {
        const tp = pos[hoveredGroup];
        const r = nodeR(tooltipGroup.used + tooltipGroup.assigned);
        const iconS = 24, pad = 6, gap = 3;
        const w = tooltipUnits.length * (iconS + gap) - gap + pad * 2;
        const h = iconS + pad * 2;
        const tx = Math.min(Math.max(tp.x - w / 2, 6), W - w - 6);
        const ty = tp.y - r - h - 10;
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={w} height={h} rx={5}
              fill="#0f172a" stroke="#374151" strokeWidth={1} opacity={0.96} />
            {tooltipUnits.map((u, i) => {
              const hasIcon = UNIT_ICONS_SET.has(u.id);
              const name = SHORT_NAMES[u.id] || u.id;
              const ix = tx + pad + i * (iconS + gap);
              return hasIcon ? (
                <image key={i} href={`/units/${u.id}.png`}
                  x={ix} y={ty + pad} width={iconS} height={iconS} />
              ) : (
                <text key={i} x={ix + 4} y={ty + pad + 15}
                  fill="#9ca3af" fontSize="8" fontFamily="var(--font-mono)">{name}</text>
              );
            })}
          </g>
        );
      })()}
    </svg>
  );
}

// ── Group breakdown ───────────────────────────────────────────────────────────
function GroupBreakdown({ groupUsage = [], groupCompositions = {} }) {
  const active = [...groupUsage].filter(g => g.used + g.assigned > 0).sort((a, b) => a.group - b.group);
  if (active.length === 0) return null;

  return (
    <BreakdownTable>
      {active.map(g => {
        const role = getRole(g.group, groupUsage, groupCompositions);
        const usage = g.used + g.assigned;
        const usedPct = Math.round((g.used / Math.max(1, usage)) * 100);
        const color = roleColor(role);
        const label = { hero: "HERO", support: "SUPP", production: "BLDG", army: "ARMY", unused: "" }[role];

        const comp = groupCompositions[String(g.group)] || [];
        const topUnits = [...comp].sort((a, b) => {
          const ah = HERO_IDS.has(a.id) ? 1 : 0, bh = HERO_IDS.has(b.id) ? 1 : 0;
          return bh - ah || b.count - a.count;
        }).slice(0, 8);

        return (
          <BreakdownRow key={g.group}>
            <GroupNumCell style={{ color }}>{g.group}</GroupNumCell>
            <RoleCell style={{ color }}>{label}</RoleCell>
            <RatioCell>
              <RatioBars>
                <RatioBar style={{ width: `${usedPct}%`, background: color }} />
                <RatioBar style={{ width: `${100 - usedPct}%`, background: ASSIGN, opacity: 0.4 }} />
              </RatioBars>
              <RatioText>{usedPct}%</RatioText>
            </RatioCell>
            <UnitsCell>
              {topUnits.map((u, i) => {
                const hasIcon = UNIT_ICONS_SET.has(u.id);
                const name = SHORT_NAMES[u.id] || u.id;
                return (
                  <UnitChip key={i} $hero={HERO_IDS.has(u.id)} $bldg={BUILDINGS.has(u.id)} title={name}>
                    {hasIcon ? <UnitIcon src={`/units/${u.id}.png`} alt={name} /> : <span>{name}</span>}
                  </UnitChip>
                );
              })}
              {topUnits.length === 0 && <NoData>—</NoData>}
            </UnitsCell>
          </BreakdownRow>
        );
      })}
    </BreakdownTable>
  );
}

// ── Stat strip ────────────────────────────────────────────────────────────────
function StatStrip({ p, apm }) {
  if (!p) return null;
  return (
    <Stats>
      <StatRow>
        <StatItem><StatVal>{p.battleTag.split("#")[0]}</StatVal><StatKey>player</StatKey></StatItem>
        <StatItem><StatVal>{p.mmr}</StatVal><StatKey>mmr</StatKey></StatItem>
        <StatItem><StatVal>{apm}</StatVal><StatKey>apm</StatKey></StatItem>
        <StatItem><StatVal>{p.groupUsage?.filter(g => g.used + g.assigned > 0).length || 0}</StatVal><StatKey>groups</StatKey></StatItem>
        <StatItem><StatVal>{p.transitionPairs?.length || 0}</StatVal><StatKey>transitions</StatKey></StatItem>
        <StatItem><StatVal>{p.race === 1 ? "HU" : p.race === 2 ? "ORC" : p.race === 4 ? "NE" : "UD"}</StatVal><StatKey>race</StatKey></StatItem>
      </StatRow>
    </Stats>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GlyphLab() {
  const [players, setPlayers]   = useState([]);
  const [playerA, setPlayerA]   = useState(null);
  const [playerB, setPlayerB]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`${RELAY_URL}/api/fingerprints/gallery`)
      .then(r => r.json())
      .then(d => {
        const sorted = (d.players || [])
          .filter(p => p.transitionPairs?.length > 0)
          .sort((a, b) => b.transitionPairs.length - a.transitionPairs.length);
        setPlayers(sorted);
        const foals = sorted.find(p => p.battleTag.toLowerCase().includes("foals"));
        setPlayerA(foals || sorted[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const apmA = Math.round((playerA?.segments?.apm?.[0] || 0) * 300);
  const apmB = Math.round((playerB?.segments?.apm?.[0] || 0) * 300);
  const comparing = !!playerB;

  return (
    <Page $wide={comparing}>
      <Header>
        <PageLabel>GLYPH LAB</PageLabel>
        <Title>Player Signature</Title>
        <Sub>Node size = frequency. Arc = % selected vs assigned. Hover a node to see units.</Sub>
      </Header>

      {loading && <Muted>Loading gallery...</Muted>}
      {!loading && players.length === 0 && <Muted>No players with transition data yet.</Muted>}

      {players.length > 0 && (
        <>
          {/* Pickers */}
          <PickerRow>
            <PickerCol>
              <PickerLabel>Player A</PickerLabel>
              <PlayerPicker>
                {players.slice(0, 20).map(pl => (
                  <PickerBtn key={pl.battleTag} $active={pl.battleTag === playerA?.battleTag}
                    onClick={() => setPlayerA(pl)}>
                    {pl.battleTag.split("#")[0]}<span>{pl.mmr}</span>
                  </PickerBtn>
                ))}
              </PlayerPicker>
            </PickerCol>
            <PickerCol>
              <PickerLabel>Player B <Dim>(compare)</Dim></PickerLabel>
              <PlayerPicker>
                {playerB && (
                  <PickerBtn $active={false} onClick={() => setPlayerB(null)} style={{ opacity: 0.5 }}>
                    ✕ clear
                  </PickerBtn>
                )}
                {players.slice(0, 20).filter(pl => pl.battleTag !== playerA?.battleTag).map(pl => (
                  <PickerBtn key={pl.battleTag} $active={pl.battleTag === playerB?.battleTag}
                    onClick={() => setPlayerB(pl)}>
                    {pl.battleTag.split("#")[0]}<span>{pl.mmr}</span>
                  </PickerBtn>
                ))}
              </PlayerPicker>
            </PickerCol>
          </PickerRow>

          {/* Glyphs */}
          <GlyphRow>
            {playerA && (
              <GlyphCol>
                <GlyphWrap>
                  <GlyphScaled transitionPairs={playerA.transitionPairs} groupUsage={playerA.groupUsage}
                    groupCompositions={playerA.groupCompositions || {}} apm={apmA} />
                </GlyphWrap>
                <StatStrip p={playerA} apm={apmA} />
              </GlyphCol>
            )}
            {playerB && (
              <GlyphCol>
                <GlyphWrap>
                  <GlyphScaled transitionPairs={playerB.transitionPairs} groupUsage={playerB.groupUsage}
                    groupCompositions={playerB.groupCompositions || {}} apm={apmB} />
                </GlyphWrap>
                <StatStrip p={playerB} apm={apmB} />
              </GlyphCol>
            )}
          </GlyphRow>

          <Legend>
            <LegendItem><LegendDot style={{ background: HERO_C }} />Hero</LegendItem>
            <LegendItem><LegendDot style={{ background: GOLD }} />Army</LegendItem>
            <LegendItem><LegendDot style={{ background: VIOLET }} />Support</LegendItem>
            <LegendItem><LegendDot style={{ background: GREY_N }} />Buildings</LegendItem>
            <LegendDivider />
            <LegendItem><LegendCircle />Circle = usage</LegendItem>
            <LegendItem><LegendArc />Arc = selected %</LegendItem>
            <LegendItem><LegendLine />Line = switch freq</LegendItem>
          </Legend>

          {playerA && (
            <GroupBreakdown groupUsage={playerA.groupUsage || []} groupCompositions={playerA.groupCompositions || {}} />
          )}
        </>
      )}
    </Page>
  );
}

// ── Styled Components ─────────────────────────────────────────────────────────
const Page = styled.div`
  max-width: ${p => p.$wide ? "1100px" : "700px"};
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
  transition: max-width 0.2s;
`;

const Header = styled.div`margin-bottom: var(--space-6);`;

const PageLabel = styled.div`
  font: var(--text-xs) var(--font-mono);
  letter-spacing: 0.15em;
  color: var(--grey-light);
  text-transform: uppercase;
  margin-bottom: var(--space-2);
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin: 0 0 var(--space-2);
`;

const Sub = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin: 0;
`;

const Muted = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-mid);
  padding: var(--space-8) 0;
`;

const PickerRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
  margin-bottom: var(--space-6);
`;

const PickerCol = styled.div``;

const PickerLabel = styled.div`
  font: 10px var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--grey-light);
  margin-bottom: var(--space-2);
`;

const Dim = styled.span`opacity: 0.45;`;

const PlayerPicker = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const PickerBtn = styled.button`
  background: ${p => p.$active ? "var(--gold)" : "var(--surface-2)"};
  color: ${p => p.$active ? "#000" : "var(--grey-light)"};
  border: 1px solid ${p => p.$active ? "var(--gold)" : "var(--grey-mid)"};
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;

  span { font-family: var(--font-mono); font-size: 10px; opacity: 0.65; }
  &:hover { border-color: var(--gold); color: ${p => p.$active ? "#000" : "var(--gold)"}; }
`;

const GlyphRow = styled.div`
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
`;

const GlyphCol = styled.div`
  flex: 1;
  min-width: 0;
`;

const GlyphWrap = styled.div`
  display: flex;
  justify-content: center;
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
`;

const Stats = styled.div`
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-3);
`;

const StatRow = styled.div`display: flex; gap: var(--space-4); flex-wrap: wrap;`;
const StatItem = styled.div`display: flex; flex-direction: column; gap: 2px;`;
const StatVal = styled.div`font-family: var(--font-mono); font-size: var(--text-sm); color: #fff;`;
const StatKey = styled.div`
  font: var(--text-xxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`;

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) 0;
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font: 11px var(--font-mono);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.07em;
`;

const LegendDot = styled.div`width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;`;
const LegendCircle = styled.div`
  width: 13px; height: 13px;
  border-radius: 50%;
  border: 2px solid var(--grey-light);
  flex-shrink: 0;
`;
const LegendArc = styled.div`
  width: 16px; height: 9px;
  border-radius: 10px 10px 0 0;
  border: 2.5px solid ${GOLD};
  border-bottom: none;
  flex-shrink: 0;
`;
const LegendLine = styled.div`
  width: 18px; height: 3px;
  background: ${GOLD};
  border-radius: 2px;
  opacity: 0.7;
  flex-shrink: 0;
`;
const LegendDivider = styled.div`
  width: 1px; height: 14px;
  background: var(--grey-mid);
  opacity: 0.4;
`;

// ── Group breakdown ───────────────────────────────────────────────────────────
const BreakdownTable = styled.div`
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  overflow: hidden;
`;

const BreakdownRow = styled.div`
  display: grid;
  grid-template-columns: 28px 44px 90px 1fr;
  align-items: center;
  gap: var(--space-3);
  padding: 8px var(--space-4);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
`;

const GroupNumCell = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  text-align: center;
`;

const RoleCell = styled.div`font: 10px var(--font-mono); letter-spacing: 0.1em; text-transform: uppercase;`;

const RatioCell = styled.div`display: flex; align-items: center; gap: 6px;`;
const RatioBars = styled.div`
  display: flex; width: 56px; height: 5px;
  border-radius: 3px; overflow: hidden; background: #1f2937;
`;
const RatioBar = styled.div`height: 100%;`;
const RatioText = styled.div`font: 10px var(--font-mono); color: var(--grey-light); white-space: nowrap;`;

const UnitsCell = styled.div`display: flex; flex-wrap: wrap; gap: 3px;`;
const UnitChip = styled.span`
  display: inline-flex; align-items: center;
  padding: 2px;
  border-radius: 3px;
  background: ${p => p.$hero ? "rgba(252,211,77,0.12)" : p.$bldg ? "rgba(107,114,128,0.15)" : "rgba(255,255,255,0.05)"};
  border: 1px solid ${p => p.$hero ? "rgba(252,211,77,0.3)" : "rgba(255,255,255,0.06)"};
  span { font: 10px var(--font-mono); padding: 0 3px; color: ${p => p.$hero ? HERO_C : p.$bldg ? "#9ca3af" : "#d1d5db"}; }
`;
const UnitIcon = styled.img`width: 22px; height: 22px; object-fit: contain; image-rendering: pixelated; display: block;`;
const NoData = styled.span`font: 11px var(--font-mono); color: #374151;`;
