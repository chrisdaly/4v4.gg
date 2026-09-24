import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { FaTwitch } from "react-icons/fa";
import { raceMapping, raceIcons } from "../lib/constants";
import { Button, CountryFlag, Skeleton } from "./ui";
import PlayerHoverCard from "./PlayerHoverCard";
import useIdleTags from "../lib/chat/useIdleTags";
import { formatGameMinutes } from "./chat/chip";
import { countryNameOf, countryOf, regionOf } from "../lib/chat/regions";
import { Panel, PanelHeader, CountPill, Hint, scrollStyles } from "./chat/panel";

/**
 * The channel roster on /chat (Chat v2): everyone online, MMR-sorted and
 * grouped into brackets under an MMR histogram. `region` (a regionOf name)
 * or `country` (an ISO code, from the fullscreen map) narrows the rows, the
 * histogram and the header counts to that scope (the page keeps one of the
 * two set at a time); `filter` narrows rows by name (no input of its own
 * any more). An in-game
 * row shows a red dot, opens the game on click (onOpenGame with the
 * inGameInfoMap entry) and links its name to the player page
 * (inGameMatchMap). The last-game delta comes from recentDeltas. Idle rows
 * (joined over 3h ago, not in a game) are dimmed. The watch star shows on
 * hover and stays lit while watched.
 */

const AVATAR = 28; // px
const HIST_HEIGHT = 36; // px, tallest histogram bar
const HIST_MIN = 1200;
const HIST_BIN = 100;
const HIST_BINS = 12; // 1200..2300+
const BRACKETS = [
  { min: 2000, label: "2000+" },
  { min: 1800, label: "1800 - 1999" },
  { min: 1600, label: "1600 - 1799" },
  { min: 1400, label: "1400 - 1599" },
  { min: -Infinity, label: "Under 1400" },
];
const UNRATED = "Unrated";

/* ── Frame ─────────────────────────────────────────────────────────── */

const Sidebar = styled(Panel).attrs({ as: "aside" })`
  grid-area: roster;
  height: 100%;

  @media (max-width: 768px) {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100dvh;
    border-radius: 0;
    background: rgba(10, 8, 6, 0.96);
    z-index: var(--z-modal);
    transform: ${(p) => (p.$mobileVisible ? "translateY(0)" : "translateY(100%)")};
    transition: transform 0.25s ease;
  }
`;

const Header = styled(PanelHeader)`
  gap: var(--space-2);
`;

const Title = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
`;

const InGame = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  white-space: nowrap;
`;

const RedDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--red);
  flex-shrink: 0;
`;

const Scope = styled(Hint)`
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  img {
    width: 13px;
    height: 9px;
    border-radius: 1px;
    display: block;
  }
`;

const ColumnHint = styled.span`
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  opacity: 0.6;
  white-space: nowrap;
  ${Scope} + & {
    margin-left: 0;
  }
`;

const CloseButton = styled(Button)`
  display: none;
  @media (max-width: 768px) {
    display: inline-flex;
  }
`;

/* ── Histogram ─────────────────────────────────────────────────────── */

const Histogram = styled.div`
  padding: 10px 14px 8px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`;

const Bars = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: ${HIST_HEIGHT}px;
`;

const Bar = styled.div`
  flex: 1;
  height: ${(p) => p.$pct}%;
  min-height: 1px;
  background: rgba(252, 219, 51, 0.7);
  border-radius: 1px 1px 0 0;
`;

const Axis = styled.div`
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.6;
  margin-top: -4px;
`;

/* ── List, brackets and rows ───────────────────────────────────────── */

const List = styled.div`
  ${scrollStyles}
  flex: 1;
  min-height: 0;
  padding: 0 8px 10px;
`;

const BracketHeader = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 10px 6px 4px;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--grey-light);
  opacity: 0.7;
