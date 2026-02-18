import React from "react";
import styled from "styled-components";

const Card = styled.div`
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: rgba(255, 255, 255, 0.02);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
`;

const PlayerTag = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
`;

const ReplayTag = styled.span`
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-mid);
`;

const Arrow = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  white-space: nowrap;
`;

const ScoreBarTrack = styled.div`
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: var(--space-2);
`;

const ScoreBarFill = styled.div`
  height: 100%;
  background: var(--gold);
  border-radius: 3px;
  transition: width 0.3s;
`;

const BreakdownRow = styled.div`
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
`;

const MiniBar = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MiniBarLabel = styled.div`
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const MiniBarTrack = styled.div`
  height: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
`;

const MiniBarFill = styled.div`
  height: 100%;
  background: ${(p) => p.$color || "var(--gold)"};
  border-radius: 2px;
  opacity: 0.7;
`;

const Actions = styled.div`
  display: flex;
  gap: var(--space-2);
`;

const Btn = styled.button`
  padding: 4px 12px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid;

  ${(p) =>
    p.$primary
      ? `
    background: rgba(252, 219, 51, 0.12);
    color: var(--gold);
    border-color: rgba(252, 219, 51, 0.3);
    &:hover { background: rgba(252, 219, 51, 0.2); }
  `
      : `
    background: transparent;
    color: var(--grey-mid);
    border-color: rgba(255, 255, 255, 0.1);
    &:hover { color: var(--grey-light); border-color: rgba(255, 255, 255, 0.2); }
  `}
`;

const BREAKDOWN_COLORS = {
  action: "#4a9eff",
  apm: "#ffc107",
  hotkey: "#4caf50",
  ngram: "#ff4a4a",
};

/**
 * match: { uidA, uidB, playerA, playerB, similarity, breakdown }
 * replayLabels: { [replayId]: "R1" | "R2" | ... }
 */
export default function MatchCard({
  match,
  replayLabels,
  onLink,
  onDismiss,
  isDismissed,
}) {
  const { playerA, playerB, similarity, breakdown } = match;
  const pct = Math.round(similarity * 100);

  return (
    <Card style={isDismissed ? { opacity: 0.35 } : undefined}>
      <Header>
        <PlayerTag>{playerA.playerName}</PlayerTag>
        <ReplayTag>({replayLabels[playerA.replayId] || "?"})</ReplayTag>
        <Arrow>{`←${pct}%→`}</Arrow>
        <PlayerTag>{playerB.playerName}</PlayerTag>
        <ReplayTag>({replayLabels[playerB.replayId] || "?"})</ReplayTag>
      </Header>

      <ScoreBarTrack>
        <ScoreBarFill style={{ width: `${pct}%` }} />
      </ScoreBarTrack>

      <BreakdownRow>
        {Object.entries(breakdown).map(([key, val]) => (
          <MiniBar key={key}>
            <MiniBarLabel>{key}</MiniBarLabel>
            <MiniBarTrack>
              <MiniBarFill
                $color={BREAKDOWN_COLORS[key]}
                style={{ width: `${Math.round(val * 100)}%` }}
              />
            </MiniBarTrack>
          </MiniBar>
        ))}
      </BreakdownRow>

      <Actions>
        <Btn $primary onClick={() => onLink(match)}>
          Link
        </Btn>
        <Btn onClick={() => onDismiss(match)}>
          {isDismissed ? "Dismissed" : "Dismiss"}
        </Btn>
      </Actions>
    </Card>
  );
}
