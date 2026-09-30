import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Panel, PanelHeader, PanelLabel, CountPill, Hint, scrollStyles } from "./panel";
import { buildShortTickerText } from "./GameRow";
import { formatTime } from "../../lib/useChatMessages";

/**
 * Game activity on /chat: what the channel is playing now, and what it just
 * finished.
 *
 * Both used to be tickers in the stream, a line of log for every game that
 * started or ended. On a quiet evening that left more tickers on screen
 * than sentences, and a collapsed run of them ("3 games") said nothing at
 * all. Here they are a list you glance at, the stream is only talk, and
 * clicking any row opens the game card the page already has.
 */

const TICK_MS = 30_000; // the "12m" clock
const MAX_FINISHED = 6;

const List = styled.div`
  ${scrollStyles}
  padding: var(--space-1) 0;
  min-height: 0;
`;

const GameRow = styled.button`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: baseline;
  gap: var(--space-2);
  width: 100%;
  padding: 7px 14px;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition);

  &:hover,
  &:focus-visible {
    background: var(--surface-1);
    outline: none;
  }
`;

const Minutes = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--red);
  white-space: nowrap;

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--red);
    animation: pulse 1.5s infinite;
  }
`;

const Ended = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.7;
  white-space: nowrap;

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--green);
  }
`;

const Names = styled.span`
  min-width: 0;
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  color: var(--white);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Result = styled.span`
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Extra = styled.span`
  font-family: var(--font-mono);
  color: var(--grey-light);
  opacity: 0.7;
`;

const Mmr = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  white-space: nowrap;
`;

const MapLine = styled.span`
  grid-column: 2 / -1;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SectionLabel = styled.div`
  padding: var(--space-2) 14px 2px;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  opacity: 0.6;
`;

const Quiet = styled.div`
  padding: var(--space-4) 14px;
`;

/** Whole minutes since `startTime`, floored at 0; null without a time. */
export function minutesIn(startTime, now = Date.now()) {
  if (!startTime) return null;
  const started = new Date(startTime).getTime();
  if (Number.isNaN(started)) return null;
  return Math.max(0, Math.floor((now - started) / 60_000));
}

export default function GamesPanel({ games = [], finished = [], onOpenGame, className }) {
  // The minutes column ages on its own; the games themselves arrive with
  // the ongoing-match poll
  const [, setTick] = useState(0);
  useEffect(() => {
    if (games.length === 0) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, [games.length]);

  // Newest finish first, a handful at most: this is "what just happened",
  // not a results archive (that is /finished)
  const recent = useMemo(
    () =>
      [...finished]
        .filter((ev) => ev?.type === "game_end")
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, MAX_FINISHED),
    [finished]
  );

  const empty = games.length === 0 && recent.length === 0;

  return (
    <Panel className={className} data-games-panel aria-label="Game activity">
      <PanelHeader>
        <PanelLabel>Games</PanelLabel>
        {games.length > 0 && <CountPill data-games-count>{games.length} live</CountPill>}
      </PanelHeader>
      {empty ? (
        <Quiet>
          <Hint>Nobody here is in a game.</Hint>
        </Quiet>
      ) : (
        <List>
          {games.map((game) => {
            const mins = minutesIn(game.startTime);
            return (
              <GameRow
                key={game.matchId}
                type="button"
                data-game={game.matchId}
                title={`Show this game${game.mapName ? ` on ${game.mapName}` : ""}`}
                onClick={() =>
                  onOpenGame?.({
                    matchId: game.matchId,
                    mapName: game.mapName,
                    startTime: game.startTime,
                  })
                }
              >
                <Minutes data-minutes>{mins == null ? "live" : `${mins}m`}</Minutes>
                <Names>
                  {game.names.join(", ")}
                  {game.extra > 0 && <Extra> +{game.extra}</Extra>}
                </Names>
                {game.avgMmr != null && <Mmr>{game.avgMmr}</Mmr>}
                {game.mapName && <MapLine>{game.mapName}</MapLine>}
              </GameRow>
            );
          })}
          {recent.length > 0 && <SectionLabel>Just finished</SectionLabel>}
          {recent.map((ev) => (
            <GameRow
              key={ev.id}
              type="button"
              data-finished={ev.matchId}
              title={`Show this game${ev.mapName ? ` on ${ev.mapName}` : ""}`}
              onClick={() => onOpenGame?.({ matchId: ev.matchId, mapName: ev.mapName })}
            >
              <Ended data-ended>{formatTime(ev.time)}</Ended>
              <Result>{buildShortTickerText(ev)}</Result>
            </GameRow>
          ))}
        </List>
      )}
    </Panel>
  );
}
