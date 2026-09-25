import React from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { getMapImageUrl } from "../../lib/formatters";
import { formatTime } from "../../lib/useChatMessages";
import LineEnd, { Time } from "./LineEnd";
import { MmrComparison } from "../MmrComparison";
import PlayerHoverCard from "../PlayerHoverCard";
import useATGroupIds from "../../lib/useATGroupIds";
import { renderBlurbText } from "../MatchNote";
import { CHAT_MOBILE_PX } from "../../lib/useIsMobile";

/**
 * A game event woven into the chat stream (Chat v2).
 *
 * Collapsed it is one quiet row on the message grid: a 6px dot in the
 * avatar column (green FINISHED, red LIVE, grey STARTED for a game that has
 * since ended), the tag and the ticker text where author names start, one
 * line with an ellipsis in mono 12px on the design's #888, and the same
 * right-hand cell as a message line (LineEnd) so the time sits in the
 * message-time column. It reads as punctuation between messages.
 *
 *   .  FINISHED  ToastBrot, Shamiko +2 won 14:02 on Royal Gardens, +12 avg
 *   .  LIVE      ToastBrot, Shamiko +2 started on Royal Gardens, 1847 avg
 *
 * `compact` (the mobile stream) drops the tag for the short copy:
 *
 *   .  ToastBrot +3 · Royal Gardens
 *   .  sjow +3 won Arathor · +8
 *
 * Clicking the row swaps it for the game card (GameEventCardView): header
 * (tag pill, duration or "N min in", lobby average, time), minimap, the two
 * teams with MVP badge, MMR and delta, the micro MMR strip between them,
 * and the match notes. Clicking the card's header collapses it again.
 *
 * Props: event, expanded, onToggle(id), stillRunning, hoverData
 * ({ avatars, stats, sessions, inGameTags, inGameInfoMap } for the card's
 * hover cards), compact.
 */

const MAX_NAMES = 2;

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

// "{p1}, {p2} +N": the in-channel players first, at most two named
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

// Lobby average MMR (all eight players), for the card header
const lobbyAvg = (players) => {
  const mmrs = players.map((p) => p.mmr).filter((m) => m > 0);
  if (mmrs.length === 0) return null;
  return Math.round(mmrs.reduce((a, b) => a + b, 0) / mmrs.length);
};

/**
 * Row text for a start or end event; exported for tests.
 *   FINISHED  "{p1}, {p2} +N won {dur} on {map}, +{avg delta} avg"
 *   LIVE      "{p1}, {p2} +N started on {map}, {avg} avg"
 */
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

/**
 * Short row text for the mobile stream; exported for tests.
 *   FINISHED  "{p1}, {p2} +N won {map} · +{avg delta}"
 *   LIVE      "{p1}, {p2} +N · {map}"
 */
export function buildShortTickerText(ev) {
  if (ev.type === "game_end") {
    const winners = ev.winners || [];
    const losers = ev.losers || [];
    const won = winners.filter((p) => p.inChannel).length >= losers.filter((p) => p.inChannel).length;
    const team = won ? winners : losers;
    const gain = avgGain(team);
    const parts = [`${subjectOf(team)} ${won ? "won" : "lost"}${ev.mapName ? ` ${ev.mapName}` : ""}`];
    if (gain != null) parts.push(`${gain >= 0 ? "+" : ""}${gain}`);
    return parts.join(" · ");
  }
  const { team } = pickTeam(ev.teams || []);
  return [subjectOf(team), ev.mapName].filter(Boolean).join(" · ");
}

/* ── Tone: finished / live / started ─────────────── */

const toneColor = {
  live: "var(--red)",
  finished: "var(--green)",
  started: "var(--grey-light)",
};

const toneTint = {
  live: "var(--red-tint)",
  finished: "var(--green-tint)",
  started: "var(--surface-2)",
};

const toneLabel = {
  live: "LIVE",
  finished: "FINISHED",
  started: "STARTED",
};

const toneOf = (ev, stillRunning) => (ev.type === "game_end" ? "finished" : stillRunning ? "live" : "started");

/* ── Collapsed row ───────────────────────────────── */

/* Same grid as a message group (ChatMessage Group): 38px avatar column,
   12px gap, so the text starts where author names start; 34px and 10px on
   mobile, where the copy-link slot is gone too */
