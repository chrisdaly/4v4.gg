import React, { useState, Suspense } from "react";
import styled from "styled-components";
import { VIZ_CATEGORIES, VIZ_REGISTRY, getVizzesByCategory } from "./vizRegistry";

// ── Styled Components ──────────────────────────────────

const Wrap = styled.div`
  margin-top: var(--space-4);
`;

const CategoryTabs = styled.div`
  display: flex;
  gap: var(--space-1);
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-1);
`;

const CategoryTab = styled.button`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? "var(--gold)" : "transparent")};
  background: none;
  white-space: nowrap;
  transition: color 0.15s;

  &:hover { color: var(--white); }
`;

const VizPills = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
`;

const VizPill = styled.button`
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  border: 1px solid ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
  background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.12)" : "transparent")};
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    color: var(--white);
  }
`;

const CompareGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-4);
`;

const PlayerCard = styled.div`
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const PlayerCardHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: var(--space-2);
  width: 100%;

  .name {
    font-family: var(--font-display);
    color: var(--gold);
    font-size: var(--text-base);
  }
  .meta {
    font-family: var(--font-mono);
    color: var(--grey-light);
    font-size: var(--text-xxs);
  }
`;

const VizDesc = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-align: center;
  margin-bottom: var(--space-4);
  opacity: 0.7;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: var(--space-6);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
`;

// ── Component ──────────────────────────────────────────

/**
 * CompareView — Side-by-side comparison of a single visualization type across all players.
 *
 * @param {Object} players  - Map of battleTag → API response data
 * @param {Array}  testPlayers - Array of { tag, label, race }
 */
export default function CompareView({ players, testPlayers }) {
  const [activeCategory, setActiveCategory] = useState(VIZ_CATEGORIES[0].id);
  const [activeVizId, setActiveVizId] = useState(null);

  const categoryVizzes = getVizzesByCategory(activeCategory);
  const currentVizId = activeVizId && categoryVizzes.find((v) => v.id === activeVizId)
    ? activeVizId
    : categoryVizzes[0]?.id;
  const currentViz = VIZ_REGISTRY.find((v) => v.id === currentVizId);

  function handleCategoryChange(catId) {
    setActiveCategory(catId);
    // Reset to first viz in new category
    const vizzes = getVizzesByCategory(catId);
    setActiveVizId(vizzes[0]?.id || null);
  }

  if (!currentViz) {
    return <EmptyState>No visualizations available</EmptyState>;
  }

  const VizComponent = currentViz.component;

  return (
    <Wrap>
      {/* Category tabs */}
      <CategoryTabs>
        {VIZ_CATEGORIES.map((cat) => (
          <CategoryTab
            key={cat.id}
            $active={cat.id === activeCategory}
            onClick={() => handleCategoryChange(cat.id)}
          >
            {cat.label}
          </CategoryTab>
        ))}
      </CategoryTabs>

      {/* Viz pills within category */}
      <VizPills>
        {categoryVizzes.map((viz) => (
          <VizPill
            key={viz.id}
            $active={viz.id === currentVizId}
            onClick={() => setActiveVizId(viz.id)}
          >
            {viz.name}
          </VizPill>
        ))}
      </VizPills>

      {/* Description */}
      <VizDesc>{currentViz.desc}</VizDesc>

      {/* Player comparison grid */}
      <CompareGrid>
        {testPlayers.map(({ tag, label, race }) => {
          const data = players[tag];
          if (!data?.averaged?.segments) {
            return (
              <PlayerCard key={tag}>
                <PlayerCardHeader>
                  <span className="name">{label}</span>
                  <span className="meta">{race}</span>
                </PlayerCardHeader>
                <EmptyState>No data</EmptyState>
              </PlayerCard>
            );
          }

          const seg = data.averaged.segments;
          const emb = data.averagedEmbedding;

          return (
            <PlayerCard key={tag}>
              <PlayerCardHeader>
                <span className="name">{label}</span>
                <span className="meta">{race} &middot; {data.replayCount} replays</span>
              </PlayerCardHeader>
              <Suspense fallback={<EmptyState>Loading...</EmptyState>}>
                <VizComponent
                  segments={seg}
                  embedding={emb}
                  battleTag={tag}
                />
              </Suspense>
            </PlayerCard>
          );
        })}
      </CompareGrid>
    </Wrap>
  );
}
