import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import PeonLoader from "../../components/PeonLoader";
import TransitionGlyph from "../../components/replay-lab/TransitionGlyph";
import { raceIcons } from "../../lib/constants";
import { searchLadder } from "../../lib/api";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RACE_ICON_MAP = {
  Human: raceIcons.human,
  Orc: raceIcons.orc,
  "Night Elf": raceIcons.elf,
  Undead: raceIcons.undead,
  Random: raceIcons.random,
};

// ── MMR lookup ──────────────────────────────────

async function fetchMmr(battleTag) {
  try {
    const name = battleTag.split("#")[0];
    const results = await searchLadder(name);
    if (!Array.isArray(results)) return null;
    const match = results.find(r =>
      r.player1Id === battleTag && r.gameMode === 4
    );
    return match?.player?.mmr ?? null;
  } catch {
    return null;
  }
}

// ── Category Definitions ────────────────────────

const CATEGORIES = [
  { id: "speed-demons", title: "Speed Demons", desc: "Highest APM", metric: "meanApm", unit: "APM", sort: "desc", format: (v) => v },
  { id: "tortoises", title: "Tortoises", desc: "Lowest APM", metric: "meanApm", unit: "APM", sort: "asc", filter: (p) => p.metrics.meanApm > 0, format: (v) => v },
  { id: "snipers", title: "Snipers", desc: "Highest ability ratio", metric: "abilityPct", unit: "% abilities", sort: "desc", format: (v) => `${v}%` },
  { id: "right-clickers", title: "Right-Clickers", desc: "Most right-click heavy", metric: "rightclickPct", unit: "% right-click", sort: "desc", format: (v) => `${v}%` },
  { id: "button-mashers", title: "Button Mashers", desc: "Highest hotkey spam", metric: "selectPct", unit: "% selects", sort: "desc", format: (v) => `${v}%` },
  { id: "control-freaks", title: "Control Freaks", desc: "Most groups used", metric: "activeGroups", unit: "groups", sort: "desc", format: (v) => v },
  { id: "minimalists", title: "Minimalists", desc: "Fewest groups", metric: "activeGroups", unit: "groups", sort: "asc", filter: (p) => p.metrics.activeGroups > 0, format: (v) => v },
  { id: "one-trick", title: "One-Trick Ponies", desc: "Most concentrated usage", metric: "topGroupPct", unit: "% on #1", sort: "desc", format: (v) => `${v}%` },
  { id: "builders", title: "Builders", desc: "Highest build ratio", metric: "buildPct", unit: "% build", sort: "desc", format: (v) => `${v}%` },
  { id: "building-groupers", title: "Building Groupers", desc: "Buildings on hotkeys", metric: "buildingsOnHotkey", unit: "", sort: "desc", filter: (p) => p.metrics.buildingsOnHotkey === true, format: () => "Yes" },
  { id: "reassigners", title: "Reassigners", desc: "Constantly updating groups", metric: "assignPct", unit: "% assigns", sort: "desc", format: (v) => `${v}%` },
];

const TOP_N = 3;

function buildCategories(players) {
  return CATEGORIES.map((cat) => {
    let pool = players;
    if (cat.filter) pool = pool.filter(cat.filter);
    const sorted = [...pool].sort((a, b) => {
      const aVal = a.metrics[cat.metric];
      const bVal = b.metrics[cat.metric];
      return cat.sort === "asc" ? (aVal ?? 999) - (bVal ?? 999) : (bVal ?? -999) - (aVal ?? -999);
    });
    return { ...cat, players: sorted.slice(0, TOP_N) };
  }).filter((cat) => cat.players.length > 0);
}

function getVisibleTags(categories) {
  const tags = new Set();
  for (const cat of categories) {
    for (const p of cat.players) tags.add(p.battleTag);
  }
  return [...tags];
}

// ── Shared card info (name, race, mmr) ──────────

function CardInfo({ name, raceIcon, race, mmr }) {
  return (
    <CardInfoWrap>
      <CardName>{name}</CardName>
      <CardMeta>
        {raceIcon && <RaceImg src={raceIcon} alt={race} />}
        {mmr != null && <MmrValue>{mmr}</MmrValue>}
      </CardMeta>
    </CardInfoWrap>
  );
}

// ── Compare Panel ────────────────────────────────

