import React from "react";
import styled from "styled-components";
import OverlaySparkline from "./OverlaySparkline";
import OverlayRadar from "./OverlayRadar";
import { consistencyScore } from "../../lib/fingerprint";

const Panel = styled.div`
  border: 1px solid rgba(160, 130, 80, 0.25);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.2);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
`;

const IdentityName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
`;

const AliasTag = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const ConsistencyBadge = styled.span`
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  margin-left: auto;
  background: ${(p) =>
    p.$score >= 0.9
      ? "rgba(76, 175, 80, 0.15)"
      : p.$score >= 0.75
        ? "rgba(252, 219, 51, 0.15)"
        : "rgba(255, 80, 80, 0.15)"};
  color: ${(p) =>
    p.$score >= 0.9
      ? "var(--green)"
      : p.$score >= 0.75
        ? "var(--gold)"
        : "var(--red)"};
  border: 1px solid
    ${(p) =>
      p.$score >= 0.9
        ? "rgba(76, 175, 80, 0.3)"
        : p.$score >= 0.75
          ? "rgba(252, 219, 51, 0.3)"
          : "rgba(255, 80, 80, 0.3)"};
`;

const VisGrid = styled.div`
  display: flex;
  gap: var(--space-6);
  align-items: flex-start;
  flex-wrap: wrap;
`;

const VisColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const ColLabel = styled.div`
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const StatRow = styled.div`
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-top: var(--space-3);
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StatLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const StatValue = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: ${(p) => p.$color || "var(--white)"};
`;

const SequenceRow = styled.div`
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-top: var(--space-3);
`;

const SequenceBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SeqLabel = styled.div`
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--grey-mid);
`;

const SeqChars = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  max-width: 180px;
  line-height: 1;
`;

const SeqChar = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  padding: 0 1px;
`;

const UnlinkBtn = styled.button`
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-mid);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  &:hover {
    color: var(--red);
    border-color: rgba(255, 80, 80, 0.3);
  }
`;

function trendArrow(values) {
  if (values.length < 2) return "→";
  const first = values[0];
  const last = values[values.length - 1];
  const diff = last - first;
  const pct = first > 0 ? Math.abs(diff / first) : 0;
  if (pct < 0.05) return "→";
  return diff > 0 ? "↑" : "↓";
}

/**
 * Comparison panel for a merged identity group.
 * members: [{ uid, replayId, playerName, race, fingerprint, actions }]
 * replayLabels: { [replayId]: "R1" | "R2" | ... }
 */
export default function ComparisonPanel({ members, replayLabels, onUnlink }) {
  if (!members || members.length < 2) return null;

  const primaryName = members[0].playerName;
  const score = consistencyScore(members.map((m) => m.fingerprint));

  // Build series for overlay charts
  const sparklineSeries = members.map((m) => ({
    label: `${m.playerName} (${replayLabels[m.replayId] || "?"})`,
    timedSegments: m.actions?.timed_segments || [],
  }));

  const radarSeries = members.map((m) => ({
    label: `${m.playerName} (${replayLabels[m.replayId] || "?"})`,
    actions: m.actions || {},
  }));

  // Compute trend stats
  const avgApms = members.map((m) => {
    const segs = m.actions?.timed_segments || [];
    return segs.length ? segs.reduce((a, b) => a + b, 0) / segs.length : 0;
  });

  const hotkeyDiversity = members.map((m) => {
    const gk = m.actions?.group_hotkeys || {};
    return Object.keys(gk).filter((k) => (gk[k]?.used || 0) > 0).length;
  });

  return (
    <Panel>
      <Header>
        <IdentityName>{primaryName}</IdentityName>
        {members.map((m) => (
          <AliasTag key={m.uid}>
            {m.playerName} ({replayLabels[m.replayId] || "?"})
          </AliasTag>
        ))}
        <ConsistencyBadge $score={score}>
          {Math.round(score * 100)}% consistent
        </ConsistencyBadge>
        <UnlinkBtn onClick={onUnlink}>Unlink</UnlinkBtn>
      </Header>

      <VisGrid>
        <VisColumn>
          <ColLabel>APM over time</ColLabel>
          <OverlaySparkline series={sparklineSeries} />
        </VisColumn>

        <VisColumn>
          <ColLabel>Action distribution</ColLabel>
          <OverlayRadar series={radarSeries} />
        </VisColumn>
      </VisGrid>

      <StatRow>
        <StatItem>
          <StatLabel>Avg APM {trendArrow(avgApms)}</StatLabel>
          <StatValue>
            {avgApms.map((v) => Math.round(v)).join(" → ")}
          </StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Hotkey groups {trendArrow(hotkeyDiversity)}</StatLabel>
          <StatValue>{hotkeyDiversity.join(" → ")}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Race</StatLabel>
          <StatValue>
            {[...new Set(members.map((m) => m.race))].join(", ")}
          </StatValue>
        </StatItem>
      </StatRow>

      <SequenceRow>
        {members.map((m) => (
          <SequenceBlock key={m.uid}>
            <SeqLabel>
              Opening — {m.playerName} ({replayLabels[m.replayId] || "?"})
            </SeqLabel>
            <SeqChars>
              {(m.actions?.early_game_sequence || []).slice(0, 40).map((s, i) => (
                <SeqChar key={i}>{s.group}</SeqChar>
              ))}
            </SeqChars>
          </SequenceBlock>
        ))}
      </SequenceRow>
    </Panel>
  );
}
