import React, { useState, useEffect, useRef, useMemo } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { PageHero, CountryFlag } from "../components/ui";
import PeonLoader from "../components/PeonLoader";
import TransitionGlyph from "../components/replay-lab/TransitionGlyph";
import { getPlayerProfilesBatch } from "../lib/api";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";


// Race colors for mini-glyphs
const RACE_BADGE_COLORS = {
  Human: "#3b82f6",
  Orc: "#ef4444",
  "Night Elf": "#a855f7",
  Undead: "#22c55e",
  Random: "#888",
};

// ── Styled Components ──────────────────────────────────


const NeuralNote = styled.div`
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  line-height: 1.6;

  strong {
    color: var(--white);
  }
  .gold {
    color: var(--gold);
  }
`;

// ── Player Gallery Styles ──────────────────────────────

const GalleryControls = styled.div`
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
  align-items: center;
`;

const GallerySearch = styled.input`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(184, 134, 11, 0.3);
  border-radius: var(--radius-sm);
  color: var(--white);
  padding: 10px 16px;
  width: 280px;
  outline: none;
  transition: var(--transition);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.5);

  &:focus {
    border-color: var(--gold);
    box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(184, 134, 11, 0.15);
  }
  &:hover:not(:focus) {
    border-color: rgba(184, 134, 11, 0.55);
  }
  &::placeholder {
    color: var(--grey-light);
  }
`;

const RaceFilter = styled.div`
  display: flex;
  gap: 4px;
`;

const RaceButton = styled.button`
  background: ${p => p.$active ? "rgba(252, 219, 51, 0.15)" : "transparent"};
  border: 1px solid ${p => p.$active ? "var(--gold)" : "var(--grey-mid)"};
  border-radius: var(--radius-sm);
  color: ${p => p.$active ? "var(--gold)" : "var(--grey-light)"};
  padding: 6px 12px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    color: var(--white);
  }
`;

const SortSelect = styled.select`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
  color: var(--grey-light);
  padding: 6px 10px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--gold);
  }
`;

const CountryDropdownWrap = styled.div`
  position: relative;
`;

const CountryDropdownBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  background: ${p => p.$active ? "rgba(252, 219, 51, 0.1)" : "var(--surface-1)"};
  border: 1px solid ${p => p.$active ? "var(--gold)" : "var(--grey-mid)"};
  border-radius: var(--radius-sm);
  color: ${p => p.$active ? "var(--gold)" : "var(--grey-light)"};
  padding: 6px 10px;
  cursor: pointer;
  min-width: 130px;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    color: var(--white);
  }

  .chevron {
    margin-left: auto;
    font-size: 10px;
    transition: transform 0.15s;
    &.open {
      transform: rotate(180deg);
    }
  }
`;

const CountryDropdownList = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  min-width: 160px;
  max-height: 280px;
  overflow-y: auto;
  background: rgba(10, 10, 10, 0.95);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
  z-index: 50;
`;

const CountryDropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  background: ${p => p.$active ? "rgba(252, 219, 51, 0.12)" : "transparent"};
  border: none;
  color: ${p => p.$active ? "var(--gold)" : "var(--grey-light)"};
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;

  &:hover {
    background: rgba(252, 219, 51, 0.08);
    color: var(--white);
  }
`;

const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-6);
`;

const PlayerCard = styled(Link)`
  display: flex;
  flex-direction: column;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.3);
  padding: var(--space-4);
  text-decoration: none;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.03);
    transform: translateY(-2px);
  }
`;

const PlayerCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const RaceDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.$color || "#888"};
  flex-shrink: 0;
`;

const PlayerName = styled.span`
  font-family: var(--font-display);
  color: var(--gold);
  font-size: var(--text-base);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PlayerMmr = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: #fff;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;

  .label {
    font-size: 10px;
    color: var(--grey-mid);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const PlayerMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const MiniGlyphWrap = styled.div`
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
`;

const GalleryEmpty = styled.div`
  text-align: center;
  padding: var(--space-8);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
`;

const GalleryCount = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  margin-left: auto;
`;

const SegmentRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: var(--space-6);
`;

const SegmentTag = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  background: ${p => p.$active ? `${p.$color}20` : "transparent"};
  border: 1px solid ${p => p.$active ? p.$color : "var(--grey-mid)"};
  border-radius: var(--radius-full);
  color: ${p => p.$active ? p.$color : "var(--grey-light)"};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${p => p.$color};
    color: ${p => p.$color};
    background: ${p => `${p.$color}10`};
  }

  .label {
    font-weight: 500;
  }

  .count {
    font-size: 10px;
    opacity: 0.7;
    background: ${p => p.$active ? `${p.$color}30` : "rgba(255,255,255,0.08)"};
    padding: 1px 6px;
    border-radius: var(--radius-lg);
  }
