import React, { useRef, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { GiCrossedSwords } from "react-icons/gi";
import { CountryFlag } from "./ui";
import { raceMapping, raceIcons } from "../lib/constants";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--grey-mid);
`;

const Title = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
`;

const StatusDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: var(--space-2);
  background: ${(p) =>
    p.$status === "connected"
      ? "var(--green)"
      : p.$status === "reconnecting"
        ? "var(--gold)"
        : "var(--red)"};
  ${(p) =>
    p.$status === "reconnecting" &&
    `animation: pulse 1.5s infinite;`}
`;

const StatusLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  display: flex;
  align-items: center;
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) var(--space-4);

  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-2);
  }

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

const GroupStartRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 3px 0;
  margin-top: var(--space-2);
  line-height: 1.5;
  border-radius: var(--radius-sm);

  &:first-child {
    margin-top: 0;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const ContinuationRow = styled.div`
  padding: 1px 0;
  padding-left: 42px;
  line-height: 1.5;
  border-radius: var(--radius-sm);

  @media (max-width: 480px) {
    padding-left: 34px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  margin-top: 1px;

  @media (max-width: 480px) {
    width: 24px;
    height: 24px;
  }
`;

const AvatarRaceIcon = styled.img`
  width: 32px;
  height: 32px;
  box-sizing: border-box;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  margin-top: 1px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${(p) => p.$faded ? 0.3 : 0.85};

  @media (max-width: 480px) {
    width: 24px;
    height: 24px;
    padding: 3px;
  }
`;

const MessageContent = styled.div`
  min-width: 0;
`;

const Timestamp = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  margin-right: 6px;
`;

const NameWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  position: relative;

  &:hover > .hover-flag {
    opacity: 1;
  }
`;

const HoverFlag = styled.span`
  position: absolute;
  right: 100%;
  margin-right: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  display: inline-flex;
  align-items: center;
  pointer-events: none;
`;

const UserNameLink = styled(Link)`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  margin-right: var(--space-2);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const AvatarContainer = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const InGameBadge = styled(GiCrossedSwords)`
  position: absolute;
  top: -3px;
  right: -3px;
  width: 10px;
  height: 10px;
  color: var(--red);
  background: var(--grey-dark);
  border-radius: 50%;
  padding: 1px;
  animation: pulse 1.5s infinite;
`;

const MessageText = styled.span`
  color: rgba(255, 255, 255, 0.88);
  font-size: var(--text-xs);
  word-break: break-word;
`;

const SystemMessageRow = styled.div`
  padding: 2px 0;
  padding-left: 42px;
  line-height: 1.5;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.7;
`;

const ScrollNotice = styled.button`
  position: absolute;
  bottom: var(--space-4);
  left: 50%;
  transform: translateX(-50%);
  background: var(--grey-dark);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-full);
  color: var(--gold);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  padding: var(--space-1) var(--space-4);
  cursor: pointer;

  &:hover {
    border-color: var(--gold);
  }
`;

const ScrollContainer = styled.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getAvatarElement(tag, avatars, stats) {
  const avatarUrl = avatars?.get(tag)?.profilePicUrl;
  if (avatarUrl) return <Avatar src={avatarUrl} alt="" />;

  const playerStats = stats?.get(tag);
  const raceIcon = playerStats?.race != null ? raceMapping[playerStats.race] : null;
  if (raceIcon) return <AvatarRaceIcon src={raceIcon} alt="" />;

  return <AvatarRaceIcon src={raceIcons.random} alt="" $faded />;
}

export default function ChatPanel({ messages, status, avatars, stats, inGameTags }) {
  const listRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showNotice, setShowNotice] = useState(false);

  // Compute grouped messages
  const groupedMessages = useMemo(() => {
    return messages.map((msg, i) => {
      if (i === 0) return { ...msg, isGroupStart: true };
      const prev = messages[i - 1];
      const prevTag = prev.battle_tag || prev.battleTag;
      const currTag = msg.battle_tag || msg.battleTag;
      if (prevTag !== currTag) return { ...msg, isGroupStart: true };

      const prevTime = new Date(prev.sent_at || prev.sentAt).getTime();
      const currTime = new Date(msg.sent_at || msg.sentAt).getTime();
      if (currTime - prevTime > 2 * 60 * 1000) return { ...msg, isGroupStart: true };

      return { ...msg, isGroupStart: false };
    });
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    } else if (!autoScroll && messages.length > 0) {
      setShowNotice(true);
    }
  }, [messages, autoScroll]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
    if (atBottom) setShowNotice(false);
  }

  function scrollToBottom() {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    setAutoScroll(true);
    setShowNotice(false);
  }

  return (
    <Wrapper>
      <Header>
        <Title>4v4 Chat</Title>
        <StatusLabel>
          <StatusDot $status={status} />
          {status}
        </StatusLabel>
      </Header>
      {messages.length === 0 ? (
        <EmptyState>
          {status === "connected"
            ? "No messages yet"
            : "Connecting to chat..."}
        </EmptyState>
      ) : (
        <ScrollContainer>
          <MessageList ref={listRef} onScroll={handleScroll}>
            {groupedMessages.map((msg) => {
              const tag = msg.battle_tag || msg.battleTag;
              const userName = msg.user_name || msg.userName;
              const country = avatars?.get(tag)?.country;

              // System message
              if (!tag || tag === "system") {
                return (
                  <SystemMessageRow key={msg.id}>
                    {msg.message}
                  </SystemMessageRow>
                );
              }

              if (msg.isGroupStart) {
                return (
                  <GroupStartRow key={msg.id}>
                    <AvatarContainer>
                      {getAvatarElement(tag, avatars, stats)}
                      {inGameTags?.has(tag) && <InGameBadge />}
                    </AvatarContainer>
                    <MessageContent>
                      <Timestamp>{formatTime(msg.sent_at || msg.sentAt)}</Timestamp>
                      <NameWrapper>
                        <HoverFlag className="hover-flag">
                          <CountryFlag name={country} />
                        </HoverFlag>
                        <UserNameLink to={`/player/${encodeURIComponent(tag)}`}>
                          {userName}
                        </UserNameLink>
                      </NameWrapper>
                      <MessageText>{msg.message}</MessageText>
                    </MessageContent>
                  </GroupStartRow>
                );
              }

              return (
                <ContinuationRow key={msg.id}>
                  <MessageText>{msg.message}</MessageText>
                </ContinuationRow>
              );
            })}
          </MessageList>
          {showNotice && (
            <ScrollNotice onClick={scrollToBottom}>
              New messages below
            </ScrollNotice>
          )}
        </ScrollContainer>
      )}
    </Wrapper>
  );
}