const Row = styled.div`
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 6px 0;
  margin: 2px 0;
  border-radius: 3px;
  opacity: 0.8;
  cursor: pointer;
  user-select: none;
  transition: background var(--transition), opacity var(--transition);
  &:hover,
  &:focus-visible {
    background: var(--surface-1);
    opacity: 1;
    outline: none;
  }
  &:hover ${Time} {
    opacity: 1;
  }
  @media (max-width: ${CHAT_MOBILE_PX}px) {
    grid-template-columns: 34px minmax(0, 1fr) auto;
    gap: 10px;
    padding: 7px 0;
    margin: 0;
    [data-end-slot] {
      display: none;
    }
  }
`;

const Dot = styled.span`
  justify-self: center;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => toneColor[p.$tone] || toneColor.started};
  ${(p) =>
    p.$tone === "live" &&
    css`
      animation: pulse 1.5s infinite;
    `}
`;

/* mono 12px on the design's #888 (grey-light at .7), one line */
const RowText = styled.span`
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  line-height: 1.45;
  color: var(--grey-light);
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Tag = styled.span`
  margin-right: 8px;
  letter-spacing: 0.06em;
  opacity: 0.85;
  color: ${(p) => toneColor[p.$tone] || toneColor.started};
`;

/* ── Expanded card ───────────────────────────────── */

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
  margin: ${(p) => (p.$flush ? "0" : "8px 0")};
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
`;

const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--text-xxxs);
  ${(p) =>
    p.$clickable &&
    css`
      cursor: pointer;
      user-select: none;
    `}
`;

const TagPill = styled.span`
  letter-spacing: 0.1em;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  color: ${(p) => toneColor[p.$tone] || toneColor.started};
  background: ${(p) => toneTint[p.$tone] || toneTint.started};
`;

const HeadMeta = styled.span`
  color: var(--grey-light);
`;

const HeadAvg = styled.span`
  color: var(--grey-light);
  opacity: 0.7;
`;

const HeadTime = styled.span`
  margin-left: auto;
  color: var(--grey-light);
  opacity: 0.6;
  white-space: nowrap;
`;

const CardBody = styled.div`
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 30px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
`;

const MapBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 0;
`;

const MapImg = styled.img`
  width: 56px;
  height: 56px;
  box-sizing: border-box;
  border-radius: 3px;
  border: 1px solid rgba(var(--gold-muted-rgb), 0.45);
  object-fit: cover;
  display: block;
  background: var(--surface-2);
`;

const MapName = styled(Link)`
  font-family: var(--font-display);
  font-size: 10px;
  line-height: 1.2;
  color: var(--gold);
  text-align: center;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const TeamCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const PlayerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`;

const TeamDot = styled.span`
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => (p.$side === "b" ? "var(--team-red)" : "var(--team-blue)")};
`;

const PlayerName = styled(Link)`
  min-width: 0;
  font-family: var(--font-display);
  font-size: 13px;
  color: ${(p) => (p.$dim ? "rgba(var(--gold-muted-rgb), 1)" : "var(--gold)")};
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &:hover {
    text-decoration: underline;
  }
`;

const MvpBadge = styled.span`
  flex-shrink: 0;
  font-size: 9px;
  letter-spacing: 0.08em;
  padding: 0 4px;
  border-radius: var(--radius-sm);
  color: #0a0806; /* page background: dark text on the gold badge */
  background: var(--gold);
`;

const PlayerMmr = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.7;
`;

const PlayerDelta = styled.span`
  flex-shrink: 0;
  min-width: 18px;
  text-align: right;
  font-size: var(--text-xxxs);
  color: ${(p) => (p.$neg ? "var(--red)" : "var(--green)")};
`;

/* The micro MMR strip between the teams: MmrComparison on its fixed
   700-2700 scale, in a 30x64 box with the design's side hairlines */
const Strip = styled.div`
  position: relative;
  width: 30px;
  height: 64px;
  border-left: 1px solid rgba(255, 255, 255, 0.07);
  border-right: 1px solid rgba(255, 255, 255, 0.07);
`;

const Notes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 9px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const NoteRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  font-size: var(--text-xxs);
`;

