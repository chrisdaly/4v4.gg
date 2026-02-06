import React, { useRef, useEffect, useState } from "react";
import styled from "styled-components";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  max-width: 800px;
  margin: 0 auto;
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

const MessageRow = styled.div`
  padding: var(--space-1) 0;
  line-height: 1.5;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const Timestamp = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  margin-right: var(--space-2);
`;

const ClanTag = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-right: 2px;
`;

const UserName = styled.span`
  font-family: var(--font-display);
  color: var(--gold);
  margin-right: var(--space-2);
  cursor: default;
`;

const MessageText = styled.span`
  color: #fff;
  font-size: var(--text-sm);
  word-break: break-word;
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

export default function ChatPanel({ messages, status }) {
  const listRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showNotice, setShowNotice] = useState(false);

  // Auto-scroll to bottom when new messages arrive (if user hasn't scrolled up)
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
            {messages.map((msg) => (
              <MessageRow key={msg.id}>
                <Timestamp>{formatTime(msg.sent_at || msg.sentAt)}</Timestamp>
                {msg.clan_tag || msg.clanTag ? (
                  <ClanTag>[{msg.clan_tag || msg.clanTag}]</ClanTag>
                ) : null}
                <UserName>{msg.user_name || msg.userName}</UserName>
                <MessageText>{msg.message}</MessageText>
              </MessageRow>
            ))}
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
