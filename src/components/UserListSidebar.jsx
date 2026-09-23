import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { FaTwitch } from "react-icons/fa";
import { GiCrossedSwords } from "react-icons/gi";
import { raceMapping, raceIcons } from "../lib/constants";
import { Button, CountryFlag, Input, Skeleton } from "./ui";
import PlayerHoverCard from "./PlayerHoverCard";
import useIdleTags from "../lib/chat/useIdleTags";
import { formatGameMinutes } from "./chat/chip";

/**
 * The channel roster: one flat list of everyone in the channel ordered by
 * MMR descending (unknown MMR last, then by name), plus a name filter.
 * Watched players sit in a small "Watching" block at the top. An in-game
 * row carries a crossed-swords glyph after the name (map and elapsed in its
 * tooltip) and opens the game (onOpenGame with the inGameInfoMap entry);
 * the name text still links to the player page (inGameMatchMap). Idle rows
 * (joined over 3h ago, not in a game) are dimmed.
 */

const ROW_HEIGHT = 28; // px, one roster row
const AVATAR = 24; // px, row avatar (radius-sm)

/* ── Frame ─────────────────────────────────────────────────────────── */

const Sidebar = styled.aside`
  width: 268px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 768px) {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100dvh;
    z-index: var(--z-modal);
    transform: ${(p) => (p.$mobileVisible ? "translateY(0)" : "translateY(100%)")};
    transition: transform 0.25s ease;
  }
`;

const Frame = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: ${(p) => p.$theme?.bg || "var(--panel-bg)"};
  backdrop-filter: ${(p) => p.$theme?.blur || "blur(1px)"};
  border: ${(p) => p.$theme?.border || "8px solid transparent"};
  border-image: ${(p) => p.$theme?.borderImage || 'url("/frames/chat/ChatFrameBorder.png") 30 / 8px stretch'};
  box-shadow: ${(p) => p.$theme?.shadow || "none"};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid rgba(var(--gold-muted-rgb), 0.2);
  flex-shrink: 0;
`;

const HeaderTitle = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 0.05em;
`;

const headerStat = css`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  white-space: nowrap;
`;

const HeaderCount = styled.span`
  ${headerStat}
`;

const HeaderLive = styled(Link)`
  ${headerStat}
  text-decoration: none;
  &:hover {
    color: var(--white);
  }
`;

const HeaderSpacer = styled.span`
  flex: 1;
`;

const CountValue = styled.span`
  color: var(--gold);
`;

const CloseButton = styled(Button)`
  display: none;
  @media (max-width: 768px) {
    display: inline-flex;
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  flex-shrink: 0;
`;

const FilterInput = styled(Input)`
  flex: 1;
  min-width: 0;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xxs);
`;

/* ── Labels ────────────────────────────────────────────────────────── */

const label = css`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`;

/* ── List and rows ─────────────────────────────────────────────────── */

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1) var(--space-2) var(--space-2);
  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--grey-mid);
    border-radius: var(--radius-sm);
  }
`;

const WatchingBlock = styled.div`
  display: flex;
  flex-direction: column;
  padding-bottom: var(--space-2);
  margin-bottom: var(--space-2);
  border-bottom: 1px solid rgba(var(--gold-muted-rgb), 0.2);
`;

const WatchingLabel = styled.div`
  ${label}
  padding: var(--space-1) var(--space-2);
`;

const rowStyles = css`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: ${ROW_HEIGHT}px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: inherit;
  opacity: ${(p) => (p.$dim === "idle" ? 0.4 : 1)};
  &:hover {
    background: var(--surface-2);
    opacity: 1;
  }
`;

const Row = styled.div`
  ${rowStyles}
  ${(p) => p.$clickable && "cursor: pointer;"}
`;

const AvatarWrap = styled.span`
  position: relative;
  width: ${AVATAR}px;
  height: ${AVATAR}px;
  flex-shrink: 0;
`;

const AvatarImg = styled.img`
  width: ${AVATAR}px;
  height: ${AVATAR}px;
  border-radius: var(--radius-sm);
  display: block;
  object-fit: cover;
`;

const AvatarRaceIcon = styled(AvatarImg)`
  box-sizing: border-box;
  padding: var(--space-1);
  background: var(--surface-2);
  opacity: ${(p) => (p.$faded ? 0.3 : 0.85)};
