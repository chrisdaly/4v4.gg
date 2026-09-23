import React from "react";
import { Link, useHistory } from "react-router-dom";
import styled, { keyframes, css } from "styled-components";
import { GiCrossedSwords, GiTrophy } from "react-icons/gi";
import { getMapImageUrl } from "../../lib/formatters";
import { formatTime } from "../../lib/useChatMessages";
import LineEnd, { Time } from "./LineEnd";
import MiniTeamsRow from "../MiniMatchCard";
import MatchNote from "../MatchNote";
import StreakBadges from "../StreakBadges";
import RivalryBadge from "../RivalryBadge";

/**
 * One-line game event in the chat stream, laid out as a system row on the
 * message grid: a 24px icon in the avatar column (swords for a start,
 * trophy for a finish, in the tag colour), tag + text where author names
 * start, and the same right-hand cell as a message line (LineEnd) so the
 * time sits in the message-time column. Click toggles the full event card
 * (the pre-existing GameEventCard markup) below the line.
 *
 *   [x]  LIVE      ToastBrot, Shamiko +2 started on Royal Gardens, 1847 avg
 *   [y]  FINISHED  ToastBrot, Shamiko +2 won 14:02 on Royal Gardens, +12 avg
 *
 * Consecutive tickers read as one block: runStart adds the hairline and
 * top margin, runEnd the bottom margin (ChatPanel computes both).
 *
 * Props: event, expanded, onToggle, stillRunning, runStart, runEnd,
 * hoverData ({ avatars, stats, sessions, inGameTags, inGameInfoMap } for
 * the card's hover cards), avatars.
 */

const MAX_NAMES = 3;

const formatDuration = (seconds) => {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const pickTeam = (teams) => {
  // The team with the most channel members; ties go to the first
  let best = null;
  let bestCount = -1;
  for (const team of teams) {
    const n = (team || []).filter((p) => p.inChannel).length;
    if (n > bestCount) {
      best = team || [];
      bestCount = n;
    }
  }
  return { team: best || [], inChannel: bestCount };
};

const subjectOf = (team) => {
  const named = team.filter((p) => p.inChannel).slice(0, MAX_NAMES);
  const names = (named.length > 0 ? named : team.slice(0, 1)).map((p) => p.name || p.battleTag?.split("#")[0]).filter(Boolean);
  const rest = team.length - names.length;
  return names.length > 0 ? `${names.join(", ")}${rest > 0 ? ` +${rest}` : ""}` : `Team`;
};

const avgGain = (team) => {
  const gains = team.map((p) => p.mmrGain).filter((g) => g != null);
  if (gains.length === 0) return null;
  return Math.round(gains.reduce((a, b) => a + b, 0) / gains.length);
};

/** Ticker text for a start or end event; exported for tests. */
export function buildTickerText(ev) {
  const where = ev.mapName ? ` on ${ev.mapName}` : "";
  if (ev.type === "game_end") {
    const winners = ev.winners || [];
    const losers = ev.losers || [];
    const winnerCount = winners.filter((p) => p.inChannel).length;
    const loserCount = losers.filter((p) => p.inChannel).length;
    const won = winnerCount >= loserCount;
    const team = won ? winners : losers;
    const duration = formatDuration(ev.durationInSeconds);
    const gain = avgGain(team);
    const parts = [`${subjectOf(team)} ${won ? "won" : "lost"}${duration ? ` ${duration}` : ""}${where}`];
    if (gain != null) parts.push(`${gain >= 0 ? "+" : ""}${gain} avg`);
    return parts.join(", ");
  }
  const teams = ev.teams || [];
  const { team } = pickTeam(teams);
  const idx = teams.indexOf(team);
  const mmr = ev.teamMmrs?.[idx];
  const parts = [`${subjectOf(team)} started${where}`];
  if (mmr) parts.push(`${mmr} avg`);
  return parts.join(", ");
}

/* ── Ticker row ──────────────────────────────────── */

const toneColor = {
  live: "var(--red)",
  finished: "var(--green)",
  started: "var(--grey-light)",
};

const Block = styled.div`
  ${(p) =>
    p.$runStart &&
    css`
      margin-top: var(--space-2);
      padding-top: var(--space-1);
      border-top: 1px solid var(--surface-3);
    `}
  ${(p) =>
    p.$runEnd &&
    css`
      margin-bottom: var(--space-2);
    `}
`;

/* Same grid as a message group (ChatMessage Group): 40px avatar column,
   var(--space-3) gap, so the text starts where author names start */
const Row = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-1) 0;
  color: var(--grey-light);
  cursor: pointer;
  user-select: none;
  transition: color var(--transition);
  &:hover {
    color: var(--white);
  }
  &:hover ${Time} {
    color: var(--grey-light);
  }
