import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { FaTwitch } from "react-icons/fa";
import { raceMapping, raceIcons } from "../lib/constants";
import { Button, CountryFlag, Input, Skeleton } from "./ui";
import PlayerHoverCard from "./PlayerHoverCard";
import useIdleTags from "../lib/chat/useIdleTags";
import { formatGameMinutes } from "./chat/chip";

/**
 * The channel roster. Three collapsible sections (In game, Online, Away),
 * a name filter and a Player/MMR sort. Rows are name + MMR only, no status
 * chip: the In game section is sub-grouped by match, each match introduced
 * by one divider line ("Ferocity · 12m · 3"), so the state is carried by
 * the grouping rather than repeated on every row. An in-game row and its
 * divider open the game (onOpenGame with the inGameInfoMap entry); the name
 * text on an in-game row still links to the player page (inGameMatchMap).
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

const HeaderCount = styled.span`
  flex: 1;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
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

const SortButton = styled(Button)`
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xxxs);
`;

/* ── Labels ────────────────────────────────────────────────────────── */

const label = css`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`;

/* ── Sections and rows ─────────────────────────────────────────────── */

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1) var(--space-2) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

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

const Section = styled.section`
  display: flex;
  flex-direction: column;
`;

const SectionHeader = styled.button`
  ${label}
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-1) var(--space-2);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  user-select: none;
  &:hover {
    color: var(--white);
  }
`;

const SectionCount = styled.span`
  color: var(--gold);
`;

const Chevron = styled.span`
  display: inline-block;
  font-size: var(--text-xxxs);
  transform: ${(p) => (p.$open ? "rotate(90deg) scale(0.7)" : "scale(0.7)")};
  transition: transform 0.2s;
`;

const GameGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const GameDivider = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: var(--space-1) var(--space-2) 0;
  ${(p) =>
    p.$clickable &&
    css`
      cursor: pointer;
      transition: color var(--transition);
      &:hover {
        color: var(--white);
      }
    `}
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
  opacity: ${(p) => (p.$dim === "idle" ? 0.4 : p.$dim === "quiet" ? 0.55 : 1)};
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

/**
 * In-game users sub-grouped by match, most channel players first, then the
 * newest game. Row order inside a game follows the incoming (already sorted)
 * order. Users whose match is unknown come back separately.
 */
function groupByMatch(users, inGameInfoMap) {
  const games = new Map();
  const unknown = [];
  for (const u of users) {
    const info = inGameInfoMap?.get(u.battleTag);
    if (!info) {
      unknown.push(u);
      continue;
    }
    const key = info.matchId || `${info.mapName}|${info.startTime}`;
    let game = games.get(key);
    if (!game) {
      game = { key, matchId: info.matchId, mapName: info.mapName, startTime: info.startTime, players: [] };
      games.set(key, game);
    }
    game.players.push(u);
  }
  const sorted = [...games.values()].sort(
    (a, b) => b.players.length - a.players.length || new Date(b.startTime) - new Date(a.startTime)
  );
  return { games: sorted, unknown };
}

function gameDividerText(game) {
  const elapsed = formatGameMinutes(game.startTime);
  return [game.mapName || "Unknown map", elapsed, game.players.length].filter(Boolean).join(" · ");
}

