import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { MmrComparison } from "../MmrComparison";
import useATGroupIds from "../../lib/useATGroupIds";
import { Avatar } from "../UserListSidebar";
import { resolveGame } from "./GameModal";
import { formatGameMinutes } from "./chip";

/**
 * The mobile game sheet on /chat: the ongoing game behind an in-game
 * marker, roster row or player card, full screen. Header (LIVE dot, map,
 * minutes, close), then Game.jsx's mobile order: team 1 header, its four
 * player cells, the micro MMR comparison, four more cells, team 2 header.
 * The event comes from resolveGame (GameModal); without one the channel
 * players in that game are listed instead.
 *
 * Props: as GameModal (game, gameEvents, ongoingMatches, ongoingMatchIds,
 * onlineUsers, inGameInfoMap, stats, avatars, onClose)
 */

const HEADER = 52; // px
const CELL = 52; // px avatar

const Screen = styled.div`
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  flex-direction: column;
  background: #0a0806;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  height: ${HEADER}px;
  padding: 0 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
`;

const State = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  font-weight: 700;
  letter-spacing: 0.14em;
  color: ${(p) => (p.$live ? "var(--red)" : "var(--green)")};
  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: var(--radius-full);
    background: currentColor;
    ${(p) => p.$live && "animation: pulse 1.5s infinite;"}
  }
`;

const MapName = styled.span`
  font-family: var(--font-display);
  font-size: 15px;
  color: var(--white);
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Minutes = styled.span`
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--grey-light);
  white-space: nowrap;
`;

const Close = styled.button`
  margin-left: auto;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  font-size: 20px;
  line-height: 1;
  color: var(--text-body);
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-md);
  cursor: pointer;
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 14px calc(16px + env(safe-area-inset-bottom, 0px));
`;

const TeamHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TeamLabel = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: ${(p) => (p.$side === "b" ? "var(--team-red)" : "var(--team-blue)")};
`;

const TeamMmr = styled.span`
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--white);
  small {
    font-size: 10px;
    color: var(--grey-light);
  }
`;

const Cells = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
`;

const Cell = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  text-decoration: none;
`;

const CellName = styled.span`
  max-width: 100%;
  font-family: var(--font-display);
  font-size: var(--text-xxxs);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Chart = styled.div`
  position: relative;
  height: 120px;
`;

const Note = styled.p`
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const Roster = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
`;

const RosterRow = styled.li`
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-1) var(--space-2);
`;

const RosterName = styled(Link)`
  flex: 1;
  min-width: 0;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RosterMmr = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const teamAvg = (players) => {
  const mmrs = players.map((p) => p.mmr).filter((m) => m > 0);
  return mmrs.length ? Math.round(mmrs.reduce((a, b) => a + b, 0) / mmrs.length) : null;
};

function TeamCells({ players, avatars, stats, side }) {
  return (
    <Cells data-team={side}>
      {players.map((p, i) => {
        const name = p.name || p.battleTag?.split("#")[0] || "?";
        return (
          <Cell key={p.battleTag || i} to={`/player/${encodeURIComponent(p.battleTag || name)}`}>
            <Avatar tag={p.battleTag} avatars={avatars} stats={stats} size={CELL} />
            <CellName>{name}</CellName>
          </Cell>
        );
      })}
    </Cells>
  );
}

export default function GameSheet({ game, gameEvents, ongoingMatches, ongoingMatchIds, onlineUsers, inGameInfoMap, stats, avatars, onClose }) {
  const { event, players } = useMemo(
    () => resolveGame(game, { gameEvents, ongoingMatches, onlineUsers, inGameInfoMap }),
    [game, gameEvents, ongoingMatches, onlineUsers, inGameInfoMap]
  );
  const isEnd = event?.type === "game_end";
  const teamA = useMemo(() => (event ? (isEnd ? event.winners : event.teams?.[0]) || [] : []), [event, isEnd]);
  const teamB = useMemo(() => (event ? (isEnd ? event.losers : event.teams?.[1]) || [] : []), [event, isEnd]);
  const { teamOneAT, teamTwoAT } = useATGroupIds(teamA, teamB);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const matchId = game?.matchId;
  const live = matchId ? Boolean(ongoingMatchIds?.has(matchId)) : true;
  const mapName = event?.mapName || game?.mapName || "Unknown map";
  const minutes = live ? formatGameMinutes(game?.startTime || event?.time) : null;
  const hasChart = [...teamA, ...teamB].some((p) => p.mmr > 0);
  const avgA = event?.teamMmrs?.[0] ?? teamAvg(teamA);
  const avgB = event?.teamMmrs?.[1] ?? teamAvg(teamB);

  return (
    <Screen role="dialog" aria-modal="true" aria-label={`${live ? "Live" : "Finished"} · ${mapName}`} data-game-sheet={matchId || "unknown"}>
      <Head>
        <State $live={live}>{live ? "LIVE" : "FINISHED"}</State>
        <MapName>{mapName}</MapName>
        {minutes && <Minutes>{minutes.replace(/m$/, "")} mins</Minutes>}
        <Close type="button" aria-label="Close game" onClick={onClose}>
          ×
        </Close>
      </Head>
      <Body>
        {event ? (
          <>
            <TeamHeader>
              <TeamLabel $side="a">TEAM 1</TeamLabel>
              {avgA != null && (
                <TeamMmr>
                  {avgA} <small>MMR</small>
                </TeamMmr>
              )}
            </TeamHeader>
            <TeamCells players={teamA} avatars={avatars} stats={stats} side="a" />
            <Chart data-mmr-strip>
              {hasChart && (
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
            </Chart>
            <TeamCells players={teamB} avatars={avatars} stats={stats} side="b" />
            <TeamHeader>
              <TeamLabel $side="b">TEAM 2</TeamLabel>
              {avgB != null && (
                <TeamMmr>
                  {avgB} <small>MMR</small>
                </TeamMmr>
              )}
            </TeamHeader>
          </>
        ) : (
          <>
            <Note>No lobby data yet; channel players in this game:</Note>
            {players.length > 0 ? (
              <Roster data-game-roster>
                {players.map((u) => {
                  const mmr = stats?.get(u.battleTag)?.mmr;
                  return (
                    <RosterRow key={u.battleTag}>
                      <RosterName to={`/player/${encodeURIComponent(u.battleTag)}`}>{u.name || u.battleTag.split("#")[0]}</RosterName>
                      {mmr != null && <RosterMmr>{Math.round(mmr)}</RosterMmr>}
                    </RosterRow>
                  );
                })}
              </Roster>
            ) : (
              <Note>Nobody from the channel is in it any more.</Note>
            )}
          </>
        )}
      </Body>
    </Screen>
  );
}
