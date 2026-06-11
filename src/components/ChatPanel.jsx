import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import styled, { keyframes, css } from "styled-components";
import { GiCrossedSwords } from "react-icons/gi";
import { HiKey, HiBell, HiSearch, HiTranslate } from "react-icons/hi";
import { IoSend } from "react-icons/io5";
import { FaTwitch } from "react-icons/fa";
import crownIcon from "../assets/icons/king.svg";
import { raceMapping, raceIcons } from "../lib/constants";
import { CountryFlag, Skeleton, SkeletonCircle } from "./ui";
import { useMessageSegments, useBotResponseMap, formatDateDivider, getDateKey, formatTime, formatDateTime } from "../lib/useChatMessages";
import { getMapImageUrl } from "../lib/formatters";
import { linkifyMessage, playPing } from "../lib/chatExtras";
import PlayerHoverCard from "./PlayerHoverCard";
import { getPlayerProfile } from "../lib/api";
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
    border-radius: var(--radius-sm);
  }
`;

const MessageSegment = styled.div`
  position: relative;
  min-height: 56px;
  margin-top: 14px;
  padding-bottom: var(--space-1);

  &:first-child {
    margin-top: 0;
  }

  @media (max-width: 480px) {
    min-height: 48px;
    margin-top: 10px;
  }
`;

const GroupStartRow = styled.div`
  padding: 2px var(--space-4) 2px 64px;
  line-height: 1.375;
  transition: background 0.6s;
  ${(p) => p.$flash && "background: rgba(252, 219, 51, 0.14) !important;"}

  @media (max-width: 480px) {
    padding-left: 56px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const ContinuationRow = styled.div`
  position: relative;
  padding: 2px var(--space-4) 2px 64px;
  line-height: 1.375;
  transition: background 0.6s;
  ${(p) => p.$flash && "background: rgba(252, 219, 51, 0.14) !important;"}

  @media (max-width: 480px) {
    padding-left: 56px;
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
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
`;

const Avatar = styled.img`
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 36px;
    height: 36px;
  }
`;

const AvatarRaceIcon = styled.img`
  width: 44px;
  height: 44px;
  box-sizing: border-box;
  border-radius: var(--radius-md);
  flex-shrink: 0;
  padding: 8px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${(p) => p.$faded ? 0.3 : 0.85};

  @media (max-width: 480px) {
    width: 36px;
    height: 36px;
    padding: 6px;
  }
`;

const MessageContent = styled.div`
  min-width: 0;
`;

const InlineMmr = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: #fff;
  margin-left: var(--space-2);
  font-weight: 600;
`;

const MmrSuffix = styled.span`
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  font-weight: 400;
  opacity: 0.7;
`;

const Timestamp = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
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
  width: 44px;

  @media (max-width: 480px) {
    width: 36px;
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
  color: var(--text-body);
  font-size: var(--text-sm);
  line-height: 1.6;
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: var(--text-xs);
    line-height: 1.5;
  }
`;

const SystemMessageRow = styled.div`
  padding: 2px var(--space-4) 2px 64px;
  line-height: 1.375;
  font-size: var(--text-xs);
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
    font-size: var(--text-xxxs);
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
    background: rgba(var(--gold-muted-rgb), 0.15);
  }
`;

const DateLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  white-space: nowrap;
`;

const InputBar = styled.form`
  position: relative;
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
  border: 1px solid rgba(var(--gold-muted-rgb), 0.2);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-2);
  color: var(--text-body);
  font-family: var(--font-body);
  font-size: var(--text-xs);
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
  border: 1px solid rgba(var(--gold-muted-rgb), 0.3);
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
  border: 1px solid rgba(var(--gold-muted-rgb), 0.2);
  border-radius: var(--radius-sm);
  background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.1)" : "transparent")};
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    color: var(--gold);
    border-color: rgba(var(--gold-muted-rgb), 0.4);
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
  border: 1px solid rgba(var(--gold-muted-rgb), 0.2);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-2);
  color: var(--text-body);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
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
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  white-space: nowrap;
`;

const SendError = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--red);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TranslationRow = styled.div`
  margin: 2px 0 2px 64px;
  padding: 2px 10px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.8;
  line-height: 1.4;

  @media (max-width: 480px) {
    margin-left: 56px;
  }
