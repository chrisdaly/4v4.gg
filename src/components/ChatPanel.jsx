import React, { useRef, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { GiCrossedSwords } from "react-icons/gi";
import { HiKey } from "react-icons/hi";
import { IoSend } from "react-icons/io5";
import crownIcon from "../assets/icons/king.svg";
import { raceMapping, raceIcons } from "../lib/constants";
import { CountryFlag, Skeleton, SkeletonCircle } from "./ui";
import { useMessageSegments, useBotResponseMap, formatDateDivider, getDateKey, formatTime, formatDateTime } from "../lib/useChatMessages";
import useAdmin from "../lib/useAdmin";

const OuterFrame = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  box-sizing: border-box;
  background: ${(p) => p.$theme?.bg || "rgba(10, 8, 6, 0.25)"};
  backdrop-filter: ${(p) => p.$theme?.blur || "blur(1px)"};
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  border: ${(p) => p.$theme?.border || "8px solid transparent"};
  border-image: ${(p) => p.$theme?.borderImage || 'url("/frames/chat/ChatFrameBorder.png") 30 / 8px stretch'};
  box-shadow: ${(p) => p.$theme?.shadow || "none"};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${(p) => p.$theme?.headerBg || "rgba(10, 8, 6, 0.2)"};
  backdrop-filter: ${(p) => p.$theme?.blur || "blur(1px)"};
  flex-shrink: 0;

  @media (max-width: 480px) {
    padding: 10px var(--space-2);
  }
`;

const Title = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`;

const StatusBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const StatusDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => (p.$connected ? "var(--green)" : "var(--grey-mid)")};
  ${(p) => p.$connected && "animation: pulse 1.5s infinite;"}
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
  min-height: 90px;
  margin-top: 20px;
  padding-bottom: var(--space-1);

  &:first-child {
    margin-top: 0;
  }

  @media (max-width: 480px) {
    min-height: 74px;
    margin-top: 14px;
  }
`;

const GroupStartRow = styled.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  @media (max-width: 480px) {
    padding-left: 66px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const ContinuationRow = styled.div`
  position: relative;
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  @media (max-width: 480px) {
    padding-left: 66px;
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
  right: var(--space-4);
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
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

const WinCrown = styled.img`
  width: 16px;
  height: 16px;
  margin-left: 4px;
  filter: drop-shadow(0 0 4px rgba(252, 219, 51, 0.4));
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

const AvatarImgWrap = styled.div`
  position: relative;
  display: inline-block;
`;

const AvatarFlag = styled.div`
  position: absolute;
  bottom: -1px;
  right: -3px;
  line-height: 0;
`;

const AvatarStats = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 2px;
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
  font-size: 15px;
  color: #fff;
  font-weight: 700;

  @media (max-width: 480px) {
    font-size: 13px;
  }
`;

const MmrLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0.7;
`;

const FormDots = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  justify-content: center;
  max-width: 38px;
`;

const FormDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: ${(p) => (p.$win ? "var(--green)" : "var(--red)")};
  opacity: 0.8;

  @media (max-width: 480px) {
    width: 5px;
    height: 5px;
  }
`;

const InGameIcon = styled(GiCrossedSwords)`
  width: 14px;
  height: 14px;
  color: var(--red);
  fill: var(--red);
  margin-left: 6px;
  animation: pulse 1.5s infinite;
  flex-shrink: 0;
`;

const MessageText = styled.span`
  font-family: var(--font-body);
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: 14px;
    line-height: 1.5;
  }
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
  bottom: var(--space-1);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: linear-gradient(180deg, rgba(30, 24, 16, 0.95) 0%, rgba(15, 12, 8, 0.98) 100%);
  border: 1px solid rgba(252, 219, 51, 0.4);
  border-radius: var(--radius-md);
  color: var(--gold);
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  letter-spacing: 0.5px;
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(252, 219, 51, 0.1);
  transition: all 0.2s ease;

  &::after {
    content: "▼";
    font-size: 9px;
  }

  &:hover {
    border-color: var(--gold);
    background: linear-gradient(180deg, rgba(252, 219, 51, 0.12) 0%, rgba(252, 219, 51, 0.04) 100%);
    box-shadow: 0 2px 16px rgba(252, 219, 51, 0.15), inset 0 1px 0 rgba(252, 219, 51, 0.15);
  }
