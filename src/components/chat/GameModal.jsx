import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Button, ModalBackdrop, ModalContent } from "../ui";
import { GameEventCardView } from "./GameTicker";
import { formatGameMinutes } from "./chip";
import { buildStartEvent } from "../../lib/chat/useGameEvents";

/**
 * The ongoing game behind an in-game chip, roster row or roster map divider.
 * Header "Live · <map> · <elapsed>", then the expanded event card
 * (GameEventCardView) for the match. The card comes from the start event
 * the chat already saw, else is built from the ongoing-match poll; when the
 * match is in neither (it just ended, or the poll has not caught up) the
 * channel players in that game are listed with their MMR instead.
 *
 * Props
 *   game           { matchId, mapName, startTime } (an inGameInfoMap entry)
 *   gameEvents     useGameEvents events (start events carry the card data)
 *   ongoingMatches raw ongoing poll, for a start event not seen yet
 *   ongoingMatchIds ids still running (header says Live while it is)
 *   onlineUsers    the channel roster, for the fallback list
 *   inGameInfoMap  battleTag -> { matchId, mapName, startTime }
 *   stats          battleTag -> { mmr }
 *   hoverData      { avatars, stats, sessions, inGameTags, inGameInfoMap }
 *   avatars        battleTag -> profile (note avatars on the card)
 *   onClose        () => void; the close button, the backdrop and Esc
 */

const Dialog = styled(ModalContent)`
  padding: var(--space-4);
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
`;

const Title = styled.h3`
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: normal;
  color: var(--white);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const State = styled.span`
  color: ${(p) => (p.$live ? "var(--red)" : "var(--green)")};
`;

const CloseButton = styled(Button)`
  flex-shrink: 0;
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
  border-radius: var(--radius-sm);
  &:hover {
    background: var(--surface-2);
  }
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
  &:hover {
    text-decoration: underline;
  }
`;

const RosterMmr = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const Note = styled.p`
  margin: 0 0 var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const matchIdOf = (m) => m.id || m.match?.id;

/**
 * resolveGame(game, { gameEvents, ongoingMatches, onlineUsers, inGameInfoMap })
 *   -> { event, players }: the start event to render, or (event null) the
 *      channel players in that game. Exported for tests.
 */
export function resolveGame(game, { gameEvents = [], ongoingMatches = [], onlineUsers = [], inGameInfoMap } = {}) {
  const matchId = game?.matchId;
  const seen = matchId ? gameEvents.find((e) => e.type === "game_start" && e.matchId === matchId) : null;
  if (seen) return { event: seen, players: [] };
  const match = matchId ? ongoingMatches.find((m) => matchIdOf(m) === matchId) : null;
  if (match) {
    const channel = new Set(onlineUsers.map((u) => u.battleTag?.toLowerCase()).filter(Boolean));
    const built = buildStartEvent(match, channel);
    if (built) return { event: built, players: [] };
  }
  const sameGame = (info) =>
    Boolean(info) &&
    (matchId ? info.matchId === matchId : info.mapName === game?.mapName && info.startTime === game?.startTime);
  return { event: null, players: onlineUsers.filter((u) => sameGame(inGameInfoMap?.get(u.battleTag))) };
}

export default function GameModal({
  game,
  gameEvents,
  ongoingMatches,
  ongoingMatchIds,
  onlineUsers,
  inGameInfoMap,
  stats,
  hoverData,
  avatars,
  onClose,
}) {
  const { event, players } = useMemo(
    () => resolveGame(game, { gameEvents, ongoingMatches, onlineUsers, inGameInfoMap }),
    [game, gameEvents, ongoingMatches, onlineUsers, inGameInfoMap]
  );

  // Esc closes this first; capture + stopPropagation keeps the chat panel's
  // own Esc handling (focus mode, search) out of it
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
  // the ongoing index carries the same start time as the event; prefer it
  // so a stale event object never skews the elapsed minutes
  const elapsed = live ? formatGameMinutes(game?.startTime || event?.time) : null;
  const title = [live ? "Live" : "Finished", mapName, elapsed].filter(Boolean).join(" · ");

  return (
    <ModalBackdrop onClick={onClose} data-game-modal={matchId || "unknown"}>
      <Dialog $size="lg" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <Head>
          <Title title={title}>
            <State $live={live}>{live ? "Live" : "Finished"}</State>
            {` · ${mapName}`}
            {elapsed ? ` · ${elapsed}` : ""}
          </Title>
          <CloseButton $icon type="button" aria-label="Close game" onClick={onClose}>
            &times;
          </CloseButton>
        </Head>
        {event ? (
          <GameEventCardView event={event} stillRunning={live} hoverData={hoverData} avatars={avatars} flush />
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
      </Dialog>
    </ModalBackdrop>
  );
}
