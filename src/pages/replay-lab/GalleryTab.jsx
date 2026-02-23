import React, { useState, useEffect, useMemo } from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import PeonLoader from "../../components/PeonLoader";
import TransitionGlyph from "../../components/replay-lab/TransitionGlyph";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

// ── Derive metrics from embedding-map glyph data ──

function deriveMetrics(player) {
  const g = player.glyph;
  if (!g) return null;

  const apmNorm = g.apm || 0;
  const meanApm = Math.round(apmNorm * 300);

  const action = g.action || [];
  const total = action.reduce((a, b) => a + b, 0) || 1;
  const rightclickPct = Math.round(((action[0] || 0) / total) * 100);
  const abilityPct = Math.round(((action[1] || 0) / total) * 100);
  const buildPct = Math.round(((action[2] || 0) / total) * 100);
  const selectPct = Math.round(((action[4] || 0) / total) * 100);
  const assignPct = Math.round(((action[5] || 0) / total) * 100);

  const hotkey = g.hotkey || [];
  let activeGroups = 0;
  for (let i = 0; i < 10; i++) {
    if ((hotkey[i] || 0) > 0.02) activeGroups++;
  }

  const sortedHk = [...hotkey].sort((a, b) => b - a);
  const topGroupPct = Math.round((sortedHk[0] || 0) * 100);
  const highGroupUsage = hotkey.slice(5).reduce((a, b) => a + b, 0);
  const buildingsOnHotkey = highGroupUsage > 0.1;

  return {
    meanApm, rightclickPct, abilityPct, buildPct,
    selectPct, assignPct, activeGroups, topGroupPct, buildingsOnHotkey,
  };
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

// ── Styles ──────────────────────────────────────

const RACE_COLORS = {
  Human: "#3b82f6", Orc: "#ef4444", "Night Elf": "#22c55e", Undead: "#a855f7", Random: "#9ca3af",
};

function raceShort(r) {
  if (r === "Human") return "HU";
  if (r === "Orc") return "ORC";
  if (r === "Night Elf") return "NE";
  if (r === "Undead") return "UD";
  return "RND";
}

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

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  gap: var(--space-2);
  min-width: 0;
`;

const FooterLeft = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
`;

const CardRank = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  flex-shrink: 0;
`;

const CardName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FooterRight = styled.div`
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
  flex-shrink: 0;
`;

const CardStat = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: #fff;
`;

const CardUnit = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const RaceDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => p.$color || "var(--grey-mid)"};
  flex-shrink: 0;
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

// ── Component ───────────────────────────────────

export default function GalleryTab() {
  const history = useHistory();
  const [players, setPlayers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    fetch(`${RELAY_URL}/api/fingerprints/embedding-map`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.players) {
          const enriched = data.players
            .filter((p) => p.glyph && p.replayCount >= 2)
            .map((p) => {
              const metrics = deriveMetrics(p);
              return metrics ? { ...p, metrics } : null;
            })
            .filter(Boolean);
          setPlayers(enriched);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => (players ? buildCategories(players) : []),
    [players]
  );

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
              const val = player.metrics[cat.metric];
              const displayName = player.battleTag.split("#")[0];
              const profile = profiles[player.battleTag];
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
                  <CardFooter>
                    <FooterLeft>
                      <CardRank>#{i + 1}</CardRank>
                      <RaceDot $color={RACE_COLORS[player.race] || RACE_COLORS.Random} />
                      <CardName title={player.battleTag}>{displayName}</CardName>
                    </FooterLeft>
                    <FooterRight>
                      <CardStat>{cat.format(val)}</CardStat>
                      <CardUnit>{cat.unit}</CardUnit>
                    </FooterRight>
                  </CardFooter>
                </Card>
              );
            })}
          </CardGrid>
        </CategorySection>
      ))}
    </>
  );
}