`;

const AvatarFlag = styled.span`
  position: absolute;
  bottom: -2px;
  right: -2px;
  line-height: 0;
`;

const nameStyles = css`
  flex: 1;
  min-width: 0;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Name = styled.span`
  ${nameStyles}
`;

const NameLink = styled(Link)`
  ${nameStyles}
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const Swords = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--grey-light);
  svg {
    width: 12px;
    height: 12px;
  }
`;

const Mmr = styled.span`
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  flex-shrink: 0;
`;

const TwitchLink = styled.a`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  svg {
    width: 12px;
    height: 12px;
    fill: var(--twitch-purple);
  }
  &:hover svg {
    opacity: 0.8;
  }
`;

const Star = styled.button`
  background: none;
  border: none;
  padding: 0;
  flex-shrink: 0;
  cursor: pointer;
  font-size: var(--text-xxs);
  line-height: 1;
  color: ${(p) => (p.$watched ? "var(--gold)" : "var(--grey-mid)")};
  opacity: ${(p) => (p.$watched ? 1 : 0)};
  transition: opacity var(--transition), color var(--transition);
  ${Row}:hover & {
    opacity: 1;
  }
  &:hover {
    color: var(--gold);
  }
`;

const Empty = styled.div`
  ${label}
  padding: var(--space-2);
`;

const SkeletonRow = styled.div`
  ${rowStyles}
`;

/* ── Helpers ───────────────────────────────────────────────────────── */

function Avatar({ tag, avatars, stats }) {
  const profile = avatars?.get(tag);
  const race = stats?.get(tag)?.race;
  const raceIcon = race != null ? raceMapping[race] : null;
  return (
    <AvatarWrap>
      {profile?.profilePicUrl ? (
        <AvatarImg src={profile.profilePicUrl} alt="" />
      ) : (
        <AvatarRaceIcon src={raceIcon || raceIcons.random} alt="" $faded={!raceIcon} />
      )}
      {profile?.country && (
        <AvatarFlag>
          <CountryFlag name={profile.country.toLowerCase()} style={{ width: 12, height: 9 }} />
        </AvatarFlag>
      )}
    </AvatarWrap>
  );
}

const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });

/** Number of distinct games in progress among the given users. */
function countLiveGames(users, inGameInfoMap) {
  const keys = new Set();
  for (const u of users) {
    const info = inGameInfoMap?.get(u.battleTag);
    if (info) keys.add(info.matchId || `${info.mapName}|${info.startTime}`);
  }
  return keys.size;
}

