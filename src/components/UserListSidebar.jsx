import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { GiCrossedSwords } from "react-icons/gi";
import crownIcon from "../assets/icons/king.svg";
import { raceMapping, raceIcons } from "../lib/constants";
import { CountryFlag, Skeleton, SkeletonCircle } from "./ui";

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
    z-index: 10001;
    transform: ${(p) => (p.$mobileVisible ? "translateY(0)" : "translateY(100%)")};
    transition: transform 0.25s ease;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`;

const SidebarContent = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: ${(p) => p.$theme?.bg || "rgba(10, 8, 6, 0.25)"};
  backdrop-filter: ${(p) => p.$theme?.blur || "blur(1px)"};
  border: ${(p) => p.$theme?.border || "8px solid transparent"};
  border-image: ${(p) => p.$theme?.borderImage || 'url("/frames/chat/ChatFrameBorder.png") 30 / 8px stretch'};
  box-shadow: ${(p) => p.$theme?.shadow || "none"};
`;

const HeaderTitle = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`;

const HeaderCount = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const CloseButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: var(--grey-light);
  font-size: var(--text-lg);
  line-height: 1;
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: var(--white);
  }

  @media (max-width: 768px) {
    display: block;
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  margin: 12px var(--space-4);

  &::before {
    content: "⌕";
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--grey-light);
    font-size: var(--text-sm);
    pointer-events: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 32px 10px 30px;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  letter-spacing: 0.3px;
  color: var(--white);
  background: linear-gradient(180deg, rgba(25, 20, 15, 0.9) 0%, rgba(12, 10, 8, 0.95) 100%);
  border: 1px solid rgba(160, 130, 80, 0.25);
  border-radius: var(--radius-md);
  outline: none;
  box-sizing: border-box;
  transition: all 0.2s ease;

  &::placeholder {
    color: var(--grey-light);
    font-size: var(--text-xxs);
  }

  &:focus {
    border-color: var(--gold);
    box-shadow: 0 0 8px rgba(252, 219, 51, 0.15);
  }
`;

const SearchClear = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--grey-light);
  font-size: var(--text-base);
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;

  &:hover {
    color: var(--white);
  }
`;

const ColumnHeaders = styled.div`
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  padding-left: calc(var(--space-4) + 28px + var(--space-2));
  border-bottom: 1px solid rgba(160, 130, 80, 0.2);
  background: rgba(20, 16, 12, 0.6);
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`;

const ColHeader = styled.span`
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};

  &:hover {
    color: var(--gold);
  }
`;

const ColPlayer = styled(ColHeader)`
  flex: 1;
`;

const ColMmr = styled(ColHeader)`
  flex-shrink: 0;
`;

const UserList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1) 0;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--grey-mid);
    border-radius: 3px;
  }
`;

const UserRowBase = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  cursor: default;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const UserLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const AvatarWrapper = styled.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`;

const AvatarFlag = styled.div`
  position: absolute;
  bottom: -2px;
  right: -2px;
  line-height: 0;
`;

const SidebarAvatar = styled.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`;

const SidebarAvatarRace = styled.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${(p) => (p.$faded ? 0.2 : 0.85)};
`;

const InGameIcon = styled(GiCrossedSwords)`
  width: 12px;
  height: 12px;
  color: var(--red);
  fill: var(--red);
  flex-shrink: 0;
  animation: pulse 1.5s infinite;
`;

const WinnerCrown = styled.img.attrs({ src: crownIcon, alt: "" })`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(252, 219, 51, 0.4));
`;

const RaceIcon = styled.img`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.85;
`;

const Name = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`;

const MmrNum = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--white);
  flex-shrink: 0;
`;

const SectionHeader = styled.div`
  padding: 12px var(--space-4) var(--space-2);
  margin-top: var(--space-1);
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  border-top: 1px solid rgba(160, 130, 80, 0.12);

  &:first-child {
    border-top: none;
    margin-top: 0;
  }

  &:hover {
    color: var(--white);
  }
`;

const SectionCount = styled.span`
  color: var(--gold);
`;

const Chevron = styled.span`
  font-size: 8px;
  transition: transform 0.2s;
  transform: ${(p) => (p.$open ? "rotate(90deg)" : "rotate(0deg)")};
`;

function getAvatarImg(tag, avatars, stats) {
  const avatarUrl = avatars?.get(tag)?.profilePicUrl;
  if (avatarUrl) return <SidebarAvatar src={avatarUrl} alt="" />;

  const playerStats = stats?.get(tag);
  const raceIcon = playerStats?.race != null ? raceMapping[playerStats.race] : null;
  if (raceIcon) return <SidebarAvatarRace src={raceIcon} alt="" />;

  return <SidebarAvatarRace src={raceIcons.random} alt="" $faded />;
}

const IdleRow = styled.div`
  opacity: 0.4;