`;

const ScrollContainer = styled.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const DateDivider = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin: var(--space-6) 0 var(--space-2);
  padding: 0 var(--space-4);

  &:first-child {
    margin-top: var(--space-2);
  }

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(160, 130, 80, 0.15);
  }
`;

const DateLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  white-space: nowrap;
`;

const InputBar = styled.form`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(10, 8, 6, 0.4);
  border-top: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`;

const ChatInput = styled.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-2);
  color: #e0e0e0;
  font-family: var(--font-body);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: rgba(252, 219, 51, 0.4);
  }

  &::placeholder {
    color: var(--grey-mid);
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const SendButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(160, 130, 80, 0.3);
  border-radius: var(--radius-sm);
  background: rgba(252, 219, 51, 0.08);
  color: var(--gold);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: rgba(252, 219, 51, 0.15);
    border-color: var(--gold);
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;

const KeyButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.1)" : "transparent")};
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    color: var(--gold);
    border-color: rgba(160, 130, 80, 0.4);
  }
`;

const KeyPrompt = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(10, 8, 6, 0.4);
  border-top: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`;

const KeyInput = styled.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-2);
  color: #e0e0e0;
  font-family: var(--font-mono);
  font-size: 12px;
  outline: none;

  &:focus {
    border-color: rgba(252, 219, 51, 0.4);
  }

  &::placeholder {
    color: var(--grey-mid);
  }
`;

const KeyLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  white-space: nowrap;
`;

const SendError = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--red);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TranslationRow = styled.div`
  margin: 2px 0 2px 84px;
  padding: 2px 10px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.8;
  line-height: 1.4;

  @media (max-width: 480px) {
    margin-left: 66px;
  }
`;

const TranslationLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 6px;
  font-style: normal;
  opacity: 0.6;
`;

const BotResponseRow = styled.div`
  margin: 4px 0 4px 84px;
  padding: 6px 10px;
  border-left: 3px solid var(--gold);
  background: rgba(252, 219, 51, 0.04);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;

  @media (max-width: 480px) {
    margin-left: 66px;
  }
`;

const BotLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 6px;
`;

const BotPreviewTag = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.7;
`;

const BotText = styled.pre`
  font-family: var(--font-mono);
  font-size: 13px;
  color: #ccc;
  margin: 2px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.4;
`;

const BotTestBar = styled.form`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  background: rgba(252, 219, 51, 0.03);
  border-top: 1px solid rgba(252, 219, 51, 0.1);
  flex-shrink: 0;
`;

const BotTestPrefix = styled.span`
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--gold);
  opacity: 0.7;
`;

const BotTestInput = styled.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(252, 219, 51, 0.15);
  border-radius: var(--radius-sm);
  padding: 5px var(--space-2);
  color: #e0e0e0;
  font-family: var(--font-mono);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: rgba(252, 219, 51, 0.4);
  }

  &::placeholder {
    color: var(--grey-mid);
    font-size: 11px;
  }

  &:disabled {
    opacity: 0.5;
  }
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

// formatDateDivider, getDateKey, formatTime, formatDateTime
// are now imported from ../lib/useChatMessages

function getAvatarElement(tag, avatars, stats) {
  const avatarUrl = avatars?.get(tag)?.profilePicUrl;
  if (avatarUrl) return <Avatar src={avatarUrl} alt="" />;

  const playerStats = stats?.get(tag);
  const raceIcon = playerStats?.race != null ? raceMapping[playerStats.race] : null;
  if (raceIcon) return <AvatarRaceIcon src={raceIcon} alt="" />;

  return <AvatarRaceIcon src={raceIcons.random} alt="" $faded />;
}


