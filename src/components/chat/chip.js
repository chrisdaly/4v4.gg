import styled, { css } from "styled-components";

/**
 * The one status chip for a player name: "in game 12m" while playing, then
 * "won +12" / "lost -9" for the two minutes recentWinners / recentDeltas
 * stay lit, then nothing. Used by the stream (ChatMessage via ChatPanel)
 * and the roster (UserListSidebar) so the state is computed in one place.
 */

const IN_GAME_MAX_MINUTES = 180;

const chipStyles = {
  ingame: css`
    color: var(--amber);
    background: var(--amber-tint);
    border-color: rgba(245, 158, 11, 0.3);
  `,
  won: css`
    color: var(--green);
    background: var(--green-tint);
    border-color: var(--green-border);
  `,
  lost: css`
    color: var(--red);
    background: var(--red-tint);
    border-color: var(--red-border);
  `,
};

export const Chip = styled.span.attrs((p) => ({ "data-chip": p.$kind }))`
  align-self: center;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  line-height: 1.2;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 1px var(--space-1);
  white-space: nowrap;
  ${(p) => chipStyles[p.$kind] || chipStyles.ingame}
  ${(p) =>
    p.$clickable &&
    css`
      cursor: pointer;
      transition: filter var(--transition);
      &:hover {
        filter: brightness(1.25);
      }
    `}
`;

/** "12m" for a game that started 12 minutes ago; null when unknown or stale. */
export function formatGameMinutes(startTime, now = Date.now()) {
  if (!startTime) return null;
  const started = new Date(startTime).getTime();
  if (Number.isNaN(started)) return null;
  const mins = Math.floor((now - started) / 60000);
  return mins >= 0 && mins < IN_GAME_MAX_MINUTES ? `${mins}m` : null;
}

/**
 * chipForTag(tag, { inGameTags, recentDeltas, recentWinners, startTimes })
 *   -> { kind: "ingame" | "won" | "lost", label } | null
 *
 * `startTimes` maps battleTag to a start time, or to an ongoing-index entry
 * ({ startTime, mapName, matchId }) so useChatFeed's inGameInfoMap can be
 * passed straight through.
 */
export function chipForTag(tag, { inGameTags, recentDeltas, recentWinners, startTimes } = {}, now = Date.now()) {
  if (!tag) return null;
  if (inGameTags?.has(tag)) {
    const entry = startTimes?.get(tag);
    const startTime = entry && typeof entry === "object" ? entry.startTime : entry;
    const mins = formatGameMinutes(startTime, now);
    return { kind: "ingame", label: mins ? `in game ${mins}` : "in game" };
  }
  const delta = recentDeltas?.get(tag);
  if (delta != null) {
    return delta >= 0 ? { kind: "won", label: `won +${delta}` } : { kind: "lost", label: `lost ${delta}` };
  }
  if (recentWinners?.has(tag)) return { kind: "won", label: "won" };
  return null;
}