`;

// ── Segment Definitions ────────────────────────────────

// Building IDs from WC3 (all races)
const BUILDINGS = new Set([
  'htow','hkee','hcas','halt','hbar','hbla','hars','hlum','hwtw','hatw','hgtw','hctw','harm','hgra','hvlt','hhou','hrtt',
  'ogre','ostr','ofrt','oalt','obar','ofor','osld','obea','otrb','otto','owtw','ovln','ohou',
  'etol','etoa','etoe','eate','eaom','eaow','eaoe','edob','emow','etrp','eden',
  'unpl','unp1','unp2','uaod','usep','ugrv','utod','uslh','ubon','utom','uzig','uzg1','uzg2','ugol',
]);

// Check if player only uses building groups (4-9), no army groups (1-3)
const hasNoArmyHotkeys = (p) => {
  const groupUsage = p.groupUsage || [];
  const armyGroups = groupUsage.filter(g => g.group >= 1 && g.group <= 3);
  const totalArmyUsage = armyGroups.reduce((sum, g) => sum + (g.used || 0) + (g.assigned || 0), 0);
  const totalUsage = groupUsage.reduce((sum, g) => sum + (g.used || 0) + (g.assigned || 0), 0);
  return totalUsage > 10 && totalArmyUsage < 5;
};

// Check if group 1 has mostly buildings (classic RTS habit)
const hasBuildingsOnOne = (p) => {
  const comp = p.groupCompositions?.["1"];
  if (!comp || comp.length === 0) return false;
  const totalCount = comp.reduce((s, u) => s + u.count, 0);
  const buildingCount = comp.filter(u => BUILDINGS.has(u.id)).reduce((s, u) => s + u.count, 0);
  return totalCount > 0 && (buildingCount / totalCount) > 0.5;
};

const SEGMENTS = [
  {
    id: "speed-demons",
    label: "Speed Demons",
    desc: "200+ APM average",
    filter: p => (p.metrics?.meanApm || 0) >= 200,
    color: "#f97316", // orange
  },
  {
    id: "slow-steady",
    label: "Slow & Steady",
    desc: "Under 120 APM",
    filter: p => (p.metrics?.meanApm || 999) < 120 && (p.metrics?.meanApm || 0) > 0,
    color: "#64748b", // slate
  },
  {
    id: "control-masters",
    label: "Control Masters",
    desc: "6+ hotkey groups active",
    filter: p => (p.metrics?.activeGroups || 0) >= 6,
    color: "#8b5cf6", // purple
  },
  {
    id: "selection-addicts",
    label: "Selection Addicts",
    desc: "40%+ actions are re-selects",
    filter: p => (p.metrics?.selectPct || 0) >= 40,
    color: "#ec4899", // pink
  },
  {
    id: "buildings-on-1",
    label: "Buildings on 1",
    desc: "Classic RTS habit - production on group 1",
    filter: hasBuildingsOnOne,
    color: "#14b8a6", // teal
  },
  {
    id: "no-army-hotkeys",
    label: "No Army Hotkeys",
    desc: "Only buildings on control groups",
    filter: hasNoArmyHotkeys,
    color: "#06b6d4", // cyan
  },
  {
    id: "one-group-wonders",
    label: "One-Group Wonders",
    desc: "70%+ on single group",
    filter: p => (p.metrics?.topGroupPct || 0) >= 70,
    color: "#ef4444", // red
  },
];

// ── Player Gallery Component ───────────────────────────

function PlayerGallery({ players, loading }) {
  const [search, setSearch] = useState("");
  const [raceFilter, setRaceFilter] = useState(null);
  const [countryFilter, setCountryFilter] = useState(null);
  const [segmentFilter, setSegmentFilter] = useState("speed-demons");
  const [sortBy, setSortBy] = useState("mmr");
  const [profiles, setProfiles] = useState({});
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef(null);

  // Close country dropdown on outside click
  useEffect(() => {
    if (!countryDropdownOpen) return;
    const handler = (e) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [countryDropdownOpen]);

  // Fetch profiles in batch when country dropdown opens
  useEffect(() => {
    if (!countryDropdownOpen) return;
    const toFetch = players.slice(0, 100).filter(p => !profiles[p.battleTag]);
    if (toFetch.length === 0) return;
    getPlayerProfilesBatch(toFetch.map(p => p.battleTag)).then(map => {
      setProfiles(prev => {
        const next = { ...prev };
        for (const [tag, profile] of map) next[tag] = profile;
        return next;
      });
    });
  }, [countryDropdownOpen, players]);

  // Get unique countries from fetched profiles
  const countries = useMemo(() => {
    const countrySet = new Set();
    Object.values(profiles).forEach(p => {
      if (p?.country) countrySet.add(p.country);
    });
    return Array.from(countrySet).sort();
  }, [profiles]);

  // Compute segment counts
  const segmentCounts = useMemo(() => {
    const counts = {};
    for (const seg of SEGMENTS) {
      counts[seg.id] = players.filter(seg.filter).length;
    }
    return counts;
  }, [players]);

  const filtered = useMemo(() => {
    let result = [...players];

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.battleTag.toLowerCase().includes(q)
      );
    }

    // Filter by race
    if (raceFilter) {
      result = result.filter(p => p.race === raceFilter);
    }

    // Filter by country
    if (countryFilter) {
      result = result.filter(p => profiles[p.battleTag]?.country === countryFilter);
    }

    // Filter by segment
    if (segmentFilter) {
      const seg = SEGMENTS.find(s => s.id === segmentFilter);
      if (seg) {
        result = result.filter(seg.filter);
      }
    }

    // Sort
    switch (sortBy) {
      case "mmr":
        result.sort((a, b) => (b.mmr || 0) - (a.mmr || 0));
        break;
      case "apm":
        result.sort((a, b) => (b.metrics?.meanApm || 0) - (a.metrics?.meanApm || 0));
        break;
      case "name":
        result.sort((a, b) => a.battleTag.localeCompare(b.battleTag));
        break;
    }

    return result;
  }, [players, search, raceFilter, countryFilter, segmentFilter, sortBy, profiles]);


  if (loading) {
    return <PeonLoader />;
  }

  return (
    <>
      <GalleryControls>
        <GallerySearch
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search players..."
        />
        <RaceFilter>
          <RaceButton $active={!raceFilter} onClick={() => setRaceFilter(null)}>All</RaceButton>
          <RaceButton $active={raceFilter === "Human"} onClick={() => setRaceFilter("Human")}>HU</RaceButton>
          <RaceButton $active={raceFilter === "Orc"} onClick={() => setRaceFilter("Orc")}>ORC</RaceButton>
          <RaceButton $active={raceFilter === "Night Elf"} onClick={() => setRaceFilter("Night Elf")}>NE</RaceButton>
          <RaceButton $active={raceFilter === "Undead"} onClick={() => setRaceFilter("Undead")}>UD</RaceButton>
        </RaceFilter>
        <SortSelect value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="mmr">Highest MMR</option>
          <option value="apm">Highest APM</option>
          <option value="name">Name A-Z</option>
        </SortSelect>
        {countries.length > 0 && (
          <CountryDropdownWrap ref={countryDropdownRef}>
            <CountryDropdownBtn
              $active={!!countryFilter}
              onClick={() => setCountryDropdownOpen(v => !v)}
            >
              {countryFilter ? (
                <>
                  <CountryFlag name={countryFilter.toLowerCase()} style={{ width: 16, height: 12 }} />
                  <span>{countryFilter}</span>
                </>
              ) : (
                <span>All Countries</span>
              )}
              <span className={`chevron ${countryDropdownOpen ? "open" : ""}`}>▾</span>
            </CountryDropdownBtn>
            {countryDropdownOpen && (
              <CountryDropdownList>
                <CountryDropdownItem
                  $active={!countryFilter}
                  onClick={() => { setCountryFilter(null); setCountryDropdownOpen(false); }}
                >
                  All Countries
                </CountryDropdownItem>
                {countries.map(c => (
                  <CountryDropdownItem
                    key={c}
                    $active={countryFilter === c}
                    onClick={() => { setCountryFilter(c); setCountryDropdownOpen(false); }}
                  >
                    <CountryFlag name={c.toLowerCase()} style={{ width: 16, height: 12 }} />
                    <span>{c}</span>
                  </CountryDropdownItem>
                ))}
              </CountryDropdownList>
            )}
          </CountryDropdownWrap>
        )}
        {(segmentFilter || search) && <GalleryCount>{filtered.length} players</GalleryCount>}
      </GalleryControls>

      <SegmentRow>
        {SEGMENTS.map(seg => (
          <SegmentTag
            key={seg.id}
            $active={segmentFilter === seg.id}
            $color={seg.color}
            onClick={() => setSegmentFilter(segmentFilter === seg.id ? null : seg.id)}
            title={seg.desc}
          >
            <span className="label">{seg.label}</span>
            <span className="count">{segmentCounts[seg.id]}</span>
          </SegmentTag>
        ))}
      </SegmentRow>

      {!segmentFilter && !search && (
        <GalleryEmpty style={{ paddingTop: "var(--space-8)" }}>
          Select a segment above to explore players.
        </GalleryEmpty>
      )}

      {(segmentFilter || search) && filtered.length === 0 ? (
        <GalleryEmpty>
          {players.length === 0
            ? "No player signatures yet. Upload a replay to get started!"
            : "No players match your search."}
        </GalleryEmpty>
      ) : (segmentFilter || search) ? (
        <GalleryGrid>
          {filtered.slice(0, 60).map(p => (
            <PlayerCard key={p.battleTag} to={`/player/${encodeURIComponent(p.battleTag)}?tab=playstyle`}>
              <PlayerCardHeader>
                <RaceDot $color={RACE_BADGE_COLORS[p.race]} />
                {profiles[p.battleTag]?.country && (
                  <CountryFlag name={profiles[p.battleTag].country.toLowerCase()} style={{ width: 16, height: 12 }} />
                )}
                <PlayerName>{p.battleTag.split("#")[0]}</PlayerName>
                {p.mmr > 0 && <PlayerMmr>{p.mmr} <span className="label">MMR</span></PlayerMmr>}
              </PlayerCardHeader>
              <MiniGlyphWrap>
                <TransitionGlyph
                  transitionPairs={p.transitionPairs || []}
                  groupUsage={p.groupUsage || []}
                  groupCompositions={p.groupCompositions || {}}
                  segments={p.segments}
                  playerName={p.battleTag}
                  mini
                />
              </MiniGlyphWrap>
              <PlayerMeta>{p.race} · {p.replayCount} games</PlayerMeta>
            </PlayerCard>
          ))}
        </GalleryGrid>
      ) : null}

      {(segmentFilter || search) && filtered.length > 60 && (
        <NeuralNote style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
          Showing 60 of {filtered.length} players. Use search to find specific players.
        </NeuralNote>
      )}
    </>
  );
}


// ── Page Header ────────────────────────────────────────

const sigHeader = (
  <PageHero
    eyebrow="Playstyle Analysis"
    title="Player Signatures"
    lead="Every player has a unique fingerprint based on their APM, hotkey usage, and action patterns. Upload replays to build the database and explore how players compare."
    lg
  />
);

// ── Page Component ─────────────────────────────────────

export default function Signatures() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let retryTimeout = null;

    async function fetchGallery(attempt = 0) {
      try {
        const r = await fetch(`${RELAY_URL}/api/fingerprints/gallery`);
        const data = r.ok ? await r.json() : null;
        if (cancelled) return;
        if (data?.players?.length > 0) {
          setPlayers(data.players);
          setLoading(false);
        } else if (attempt < 12) {
          // Gallery cache is warming up server-side — retry every 5s (up to 1 min)
          retryTimeout = setTimeout(() => fetchGallery(attempt + 1), 5000);
        } else {
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGallery();
    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  return (
    <PageLayout maxWidth="1200px" bare header={sigHeader}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <PlayerGallery players={players} loading={loading} />
      </div>
    </PageLayout>
  );
}