`;

const TranslationLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  font-weight: 700;
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 6px;
  font-style: normal;
  opacity: 0.6;
`;

const BotResponseRow = styled.div`
  margin: 4px 0 4px 64px;
  padding: 6px 10px;
  border-left: 3px solid var(--gold);
  background: rgba(252, 219, 51, 0.04);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;

  @media (max-width: 480px) {
    margin-left: 56px;
  }
`;

const BotLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  font-weight: 700;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 6px;
`;

const BotPreviewTag = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.7;
`;

const BotText = styled.pre`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
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
  font-size: var(--text-xxs);
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
  color: var(--text-body);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: rgba(252, 219, 51, 0.4);
  }

  &::placeholder {
    color: var(--grey-mid);
    font-size: var(--text-xxxs);
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

/* ── Game events woven into the stream ─────────── */

const eventSlideIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const finishGlow = keyframes`
  0% { box-shadow: 0 0 0 rgba(252, 219, 51, 0); }
  30% { box-shadow: 0 0 14px rgba(252, 219, 51, 0.35); }
  100% { box-shadow: 0 0 0 rgba(252, 219, 51, 0); }
`;

const GameEventCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin: var(--space-2) var(--space-4);
  padding: var(--space-1) var(--space-2);
  border-left: 2px solid ${(p) => (p.$end ? "rgba(var(--gold-muted-rgb), 0.5)" : "rgba(194, 52, 52, 0.5)")};
  background: ${(p) => (p.$end ? "rgba(var(--gold-muted-rgb), 0.04)" : "rgba(255, 255, 255, 0.02)")};
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  transition: background 0.15s;
  ${(p) =>
    p.$live &&
    css`
      animation: ${eventSlideIn} 0.4s ease-out${p.$end ? css`, ${finishGlow} 2s ease-out 0.2s` : ""};
    `}

  &:hover {
    background: ${(p) => (p.$end ? "rgba(var(--gold-muted-rgb), 0.08)" : "rgba(255, 255, 255, 0.04)")};
  }

  a {
    color: var(--gold);
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const EventMapImg = styled.img`
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
  margin-top: 2px;
`;

const EventBody = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const EventHeaderLine = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
`;

const EventTag = styled.span`
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  color: ${(p) => (p.$end ? "var(--gold)" : "var(--red)")};
  background: ${(p) => (p.$end ? "var(--gold-tint)" : "var(--red-tint)")};
`;

const EventCrown = styled.img`
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(252, 219, 51, 0.4));
`;

const EventTeamLine = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  ${(p) => p.$dim && "opacity: 0.5;"}
`;

const EventName = styled.span`
  font-family: var(--font-display);
  color: var(--gold);
`;

const EventVs = styled.span`
  font-weight: 700;
  color: var(--grey-light);
  font-size: var(--text-xxxs);
  width: 12px;
  flex-shrink: 0;
  text-align: center;
`;

const EventMeta = styled.span`
  color: var(--grey-light);
  opacity: 0.7;
  white-space: nowrap;
`;

/* ── Name-row accessories ──────────────────────── */

const ClanTagChip = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  margin-left: 5px;
  opacity: 0.8;

  &::before {
    content: "[";
  }
  &::after {
    content: "]";
  }
`;

const DeltaPill = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  font-weight: 700;
  margin-left: 6px;
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  color: ${(p) => (p.$positive ? "var(--green)" : "var(--red)")};
  background: ${(p) => (p.$positive ? "var(--green-tint)" : "var(--red-tint)")};
`;

const InGameChip = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: rgba(194, 52, 52, 0.12);
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--red);
  text-decoration: none;

  svg {
    width: 10px;
    height: 10px;
    animation: pulse 1.5s infinite;
  }

  &:hover {
    background: rgba(194, 52, 52, 0.25);
  }
`;

const LiveTwitchLink = styled.a`
  display: inline-flex;
  align-items: center;
  margin-left: 6px;

  svg {
    width: 13px;
    height: 13px;
    fill: #9146ff;
  }

  &:hover svg {
    fill: #a970ff;
  }
`;