const noteTagColor = {
  MVP: "var(--gold)",
  UPSET: "var(--amber)",
};

const NoteTag = styled.span`
  flex-shrink: 0;
  width: 44px;
  letter-spacing: 0.1em;
  color: ${(p) => noteTagColor[p.$tag] || "var(--grey-light)"};
`;

const NoteName = styled(Link)`
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--gold);
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const NoteText = styled.span`
  min-width: 0;
  color: var(--text-body);
  overflow-wrap: anywhere;
`;

const NoteQuote = styled.span`
  color: var(--grey-light);
  font-style: italic;
`;

function elapsedMinutes(startTime) {
  if (!startTime) return null;
  const mins = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
  return mins >= 0 && mins < 180 ? mins : null;
}

/**
 * Note rows for the card from the event's existing analytics: the
 * computeNote / blurb note, tagged MVP when its subject is the match MVP,
 * UPSET for the favourites-fell note, STACK for race stacks, NOTE for the
 * rest. Streak (HOT/COLD) and rivalry badges are left out on purpose.
 * Exported for tests.
 */
export function cardNotes(ev) {
  const note = ev.note;
  if (!note) return [];
  if (typeof note === "string") return [{ tag: "NOTE", name: null, href: null, text: note, quote: null }];
  const href = note.tag ? `/player/${encodeURIComponent(note.tag)}` : null;
  if (note.tag) {
    const tag = ev.mvp && note.tag === ev.mvp ? "MVP" : "NOTE";
    return [{ tag, name: note.name, href, text: note.text, quote: null }];
  }
  if (note.raceId != null) return [{ tag: "STACK", name: null, href: null, text: note.text, quote: note.quote || null }];
  const upset = /^upset\s*-\s*/i;
  if (upset.test(note.text || "")) {
    return [{ tag: "UPSET", name: null, href: null, text: note.text.replace(upset, ""), quote: null }];
  }
  return [{ tag: "NOTE", name: null, href: null, text: note.text, quote: null }];
}

function TeamRows({ players, side, dim, mvpTag, showDelta, hoverData }) {
  return (
    <TeamCol data-team={side}>
      {(players || []).map((p, i) => {
        const name = p.name || p.battleTag?.split("#")[0] || "?";
        const link = (
          <PlayerName to={`/player/${encodeURIComponent(p.battleTag || name)}`} $dim={dim} onClick={(e) => e.stopPropagation()}>
            {name}
          </PlayerName>
        );
        return (
          <PlayerRow key={p.battleTag || i}>
            <TeamDot $side={side} />
            {hoverData && p.battleTag ? (
              <PlayerHoverCard
                battleTag={p.battleTag}
                avatars={hoverData.avatars}
                stats={hoverData.stats}
                sessions={hoverData.sessions}
                inGameInfo={hoverData.inGameTags?.has(p.battleTag) ? hoverData.inGameInfoMap?.get(p.battleTag) : null}
                style={{ minWidth: 0 }}
              >
                {link}
              </PlayerHoverCard>
            ) : (
              link
            )}
            {mvpTag && p.battleTag === mvpTag && <MvpBadge data-mvp>MVP</MvpBadge>}
            {p.mmr > 0 && <PlayerMmr>{Math.round(p.mmr)}</PlayerMmr>}
            {showDelta && p.mmrGain != null && (
              <PlayerDelta $neg={p.mmrGain < 0}>
                {p.mmrGain >= 0 ? "+" : "-"}
                {Math.abs(Math.round(p.mmrGain))}
              </PlayerDelta>
            )}
          </PlayerRow>
        );
      })}
    </TeamCol>
  );
}

/**
 * The expanded game card. `onToggle` makes the header row a collapse
 * control (the stream); `flush` drops the outer margin (GameModal).
 */
export function GameEventCardView({ event: ev, stillRunning = false, hoverData, onToggle, flush = false }) {
  const isEnd = ev.type === "game_end";
  const tone = toneOf(ev, stillRunning);
  const teamA = (isEnd ? ev.winners : ev.teams?.[0]) || [];
  const teamB = (isEnd ? ev.losers : ev.teams?.[1]) || [];
  const { teamOneAT, teamTwoAT } = useATGroupIds(teamA, teamB);
  const mapImg = ev.mapName ? getMapImageUrl(ev.mapName) : null;
  const eventLink = isEnd ? `/match/${ev.matchId}` : "/live";
  const avg = lobbyAvg([...teamA, ...teamB]);
  const hasStrip = [...teamA, ...teamB].some((p) => p.mmr > 0);
  const mins = tone === "live" ? elapsedMinutes(ev.time) : null;
  const meta = isEnd ? formatDuration(ev.durationInSeconds) : tone === "live" ? (mins != null ? `${mins} min in` : "in progress") : "ended";
  const notes = cardNotes(ev);
  const toggle = onToggle ? () => onToggle(ev.id) : undefined;

  return (
    <Card $flush={flush} data-game-card={ev.id}>
      <CardHead
        $clickable={Boolean(toggle)}
        role={toggle ? "button" : undefined}
        tabIndex={toggle ? 0 : undefined}
        aria-expanded={toggle ? true : undefined}
        data-event-id={toggle ? ev.id : undefined}
        title={toggle ? "Collapse" : undefined}
        onClick={toggle}
        onKeyDown={
          toggle
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle();
                }
              }
            : undefined
        }
      >
        <TagPill $tone={tone}>{toneLabel[tone]}</TagPill>
        {meta && <HeadMeta>{meta}</HeadMeta>}
        {avg != null && <HeadAvg>{avg} avg</HeadAvg>}
        <HeadTime>{formatTime(ev.time)}</HeadTime>
      </CardHead>
      <CardBody>
        <MapBlock>
          {mapImg && (
            <Link to={eventLink} onClick={(e) => e.stopPropagation()}>
              <MapImg
                src={mapImg}
                alt=""
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </Link>
          )}
          {ev.mapName && (
            <MapName to={eventLink} onClick={(e) => e.stopPropagation()}>
              {ev.mapName}
            </MapName>
          )}
        </MapBlock>
        <TeamRows players={teamA} side="a" dim={false} mvpTag={ev.mvp} showDelta={isEnd} hoverData={hoverData} />
        <Strip title="Player MMR by team" data-mmr-strip>
          {hasStrip && (
            <MmrComparison
              data={{
                teamOneMmrs: teamA.map((p) => p.mmr || 0),
                teamTwoMmrs: teamB.map((p) => p.mmr || 0),
                teamOneAT,
                teamTwoAT,
              }}
              variant="micro"
            />
          )}
        </Strip>
        <TeamRows players={teamB} side="b" dim={isEnd} mvpTag={ev.mvp} showDelta={isEnd} hoverData={hoverData} />
      </CardBody>
      {notes.length > 0 && (
        <Notes data-game-notes>
          {notes.map((n, i) => (
            <NoteRow key={i} data-note={n.tag}>
              <NoteTag $tag={n.tag}>{n.tag}</NoteTag>
              {n.name && n.href && (
                <NoteName to={n.href} onClick={(e) => e.stopPropagation()}>
                  {n.name}
                </NoteName>
              )}
              <NoteText>
                {renderBlurbText(n.text)}
                {n.quote && <NoteQuote> {n.quote}</NoteQuote>}
              </NoteText>
            </NoteRow>
          ))}
        </Notes>
      )}
    </Card>
  );
}

export default function GameRow({ event, expanded = false, onToggle, stillRunning = false, hoverData, compact = false }) {
  const tone = toneOf(event, stillRunning);
  if (expanded) {
    return (
      <div data-ticker={tone} data-expanded="true">
        <GameEventCardView event={event} stillRunning={stillRunning} hoverData={hoverData} onToggle={onToggle} />
      </div>
    );
  }
  return (
    <Row
      data-ticker={tone}
      role="button"
      tabIndex={0}
      aria-expanded={false}
      data-event-id={event.id}
      title="Show game details"
      onClick={() => onToggle?.(event.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle?.(event.id);
        }
      }}
    >
      <Dot $tone={tone} aria-hidden="true" />
      <RowText>
        {!compact && <Tag $tone={tone}>{toneLabel[tone]}</Tag>}
        {compact ? buildShortTickerText(event) : buildTickerText(event)}
      </RowText>
      <LineEnd time={event.time} reserve />
    </Row>
  );
}
