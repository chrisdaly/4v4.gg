import React, { useRef, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--grey-mid);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
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

const MessageSegment = styled.div`
  position: relative;
  min-height: 85px;
  margin-top: var(--space-4);
  padding-bottom: var(--space-1);

  &:first-child {
    margin-top: 0;
  }
`;

const GroupStartRow = styled.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const ContinuationRow = styled.div`
  position: relative;
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  @media (max-width: 480px) {
    padding-left: 64px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  &:hover > .hover-timestamp {
    opacity: 0.5;
  }
`;

const HoverTimestamp = styled.span`
  position: absolute;
  left: 0;
  width: 84px;
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
  text-align: center;
`;

const Avatar = styled.img`
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
  }
`;

const AvatarRaceIcon = styled.img`
  width: 60px;
  height: 60px;
  box-sizing: border-box;
  border-radius: var(--radius-md);
  flex-shrink: 0;
  padding: 10px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${(p) => p.$faded ? 0.3 : 0.85};

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
    padding: 6px;
  }
`;

const MessageContent = styled.div`
  min-width: 0;
`;

const Timestamp = styled.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`;

const NameWrapper = styled.span`
  display: inline-flex;
  align-items: center;
`;

const UserNameLink = styled(Link)`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const AvatarContainer = styled.div`
  position: absolute;
  left: var(--space-2);
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 60px;

  @media (max-width: 480px) {
    width: 44px;
  }
`;

const AvatarStats = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 3px;
  line-height: 1;
  gap: 4px;
`;

const MmrRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`;

const MmrValue = styled.span`
  font-family: var(--font-mono);
  font-size: 14px;
  color: #fff;
  font-weight: 700;
`;

const MmrLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.6;
`;

const FormDots = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  justify-content: center;
`;

const FormDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: ${(p) => (p.$win ? "var(--green)" : "var(--red)")};
  opacity: 0.8;
`;

const InGameDot = styled.span`
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 8px;
  height: 8px;
  background: var(--red);
  border-radius: 50%;
  border: 2px solid var(--grey-dark);
  animation: pulse 1.5s infinite;
`;

const MessageText = styled.span`
  color: rgba(255, 255, 255, 0.82);
  font-size: 15px;
  line-height: 1.375;
  word-break: break-word;
`;

const SystemMessageRow = styled.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
  font-size: 13px;
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
  border: 1px solid rgba(252, 219, 51, 0.3);
  border-radius: var(--radius-full);
  color: var(--gold);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  padding: var(--space-1) var(--space-4);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.08);
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

function formatDateTime(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return time;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return `Yesterday ${time}`;
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)} ${time}`;
}

function getAvatarElement(tag, avatars, stats) {
  const avatarUrl = avatars?.get(tag)?.profilePicUrl;
  if (avatarUrl) return <Avatar src={avatarUrl} alt="" />;

  const playerStats = stats?.get(tag);
  const raceIcon = playerStats?.race != null ? raceMapping[playerStats.race] : null;
  if (raceIcon) return <AvatarRaceIcon src={raceIcon} alt="" />;

  return <AvatarRaceIcon src={raceIcons.random} alt="" $faded />;
}

export default function ChatPanel({ messages, status, avatars, stats, sessions, inGameTags }) {
  const listRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showNotice, setShowNotice] = useState(false);

  // Compute message segments (grouped by same user within 2 min)
  const messageSegments = useMemo(() => {
    const segments = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const tag = msg.battle_tag || msg.battleTag;
      let isGroupStart = i === 0;
      if (!isGroupStart) {
        const prev = messages[i - 1];
        const prevTag = prev.battle_tag || prev.battleTag;
        if (prevTag !== tag) {
          isGroupStart = true;
        } else {
          const prevTime = new Date(prev.sent_at || prev.sentAt).getTime();
          const currTime = new Date(msg.sent_at || msg.sentAt).getTime();
          if (currTime - prevTime > 2 * 60 * 1000) isGroupStart = true;
        }
      }
      if (isGroupStart) {
        segments.push({ start: msg, continuations: [] });
      } else if (segments.length > 0) {
        segments[segments.length - 1].continuations.push(msg);
      }
    }
    return segments;
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
            {messageSegments.map((segment) => {
              const msg = segment.start;
              const tag = msg.battle_tag || msg.battleTag;
              const userName = msg.user_name || msg.userName;

              // System message
              if (!tag || tag === "system") {
                return (
                  <SystemMessageRow key={msg.id}>
                    {msg.message}
                  </SystemMessageRow>
                );
              }

              return (
                <MessageSegment key={msg.id}>
                  <AvatarContainer>
                    <div style={{ position: "relative" }}>
                      {getAvatarElement(tag, avatars, stats)}
                      {inGameTags?.has(tag) && <InGameDot />}
                    </div>
                    {(stats?.get(tag)?.mmr != null || sessions?.get(tag)) && (
                      <AvatarStats>
                        {stats?.get(tag)?.mmr != null && (
                          <MmrRow>
                            <MmrValue>{Math.round(stats.get(tag).mmr)}</MmrValue>
                            <MmrLabel>MMR</MmrLabel>
                          </MmrRow>
                        )}
                        {sessions?.get(tag) && (
                          <FormDots>
                            {sessions.get(tag).slice(-10).map((won, i) => (
                              <FormDot key={i} $win={won} />
                            ))}
                          </FormDots>
                        )}
                      </AvatarStats>
                    )}
                  </AvatarContainer>
                  <GroupStartRow>
                    <MessageContent>
                      <div>
                        <NameWrapper>
                          <UserNameLink to={`/player/${encodeURIComponent(tag)}`}>
                            {userName}
                          </UserNameLink>
                          <Timestamp>{formatDateTime(msg.sent_at || msg.sentAt)}</Timestamp>
                        </NameWrapper>
                      </div>
                      <MessageText>{msg.message}</MessageText>
                    </MessageContent>
                  </GroupStartRow>
                  {segment.continuations.map((cMsg) => (
                    <ContinuationRow key={cMsg.id}>
                      <HoverTimestamp className="hover-timestamp">
                        {formatTime(cMsg.sent_at || cMsg.sentAt)}
                      </HoverTimestamp>
                      <MessageText>{cMsg.message}</MessageText>
                    </ContinuationRow>
                  ))}
                </MessageSegment>
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