`;

const IconSlot = styled.span`
  width: 24px;
  height: 24px;
  margin: 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: ${(p) => toneColor[p.$tone] || toneColor.started};
  svg {
    width: 14px;
    height: 14px;
  }
`;

/* Same grid as a message line (ChatMessage Line): text, then LineEnd */
const Body = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-3);
  align-items: baseline;
`;

const Tag = styled.span`
  margin-right: var(--space-2);
  font-family: var(--font-display);
  font-size: var(--text-xxxs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${(p) => toneColor[p.$tone] || toneColor.started};
`;

const Text = styled.span`
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  line-height: 1.5;
  overflow-wrap: anywhere;
`;

const LiveDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  margin-right: 5px;
  vertical-align: middle;
  animation: pulse 1.5s infinite;
`;

/* ── Expanded card (pre-existing GameEventCard markup) ─── */

const eventSlideIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const finishGlow = keyframes`
  0% { box-shadow: 0 0 0 rgba(194, 52, 52, 0); }
  30% { box-shadow: 0 0 14px rgba(194, 52, 52, 0.35); }
  100% { box-shadow: 0 0 0 rgba(194, 52, 52, 0); }
`;

const GameEventCard = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  max-width: 580px;
  box-sizing: border-box;
  margin: 0 0 var(--space-2) 52px;
  padding: var(--space-2) var(--space-3);
  border-left: 2px solid ${(p) => (p.$end ? "rgba(248, 113, 113, 0.5)" : "rgba(74, 222, 128, 0.5)")};
  background: rgba(255, 255, 255, 0.02);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  transition: background 0.15s;
  cursor: pointer;
  ${(p) =>
    p.$live &&
    css`
      animation: ${eventSlideIn} 0.4s ease-out${p.$end ? css`, ${finishGlow} 2s ease-out 0.2s` : ""};
    `}

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  a {
    color: var(--gold);
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  ${(p) =>
    p.$flush &&
    css`
      margin-left: 0;
      max-width: none;
    `}

  @media (max-width: 480px) {
    margin-left: 0;
  }
`;

const EventTagCol = styled.div`
  width: 84px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
`;

const EventMapBlock = styled.div`
  width: 96px;
  flex-shrink: 0;
  align-self: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  text-align: center;
`;

const EventMapImg = styled.img`
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  display: block;
`;

const EventMapName = styled(Link)`
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  line-height: 1.2;
`;

const EventMapMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.8;
`;

const EventBody = styled.div`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const EventTag = styled.span`
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 3px 7px;
  border-radius: var(--radius-sm);
  color: ${(p) => (p.$end ? "var(--red)" : "var(--green)")};
  background: ${(p) => (p.$end ? "var(--red-tint)" : "var(--green-tint)")};
`;

const EventNote = styled.div`
  margin-top: 5px;
`;

function formatGameMinutes(startTime) {
  if (!startTime) return null;
  const mins = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
  return mins >= 0 && mins < 180 ? `${mins}m` : null;
}

/**
 * The expanded event card. `flush` drops the 52px stream indent and the
 * max-width so the card fills a modal (GameModal).
 */