function UserRow({ user, avatars, stats, sessions, inGameInfo, playerUrl, liveInfo, isWatched, onToggleWatch, onOpenGame, dim }) {
  const tag = user.battleTag;
  const mmr = stats?.get(tag)?.mmr;
  const swordsTitle = inGameInfo
    ? ["in game", inGameInfo.mapName, formatGameMinutes(inGameInfo.startTime)].filter(Boolean).join(" · ")
    : null;
  const openGame = inGameInfo && onOpenGame ? () => onOpenGame(inGameInfo) : null;

  const content = (
    <>
      <Avatar tag={tag} avatars={avatars} stats={stats} />
      <PlayerHoverCard
        battleTag={tag}
        avatars={avatars}
        stats={stats}
        sessions={sessions}
        inGameInfo={inGameInfo}
        style={{ flex: 1, minWidth: 0 }}
      >
        {playerUrl ? (
          <NameLink to={playerUrl} onClick={(e) => e.stopPropagation()}>
            {user.name}
          </NameLink>
        ) : (
          <Name>{user.name}</Name>
        )}
      </PlayerHoverCard>
      {inGameInfo && (
        <Swords data-in-game title={swordsTitle} aria-label={swordsTitle}>
          <GiCrossedSwords />
        </Swords>
      )}
      {liveInfo && (
        <TwitchLink
          href={`https://twitch.tv/${liveInfo.twitchName}`}
          target="_blank"
          rel="noopener noreferrer"
          title={liveInfo.title || "Live on Twitch"}
          onClick={(e) => e.stopPropagation()}
        >
          <FaTwitch />
        </TwitchLink>
      )}
      {mmr != null && <Mmr>{Math.round(mmr)}</Mmr>}
      {onToggleWatch && (
        <Star
          type="button"
          $watched={isWatched}
          aria-label={isWatched ? "Unwatch player" : "Watch player"}
          title={isWatched ? "Unwatch player" : "Watch player (pin to top, notify while away)"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleWatch(tag);
          }}
        >
          {isWatched ? "★" : "☆"}
        </Star>
      )}
    </>
  );

  const shared = { "data-row": tag, "data-dim": dim, $dim: dim };
  return openGame ? (
    <Row
      {...shared}
      $clickable
      role="button"
      tabIndex={0}
      onClick={openGame}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openGame();
        }
      }}
    >
      {content}
    </Row>
  ) : (
    <Row {...shared}>{content}</Row>
  );
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function UserListSidebar({
  users,
  avatars,
  stats,
  sessions,
  inGameTags,
  inGameInfoMap,
  inGameMatchMap,
  liveStreamers,
  watchList,
  onToggleWatch,
  onOpenGame,
  $mobileVisible,
  onClose,
  borderTheme,
}) {
  const [search, setSearch] = useState("");
  // Owns the once-a-minute idle tick so only the roster re-renders for it
  const idleTags = useIdleTags(users, inGameTags);

  const sortedUsers = useMemo(() => {
    const mmrOf = (u) => stats?.get(u.battleTag)?.mmr ?? -Infinity;
    return [...users].sort((a, b) => {
      const aMmr = mmrOf(a);
      const bMmr = mmrOf(b);
      if (aMmr !== bMmr) return bMmr - aMmr;
      return byName(a, b);
    });
  }, [users, stats]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedUsers;
    return sortedUsers.filter((u) => (u.name || "").toLowerCase().includes(q));
  }, [sortedUsers, search]);

  const isWatched = (u) => Boolean(watchList?.has(u.battleTag?.toLowerCase()));
  const watching = filteredUsers.filter(isWatched);
  const rest = watching.length ? filteredUsers.filter((u) => !isWatched(u)) : filteredUsers;

  const liveGames = useMemo(() => countLiveGames(users, inGameInfoMap), [users, inGameInfoMap]);

  const rowFor = (user) => {
    const tag = user.battleTag;
    const inGame = Boolean(inGameTags?.has(tag));
    return (
      <UserRow
        key={tag}
        user={user}
        avatars={avatars}
        stats={stats}
        sessions={sessions}
        inGameInfo={inGame ? inGameInfoMap?.get(tag) : null}
        playerUrl={inGame ? inGameMatchMap?.get(tag) : null}
        liveInfo={liveStreamers?.get(tag)}
        isWatched={isWatched(user)}
        onToggleWatch={onToggleWatch}
        onOpenGame={onOpenGame}
        dim={idleTags?.has(tag) ? "idle" : undefined}
      />
    );
  };

  const nothingMatches = users.length > 0 && filteredUsers.length === 0;

  return (
    <Sidebar $mobileVisible={$mobileVisible} aria-label="Channel roster">
      <Frame $theme={borderTheme}>
        <Header>
          <HeaderTitle>Channel</HeaderTitle>
          <HeaderCount data-online-count>
            <CountValue>{users.length}</CountValue> online
          </HeaderCount>
          {liveGames > 0 && (
            <HeaderLive to="/live" data-live-count title="Live games">
              <CountValue>{liveGames}</CountValue> live
            </HeaderLive>
          )}
          <HeaderSpacer />
          <CloseButton $icon type="button" aria-label="Close roster" onClick={onClose}>
            &times;
          </CloseButton>
        </Header>
        <Toolbar>
          <FilterInput
            type="text"
            placeholder="Filter players"
            aria-label="Filter players"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Toolbar>
        <List>
          {users.length === 0 &&
            [...Array(8)].map((_, i) => (
              <SkeletonRow key={`skel-${i}`}>
                <Skeleton $w={`${AVATAR}px`} $h={`${AVATAR}px`} />
                <Skeleton $w={`${55 + ((i * 17) % 30)}%`} $h="12px" />
                <Skeleton $w="28px" $h="10px" style={{ marginLeft: "auto" }} />
              </SkeletonRow>
            ))}
          {nothingMatches && <Empty>No players match</Empty>}
          {watching.length > 0 && (
            <WatchingBlock data-watching>
              <WatchingLabel>Watching</WatchingLabel>
              {watching.map(rowFor)}
            </WatchingBlock>
          )}
          {rest.map(rowFor)}
        </List>
      </Frame>
    </Sidebar>
  );
}
