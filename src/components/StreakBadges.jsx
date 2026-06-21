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

const RangeWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const RangeBar = styled.div`
  position: relative;
  width: 80px;
  height: 5px;
  border-radius: 3px;
  background: rgba(255,255,255,0.1);
  overflow: visible;
`;

const RangeFill = styled.div`
  position: absolute;
  top: 0;
  left: ${(p) => p.$left}%;
  width: ${(p) => p.$width}%;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--grey-mid), var(--gold));
`;

const RangeTick = styled.div`
  position: absolute;
  top: -2px;
  left: ${(p) => p.$pos}%;
  width: 2px;
  height: 9px;
  border-radius: 1px;
  background: var(--gold);
  transform: translateX(-50%);
`;

const RangeLabels = styled.div`
  display: flex;
  justify-content: space-between;
  width: 80px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-light);
  opacity: 0.7;
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
          // Mini range bar: low ──●── peak (current = peak since it just hit a new high)
          const cur = Number.isFinite(badge.currentMmr) ? badge.currentMmr : 0;
          const low = Number.isFinite(badge.seasonLow) ? badge.seasonLow : Math.max(cur - 200, 0);
          const peak = Number.isFinite(badge.seasonPeak) ? badge.seasonPeak : cur;
          const range = Math.max(peak - low, 1);
          const curPct = ((cur - low) / range) * 100;
          const barLeft = 0;
          const barWidth = 100;

          return (
            <Row key={i} style={{ alignItems: "flex-start" }}>
              <Label $color="var(--gold)" style={{ paddingTop: 2 }}>PEAK</Label>
              <div>
                <Row style={{ marginBottom: 4 }}>
                  <PlayerLink to={`/player/${encodeURIComponent(badge.tag)}`} onClick={(e) => e.stopPropagation()}>
                    {badge.name}
                  </PlayerLink>
                  <Meta>new high · {cur} MMR</Meta>
                </Row>
                <RangeWrap>
                  <RangeBar>
                    <RangeFill $left={barLeft} $width={barWidth} />
                    <RangeTick $pos={Math.min(Math.max(curPct, 1), 99)} />
                  </RangeBar>
                  <RangeLabels>
                    <span>{low}</span>
                    <span>{peak}</span>
                  </RangeLabels>
                </RangeWrap>
              </div>
            </Row>
          );
        }

        return null;
      })}
    </Wrap>
  );
}