export function GameEventCardView({ event: ev, stillRunning, hoverData, avatars, flush = false }) {
  const history = useHistory();
  const isEnd = ev.type === "game_end";
  const duration = ev.durationInSeconds != null ? `${Math.round(ev.durationInSeconds / 60)} min` : null;
  const mapImg = ev.mapName ? getMapImageUrl(ev.mapName) : null;
  const teamA = isEnd ? ev.winners : ev.teams?.[0];
  const teamB = isEnd ? ev.losers : ev.teams?.[1];
  const eventLink = isEnd ? `/match/${ev.matchId}` : "/live";
  const hasChart = (teamA || []).some((p) => p.mmr > 0);
  const liveMins = stillRunning ? formatGameMinutes(ev.time) : null;

  return (
    <GameEventCard $end={isEnd} $live={ev.live} $flush={flush} onClick={() => history.push(eventLink)}>
      <EventTagCol>
        <EventTag $end={isEnd}>{isEnd ? "Finish" : "Start"}</EventTag>
        {isEnd ? (
          <>
            {duration && <EventMapMeta>{duration}</EventMapMeta>}
            <EventMapMeta>ended {formatTime(ev.time)}</EventMapMeta>
          </>
        ) : stillRunning ? (
          <EventMapMeta>
            <LiveDot />
            in progress{liveMins ? ` · ${liveMins}` : ""}
          </EventMapMeta>
        ) : (
          <EventMapMeta>started {formatTime(ev.time)}</EventMapMeta>
        )}
      </EventTagCol>
      <EventMapBlock>
        {mapImg && (
          <Link to={eventLink} onClick={(e) => e.stopPropagation()}>
            <EventMapImg
              src={mapImg}
              alt=""
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </Link>
        )}
        {ev.mapName && (
          <EventMapName to={eventLink} onClick={(e) => e.stopPropagation()}>
            {ev.mapName}
          </EventMapName>
        )}
      </EventMapBlock>
      <EventBody>
        <MiniTeamsRow
          teamA={{ players: teamA, winner: isEnd }}
          teamB={{ players: teamB, winner: false }}
          dimLosers={isEnd}
          showChart={hasChart}
          mvpTag={ev.mvp}
          hoverData={hoverData}
        />
        {ev.note && (
          <EventNote>
            <MatchNote note={ev.note} avatarUrl={ev.note.tag ? avatars?.get(ev.note.tag)?.profilePicUrl : null} />
          </EventNote>
        )}
        {isEnd && (ev.badges?.length > 0 || ev.rivals?.length > 0) && (
          <EventNote>
            <StreakBadges badges={ev.badges} />
            <RivalryBadge rivals={ev.rivals} />
          </EventNote>
        )}
      </EventBody>
    </GameEventCard>
  );
}

export default function GameTicker({
  event,
  expanded = false,
  onToggle,
  stillRunning = false,
  runStart = true,
  runEnd = true,
  hoverData,
  avatars,
}) {
  const isEnd = event.type === "game_end";
  const tone = isEnd ? "finished" : stillRunning ? "live" : "started";
  const label = isEnd ? "Finished" : stillRunning ? "Live" : "Started";
  return (
    <Block data-ticker={tone} data-run-start={runStart || undefined} data-run-end={runEnd || undefined} $runStart={runStart} $runEnd={runEnd}>
      <Row
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        data-event-id={event.id}
        onClick={() => onToggle?.(event.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle?.(event.id);
          }
        }}
      >
        <IconSlot $tone={tone} data-ticker-icon={isEnd ? "trophy" : "swords"} aria-hidden="true">
          {isEnd ? <GiTrophy /> : <GiCrossedSwords />}
        </IconSlot>
        <Body>
          <Text>
            <Tag $tone={tone}>{label}</Tag>
            {stillRunning && !isEnd && <LiveDot />}
            {buildTickerText(event)}
          </Text>
          <LineEnd time={event.time} reserve />
        </Body>
      </Row>
      {expanded && <GameEventCardView event={event} stillRunning={stillRunning} hoverData={hoverData} avatars={avatars} />}
    </Block>
  );
}
