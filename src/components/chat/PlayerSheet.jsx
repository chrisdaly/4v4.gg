import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import FormDots from "../FormDots";
import { Avatar } from "../UserListSidebar";
import { formatGameMinutes } from "./chip";

/**
 * The mobile player card on /chat: a bottom sheet over a scrim, opened from
 * a name in the stream or a roster row. 56px avatar with flag, name, MMR,
 * the in-game status, the last ten games as form dots, and two buttons:
 * Watch game (in-game players, hands the ongoing-index entry to
 * onWatchGame) and View profile (/player).
 *
 * Props
 *   battleTag      the player
 *   onlineUsers    the roster, for the display name
 *   avatars, stats, sessions, inGameTags, inGameInfoMap  useChatFeed data
 *   onWatchGame    (info) => void
 *   onClose        () => void; the scrim, Esc
 */

const FORM_GAMES = 10;

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.55);
`;

const Sheet = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: calc(var(--z-modal) + 1);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 18px calc(26px + env(safe-area-inset-bottom, 0px));
  background: #0d0b09;
  border-top: 1px solid rgba(252, 219, 51, 0.35);
  border-radius: 14px 14px 0 0;
  animation: chatSheetUp 0.25s ease;
  @keyframes chatSheetUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
`;

const Handle = styled.div`
  align-self: center;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`;

const Identity = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

const Name = styled.span`
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Mmr = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--white);
  small {
    font-size: var(--text-xxxs);
    color: var(--grey-light);
  }
`;

const InGame = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--red);
  white-space: nowrap;
  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: var(--radius-full);
    background: var(--red);
    animation: pulse 1.5s infinite;
  }
`;

const FormBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FormLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--grey-light);
  opacity: 0.7;
`;

const Buttons = styled.div`
  display: grid;
  grid-template-columns: ${(p) => (p.$two ? "1fr 1fr" : "1fr")};
  gap: 10px;
`;

const WatchButton = styled.button`
  height: 44px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--gold);
  background: none;
  border: 1px solid rgba(252, 219, 51, 0.5);
  border-radius: var(--radius-md);
  cursor: pointer;
`;

const ProfileLink = styled(Link)`
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #0a0806;
  background: var(--gold);
  border-radius: var(--radius-md);
  text-decoration: none;
`;

export default function PlayerSheet({ battleTag, onlineUsers = [], avatars, stats, sessions, inGameTags, inGameInfoMap, onWatchGame, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  if (!battleTag) return null;
  const user = onlineUsers.find((u) => u.battleTag === battleTag);
  const name = user?.name || battleTag.split("#")[0];
  const mmr = stats?.get(battleTag)?.mmr;
  const info = inGameTags?.has(battleTag) ? inGameInfoMap?.get(battleTag) || {} : null;
  const minutes = info ? formatGameMinutes(info.startTime) : null;
  const form = sessions?.get(battleTag);
  const canWatch = Boolean(info && onWatchGame);

  return (
    <>
      <Scrim onClick={onClose} data-player-sheet-scrim />
      <Sheet role="dialog" aria-modal="true" aria-label={name} data-player-sheet={battleTag}>
        <Handle />
        <Top>
          <Avatar tag={battleTag} avatars={avatars} stats={stats} size={56} />
          <Identity>
            <Name>{name}</Name>
            {mmr != null && (
              <Mmr>
                {Math.round(mmr)} <small>MMR</small>
              </Mmr>
            )}
          </Identity>
          {info && <InGame data-sheet-in-game>{`in game${minutes ? ` ${minutes}` : ""}`}</InGame>}
        </Top>
        {form && form.length > 0 && (
          <FormBlock>
            <FormLabel>Last {Math.min(FORM_GAMES, form.length)} games</FormLabel>
            <FormDots form={form} size="medium" maxDots={FORM_GAMES} showSummary={false} />
          </FormBlock>
        )}
        <Buttons $two={canWatch}>
          {canWatch && (
            <WatchButton type="button" onClick={() => onWatchGame(info)}>
              Watch game
            </WatchButton>
          )}
          <ProfileLink to={`/player/${encodeURIComponent(battleTag)}`}>View profile</ProfileLink>
        </Buttons>
      </Sheet>
    </>
  );
}