function ComparePanel({ players, profiles: galleryProfiles, mmrCache, onMmrFetch }) {
  const [inputs, setInputs] = useState(["", ""]);
  const [compareProfiles, setCompareProfiles] = useState([null, null]);
  const [loading, setLoading] = useState([false, false]);

  const raceLookup = useMemo(() => {
    const map = {};
    if (players) {
      for (const p of players) map[p.battleTag] = p.race;
    }
    return map;
  }, [players]);

  const allTags = useMemo(() => {
    if (!players) return [];
    return players.map(p => p.battleTag).sort((a, b) => a.localeCompare(b));
  }, [players]);

  const fetchProfile = useCallback(async (tag, index) => {
    if (!tag) {
      setCompareProfiles(prev => { const n = [...prev]; n[index] = null; return n; });
      return;
    }
    setLoading(prev => { const n = [...prev]; n[index] = true; return n; });
    try {
      if (galleryProfiles[tag]) {
        setCompareProfiles(prev => { const n = [...prev]; n[index] = galleryProfiles[tag]; return n; });
      } else {
        const r = await fetch(`${RELAY_URL}/api/fingerprints/profile/${encodeURIComponent(tag)}`);
        const data = r.ok ? await r.json() : null;
        setCompareProfiles(prev => { const n = [...prev]; n[index] = data; return n; });
      }
      // Fetch MMR if not cached
      if (!(tag in mmrCache)) onMmrFetch(tag);
    } catch {
      setCompareProfiles(prev => { const n = [...prev]; n[index] = null; return n; });
    }
    setLoading(prev => { const n = [...prev]; n[index] = false; return n; });
  }, [galleryProfiles, mmrCache, onMmrFetch]);

  const handleSubmit = (index) => {
    const tag = inputs[index].trim();
    if (tag) fetchProfile(tag, index);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") handleSubmit(index);
  };

  const addSlot = () => {
    setInputs(prev => [...prev, ""]);
    setCompareProfiles(prev => [...prev, null]);
    setLoading(prev => [...prev, false]);
  };

  const removeSlot = (index) => {
    if (inputs.length <= 2) return;
    setInputs(prev => prev.filter((_, i) => i !== index));
    setCompareProfiles(prev => prev.filter((_, i) => i !== index));
    setLoading(prev => prev.filter((_, i) => i !== index));
  };

  const hasAnyProfile = compareProfiles.some(Boolean);

  return (
    <CompareWrap>
      <CompareHeader>
        <CompareTitle>Compare</CompareTitle>
        <CompareDesc>Enter battletags to compare side by side</CompareDesc>
      </CompareHeader>
      <CompareInputRow>
        {inputs.map((val, i) => (
          <CompareInputWrap key={i}>
            <CompareInput
              type="text"
              list="compare-tags"
              placeholder="Player#12345"
              value={val}
              onChange={(e) => setInputs(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onBlur={() => handleSubmit(i)}
            />
            {inputs.length > 2 && (
              <RemoveSlotBtn onClick={() => removeSlot(i)} title="Remove">x</RemoveSlotBtn>
            )}
          </CompareInputWrap>
        ))}
        {inputs.length < 4 && (
          <AddSlotBtn onClick={addSlot} title="Add player">+</AddSlotBtn>
        )}
      </CompareInputRow>
      <datalist id="compare-tags">
        {allTags.map(tag => <option key={tag} value={tag} />)}
      </datalist>
      {hasAnyProfile && (
        <CompareGrid $count={inputs.length}>
          {inputs.map((val, i) => {
            const profile = compareProfiles[i];
            const tag = val.trim();
            const displayName = tag ? tag.split("#")[0] : "";
            const race = raceLookup[tag];
            const raceIcon = RACE_ICON_MAP[race];
            const mmr = mmrCache[tag];
            return (
              <CompareCard key={i}>
                {loading[i] ? (
                  <GlyphPlaceholder><PlaceholderDot /></GlyphPlaceholder>
                ) : profile ? (
                  <>
                    <GlyphBox>
                      <TransitionGlyph
                        transitionPairs={profile.transitionPairs || []}
                        groupUsage={profile.groupUsage || []}
                        groupCompositions={profile.groupCompositions || {}}
                        segments={profile.averaged?.segments || null}
                        playerName={tag}
                        replayCount={profile.replayCount || profile.confidence?.replayCount}
                        mini
                      />
                    </GlyphBox>
                    <CardInfo name={displayName} raceIcon={raceIcon} race={race} mmr={mmr} />
                  </>
                ) : tag ? (
                  <GlyphPlaceholder><NoDataSmall>No data</NoDataSmall></GlyphPlaceholder>
                ) : null}
              </CompareCard>
            );
          })}
        </CompareGrid>
      )}
    </CompareWrap>
  );
}

// ── Component ───────────────────────────────────

export default function GalleryTab() {
  const history = useHistory();
  const [players, setPlayers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});
  const [mmrCache, setMmrCache] = useState({});

  useEffect(() => {
    fetch(`${RELAY_URL}/api/fingerprints/gallery`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.players) {
          setPlayers(data.players.filter((p) => p.metrics));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => (players ? buildCategories(players) : []),
    [players]
  );

  // Fetch profiles for gallery cards
  useEffect(() => {
    if (categories.length === 0) return;
    const tags = getVisibleTags(categories);
    let cancelled = false;
    (async () => {
      const BATCH = 6;
      for (let i = 0; i < tags.length; i += BATCH) {
        if (cancelled) return;
        const batch = tags.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map((tag) =>
            fetch(`${RELAY_URL}/api/fingerprints/profile/${encodeURIComponent(tag)}`)
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
          )
        );
        if (cancelled) return;
        setProfiles((prev) => {
          const next = { ...prev };
          batch.forEach((tag, j) => {
            if (results[j]) next[tag] = results[j];
          });
          return next;
        });
      }
    })();
    return () => { cancelled = true; };
  }, [categories]);

  // Fetch MMR for gallery card players
  useEffect(() => {
    if (categories.length === 0) return;
    const tags = getVisibleTags(categories);
    let cancelled = false;
    (async () => {
      for (const tag of tags) {
        if (cancelled) return;
        const mmr = await fetchMmr(tag);
        if (cancelled) return;
        if (mmr != null) {
          setMmrCache(prev => ({ ...prev, [tag]: mmr }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [categories]);

  // Callback for compare panel to request MMR
  const handleMmrFetch = useCallback(async (tag) => {
    const mmr = await fetchMmr(tag);
    if (mmr != null) {
      setMmrCache(prev => ({ ...prev, [tag]: mmr }));
    }
  }, []);

  const navigateToPlayer = (battleTag) => {
    const p = new URLSearchParams();
    p.set("tab", "explore");
    p.set("player", battleTag);
    history.push({ pathname: "/replay-lab", search: `?${p}` });
  };

  if (loading) {
    return (
      <div className="page-loader" style={{ minHeight: "40vh" }}>
        <PeonLoader />
      </div>
    );
  }

  if (!players?.length) {
    return <NoData>No gallery data yet. More replays need to be indexed.</NoData>;
  }

  return (
    <>
      <ComparePanel players={players} profiles={profiles} mmrCache={mmrCache} onMmrFetch={handleMmrFetch} />
      <StatsRow>
        <StatChip>{players.length} <span>players indexed</span></StatChip>
      </StatsRow>
      {categories.map((cat) => (
        <CategorySection key={cat.id}>
          <CategoryHeader>
            <CategoryTitle>{cat.title}</CategoryTitle>
            <CategoryDesc>{cat.desc}</CategoryDesc>
          </CategoryHeader>
          <CardGrid>
            {cat.players.map((player, i) => {
              const displayName = player.battleTag.split("#")[0];
              const profile = profiles[player.battleTag];
              const raceIcon = RACE_ICON_MAP[player.race];
              const mmr = mmrCache[player.battleTag];
              return (
                <Card
                  key={player.battleTag}
                  onClick={() => navigateToPlayer(player.battleTag)}
                >
                  {profile ? (
                    <GlyphBox>
                      <TransitionGlyph
                        transitionPairs={profile.transitionPairs || []}
                        groupUsage={profile.groupUsage || []}
                        groupCompositions={profile.groupCompositions || {}}
                        segments={profile.averaged?.segments || null}
                        playerName={player.battleTag}
                        replayCount={player.replayCount}
                        mini
                      />
                    </GlyphBox>
                  ) : (
                    <GlyphPlaceholder><PlaceholderDot /></GlyphPlaceholder>
                  )}
                  <CardInfo name={displayName} raceIcon={raceIcon} race={player.race} mmr={mmr} />
                </Card>
              );
            })}
          </CardGrid>
        </CategorySection>
      ))}
    </>
  );
}

// ── Styled Components ───────────────────────────

const CategorySection = styled.section`
  margin-bottom: var(--space-8);
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
`;

const CategoryTitle = styled.h3`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin: 0;
`;

const CategoryDesc = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.button`
  display: flex;
  flex-direction: column;
  background: var(--surface-1);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  overflow: hidden;
  padding: 0;

  &:hover {
    border-color: var(--gold);
    background: var(--gold-tint);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const GlyphBox = styled.div`
  background: #0a0a0a;
  width: 100%;
  aspect-ratio: 1;
`;

const GlyphPlaceholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  background: #0a0a0a;
`;

const PlaceholderDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--grey-mid);
  opacity: 0.4;
  animation: pulse-gallery 1.2s ease-in-out infinite;
  @keyframes pulse-gallery {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 0.6; }
  }
`;

/* Card info underneath glyph */

const CardInfoWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-2) var(--space-3) var(--space-3);
`;

const CardName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  line-height: 1.1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const RaceImg = styled.img`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
`;

const MmrValue = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
`;

const NoData = styled.div`
  padding: var(--space-8) var(--space-4);
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  background: var(--surface-1);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
`;

const NoDataSmall = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
`;

const StatsRow = styled.div`
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
`;

const StatChip = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: #fff;
  & span { color: var(--grey-light); font-size: var(--text-xxs); }
`;

/* ── Compare Panel ── */

const CompareWrap = styled.div`
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const CompareHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
`;

const CompareTitle = styled.h3`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin: 0;
`;

const CompareDesc = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
`;

const CompareInputRow = styled.div`
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
`;

const CompareInputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const CompareInput = styled.input`
  background: var(--surface-1);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-sm);
  color: #fff;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  padding: var(--space-2) var(--space-3);
  width: 200px;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder { color: var(--grey-mid); }
  &:focus { border-color: var(--gold); }
`;

const RemoveSlotBtn = styled.button`
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  color: var(--grey-mid);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;

  &:hover { color: var(--red); }
`;

const AddSlotBtn = styled.button`
  background: var(--surface-1);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-sm);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
  }
`;

const CompareGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${p => p.$count}, 1fr);
  gap: var(--space-3);

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const CompareCard = styled.div`
  background: var(--surface-1);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
  overflow: hidden;
`;
