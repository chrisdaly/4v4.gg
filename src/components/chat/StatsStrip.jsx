import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Skeleton } from "../ui";
import { chartColors } from "../../lib/design-tokens";
import useChatStats, { toLocalHours, busiestHour, formatHour } from "../../lib/chat/useChatStats";

/**
 * Collapsible strip at the top of the /chat list (opened from the map
 * panel's Stats toggle): four figures from GET /api/chat/stats (messages
 * 24h, chatters 24h, busiest hour today, top chatters) and a 24-bar
 * activity-by-hour sparkline. Panel-less: bare labels and values on the
 * list's own background, closed off by a hairline.
 */

const Strip = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.6fr);
  gap: 10px 14px;
  padding: 10px 18px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;

  @media (max-width: 768px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const Tile = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const TileLabel = styled.span`
  font: var(--text-xxxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TileValue = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--white);
  line-height: 1.2;
  white-space: nowrap;
`;

const TileSub = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  white-space: nowrap;
`;

const SparkWrap = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  min-width: 0;
`;

const Spark = styled.svg`
  flex: 1;
  min-width: 0;
  height: 24px;
  display: block;
`;

const SparkCaption = styled.span`
  font: var(--text-xxxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  opacity: 0.7;
  white-space: nowrap;
`;

const TopList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`;

const TopRow = styled.li`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
  font-size: var(--text-xxs);
  line-height: 1.35;
`;

const TopName = styled(Link)`
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--gold);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  &:hover {
    text-decoration: underline;
  }
`;

const TopCount = styled.span`
  font-family: var(--font-mono);
  color: var(--white);
  flex-shrink: 0;
`;

const TopTile = styled(Tile)`
  @media (max-width: 768px) {
    grid-column: 1 / -1;
  }
`;

const GOLD_DIM = 0.35;
const BAR_W = 10;
const BAR_GAP = 2;
const H = 24;

function HourSparkline({ hours }) {
  const max = Math.max(1, ...hours);
  const now = new Date().getHours();
  const width = 24 * BAR_W + 23 * BAR_GAP;
  return (
    <Spark
      viewBox={`0 0 ${width} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Messages by hour of day"
      data-testid="stats-sparkline"
    >
      {hours.map((c, h) => {
        const bh = c > 0 ? Math.max(1, Math.round((c / max) * H)) : 1;
        return (
          <rect
            key={h}
            x={h * (BAR_W + BAR_GAP)}
            y={H - bh}
            width={BAR_W}
            height={bh}
            fill={chartColors.gold}
            fillOpacity={h === now ? 1 : GOLD_DIM}
            data-hour={h}
            data-current={h === now || undefined}
          >
            <title>{`${formatHour(h)}: ${c}`}</title>
          </rect>
        );
      })}
    </Spark>
  );
}

const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-US") : "–");

export default function StatsStrip({ open }) {
  const { stats, loading, error } = useChatStats(open);

  const hours = useMemo(() => toLocalHours(stats?.byHour), [stats]);
  const todayHours = useMemo(() => toLocalHours(stats?.byHourToday), [stats]);
  const busiest = useMemo(() => busiestHour(stats?.byHourToday ? todayHours : hours), [stats, todayHours, hours]);
  const top = useMemo(() => (Array.isArray(stats?.topChatters) ? stats.topChatters.slice(0, 5) : []), [stats]);

  if (!open) return null;

  if (!stats) {
    return (
      <Strip data-testid="stats-strip" aria-busy={loading}>
        {[0, 1, 2].map((i) => (
          <Tile key={i}>
            <Skeleton $w="70px" $h="9px" />
            <Skeleton $w="48px" $h="18px" />
          </Tile>
        ))}
        <TopTile>
          <Skeleton $w="80px" $h="9px" />
          <Skeleton $w="100%" $h="12px" />
          <Skeleton $w="80%" $h="12px" />
        </TopTile>
        <SparkWrap>
          {error ? <SparkCaption>relay stats unavailable</SparkCaption> : <Skeleton $w="100%" $h="24px" />}
        </SparkWrap>
      </Strip>
    );
  }

  const chatters24h = typeof stats.usersLast24h === "number" ? stats.usersLast24h : stats.uniqueUsers;

  return (
    <Strip data-testid="stats-strip" aria-busy={loading}>
      <Tile>
        <TileLabel>Messages 24h</TileLabel>
        <TileValue>{fmt(stats.messagesLast24h)}</TileValue>
        <TileSub>{fmt(stats.messagesLast7d)} this week</TileSub>
      </Tile>
      <Tile>
        <TileLabel>Chatters 24h</TileLabel>
        <TileValue>{fmt(chatters24h)}</TileValue>
        <TileSub>{fmt(stats.uniqueUsers)} all time</TileSub>
      </Tile>
      <Tile>
        <TileLabel>Busiest hour today</TileLabel>
        <TileValue>{busiest ? formatHour(busiest.hour) : "–"}</TileValue>
        <TileSub>{busiest ? `${fmt(busiest.count)} msgs` : "quiet so far"}</TileSub>
      </Tile>
      <TopTile>
        <TileLabel>Top chatters</TileLabel>
        <TopList>
          {top.map((c) => {
            const tag = c.battle_tag || "";
            const name = c.user_name || tag.split("#")[0];
            return (
              <TopRow key={tag || name}>
                <TopName to={`/player/${encodeURIComponent(tag)}`} title={tag}>
                  {name}
                </TopName>
                <TopCount>{fmt(c.count)}</TopCount>
              </TopRow>
            );
          })}
        </TopList>
      </TopTile>
      <SparkWrap>
        <HourSparkline hours={hours} />
        <SparkCaption>by hour, local</SparkCaption>
      </SparkWrap>
    </Strip>
  );
}