`;

const rowStyles = css`
  display: grid;
  grid-template-columns: ${AVATAR}px minmax(0, 1fr) 6px 24px 34px;
  align-items: center;
  gap: 9px;
  padding: 4px 6px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: inherit;
  opacity: ${(p) => (p.$dim === "idle" ? 0.6 : 1)};
  transition: background var(--transition);
  &:hover {
    background: var(--gold-tint-subtle);
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
`;

const AvatarImg = styled.img`
  width: ${AVATAR}px;
  height: ${AVATAR}px;
  border-radius: 3px;
  display: block;
  object-fit: cover;
  background: var(--surface-2);
`;

const AvatarRaceIcon = styled(AvatarImg)`
  box-sizing: border-box;
  padding: var(--space-1);
  opacity: ${(p) => (p.$faded ? 0.3 : 0.85)};
`;

const AvatarFlag = styled.span`
  position: absolute;
  bottom: -2px;
  right: -3px;
  line-height: 0;
  img {
    width: 13px;
    height: 9px;
    border-radius: 1px;
    box-shadow: 0 0 0 1px #0a0806;
    display: block;
  }
`;

const NameCell = styled.span`
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
`;

const nameStyles = css`
  flex: 1;
  min-width: 0;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: ${(p) => (p.$dim === "idle" ? "rgba(var(--gold-muted-rgb), 0.8)" : "var(--gold)")};
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

const GameDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: ${(p) => (p.$on ? "var(--red)" : "transparent")};
`;

const Delta = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-align: right;
  color: ${(p) => (p.$sign > 0 ? "var(--green)" : "var(--red)")};
`;

const Mmr = styled.span`
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--white);
  text-align: right;
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
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  padding: var(--space-3) var(--space-2);
`;

const SkeletonRow = styled.div`
  ${rowStyles}
`;

/* ── Helpers ───────────────────────────────────────────────────────── */

/** 28px avatar (profile picture or race icon) with the country flag; the map modal's rail reuses it. */
export function Avatar({ tag, avatars, stats }) {
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
          <CountryFlag name={profile.country.toLowerCase()} />
        </AvatarFlag>
      )}
    </AvatarWrap>
  );
}

const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });

/** 12 histogram bins (1200..2300+, 100 each) over users with a known MMR. */
export function histogramBins(users, stats) {
  const bins = new Array(HIST_BINS).fill(0);
  for (const u of users) {
    const mmr = stats?.get(u.battleTag)?.mmr;
    if (mmr == null) continue;
    const i = Math.max(0, Math.min(HIST_BINS - 1, Math.floor((mmr - HIST_MIN) / HIST_BIN)));
    bins[i]++;
  }
  return bins;
}

const binTitle = (i, n) => {
  const lo = HIST_MIN + i * HIST_BIN;
  return `${i === HIST_BINS - 1 ? `${lo}+` : `${lo} - ${lo + HIST_BIN - 1}`}: ${n}`;
};

/** Bracket groups in display order; unrated players (no MMR) trail in their own group. */
export function bracketGroups(sortedUsers, stats) {
  const groups = BRACKETS.map((b, i) => ({ label: b.label, users: [], min: b.min, max: i === 0 ? Infinity : BRACKETS[i - 1].min }));
  const unrated = { label: UNRATED, users: [] };
  for (const u of sortedUsers) {
    const mmr = stats?.get(u.battleTag)?.mmr;
    if (mmr == null) {
      unrated.users.push(u);
      continue;
    }
    const g = groups.find((b) => mmr >= b.min && mmr < b.max);
    if (g) g.users.push(u);
  }
  return [...groups, unrated].filter((g) => g.users.length);
}

const formatDelta = (d) => `${d > 0 ? "+" : "-"}${Math.abs(Math.round(d))}`;

