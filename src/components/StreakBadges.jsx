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
  color: ${(p) => p.$color};
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

const Meta = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  white-space: nowrap;
`;

const Gain = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: ${(p) => (p.$pos ? "var(--green)" : "var(--red)")};
  white-space: nowrap;
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
  opacity: ${(p) => (p.$dim ? 0.35 : 1)};
`;

export default function StreakBadges({ badges }) {
  if (!badges || badges.length === 0) return null;

  return (
    <Wrap>
      {badges.map((badge, i) => {
        if (badge.type === "streak") {
          const hot = badge.won;
          const color = hot ? "var(--green)" : "var(--red)";
          const dotCount = Math.min(badge.length, 10);
          return (
            <Row key={i}>
              <Label $color={color}>{hot ? "HOT" : "COLD"}</Label>
              <PlayerLink to={`/player/${encodeURIComponent(badge.tag)}`} onClick={(e) => e.stopPropagation()}>
                {badge.name}
              </PlayerLink>
              <Meta>{badge.length}{hot ? "W" : "L"} streak</Meta>
              {badge.mmrGain != null && (
                <Gain $pos={badge.mmrGain >= 0}>{badge.mmrGain >= 0 ? "+" : ""}{badge.mmrGain}</Gain>
              )}
              <Dots>
                {Array.from({ length: dotCount }, (_, j) => (
                  <Dot key={j} $win={hot} $dim={j < dotCount - Math.min(badge.length, 10)} />
                ))}
              </Dots>
            </Row>
          );
        }

        if (badge.type === "milestone") {
          return (
            <Row key={i}>
              <Label $color="var(--gold)">PEAK</Label>
              <PlayerLink to={`/player/${encodeURIComponent(badge.tag)}`} onClick={(e) => e.stopPropagation()}>
                {badge.name}
              </PlayerLink>
              <Meta>just hit {badge.milestone} MMR</Meta>
            </Row>
          );
        }

        return null;
      })}
    </Wrap>
  );
}
