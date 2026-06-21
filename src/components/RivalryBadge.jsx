import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Label = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  font-weight: 700;
  letter-spacing: 0.12em;
  min-width: 36px;
  color: var(--cyan);
`;

const PlayerLink = styled(Link)`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  &:hover { text-decoration: underline; }
`;

const PlayerName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
`;

const Dots = styled.span`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
`;

const Dot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${(p) => (p.$win ? "var(--green)" : "var(--red)")};
  opacity: ${(p) => (p.$win ? 1 : 0.4)};
`;

const Vs = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.5;
`;

// rivals: [{ playerA, playerATag?, playerB, playerBTag?, playerAWins, playerBWins, meetings }]
// playerA should be the winner of the current match (so their dots read left-to-right as wins)
export default function RivalryBadge({ rivals }) {
  if (!rivals || rivals.length === 0) return null;

  return (
    <Wrap>
      {rivals.map((r, i) => {
        // Cap dots at 7 to keep it compact
        const maxDots = 7;
        const aWins = Math.min(r.playerAWins, maxDots);
        const bWins = Math.min(r.playerBWins, maxDots - aWins);

        const PlayerAEl = r.playerATag ? (
          <PlayerLink to={`/player/${encodeURIComponent(r.playerATag)}`} onClick={(e) => e.stopPropagation()}>
            {r.playerA}
          </PlayerLink>
        ) : (
          <PlayerName>{r.playerA}</PlayerName>
        );

        const PlayerBEl = r.playerBTag ? (
          <PlayerLink to={`/player/${encodeURIComponent(r.playerBTag)}`} onClick={(e) => e.stopPropagation()}>
            {r.playerB}
          </PlayerLink>
        ) : (
          <PlayerName>{r.playerB}</PlayerName>
        );

        return (
          <Row key={i}>
            <Label>H2H</Label>
            {PlayerAEl}
            <Dots>
              {Array.from({ length: aWins }, (_, j) => <Dot key={`a${j}`} $win />)}
              {Array.from({ length: bWins }, (_, j) => <Dot key={`b${j}`} />)}
            </Dots>
            <Vs>vs</Vs>
            {PlayerBEl}
          </Row>
        );
      })}
    </Wrap>
  );
}
