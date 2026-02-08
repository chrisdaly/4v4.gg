import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { GiCrossedSwords } from "react-icons/gi";
import { raceMapping, raceIcons } from "../lib/constants";

const Sidebar = styled.aside`
  width: 220px;
  height: 100%;
  border: 16px solid transparent;
  border-image: url("/frames/wc3-frame.png") 80 / 16px stretch;
  background: rgba(15, 12, 10, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    z-index: var(--z-overlay);
    background: rgba(15, 12, 10, 0.95);
    border-left: 1px solid rgba(160, 130, 80, 0.2);
    border-radius: 0;
    transform: ${(p) => (p.$mobileVisible ? "translateX(0)" : "translateX(100%)")};
    transition: transform 0.25s ease;
  }
`;

const Header = styled.div`
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`;

const Count = styled.span`
  color: var(--gold);
`;

const SearchWrapper = styled.div`
  position: relative;
  margin: var(--space-2) var(--space-2);

  &::before {
    content: "⌕";
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--grey-light);
    font-size: 13px;
    pointer-events: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 6px 28px 6px 24px;
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.3px;
  color: #fff;
  background: linear-gradient(180deg, rgba(25, 20, 15, 0.9) 0%, rgba(12, 10, 8, 0.95) 100%);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-md);
  outline: none;
  box-sizing: border-box;
  transition: all 0.2s ease;

  &::placeholder {
    color: var(--grey-light);
    font-size: 11px;
  }

  &:focus {
    border-color: var(--gold);
    box-shadow: 0 0 8px rgba(252, 219, 51, 0.15);
  }
`;

const SearchClear = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--grey-light);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;

  &:hover {
    color: #fff;
  }
`;

const ColumnHeaders = styled.div`
  display: flex;
  align-items: center;
  padding: var(--space-1) var(--space-4);
  padding-left: calc(var(--space-4) + 28px + var(--space-4));
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  background: rgba(20, 16, 12, 0.6);
  font-family: var(--font-mono);
  font-size: 10px;
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
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  cursor: default;
  border-radius: var(--radius-sm);
  margin: 0 var(--space-1);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const UserLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  border-radius: var(--radius-sm);
  margin: 0 var(--space-1);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const AvatarWrapper = styled.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
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

const InGameOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--radius-sm);
  color: var(--red);
  font-size: 14px;
  pointer-events: none;
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
  color: #fff;
  flex-shrink: 0;
`;

function getAvatarImg(tag, avatars, stats) {
  const avatarUrl = avatars?.get(tag)?.profilePicUrl;
  if (avatarUrl) return <SidebarAvatar src={avatarUrl} alt="" />;

  const playerStats = stats?.get(tag);
  const raceIcon = playerStats?.race != null ? raceMapping[playerStats.race] : null;
  if (raceIcon) return <SidebarAvatarRace src={raceIcon} alt="" />;

  return <SidebarAvatarRace src={raceIcons.random} alt="" $faded />;
}

function UserRowItem({ user, avatars, stats, inGame, matchUrl }) {
  const mmr = stats?.get(user.battleTag)?.mmr;

  const content = (
    <>
      <AvatarWrapper>
        {getAvatarImg(user.battleTag, avatars, stats)}
        {inGame && <InGameOverlay><GiCrossedSwords /></InGameOverlay>}
      </AvatarWrapper>
      <Name>{user.name}</Name>
      {mmr != null && (
        <MmrNum>{Math.round(mmr)}</MmrNum>
      )}
    </>
  );

  if (matchUrl) {
    return <UserLink to={matchUrl}>{content}</UserLink>;
  }
  return <UserRowBase>{content}</UserRowBase>;
}

export default function UserListSidebar({
  users,
  avatars,
  stats,
  inGameTags,
  inGameMatchMap,
  $mobileVisible,
  onClose,
}) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("mmr");

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

  return (
    <Sidebar $mobileVisible={$mobileVisible}>
      <Header>
        Channel <Count>{users.length}</Count>
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
        {filteredUsers.map((user) => (
          <UserRowItem
            key={user.battleTag}
            user={user}
            avatars={avatars}
            stats={stats}
            inGame={inGameTags?.has(user.battleTag)}
            matchUrl={inGameMatchMap?.get(user.battleTag)}
          />
        ))}
      </UserList>
    </Sidebar>
  );
}