const WatchedBar = styled.div`
  border-left: 2px solid rgba(var(--gold-muted-rgb), 0.6);
`;

/* ── Header toggles + search ───────────────────── */

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-1);
`;

const HeaderToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.12)" : "none")};
  border: none;
  border-radius: var(--radius-sm);
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
  cursor: pointer;
  transition: color 0.15s;

  &:hover {
    color: var(--gold);
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`;

const SearchField = styled.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(var(--gold-muted-rgb), 0.2);
  border-radius: var(--radius-sm);
  padding: 6px var(--space-2);
  color: var(--text-body);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  outline: none;

  &:focus {
    border-color: rgba(252, 219, 51, 0.4);
  }

  &::placeholder {
    color: var(--grey-mid);
  }
`;

const SearchResults = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) var(--space-4);
`;

const SearchResultRow = styled.button`
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  padding: var(--space-2) var(--space-1);
  font-size: var(--text-xs);
  cursor: pointer;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const SearchAvatar = styled.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  ${(p) => p.$placeholder && "padding: 4px; background: rgba(255,255,255,0.06); opacity: 0.5; box-sizing: border-box;"}
`;

const SearchResultBody = styled.div`
  min-width: 0;
`;

const Mark = styled.span`
  background: rgba(252, 219, 51, 0.25);
  color: var(--gold);
  border-radius: 2px;
  padding: 0 1px;
`;

const SearchResultMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  margin-bottom: 2px;

  a {
    color: var(--gold);
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const SearchEmpty = styled.div`
  padding: var(--space-4);
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

/* ── History + unread markers ──────────────────── */

const LoadOlderButton = styled.button`
  display: block;
  margin: var(--space-2) auto;
  padding: var(--space-1) var(--space-4);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(var(--gold-muted-rgb), 0.25);
  border-radius: var(--radius-md);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    color: var(--gold);
    border-color: var(--gold);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const NewDivider = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-2) var(--space-4);

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(194, 52, 52, 0.5);
  }
`;

const NewDividerLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--red);
`;

/* ── @mention autocomplete ─────────────────────── */

const MentionMenu = styled.div`
  position: absolute;
  bottom: 100%;
  left: 48px;
  margin-bottom: 4px;
  background: rgba(15, 12, 8, 0.98);
  border: 1px solid rgba(var(--gold-muted-rgb), 0.4);
  border-radius: var(--radius-md);
  overflow: hidden;
  z-index: 100;
`;

const MentionItem = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-1) var(--space-3);
  background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.12)" : "none")};
  border: none;
  color: var(--gold);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  cursor: pointer;

  &:hover {
    background: rgba(252, 219, 51, 0.12);
  }
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

function formatGameMinutes(startTime) {
  if (!startTime) return null;
  const mins = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
  return mins >= 0 && mins < 180 ? `${mins}m` : null;
}

// Wrap case-insensitive matches of `query` in a highlight mark
function highlightMatches(text, query) {
  const q = query.trim();
  if (!q || !text) return text;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts = [];
  let i = 0;
  for (;;) {
    const j = lower.indexOf(ql, i);
    if (j === -1) break;
    if (j > i) parts.push(text.slice(i, j));
    parts.push(<Mark key={j}>{text.slice(j, j + q.length)}</Mark>);
    i = j + q.length;
  }
  if (parts.length === 0) return text;
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}

function readPref(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // non-persistent is fine
  }
}