function UserRow({ user, avatars, stats, sessions, inGameInfo, playerUrl, liveInfo, isWatched, onToggleWatch, onOpenGame, dim }) {
  const tag = user.battleTag;
  const mmr = stats?.get(tag)?.mmr;
  const elapsed = inGameInfo ? formatGameMinutes(inGameInfo.startTime) : null;
  const title = inGameInfo
    ? [inGameInfo.mapName, elapsed].filter(Boolean).join(" · ")
    : undefined;
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

  const shared = { "data-row": tag, "data-dim": dim, title, $dim: dim };
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

function RosterSection({ id, title, count, open, onToggle, children }) {
  if (count === 0) return null;
  return (
    <Section data-section={id}>
      <SectionHeader type="button" onClick={onToggle} aria-expanded={open}>
        <Chevron $open={open}>&#9654;</Chevron>
        {title} <SectionCount>{count}</SectionCount>
      </SectionHeader>
      {open && children}
    </Section>
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
  recentChatters,
  $mobileVisible,
  onClose,
  borderTheme,
}) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("mmr");
  const [open, setOpen] = useState({ ingame: true, online: true, away: true });
  // Owns the once-a-minute idle tick so only the roster re-renders for it
  const idleTags = useIdleTags(users, inGameTags);

  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const sortedUsers = useMemo(() => {
    const isWatched = (u) => (watchList?.has(u.battleTag?.toLowerCase()) ? 1 : 0);
    return [...users].sort((a, b) => {
      // Watched players always sort to the top of their section
      const w = isWatched(b) - isWatched(a);
      if (w !== 0) return w;
      if (sortField === "name") {
        const cmp = byName(a, b);
        if (cmp !== 0) return cmp;
      }
      const aMmr = stats?.get(a.battleTag)?.mmr ?? -1;
      const bMmr = stats?.get(b.battleTag)?.mmr ?? -1;
      if (aMmr !== bMmr) return bMmr - aMmr;
      return byName(a, b);
    });
  }, [users, stats, sortField, watchList]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedUsers;
    return sortedUsers.filter((u) => (u.name || "").toLowerCase().includes(q));
  }, [sortedUsers, search]);

  const sections = useMemo(() => {
    const ingame = [];
    const online = [];
    const away = [];
    for (const u of filteredUsers) {
      if (inGameTags?.has(u.battleTag)) ingame.push(u);
      else if (idleTags?.has(u.battleTag)) away.push(u);
      else online.push(u);
    }
    return { ingame, online, away };
  }, [filteredUsers, inGameTags, idleTags]);

  const inGameGroups = useMemo(() => groupByMatch(sections.ingame, inGameInfoMap), [sections.ingame, inGameInfoMap]);

  const quietMode = Boolean(recentChatters && recentChatters.size > 0);

  const rowFor = (section, user) => {
    const tag = user.battleTag;
    const inGame = section === "ingame";
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
        isWatched={Boolean(watchList?.has(tag?.toLowerCase()))}
        onToggleWatch={onToggleWatch}
        onOpenGame={onOpenGame}
        dim={
          section === "away"
            ? "idle"
            : section === "online" && quietMode && !recentChatters.has(tag)
              ? "quiet"
              : undefined
        }
      />
    );
  };

  const nothingMatches = users.length > 0 && filteredUsers.length === 0;

  return (
    <Sidebar $mobileVisible={$mobileVisible} aria-label="Channel roster">
      <Frame $theme={borderTheme}>
        <Header>
          <HeaderTitle>Channel</HeaderTitle>
          <HeaderCount data-online-count>{users.length} online</HeaderCount>
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
          <SortButton $pill type="button" data-active={sortField === "name"} onClick={() => setSortField("name")}>
            Player
          </SortButton>
          <SortButton $pill type="button" data-active={sortField === "mmr"} onClick={() => setSortField("mmr")}>
            MMR
          </SortButton>
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
          <RosterSection id="ingame" title="In game" count={sections.ingame.length} open={open.ingame} onToggle={() => toggle("ingame")}>
            {inGameGroups.games.map((g) => {
              const openGame = onOpenGame
                ? () => onOpenGame({ matchId: g.matchId, mapName: g.mapName, startTime: g.startTime })
                : null;
              return (
                <GameGroup key={g.key} data-game={g.key}>
                  <GameDivider
                    data-game-divider
                    title={gameDividerText(g)}
                    $clickable={Boolean(openGame)}
                    role={openGame ? "button" : undefined}
                    tabIndex={openGame ? 0 : undefined}
                    onClick={openGame || undefined}
                    onKeyDown={
                      openGame
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openGame();
                            }
                          }
                        : undefined
                    }
                  >
                    {gameDividerText(g)}
                  </GameDivider>
                  {g.players.map((u) => rowFor("ingame", u))}
                </GameGroup>
              );
            })}
            {inGameGroups.unknown.length > 0 && (
              <GameGroup data-game="unknown">{inGameGroups.unknown.map((u) => rowFor("ingame", u))}</GameGroup>
            )}
          </RosterSection>
          <RosterSection id="online" title="Online" count={sections.online.length} open={open.online} onToggle={() => toggle("online")}>
            {sections.online.map((u) => rowFor("online", u))}
          </RosterSection>
          <RosterSection id="away" title="Away" count={sections.away.length} open={open.away} onToggle={() => toggle("away")}>
            {sections.away.map((u) => rowFor("away", u))}
          </RosterSection>
        </List>
      </Frame>
    </Sidebar>
  );
}
