import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { raceMapping, raceIcons } from "../lib/constants";

const Sidebar = styled.aside`
  width: 220px;
  height: calc(100vh - 80px);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
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
    background: var(--grey-dark);
    border-left: 1px solid var(--grey-mid);
    border-radius: 0;
    transform: ${(p) => (p.$mobileVisible ? "translateX(0)" : "translateX(100%)")};
    transition: transform 0.25s ease;
  }
`;

const Header = styled.div`
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--grey-mid);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Count = styled.span`
  color: var(--gold);
`;

const SearchInput = styled.input`
  width: 100%;
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--grey-mid);
  outline: none;

  &::placeholder {
    color: var(--grey-light);
    opacity: 0.5;
  }

  &:focus {
    border-bottom-color: var(--gold);
  }
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
  gap: 8px;
  padding: 5px var(--space-3);
  cursor: default;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const UserLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px var(--space-3);
  cursor: pointer;
  text-decoration: none;
  color: inherit;

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
  width: 24px;
  height: 24px;
  border-radius: 50%;
`;

const SidebarAvatarRace = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  padding: 3px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${(p) => (p.$faded ? 0.2 : 0.85)};
`;

const InGameDot = styled.span`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 6px;
  height: 6px;
  background: var(--red);
  border-radius: 50%;
  animation: pulse 1.5s infinite;
`;

const Name = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`;

const Mmr = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  opacity: 0.7;
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
        {inGame && <InGameDot />}
      </AvatarWrapper>
      <Name>{user.name}</Name>
      <Mmr>{mmr != null ? Math.round(mmr) : ""}</Mmr>
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

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aMmr = stats?.get(a.battleTag)?.mmr ?? -1;
      const bMmr = stats?.get(b.battleTag)?.mmr ?? -1;
      if (aMmr !== bMmr) return bMmr - aMmr;
      return (a.name || "").localeCompare(b.name || "", undefined, {
        sensitivity: "base",
      });
    });
  }, [users, stats]);

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
      <SearchInput
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <UserList>
        {filteredUsers.map((user) => {
          const inGame = inGameTags?.has(user.battleTag);
          const matchUrl = inGame ? inGameMatchMap?.get(user.battleTag) : null;
          return (
            <UserRowItem
              key={user.battleTag}
              user={user}
              avatars={avatars}
              stats={stats}
              inGame={inGame}
              matchUrl={matchUrl}
            />
          );
        })}
      </UserList>
    </Sidebar>
  );
}