export default function ChatPanel({
  messages,
  status,
  avatars,
  stats,
  sessions,
  inGameTags,
  inGameInfoMap,
  recentWinners,
  recentDeltas,
  gameEvents = [],
  liveStreamers,
  watchList,
  onlineUsers = [],
  botResponses = [],
  translations = new Map(),
  borderTheme,
  sendMessage,
  loadOlder,
  hasMoreHistory,
}) {
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showNotice, setShowNotice] = useState(false);
  const { adminKey: apiKey, isAdmin, setAdminKey: setApiKeyHook } = useAdmin();
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [botDraft, setBotDraft] = useState("");
  const [botTesting, setBotTesting] = useState(false);
  const [showTranslations, setShowTranslations] = useState(() => readPref("chat:showTranslations", true));
  const [notifyOn, setNotifyOn] = useState(() => readPref("chat:notify", false));
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [newMarkerTime, setNewMarkerTime] = useState(null);
  const [searchAvatars, setSearchAvatars] = useState(new Map());
  const [flashId, setFlashId] = useState(null);
  const [jumping, setJumping] = useState(false);
  const lastNotifiedRef = useRef(null);
  const flashTimerRef = useRef(null);

  // Fetch profiles for search-result authors not already known to the page
  useEffect(() => {
    if (!searchResults) return;
    const missing = [...new Set(searchResults.map((r) => r.battle_tag))]
      .filter((tag) => tag && !avatars?.get(tag) && !searchAvatars.has(tag));
    for (const tag of missing) {
      getPlayerProfile(tag).then((profile) => {
        setSearchAvatars((prev) => new Map(prev).set(tag, profile));
      });
    }
    // searchAvatars intentionally omitted — it's the accumulator this effect fills
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults, avatars]);

  // Jump from a search result to the message in the stream, paging in older
  // history as needed, then flash it
  const jumpToMessage = useCallback(async (result) => {
    if (jumping) return;
    setJumping(true);
    try {
      const target = result.received_at;
      let oldest = messages[0]?.received_at;
      let pages = 0;
      const isLoaded = () => messages.some((m) => m.id === result.id);
      // Page back until the stream reaches the target time (sqlite datetime
      // strings compare lexicographically). Bounded so a miss can't spin.
      while (!isLoaded() && loadOlder && oldest && target < oldest && pages < 20) {
        const r = await loadOlder();
        if (!r || r.added === 0) break;
        oldest = r.oldestCursor || oldest;
        pages++;
      }
      setSearchOpen(false);
      setAutoScroll(false);
      setFlashId(result.id);
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashId(null), 2500);
      // Retry until React has rendered the paged-in rows
      let attempts = 0;
      const tryScroll = () => {
        const el = document.getElementById(`msg-${result.id}`);
        if (el) {
          el.scrollIntoView({ block: "center" });
        } else if (attempts++ < 10) {
          setTimeout(tryScroll, 100);
        }
      };
      requestAnimationFrame(tryScroll);
    } finally {
      setJumping(false);
    }
  }, [jumping, messages, loadOlder]);

  // Notification blip for watched players' messages
  useEffect(() => {
    if (!notifyOn || !watchList || watchList.size === 0 || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.id === lastNotifiedRef.current) return;
    lastNotifiedRef.current = last.id;
    const tag = (last.battle_tag || last.battleTag || "").toLowerCase();
    if (watchList.has(tag)) playPing();
  }, [messages, notifyOn, watchList]);

  // "— new —" marker: remember where you were when the tab went hidden
  useEffect(() => {
    let clearTimer = null;
    const onVisibility = () => {
      if (document.hidden) {
        clearTimeout(clearTimer);
        const last = messages[messages.length - 1];
        if (last) setNewMarkerTime(new Date(last.sent_at || last.sentAt).getTime());
      } else {
        clearTimer = setTimeout(() => setNewMarkerTime(null), 120_000);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(clearTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [messages]);

  const toggleTranslations = () => {
    setShowTranslations((v) => {
      writePref("chat:showTranslations", !v);
      return !v;
    });
  };

  const toggleNotify = () => {
    setNotifyOn((v) => {
      writePref("chat:notify", !v);
      return !v;
    });
  };

  // Debounced public search against the relay
  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`${RELAY_URL}/api/chat/search?q=${encodeURIComponent(q)}&limit=50`)
        .then((r) => r.json())
        .then((data) => setSearchResults(data.results || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, searchOpen]);

  const handleLoadOlder = useCallback(async () => {
    if (!loadOlder || loadingOlder) return;
    setLoadingOlder(true);
    const el = listRef.current;
    const prevHeight = el?.scrollHeight || 0;
    const prevTop = el?.scrollTop || 0;
    await loadOlder();
    // Keep the viewport anchored on the message the user was reading
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight + prevTop;
      setLoadingOlder(false);
    });
  }, [loadOlder, loadingOlder]);

  // @mention autocomplete state derived from the draft
  const mentionMatch = useMemo(() => {
    const m = draft.match(/@([\w#]*)$/);
    if (!m) return null;
    const q = m[1].toLowerCase();
    const candidates = onlineUsers
      .filter((u) => (u.name || "").toLowerCase().startsWith(q))
      .slice(0, 6);
    return candidates.length > 0 ? { prefix: m[1], candidates } : null;
  }, [draft, onlineUsers]);

  const insertMention = useCallback((name) => {
    setDraft((d) => d.replace(/@([\w#]*)$/, `@${name} `));
    inputRef.current?.focus();
  }, []);

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

  // Weave game events into the message stream by timestamp
  const renderItems = useMemo(() => {
    const items = messageSegments.map((seg) => ({
      kind: "seg",
      time: new Date(seg.start.sent_at || seg.start.sentAt).getTime(),
      seg,
    }));
    const oldestLoaded = items.length > 0 ? items[0].time : 0;
    for (const ev of gameEvents) {
      const t = new Date(ev.time).getTime();
      if (t >= oldestLoaded) items.push({ kind: "event", time: t, ev });
    }
    return items.sort((a, b) => a.time - b.time);
  }, [messageSegments, gameEvents]);

  // Auto-scroll to bottom when new messages arrive (paging in older history
  // changes `messages` too, so key off the newest message id)
  const lastMsgIdRef = useRef(null);
  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? null;
    const isNewTail = lastId !== lastMsgIdRef.current;
    lastMsgIdRef.current = lastId;
    if (autoScroll && listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    } else if (!autoScroll && isNewTail && messages.length > 0) {
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
          <HeaderActions>
            <HeaderToggle
              $active={showTranslations}
              onClick={toggleTranslations}
              title={showTranslations ? "Hide translations" : "Show translations"}
            >
              <HiTranslate size={15} />
            </HeaderToggle>
            <HeaderToggle
              $active={notifyOn}
              onClick={toggleNotify}
              title={notifyOn ? "Mute watched-player pings" : "Ping when watched players chat"}
            >
              <HiBell size={15} />
            </HeaderToggle>
            <HeaderToggle
              $active={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
              title="Search chat history"
            >
              <HiSearch size={15} />
            </HeaderToggle>
            <StatusBadge>
              <StatusDot $connected={status === "connected"} />
              {status === "connected"
                ? messages.length
                : status === "reconnecting"
                  ? "Reconnecting..."
                  : "Connecting..."}
            </StatusBadge>
          </HeaderActions>
        </Header>
        {searchOpen && (
          <SearchBar>
            <SearchField
              type="text"
              placeholder="Search the last 24 hours..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </SearchBar>
        )}
        {searchOpen ? (
          <SearchResults>
            {searching && <SearchEmpty>Searching...</SearchEmpty>}
            {!searching && searchResults && searchResults.length === 0 && (
              <SearchEmpty>No messages found</SearchEmpty>
            )}
            {!searching && !searchResults && (
              <SearchEmpty>Type at least 2 characters to search the last 24 hours</SearchEmpty>
            )}
            {!searching &&
              searchResults?.map((r, i) => {
                const profile = avatars?.get(r.battle_tag) || searchAvatars.get(r.battle_tag);
                return (
                  <SearchResultRow
                    key={`${r.id ?? r.received_at}-${i}`}
                    type="button"
                    title="Jump to message"
                    disabled={jumping}
                    onClick={() => jumpToMessage(r)}
                  >
                    {profile?.profilePicUrl ? (
                      <SearchAvatar src={profile.profilePicUrl} alt="" />
                    ) : (
                      <SearchAvatar src={raceIcons.random} alt="" $placeholder />
                    )}
                    <SearchResultBody>
                      <SearchResultMeta>
                        <Link
                          to={`/player/${encodeURIComponent(r.battle_tag)}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {highlightMatches(r.user_name, searchQuery)}
                        </Link>
                        {" · "}
                        {formatDateTime(r.sent_at || r.received_at)}
                      </SearchResultMeta>
                      <MessageText>{highlightMatches(r.message, searchQuery)}</MessageText>
                    </SearchResultBody>
                  </SearchResultRow>
                );
              })}
          </SearchResults>
        ) : null}
        {searchOpen ? null : messages.length === 0 ? (
          status !== "connected" ? (
            <MessageList>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ display: "flex", gap: "var(--space-2)", padding: "var(--space-4) var(--space-4)", alignItems: "flex-start" }}>
                  <SkeletonCircle $size="44px" style={{ borderRadius: "var(--radius-md)" }} />
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
              {hasMoreHistory && loadOlder && (
                <LoadOlderButton onClick={handleLoadOlder} disabled={loadingOlder}>
                  {loadingOlder ? "Loading..." : "Load earlier messages"}
                </LoadOlderButton>
              )}
              {(() => {
                let prevSegTime = null;
                let newMarkerShown = false;
                return renderItems.map((item) => {
                  // Game event woven into the stream
                  if (item.kind === "event") {
                    const ev = item.ev;
                    const isEnd = ev.type === "game_end";
                    const renderNames = (players) =>
                      (players || []).map((p, i) => (
                        <React.Fragment key={p.battleTag || i}>
                          {i > 0 && ", "}
                          <EventName>{p.name}</EventName>
                        </React.Fragment>
                      ));
                    const duration =
                      ev.durationInSeconds != null
                        ? `${Math.round(ev.durationInSeconds / 60)} min`
                        : null;
                    const mapImg = ev.mapName ? getMapImageUrl(ev.mapName) : null;
                    const teamA = isEnd ? ev.winners : ev.teams?.[0];
                    const teamB = isEnd ? ev.losers : ev.teams?.[1];
                    const eventLink = isEnd ? `/match/${ev.matchId}` : "/live";
                    return (
                      <GameEventCard key={ev.id} $end={isEnd} $live={ev.live}>
                        {mapImg && (
                          <Link to={eventLink}>
                            <EventMapImg src={mapImg} alt="" onError={(e) => { e.target.style.display = "none"; }} />
                          </Link>
                        )}
                        <EventBody>
                          <EventHeaderLine>
                            <EventTag $end={isEnd}>{isEnd ? "Finish" : "Start"}</EventTag>
                            {ev.mapName && <Link to={eventLink}>{ev.mapName}</Link>}
                            <EventMeta>
                              {ev.avgMmr != null && `· avg ${ev.avgMmr} `}
                              {isEnd
                                ? `· ${duration ? `${duration} · ` : ""}ended ${formatTime(ev.time)}`
                                : `· started ${formatTime(ev.time)}`}
                            </EventMeta>
                          </EventHeaderLine>
                          <EventTeamLine>
                            {isEnd ? <EventCrown src={crownIcon} alt="winners" /> : <EventVs />}
                            <span>{renderNames(teamA)}</span>
                          </EventTeamLine>
                          <EventTeamLine $dim={isEnd}>
                            <EventVs>vs</EventVs>
                            <span>{renderNames(teamB)}</span>
                          </EventTeamLine>
                        </EventBody>
                      </GameEventCard>
                    );
                  }

                  const segment = item.seg;
                  const msg = segment.start;
                  const tag = msg.battle_tag || msg.battleTag;
                  const userName = msg.user_name || msg.userName;
                  const msgTime = msg.sent_at || msg.sentAt;
                  const msgDateKey = getDateKey(msgTime);

                  const showDateDivider = prevSegTime === null || getDateKey(prevSegTime) !== msgDateKey;
                  const showNewMarker =
                    !newMarkerShown && newMarkerTime != null && item.time > newMarkerTime;
                  if (showNewMarker) newMarkerShown = true;
                  prevSegTime = msgTime;

                  const dividers = (
                    <>
                      {showDateDivider && (
                        <DateDivider><DateLabel>{formatDateDivider(msgTime)}</DateLabel></DateDivider>
                      )}
                      {showNewMarker && (
                        <NewDivider><NewDividerLabel>new</NewDividerLabel></NewDivider>
                      )}
                    </>
                  );

                  // System message
                  if (!tag || tag === "system") {
                    return (
                      <React.Fragment key={msg.id}>
                        {dividers}
                        <SystemMessageRow>
                          {msg.message}
                        </SystemMessageRow>
                      </React.Fragment>
                    );
                  }

                  const isWatched = watchList?.has(tag.toLowerCase());
                  const clanTag = msg.clan_tag || msg.clanTag;
                  const delta = recentDeltas?.get(tag);
                  const live = liveStreamers?.get(tag);
                  const gameInfo = inGameTags?.has(tag) ? inGameInfoMap?.get(tag) : null;
                  const gameMins = gameInfo ? formatGameMinutes(gameInfo.startTime) : null;
                  const SegmentWrap = isWatched ? WatchedBar : React.Fragment;

                  return (
                    <React.Fragment key={msg.id}>
                      {dividers}
                    <SegmentWrap>
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
                      </AvatarContainer>
                      <GroupStartRow id={`msg-${msg.id}`} $flash={flashId === msg.id}>
                        <MessageContent>
                          <div>
                            <NameWrapper>
                              <PlayerHoverCard
                                battleTag={tag}
                                avatars={avatars}
                                stats={stats}
                                sessions={sessions}
                                inGameInfo={gameInfo}
                              >
                                <UserNameLink to={`/player/${encodeURIComponent(tag)}`}>
                                  {userName}
                                </UserNameLink>
                              </PlayerHoverCard>
                              {clanTag && <ClanTagChip>{clanTag}</ClanTagChip>}
                              {stats?.get(tag)?.mmr != null && (
                                <InlineMmr>{Math.round(stats.get(tag).mmr)} <MmrSuffix>MMR</MmrSuffix></InlineMmr>
                              )}
                              {delta != null && (
                                <DeltaPill $positive={delta >= 0}>
                                  {delta >= 0 ? `+${delta}` : delta}
                                </DeltaPill>
                              )}
                              {gameInfo ? (
                                <InGameChip to={`/player/${encodeURIComponent(tag)}`} title={`In game on ${gameInfo.mapName || "unknown map"}`}>
                                  <GiCrossedSwords />
                                  {gameMins || "in game"}
                                </InGameChip>
                              ) : (
                                inGameTags?.has(tag) && <InGameIcon />
                              )}
                              {live && (
                                <LiveTwitchLink
                                  href={`https://twitch.tv/${live.twitchName}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={live.title || "Live on Twitch"}
                                >
                                  <FaTwitch />
                                </LiveTwitchLink>
                              )}
                              {recentWinners?.has(tag) && <WinCrown src={crownIcon} alt="" />}
                              <Timestamp>{formatDateTime(msg.sent_at || msg.sentAt)}</Timestamp>
                            </NameWrapper>
                          </div>
                          <MessageText>{linkifyMessage(msg.message)}</MessageText>
                          {showTranslations && translations.has(msg.id) && (
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
                            <ContinuationRow id={`msg-${cMsg.id}`} $flash={flashId === cMsg.id}>
                              <HoverTimestamp className="hover-timestamp">
                                {formatTime(cMsg.sent_at || cMsg.sentAt)}
                              </HoverTimestamp>
                              <MessageText>{linkifyMessage(cMsg.message)}</MessageText>
                            </ContinuationRow>
                            {showTranslations && translations.has(cMsg.id) && (
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
                    </SegmentWrap>
                    </React.Fragment>
                  );
                });
              })()}
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
      {isAdmin && sendMessage && showKeyPrompt && !apiKey && (
        <KeyPrompt as="form" onSubmit={handleSaveKey}>
          <KeyLabel>API Key:</KeyLabel>
          <KeyInput name="apiKeyInput" type="password" placeholder="Enter admin API key" autoFocus />
          <SendButton type="submit"><IoSend size={14} /></SendButton>
        </KeyPrompt>
      )}
      {isAdmin && sendMessage && (apiKey || !showKeyPrompt) && (
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
              {mentionMatch && (
                <MentionMenu>
                  {mentionMatch.candidates.map((u) => (
                    <MentionItem
                      key={u.battleTag}
                      type="button"
                      onClick={() => insertMention(u.name)}
                    >
                      {u.name}
                    </MentionItem>
                  ))}
                </MentionMenu>
              )}
              <ChatInput
                ref={inputRef}
                type="text"
                placeholder="Send a message..."
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setSendError(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Tab" && mentionMatch) {
                    e.preventDefault();
                    insertMention(mentionMatch.candidates[0].name);
                  }
                }}
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
      {isAdmin && (
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