const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";
export default function ChatPanel({ messages, status, avatars, stats, sessions, inGameTags, recentWinners, botResponses = [], translations = new Map(), borderTheme, sendMessage }) {
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showNotice, setShowNotice] = useState(false);
  const { adminKey: apiKey, setAdminKey: setApiKeyHook } = useAdmin();
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [botDraft, setBotDraft] = useState("");
  const [botTesting, setBotTesting] = useState(false);

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    if (!draft.trim() || !apiKey || sending || !sendMessage) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage(draft.trim(), apiKey);
      setDraft("");
      inputRef.current?.focus();
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }, [draft, apiKey, sending, sendMessage]);

  function handleSaveKey(e) {
    e.preventDefault();
    const input = e.target.elements?.apiKeyInput?.value?.trim();
    if (input) {
      setApiKeyHook(input);
    }
    setShowKeyPrompt(false);
  }

  function handleClearKey() {
    setApiKeyHook("");
    setShowKeyPrompt(false);
  }

  const handleBotTest = useCallback(async (e) => {
    e.preventDefault();
    const cmd = botDraft.trim();
    if (!cmd || botTesting) return;
    const command = cmd.startsWith("!") ? cmd : `!${cmd}`;
    setBotTesting(true);
    try {
      const key = apiKey;
      const res = await fetch(`${RELAY_URL}/api/admin/bot/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": key },
        body: JSON.stringify({ command }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      setBotDraft("");
    } catch (err) {
      setSendError(err.message);
    } finally {
      setBotTesting(false);
    }
  }, [botDraft, apiKey, botTesting]);

  const { botResponseMap, unmatchedBotResponses } = useBotResponseMap(botResponses, messages);
  const messageSegments = useMessageSegments(messages);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
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
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
    setAutoScroll(true);
    setShowNotice(false);
  }

  return (
    <OuterFrame>
      <Wrapper $theme={borderTheme}>
        <Header $theme={borderTheme}>
          <Title>4v4 Chat</Title>
          <StatusBadge>
            <StatusDot $connected={status === "connected"} />
            {status === "connected"
              ? messages.length
              : status === "reconnecting"
                ? "Reconnecting..."
                : "Connecting..."}
          </StatusBadge>
        </Header>
        {messages.length === 0 ? (
          status !== "connected" ? (
            <MessageList>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ display: "flex", gap: "var(--space-2)", padding: "var(--space-4) var(--space-4)", alignItems: "flex-start" }}>
                  <SkeletonCircle $size="60px" style={{ borderRadius: "var(--radius-md)" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                      <Skeleton $w="100px" $h="14px" />
                      <Skeleton $w="50px" $h="10px" />
                    </div>
                    <Skeleton $w={`${50 + Math.random() * 40}%`} $h="14px" />
                    {i % 2 === 0 && <Skeleton $w={`${30 + Math.random() * 30}%`} $h="14px" />}
                  </div>
                </div>
              ))}
            </MessageList>
          ) : (
            <EmptyState>No messages yet</EmptyState>
          )
        ) : (
          <ScrollContainer>
            <MessageList ref={listRef} onScroll={handleScroll}>
              {messageSegments.map((segment, segIdx) => {
                const msg = segment.start;
                const tag = msg.battle_tag || msg.battleTag;
                const userName = msg.user_name || msg.userName;
                const msgTime = msg.sent_at || msg.sentAt;
                const msgDateKey = getDateKey(msgTime);

                // Check if we need a date divider
                let showDateDivider = segIdx === 0;
                if (!showDateDivider && segIdx > 0) {
                  const prevMsg = messageSegments[segIdx - 1].start;
                  const prevTime = prevMsg.sent_at || prevMsg.sentAt;
                  showDateDivider = getDateKey(prevTime) !== msgDateKey;
                }

                // System message
                if (!tag || tag === "system") {
                  return (
                    <React.Fragment key={msg.id}>
                      {showDateDivider && (
                        <DateDivider><DateLabel>{formatDateDivider(msgTime)}</DateLabel></DateDivider>
                      )}
                      <SystemMessageRow>
                        {msg.message}
                      </SystemMessageRow>
                    </React.Fragment>
                  );
                }

                return (
                  <React.Fragment key={msg.id}>
                    {showDateDivider && (
                      <DateDivider><DateLabel>{formatDateDivider(msgTime)}</DateLabel></DateDivider>
                    )}
                  <MessageSegment>
                    <AvatarContainer>
                      <AvatarImgWrap>
                        {getAvatarElement(tag, avatars, stats)}
                        {avatars?.get(tag)?.country && (
                          <AvatarFlag>
                            <CountryFlag name={avatars.get(tag).country.toLowerCase()} />
                          </AvatarFlag>
                        )}
                      </AvatarImgWrap>
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
                              {sessions.get(tag).map((won, i) => (
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
                            {inGameTags?.has(tag) && <InGameIcon />}
                            {recentWinners?.has(tag) && <WinCrown src={crownIcon} alt="" />}
                            <Timestamp>{formatDateTime(msg.sent_at || msg.sentAt)}</Timestamp>
                          </NameWrapper>
                        </div>
                        <MessageText>{msg.message}</MessageText>
                        {translations.has(msg.id) && (
                          <TranslationRow style={{ margin: '2px 0', padding: '2px 0' }}>
                            <TranslationLabel>EN</TranslationLabel>
                            {translations.get(msg.id)}
                          </TranslationRow>
                        )}
                      </MessageContent>
                    </GroupStartRow>
                    {botResponseMap.has(msg.id) && (
                      <BotResponseRow>
                        <BotLabel>BOT</BotLabel>
                        {!botResponseMap.get(msg.id).botEnabled && <BotPreviewTag>(preview)</BotPreviewTag>}
                        <BotText>{botResponseMap.get(msg.id).response}</BotText>
                      </BotResponseRow>
                    )}
                    {segment.continuations.map((cMsg) => {
                      const cBotResp = botResponseMap.get(cMsg.id);
                      return (
                        <React.Fragment key={cMsg.id}>
                          <ContinuationRow>
                            <HoverTimestamp className="hover-timestamp">
                              {formatTime(cMsg.sent_at || cMsg.sentAt)}
                            </HoverTimestamp>
                            <MessageText>{cMsg.message}</MessageText>
                          </ContinuationRow>
                          {translations.has(cMsg.id) && (
                            <TranslationRow>
                              <TranslationLabel>EN</TranslationLabel>
                              {translations.get(cMsg.id)}
                            </TranslationRow>
                          )}
                          {cBotResp && (
                            <BotResponseRow>
                              <BotLabel>BOT</BotLabel>
                              {!cBotResp.botEnabled && <BotPreviewTag>(preview)</BotPreviewTag>}
                              <BotText>{cBotResp.response}</BotText>
                            </BotResponseRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </MessageSegment>
                  </React.Fragment>
                );
              })}
              {unmatchedBotResponses.map((br, i) => (
                <BotResponseRow key={`bot-${i}`} style={{ marginLeft: "var(--space-4)" }}>
                  <BotLabel>BOT</BotLabel>
                  {!br.botEnabled && <BotPreviewTag>(preview)</BotPreviewTag>}
                  <BotPreviewTag style={{ marginLeft: 6 }}>{br.command}</BotPreviewTag>
                  <BotText>{br.response}</BotText>
                </BotResponseRow>
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
      {import.meta.env.DEV && sendMessage && showKeyPrompt && !apiKey && (
        <KeyPrompt as="form" onSubmit={handleSaveKey}>
          <KeyLabel>API Key:</KeyLabel>
          <KeyInput name="apiKeyInput" type="password" placeholder="Enter admin API key" autoFocus />
          <SendButton type="submit"><IoSend size={14} /></SendButton>
        </KeyPrompt>
      )}
      {import.meta.env.DEV && sendMessage && (apiKey || !showKeyPrompt) && (
        <InputBar onSubmit={handleSend}>
          <KeyButton
            type="button"
            $active={!!apiKey}
            onClick={() => apiKey ? handleClearKey() : setShowKeyPrompt(true)}
            title={apiKey ? "Clear API key" : "Set API key"}
          >
            <HiKey size={16} />
          </KeyButton>
          {apiKey ? (
            <>
              <ChatInput
                ref={inputRef}
                type="text"
                placeholder="Send a message..."
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setSendError(null); }}
                disabled={sending}
                maxLength={500}
              />
              {sendError && <SendError title={sendError}>!</SendError>}
              <SendButton type="submit" disabled={sending || !draft.trim()}>
                <IoSend size={14} />
              </SendButton>
            </>
          ) : (
            <KeyLabel>Set API key to send messages</KeyLabel>
          )}
        </InputBar>
      )}
      {import.meta.env.DEV && (
        <BotTestBar onSubmit={handleBotTest}>
          <BotTestPrefix>BOT</BotTestPrefix>
          <BotTestInput
            type="text"
            placeholder="!games, !stats name, !recap topic 50, !help"
            value={botDraft}
            onChange={(e) => setBotDraft(e.target.value)}
            disabled={botTesting}
            maxLength={200}
          />
          <SendButton type="submit" disabled={botTesting || !botDraft.trim()}>
            <IoSend size={14} />
          </SendButton>
        </BotTestBar>
      )}
    </OuterFrame>
  );
}