function UserRow({ user, avatars, stats, sessions, inGameInfo, playerUrl, liveInfo, delta, isWatched, onToggleWatch, onOpenGame, dim }) {
  const tag = user.battleTag;
  const mmr = stats?.get(tag)?.mmr;
  const gameTitle = inGameInfo
    ? ["in game", inGameInfo.mapName, formatGameMinutes(inGameInfo.startTime)].filter(Boolean).join(" · ")
    : null;
  const openGame = inGameInfo && onOpenGame ? () => onOpenGame(inGameInfo) : null;

  const content = (
    <>
      <Avatar tag={tag} avatars={avatars} stats={stats} />
      <NameCell>
        <PlayerHoverCard
          battleTag={tag}
          avatars={avatars}
          stats={stats}
          sessions={sessions}
          inGameInfo={inGameInfo}
          style={{ flex: 1, minWidth: 0, display: "flex" }}
        >
          {playerUrl ? (
            <NameLink to={playerUrl} $dim={dim} onClick={(e) => e.stopPropagation()}>
              {user.name}
            </NameLink>
          ) : (
            <Name $dim={dim}>{user.name}</Name>
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
        {onToggleWatch && (
          <Star
            type="button"
            $watched={isWatched}
            aria-label={isWatched ? "Unwatch player" : "Watch player"}
            title={isWatched ? "Unwatch player" : "Watch player (notify while away)"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWatch(tag);
            }}
          >
            {isWatched ? "★" : "☆"}
          </Star>
        )}
      </NameCell>
      <GameDot data-in-game={inGameInfo ? "true" : undefined} title={gameTitle || undefined} $on={Boolean(inGameInfo)} />
      <Delta data-delta={delta != null ? formatDelta(delta) : undefined} title={delta != null ? "Last game" : undefined} $sign={delta}>
        {delta != null ? formatDelta(delta) : ""}
      </Delta>
      <Mmr>{mmr != null ? Math.round(mmr) : ""}</Mmr>
    </>
  );

  const shared = { "data-row": tag, "data-dim": dim, $dim: dim };
  return openGame ? (
    <Row
      {...shared}
      $clickable
      role="button"
      tabIndex={0}
      aria-label={`${user.name}: ${gameTitle}`}
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
  recentDeltas,
  liveStreamers,
  watchList,
  onToggleWatch,
  onOpenGame,
  $mobileVisible,
  onClose,
  region = null,
  country = null,
  filter = "",
}) {
  // Owns the once-a-minute idle tick so only the roster re-renders for it
  const idleTags = useIdleTags(users, inGameTags);

  const visible = useMemo(() => {
    const q = (filter || "").trim().toLowerCase();
    const mmrOf = (u) => stats?.get(u.battleTag)?.mmr ?? -Infinity;
    return users
      .filter((u) => !country || countryOf(u, avatars) === country)
      .filter((u) => !region || regionOf(countryOf(u, avatars)) === region)
      .filter((u) => !q || (u.name || "").toLowerCase().includes(q))
      .sort((a, b) => {
        const aMmr = mmrOf(a);
        const bMmr = mmrOf(b);
        if (aMmr !== bMmr) return bMmr - aMmr;
        return byName(a, b);
      });
  }, [users, stats, avatars, region, country, filter]);

  const bins = useMemo(() => histogramBins(visible, stats), [visible, stats]);
  const binMax = Math.max(1, ...bins);
  const groups = useMemo(() => bracketGroups(visible, stats), [visible, stats]);
  const inGameCount = visible.filter((u) => inGameTags?.has(u.battleTag)).length;
  const isWatched = (u) => Boolean(watchList?.has(u.battleTag?.toLowerCase()));

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
        delta={recentDeltas?.get(tag) ?? null}
        isWatched={isWatched(user)}
        onToggleWatch={onToggleWatch}
        onOpenGame={onOpenGame}
        dim={idleTags?.has(tag) ? "idle" : undefined}
      />
    );
  };

  const nothingMatches = users.length > 0 && visible.length === 0;

  return (
    <Sidebar $mobileVisible={$mobileVisible} aria-label="Channel roster" data-roster>
      <Header>
        <Title>Online</Title>
        <CountPill data-online-count>{visible.length}</CountPill>
        <InGame data-in-game-count>
          <RedDot />
          {inGameCount} in game
        </InGame>
        {country ? (
          <Scope data-roster-scope title={countryNameOf(country)}>
            <CountryFlag name={country.toLowerCase()} />
            {country}
          </Scope>
        ) : (
          region && <Scope data-roster-scope title={region}>{region}</Scope>
        )}
        <ColumnHint title="MMR change from last game">LAST · MMR</ColumnHint>
        <CloseButton $icon type="button" aria-label="Close roster" onClick={onClose}>
          &times;
        </CloseButton>
      </Header>
      <Histogram data-histogram>
        <Bars>
          {bins.map((n, i) => (
            <Bar key={i} data-bin={n} title={binTitle(i, n)} $pct={Math.round((n / binMax) * 100)} />
          ))}
        </Bars>
        <Axis>
          <span>&lt;1300</span>
          <span>1600</span>
          <span>1900</span>
          <span>2200+</span>
        </Axis>
      </Histogram>
      <List>
        {users.length === 0 &&
          [...Array(8)].map((_, i) => (
            <SkeletonRow key={`skel-${i}`}>
              <Skeleton $w={`${AVATAR}px`} $h={`${AVATAR}px`} />
              <Skeleton $w={`${55 + ((i * 17) % 30)}%`} $h="12px" />
              <span />
              <span />
              <Skeleton $w="28px" $h="10px" style={{ marginLeft: "auto" }} />
            </SkeletonRow>
          ))}
        {nothingMatches && (
          <Empty>{country || region ? `Nobody online in ${country ? countryNameOf(country) : region}` : "No players match"}</Empty>
        )}
        {groups.map((g) => (
          <React.Fragment key={g.label}>
            <BracketHeader data-bracket={g.label}>
              <span>{g.label}</span>
              <span>{g.users.length}</span>
            </BracketHeader>
            {g.users.map(rowFor)}
          </React.Fragment>
        ))}
      </List>
    </Sidebar>
  );
}
