import React from "react";
import styled from "styled-components";
import { Dot } from "./ui";
import { Wrap, Row, Label, PlayerLink, Dots, BADGE_DOT_SIZE } from "./badgeParts";

const PlayerName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
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
              {Array.from({ length: aWins }, (_, j) => <Dot key={`a${j}`} $win $size={BADGE_DOT_SIZE} $recent />)}
              {Array.from({ length: bWins }, (_, j) => <Dot key={`b${j}`} $size={BADGE_DOT_SIZE} $dim />)}
            </Dots>
            <Vs>vs</Vs>
            {PlayerBEl}
          </Row>
        );
      })}
    </Wrap>
  );
}
