import React from "react";
import styled from "styled-components";
import { Dot, Delta } from "./ui";
import { Wrap, Row, Label, PlayerLink, Dots, BADGE_DOT_SIZE } from "./badgeParts";

const Meta = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  white-space: nowrap;
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
  border-radius: var(--radius-sm);
  background: var(--surface-3);
  overflow: visible;
`;

const RangeFill = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--grey-mid), var(--gold));
`;

const RangeTick = styled.div`
  position: absolute;
  top: -2px;
  left: ${(p) => p.$pos}%;
  width: 2px;
  height: 9px;
  border-radius: var(--radius-sm);
  background: var(--gold);
  transform: translateX(-50%);
`;

const RangeLabels = styled.div`
  display: flex;
  justify-content: space-between;
  width: 80px;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
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
                <Delta value={badge.mmrGain} $size="var(--text-xxxs)" style={{ whiteSpace: "nowrap" }} />
              )}
              <Dots>
                {Array.from({ length: dotCount }, (_, j) => (
                  <Dot key={j} $win={hot} $size={BADGE_DOT_SIZE} $recent />
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
                    <RangeFill />
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
