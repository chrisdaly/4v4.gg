import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { FaTwitch } from "react-icons/fa";
import { raceMapping, raceIcons } from "../lib/constants";
import { Button, CountryFlag, Dot, Input, Skeleton } from "./ui";
import PlayerHoverCard from "./PlayerHoverCard";
import useIdleTags from "../lib/chat/useIdleTags";
import { Chip, chipForTag, formatGameMinutes } from "./chat/chip";

/**
 * The channel roster. Three collapsible sections (In game, Online, Away),
 * a "Live now" strip of the games channel members are playing, a name
 * filter and a Player/MMR sort. Every row carries the same status chip as
 * the stream (chat/chip.js), so "in game 12m" / "won +12" / "lost -9" are
 * computed in one place.
 */

const ROW_HEIGHT = 28; // px, one roster row
const AVATAR = 24; // px, row avatar (radius-sm)
const LIVE_STRIP_MAX_ROWS = 3;

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

/* ── Live now strip ────────────────────────────────────────────────── */

const label = css`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`;

const LiveStrip = styled.div`
  padding: var(--space-1) var(--space-2) var(--space-2);
  margin: 0 var(--space-2);
  border-bottom: 1px solid rgba(var(--gold-muted-rgb), 0.15);
  flex-shrink: 0;
`;

const LiveHeader = styled.button`
  ${label}
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-1) 0;
  background: none;
  border: none;
  cursor: ${(p) => (p.$toggle ? "pointer" : "default")};
  text-align: left;
  &:hover {
    color: ${(p) => (p.$toggle ? "var(--white)" : "var(--grey-light)")};
  }
`;

const LiveCount = styled.span`
  color: var(--gold);
`;

const LiveRow = styled(Link)`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: ${ROW_HEIGHT - 4}px;
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: inherit;
  &:hover {
    background: var(--surface-2);
  }
`;

const LiveMap = styled.span`
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--white);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LiveMeta = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  white-space: nowrap;
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
`;

const RowLink = styled(Link)`
  ${rowStyles}
  cursor: pointer;
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

const Name = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
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
  ${Row}:hover &,
  ${RowLink}:hover & {
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
 * Games in progress from the channel's point of view: one entry per match
 * with at least one channel member in it, most channel members first.
 */
export function liveGamesFrom(users, inGameTags, inGameInfoMap, inGameMatchMap) {
  const games = new Map();
  for (const u of users) {
    const tag = u.battleTag;
    if (!inGameTags?.has(tag)) continue;
    const info = inGameInfoMap?.get(tag);
    if (!info) continue;
    const key = info.matchId || `${info.mapName}|${info.startTime}`;
    let game = games.get(key);
    if (!game) {
      game = { key, mapName: info.mapName, startTime: info.startTime, players: [], url: inGameMatchMap?.get(tag) };
      games.set(key, game);
    }
    game.players.push(u.name || tag.split("#")[0]);
  }
  return [...games.values()].sort(
    (a, b) => b.players.length - a.players.length || new Date(b.startTime) - new Date(a.startTime)
  );
}

function UserRow({ user, avatars, stats, sessions, inGameInfo, matchUrl, chip, liveInfo, isWatched, onToggleWatch, dim }) {
  const tag = user.battleTag;
  const mmr = stats?.get(tag)?.mmr;
  const elapsed = inGameInfo ? formatGameMinutes(inGameInfo.startTime) : null;
  const title = inGameInfo
    ? [inGameInfo.mapName, elapsed].filter(Boolean).join(" · ")
    : undefined;

  const content = (
    <>
      <Avatar tag={tag} avatars={avatars} stats={stats} />
      <PlayerHoverCard
        battleTag={tag}
        avatars={avatars}
        stats={stats}
        sessions={sessions}
        inGameInfo={inGameInfo}
        style={{ minWidth: 0 }}
      >
        <Name>{user.name}</Name>
      </PlayerHoverCard>
      {chip && <Chip $kind={chip.kind}>{chip.label}</Chip>}
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
          title={isWatched ? "Unwatch player" : "Watch player (pin to top, enable pings)"}
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
  return matchUrl ? (
    <RowLink to={matchUrl} {...shared}>{content}</RowLink>
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

function LiveNow({ games }) {
  const [openOverride, setOpenOverride] = useState(null);
  if (games.length === 0) return null;
  const many = games.length > LIVE_STRIP_MAX_ROWS;
  const open = openOverride ?? !many;
  const players = games.reduce((n, g) => n + g.players.length, 0);
  return (
    <LiveStrip data-live-strip data-live-count={games.length}>
      <LiveHeader
        type="button"
        $toggle={many}
        aria-expanded={open}
        onClick={() => many && setOpenOverride((v) => !(v ?? !many))}
        title={many ? (open ? "Collapse" : "Show games") : undefined}
      >
        <Dot $size={6} $recent />
        Live now <LiveCount>{games.length}</LiveCount>
        {many && !open && <LiveMeta>{players} from channel</LiveMeta>}
      </LiveHeader>
      {open && games.map((g) => {
        const elapsed = formatGameMinutes(g.startTime);
        const row = (
          <>
            <LiveMap>{g.mapName || "Unknown map"}</LiveMap>
            <LiveMeta>
              {g.players.length} from channel{elapsed ? ` · ${elapsed}` : ""}
            </LiveMeta>
          </>
        );
        return g.url ? (
          <LiveRow key={g.key} to={g.url} title={g.players.join(", ")} data-live-row>
            {row}
          </LiveRow>
        ) : (
          <LiveRow as="div" key={g.key} title={g.players.join(", ")} data-live-row>
            {row}
          </LiveRow>
        );
      })}
    </LiveStrip>
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
  recentWinners,
  recentDeltas,
  liveStreamers,
  watchList,
  onToggleWatch,
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

  const liveGames = useMemo(
    () => liveGamesFrom(users, inGameTags, inGameInfoMap, inGameMatchMap),
    [users, inGameTags, inGameInfoMap, inGameMatchMap]
  );

  const chipCtx = { inGameTags, recentDeltas, recentWinners, startTimes: inGameInfoMap };
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
        matchUrl={inGame ? inGameMatchMap?.get(tag) : null}
        chip={chipForTag(tag, chipCtx)}
        liveInfo={liveStreamers?.get(tag)}
        isWatched={Boolean(watchList?.has(tag?.toLowerCase()))}
        onToggleWatch={onToggleWatch}
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
        <LiveNow games={liveGames} />
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
            {sections.ingame.map((u) => rowFor("ingame", u))}
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