`;

function UserRowItem({ user, avatars, stats, inGame, matchUrl, isRecentWinner, isIdle }) {
  const playerStats = stats?.get(user.battleTag);
  const mmr = playerStats?.mmr;
  const raceIcon = playerStats?.race != null ? raceMapping[playerStats.race] : null;
  const country = avatars?.get(user.battleTag)?.country;

  const content = (
    <>
      <AvatarWrapper>
        {getAvatarImg(user.battleTag, avatars, stats)}
        {country && (
          <AvatarFlag>
            <CountryFlag name={country.toLowerCase()} style={{ width: 14, height: 10 }} />
          </AvatarFlag>
        )}
      </AvatarWrapper>
      {inGame && <InGameIcon />}
      {isRecentWinner && <WinnerCrown />}
      {raceIcon && <RaceIcon src={raceIcon} alt="" />}
      <Name>{user.name}</Name>
      {mmr != null && (
        <MmrNum>{Math.round(mmr)}</MmrNum>
      )}
    </>
  );

  if (matchUrl) {
    return <UserLink to={matchUrl}>{content}</UserLink>;
  }
  const row = <UserRowBase>{content}</UserRowBase>;
  if (isIdle) return <IdleRow>{row}</IdleRow>;
  return row;
}

export default function UserListSidebar({
  users,
  avatars,
  stats,
  inGameTags,
  idleTags,
  inGameMatchMap,
  recentWinners,
  $mobileVisible,
  onClose,
  borderTheme,
}) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("mmr");
  const [inGameOpen, setInGameOpen] = useState(true);
  const [onlineOpen, setOnlineOpen] = useState(true);
  const [awayOpen, setAwayOpen] = useState(true);

  function handleSort(field) {
    setSortField(field);
  }

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (sortField === "live") {
        const aLive = inGameTags?.has(a.battleTag) ? 1 : 0;
        const bLive = inGameTags?.has(b.battleTag) ? 1 : 0;
        if (aLive !== bLive) return bLive - aLive;
      }
      if (sortField === "name") {
        const cmp = (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
        if (cmp !== 0) return cmp;
      }
      const aMmr = stats?.get(a.battleTag)?.mmr ?? -1;
      const bMmr = stats?.get(b.battleTag)?.mmr ?? -1;
      if (aMmr !== bMmr) return bMmr - aMmr;
      return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
    });
  }, [users, stats, inGameTags, sortField]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return sortedUsers;
    const q = search.toLowerCase();
    return sortedUsers.filter((u) => (u.name || "").toLowerCase().includes(q));
  }, [sortedUsers, search]);

  const { inGameUsers, onlineUsers: onlineOnly, awayUsers } = useMemo(() => {
    const ig = [];
    const on = [];
    const away = [];
    for (const u of filteredUsers) {
      if (inGameTags?.has(u.battleTag)) ig.push(u);
      else if (idleTags?.has(u.battleTag)) away.push(u);
      else on.push(u);
    }
    return { inGameUsers: ig, onlineUsers: on, awayUsers: away };
  }, [filteredUsers, inGameTags, idleTags]);

  return (
    <Sidebar $mobileVisible={$mobileVisible}>
      <SidebarContent $theme={borderTheme}>
        <Header $theme={borderTheme}>
          <HeaderTitle>Channel</HeaderTitle>
          <HeaderCount>{users.length}</HeaderCount>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </Header>
      <SearchWrapper>
        <SearchInput
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <SearchClear onClick={() => setSearch("")}>×</SearchClear>
        )}
      </SearchWrapper>
      <ColumnHeaders>
        <ColPlayer $active={sortField === "name"} onClick={() => handleSort("name")}>
          Player
        </ColPlayer>
        <ColMmr $active={sortField === "mmr"} onClick={() => handleSort("mmr")}>
          MMR
        </ColMmr>
      </ColumnHeaders>
      <UserList>
        {users.length === 0 && (
          <>
            {[...Array(8)].map((_, i) => (
              <UserRowBase key={`skel-${i}`}>
                <SkeletonCircle $size="28px" style={{ borderRadius: "var(--radius-sm)" }} />
                <Skeleton $w={`${60 + Math.random() * 30}%`} $h="14px" style={{ flex: 1 }} />
                <Skeleton $w="32px" $h="12px" />
              </UserRowBase>
            ))}
          </>
        )}
        {inGameUsers.length > 0 && (
          <>
            <SectionHeader onClick={() => setInGameOpen((v) => !v)}>
              <Chevron $open={inGameOpen}>&#9654;</Chevron>
              In Game — <SectionCount>{inGameUsers.length}</SectionCount>
            </SectionHeader>
            {inGameOpen && inGameUsers.map((user) => (
              <UserRowItem
                key={user.battleTag}
                user={user}
                avatars={avatars}
                stats={stats}
                inGame
                matchUrl={inGameMatchMap?.get(user.battleTag)}
                isRecentWinner={recentWinners?.has(user.battleTag)}
              />
            ))}
          </>
        )}
        <SectionHeader onClick={() => setOnlineOpen((v) => !v)}>
          <Chevron $open={onlineOpen}>&#9654;</Chevron>
          Online — <SectionCount>{onlineOnly.length}</SectionCount>
        </SectionHeader>
        {onlineOpen && onlineOnly.map((user) => (
          <UserRowItem
            key={user.battleTag}
            user={user}
            avatars={avatars}
            stats={stats}
            inGame={false}
            matchUrl={null}
            isRecentWinner={recentWinners?.has(user.battleTag)}
          />
        ))}
        {awayUsers.length > 0 && (
          <>
            <SectionHeader onClick={() => setAwayOpen((v) => !v)}>
              <Chevron $open={awayOpen}>&#9654;</Chevron>
              Away — <SectionCount>{awayUsers.length}</SectionCount>
            </SectionHeader>
            {awayOpen && awayUsers.map((user) => (
              <UserRowItem
                key={user.battleTag}
                user={user}
                avatars={avatars}
                stats={stats}
                inGame={false}
                matchUrl={null}
                isRecentWinner={recentWinners?.has(user.battleTag)}
                isIdle
              />
            ))}
          </>
        )}
      </UserList>
      </SidebarContent>
    </Sidebar>
  );
}
