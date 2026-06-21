import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import useAdmin from "../lib/useAdmin";
import { getMapImageUrl } from "../lib/formatters";
import { getMatch } from "../lib/api";
import { formatTime } from "../lib/useChatMessages";
import { raceIcons, raceMapping } from "../lib/constants";
import MiniTeamsRow from "../components/MiniMatchCard";
import MatchNote, { renderBlurbText, stripBlurbMarkup } from "../components/MatchNote";
import StreakBadges from "../components/StreakBadges";
import RivalryBadge from "../components/RivalryBadge";
import PeonLoader from "../components/PeonLoader";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/* ── Helpers ──────────────────────────────────── */

// Parse "Recent LOUNGE chat…" section out of the fact sheet string.
// Returns { main, chat, rivals } where chat is [{userName, receivedAt, message}]
// and rivals is [{playerA, playerB, playerAWins, playerBWins, meetings}].
function parseFactSheet(factSheet, winnerNames = new Set()) {
  if (!factSheet) return { main: null, chat: [], rivals: [] };

  // Extract H2H rivalries — winner-team players always become playerA so their
  // dots read left-to-right as wins (makes the underdog story obvious visually).
  const rivals = [];
  const h2hMatch = factSheet.match(/Recent head-to-heads \(before this game\): (.+)/);
  if (h2hMatch) {
    for (const entry of h2hMatch[1].split(" | ")) {
      // "PlayerA vs PlayerB: faced each other 3x recently before this, PlayerA won 2"
      const m = entry.match(/^(.+) vs (.+): faced each other (\d+)x recently before this, (.+) won (\d+)$/);
      if (!m) continue;
      const rawA = m[1].trim(), rawB = m[2].trim();
      const meetings = parseInt(m[3]);
      const winnerName = m[4].trim(), wins = parseInt(m[5]);
      const rawAWins = rawA === winnerName ? wins : meetings - wins;
      const rawBWins = meetings - rawAWins;
      // Normalise so the current-match winner is always playerA
      const aIsWinner = winnerNames.has(rawA);
      rivals.push(aIsWinner || !winnerNames.has(rawB)
        ? { playerA: rawA, playerB: rawB, playerAWins: rawAWins, playerBWins: rawBWins, meetings }
        : { playerA: rawB, playerB: rawA, playerAWins: rawBWins, playerBWins: rawAWins, meetings }
      );
    }
  }

  const idx = factSheet.indexOf("Recent LOUNGE chat from these players");
  if (idx < 0) return { main: factSheet, chat: [], rivals };
  const main = factSheet.slice(0, idx).trimEnd();
  const chatSection = factSheet.slice(idx);
  const lineRe = /^\s*\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] ([^:]+): "(.+)"$/;
  const chat = [];
  for (const line of chatSection.split("\n")) {
    const m = line.match(lineRe);
    if (m) chat.push({ receivedAt: m[1].trim(), userName: m[2].trim(), message: m[3] });
  }
  return { main, chat, rivals };
}

// Relative time label vs. match end, e.g. "−3m" or "+2m"
function relTime(receivedAt, endTimeMs) {
  if (!endTimeMs || !receivedAt) return null;
  const msgMs = new Date(receivedAt + " UTC").getTime();
  const diffMs = msgMs - endTimeMs;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin === 0) return "at whistle";
  return diffMin > 0 ? `+${diffMin}m` : `${diffMin}m`;
}

/* ── Page layout ──────────────────────────────── */

const Page = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin-bottom: var(--space-2);
`;

const Subtitle = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-bottom: var(--space-6);
`;

/* ── Stage 1: game picker grid ───────────────── */

const PickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
`;

const PickerCard = styled.button`
  display: flex;
  flex-direction: column;
  text-align: left;
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s;
  position: relative;

  &:hover {
    border-color: rgba(252, 219, 51, 0.6);
  }
`;

const PickerMapImg = styled.img`
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
`;

const PickerCardBody = styled.div`
  padding: var(--space-2) var(--space-3);
`;

const PickerMapName = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: #fff;
  margin-bottom: 2px;
`;

const PickerMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
`;

const PickerBlurb = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  font-style: italic;
  color: var(--gold);
  opacity: 0.85;
  margin-top: var(--space-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PickerDot = styled.span`
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--gold);
  box-shadow: 0 0 4px var(--gold);
  opacity: ${(p) => (p.$has ? 1 : 0)};
`;

/* ── Stage 2: blurb workbench ────────────────── */

const WorkbenchWrap = styled.div`
  width: 100%;
`;

const WorkbenchColumns = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-6);
  align-items: start;
`;

const ChatColumn = styled.div`
  position: sticky;
  top: var(--space-4);
`;

const ChatColumnLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  opacity: 0.6;
  padding-bottom: var(--space-2);
  margin-bottom: var(--space-3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-bottom: var(--space-4);

  &:hover { color: #fff; }
`;

/* ── Legacy aliases (kept for lounge chat section) ── */
const GameInfo = styled.div`min-width: 0;`;
const GameTitle = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--white);
`;
const GamePlayers = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const GameBlurbHint = styled.div`display:none;`;

/* ── Chat-style game event card ───────────────── */

const ChatCard = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  box-sizing: border-box;
  padding: var(--space-3) var(--space-4);
  border-left: 2px solid rgba(248, 113, 113, 0.5);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  margin-bottom: var(--space-4);
`;

const EventTagCol = styled.div`
  width: 84px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
`;

const EventTag = styled.span`
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 3px 7px;
  border-radius: var(--radius-sm);
  color: var(--red);
  background: var(--red-tint);
`;

const EventMapMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.8;
`;

const EventMapBlock = styled.div`
  width: 80px;
  flex-shrink: 0;
  align-self: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  text-align: center;
`;

const EventMapImg = styled.img`
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  display: block;
`;

const EventMapName = styled(Link)`
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  line-height: 1.2;
  color: inherit;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

const EventBody = styled.div`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const EventNote = styled.div`
  margin-top: 5px;
`;

/* ── Chat messages (lounge) ───────────────────── */

const ChatMessages = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: var(--space-4);
  border-left: 2px solid rgba(255, 255, 255, 0.08);
  padding-left: var(--space-3);
`;

const ChatDivider = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-2) 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--red);
  opacity: 0.7;

  &::before {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(248, 113, 113, 0.25);
  }
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(248, 113, 113, 0.25);
  }
`;

const ChatSectionHeader = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  color: ${(p) => p.$after ? "var(--gold)" : "var(--grey-light)"};
  opacity: ${(p) => p.$after ? 1 : 0.5};
  padding: var(--space-1) 0;
  margin-bottom: 2px;
`;

const ChatMsg = styled.div`
  padding: 5px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  &:last-child { border-bottom: none; }
`;

const ChatMsgHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: 2px;
`;

const ChatAvatar = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 2px;
  opacity: 0.8;
  flex-shrink: 0;
`;

const ChatName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
`;

const ChatMmr = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
`;

const ChatRelTime = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: ${(p) => (p.$after ? "var(--gold)" : "var(--grey-light)")};
  opacity: ${(p) => (p.$after ? 0.9 : 0.6)};
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  background: ${(p) => (p.$after ? "rgba(252,219,51,0.08)" : "transparent")};
`;

const ChatText = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.4;
  padding-left: 28px;
`;

/* ── Game detail header ───────────────────────── */

const GameHeader = styled.div`
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--grey-mid);
`;

const GameHeaderMap = styled.img`
  width: 96px;
  height: 96px;
  border-radius: var(--radius-md);
  object-fit: cover;
  border: 1px solid var(--grey-mid);
  flex-shrink: 0;
`;

const GameHeaderInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const GameHeaderTitle = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin-bottom: var(--space-1);
`;

const GameHeaderMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  margin-bottom: var(--space-3);
`;

const GameHeaderTeams = styled.div`
  margin-top: var(--space-2);
`;

/* ── Mini scorecard ──────────────────────────── */

const ScorecardWrap = styled.div`
  width: 100%;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-top: var(--space-3);
`;

const ScorecardRow = styled.div`
  display: grid;
  grid-template-columns: 90px repeat(4, 1fr) repeat(4, 1fr);
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
`;

const ScorecardLabel = styled.div`
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--grey-light);
  opacity: 0.6;
  padding: 4px 6px;
`;

const ScorecardNameCell = styled.div`
  font-family: var(--font-display);
  font-size: 11px;
  color: ${(p) => p.$winner ? "var(--green)" : "var(--red)"};
  text-align: center;
  padding: 5px 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${(p) => p.$winner ? "rgba(84,189,120,0.12)" : "rgba(248,113,113,0.12)"};
  border-left: ${(p) => p.$divider ? "1px solid rgba(255,255,255,0.12)" : "none"};
`;

const ScorecardCell = styled.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: ${(p) => p.$color || "#fff"};
  text-align: center;
  padding: 3px 4px;
  border-left: ${(p) => p.$divider ? "1px solid rgba(255,255,255,0.12)" : "none"};
`;

const ScorecardHeroCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 4px 2px;
  border-left: ${(p) => p.$divider ? "1px solid rgba(255,255,255,0.12)" : "none"};
`;

const HeroWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const HeroImg = styled.img`
  width: 26px;
  height: 26px;
  object-fit: cover;
  border-radius: 2px;
  display: block;
`;

const HeroLvl = styled.span`
  position: absolute;
  bottom: 0;
  right: 0;
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 700;
  color: #fff;
  background: rgba(0,0,0,0.75);
  padding: 0 2px;
  line-height: 1.4;
  border-radius: 1px;
`;

const ScorecardSectionDivider = styled.div`
  grid-column: 1 / -1;
  height: 1px;
  background: rgba(255,255,255,0.1);
`;

/* ── Workbench sections ───────────────────────── */

const Section = styled.div`
  margin-bottom: var(--space-4);
`;

const Label = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  margin-bottom: var(--space-1);
`;

/* ── Collapsible fact sheet ───────────────────── */

const FactSheetToggle = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  width: 100%;
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: ${(p) => (p.$open ? "var(--radius-md) var(--radius-md) 0 0" : "var(--radius-md)")};
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;

  &:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: var(--white);
  }
`;

const ToggleArrow = styled.span`
  margin-left: auto;
  font-size: 10px;
  opacity: 0.6;
  transform: ${(p) => (p.$open ? "rotate(90deg)" : "rotate(0deg)")};
  transition: transform 0.15s;
`;

const FactSheet = styled.pre`
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  padding: var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 360px;
  overflow-y: auto;
  margin: 0;
`;

/* ── Prompt + output ──────────────────────────── */

const PromptArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  box-sizing: border-box;
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  color: var(--white);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.5;
  resize: vertical;

  &:focus {
    border-color: var(--gold);
    outline: none;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
`;

const GenerateButton = styled.button`
  padding: var(--space-2) var(--space-6);
  background: rgba(252, 219, 51, 0.1);
  border: var(--border-thick) solid var(--gold);
  border-radius: var(--radius-md);
  color: var(--gold);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: rgba(252, 219, 51, 0.2);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const ResetButton = styled.button`
  padding: var(--space-2) var(--space-3);
  background: none;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  cursor: pointer;

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
  }
`;

const PhaseLabel = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  opacity: 0.8;
  margin: var(--space-2) 0 var(--space-1);

  &::before {
    content: "";
    flex: 0 0 8px;
    height: 1px;
    background: rgba(255,255,255,0.15);
  }
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.15);
  }
`;

const Output = styled.div`
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  border-left: 2px solid ${(p) => (p.$passed ? "var(--grey-mid)" : "var(--gold)")};
  background: ${(p) => (p.$passed ? "rgba(255,255,255,0.02)" : "var(--gold-tint)")};
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-style: italic;
  color: ${(p) => (p.$passed ? "var(--grey-light)" : "var(--gold)")};
  ${(p) => p.$same && "opacity: 0.6;"}
`;

const Unchanged = styled.span`
  font-style: normal;
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const CompareWrap = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
`;

const CompareCard = styled.div`
  border: 1px solid ${(p) => (p.$new ? "var(--gold)" : "var(--grey-mid)")};
  border-radius: var(--radius-md);
  padding: var(--space-3);
  background: ${(p) => (p.$new ? "var(--gold-tint)" : "rgba(255,255,255,0.02)")};
`;

const CompareLabel = styled.div`
  display: inline-block;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${(p) => (p.$new ? "var(--gold)" : "var(--grey-light)")};
  background: ${(p) => (p.$new ? "rgba(252,219,51,0.1)" : "rgba(255,255,255,0.05)")};
  border: 1px solid ${(p) => (p.$new ? "rgba(252,219,51,0.3)" : "rgba(255,255,255,0.1)")};
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  margin-bottom: var(--space-3);
`;

const CompareBlurb = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-style: italic;
  line-height: 1.5;
  color: ${(p) => (p.$passed ? "var(--grey-light)" : p.$new ? "var(--gold)" : "#fff")};
`;

const History = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-2);
`;

const HistoryRow = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  font-style: italic;

  &::before {
    content: "↳ ";
    opacity: 0.5;
  }
`;

const ErrorText = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--red);
  margin-bottom: var(--space-3);
`;

const ScoreScreenLink = styled(Link)`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  text-decoration: none;
  margin-left: auto;

  &:hover {
    text-decoration: underline;
  }
`;

const ControlsDivider = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: var(--space-4) 0;
`;

const KeyGate = styled.div`
  max-width: 480px;
  margin: 15vh auto;
  text-align: center;
  font-family: var(--font-mono);
  color: var(--grey-light);

  input {
    width: 100%;
    box-sizing: border-box;
    margin-top: var(--space-3);
    padding: var(--space-2);
    background: var(--surface-1);
    border: 1px solid var(--grey-mid);
    border-radius: var(--radius-md);
    color: var(--white);
    font-family: var(--font-mono);
  }
`;

/* ── Mini scorecard component ────────────────── */

function statColor(all, val, lowerIsBetter = false) {
  if (val == null) return "var(--grey-mid)";
  const valid = all.filter((v) => v != null).sort((a, b) => lowerIsBetter ? a - b : b - a);
  const rank = valid.indexOf(val);
  if (rank < 0) return "#fff";
  if (rank <= 1) return "var(--green)";
  if (rank >= valid.length - 2) return "var(--red)";
  return "#fff";
}

function MiniScorecard({ winners, losers }) {
  const all = [...winners, ...losers];

  const StatRow = ({ label, get, lower, fmt = (v) => v }) => {
    const vals = all.map(get);
    return (
      <ScorecardRow>
        <ScorecardLabel>{label}</ScorecardLabel>
        {winners.map((p, i) => {
          const v = get(p);
          return <ScorecardCell key={i} $color={statColor(vals, v, lower)}>{v != null ? fmt(v) : "—"}</ScorecardCell>;
        })}
        {losers.map((p, i) => {
          const v = get(p);
          return <ScorecardCell key={i} $divider={i === 0} $color={statColor(vals, v, lower)}>{v != null ? fmt(v) : "—"}</ScorecardCell>;
        })}
      </ScorecardRow>
    );
  };

  return (
    <ScorecardWrap>
      {/* Name headers */}
      <ScorecardRow>
        <ScorecardLabel />
        {winners.map((p, i) => <ScorecardNameCell key={i} $winner>{p.name}</ScorecardNameCell>)}
        {losers.map((p, i) => <ScorecardNameCell key={i} $divider={i === 0}>{p.name}</ScorecardNameCell>)}
      </ScorecardRow>

      {/* Hero portraits */}
      <ScorecardRow>
        <ScorecardLabel>Heroes</ScorecardLabel>
        {winners.map((p, i) => (
          <ScorecardHeroCell key={i}>
            {(p.heroes || []).map((h, j) => (
              <HeroWrap key={j}>
                <HeroImg src={`/heroes/${h.icon}.jpeg`} alt="" />
                <HeroLvl>{h.level}</HeroLvl>
              </HeroWrap>
            ))}
          </ScorecardHeroCell>
        ))}
        {losers.map((p, i) => (
          <ScorecardHeroCell key={i} $divider={i === 0}>
            {(p.heroes || []).map((h, j) => (
              <HeroWrap key={j}>
                <HeroImg src={`/heroes/${h.icon}.jpeg`} alt="" />
                <HeroLvl>{h.level}</HeroLvl>
              </HeroWrap>
            ))}
          </ScorecardHeroCell>
        ))}
      </ScorecardRow>

      <StatRow label="HK" get={(p) => p.heroKills} />
      <StatRow label="Exp" get={(p) => p.exp} fmt={(v) => v.toLocaleString()} />

      <ScorecardRow><ScorecardSectionDivider /></ScorecardRow>

      <StatRow label="Produced" get={(p) => p.unitsProduced} />
      <StatRow label="Killed" get={(p) => p.unitsKilled} />
      <StatRow label="Lg. Army" get={(p) => p.largestArmy} />

      <ScorecardRow><ScorecardSectionDivider /></ScorecardRow>

      <StatRow label="Gold" get={(p) => p.gold} fmt={(v) => `${(v / 1000).toFixed(1)}k`} />
      <StatRow label="Upkeep" get={(p) => p.upkeep} fmt={(v) => v > 0 ? v.toLocaleString() : "0"} lower />
    </ScorecardWrap>
  );
}

/* ── Page ─────────────────────────────────────── */

export default function BlurbLab() {
  const { adminKey, setAdminKey } = useAdmin();
  const routerHistory = useHistory();
  const location = useLocation();
  const [matches, setMatches] = useState([]);
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState(null);
  const [matchDetail, setMatchDetail] = useState(null);
  const [matchScores, setMatchScores] = useState([]);
  const [factSheet, setFactSheet] = useState(null);
  const [badges, setBadges] = useState([]);
  const [cachedRivals, setCachedRivals] = useState([]);
  const [factSheetOpen, setFactSheetOpen] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [outputHistory, setOutputHistory] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [error, setError] = useState(null);

  const authed = !!adminKey;

  const api = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${RELAY_URL}/api/admin/${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": adminKey,
          ...options.headers,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    },
    [adminKey]
  );

  useEffect(() => {
    if (!authed) return;
    api("blurb-lab/sample?count=20")
      .then((data) => {
        setMatches(data.matches || []);
        setDefaultPrompt(data.defaultPrompt || "");
        setPrompt((p) => p || data.defaultPrompt || "");
      })
      .catch((e) => setError(e.message));
  }, [authed, api]);

  // Auto-select from ?id= on load once matches are available
  useEffect(() => {
    if (!matches.length) return;
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if (id && !selected) {
      const m = matches.find((x) => x.id === id);
      if (m) selectMatch(m);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const selectMatch = async (m) => {
    routerHistory.replace(`/blurb-lab?id=${encodeURIComponent(m.id)}`);
    setSelected(m);
    // Pre-populate output + rivals from stored production data immediately.
    setOutput(m.cachedBlurb ? { instant: null, reactions: m.cachedBlurb, cached: true } : null);
    setCachedRivals(m.cachedRivals || []);
    setOutputHistory([]);
    setShowSaved(false);
    setError(null);
    setFactSheet(null);
    setBadges([]);
    setFactSheetOpen(false);
    setMatchDetail(null);
    setMatchScores([]);
    setSheetLoading(true);
    getMatch(m.id).then((detail) => {
      setMatchDetail(detail?.match || null);
      setMatchScores(detail?.playerScores || []);
    });
    try {
      const data = await api(`blurb-lab/fact-sheet/${encodeURIComponent(m.id)}`);
      setFactSheet(data.factSheet);
      setBadges(data.badges || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setSheetLoading(false);
    }
  };

  // Build player lookup: name → { mmr, race } from matchDetail
  const playerByName = useMemo(() => {
    if (!matchDetail?.teams) return new Map();
    const map = new Map();
    for (const team of matchDetail.teams) {
      for (const p of team.players || []) {
        const name = p.name || p.battleTag?.split("#")[0];
        if (name) map.set(name, { mmr: p.oldMmr ?? null, race: p.rndRace ?? p.race ?? null, won: p.won });
      }
    }
    return map;
  }, [matchDetail]);

  // Match end time in ms for relative time labels
  const endTimeMs = useMemo(() => {
    if (!matchDetail?.endTime) return null;
    return new Date(matchDetail.endTime).getTime();
  }, [matchDetail]);

  // Build team arrays for the chat card (must come before fact sheet parsing)
  const { winners, losers } = useMemo(() => {
    if (!matchDetail?.teams) return { winners: null, losers: null };
    const winnerIdx = matchDetail.teams.findIndex((t) =>
      t.players?.some((p) => p.won === true || p.won === 1)
    );
    if (winnerIdx < 0) return { winners: null, losers: null };
    const toPlayers = (team) =>
      (team?.players || []).map((p) => {
        const s = matchScores.find((sc) => sc.battleTag === p.battleTag) || {};
        return {
          battleTag: p.battleTag,
          name: p.name || p.battleTag?.split("#")[0],
          race: p.rndRace ?? p.race ?? null,
          mmr: p.oldMmr ?? null,
          gold: s.resourceScore?.goldCollected ?? null,
          upkeep: s.resourceScore?.goldUpkeepLost ?? null,
          heroKills: s.heroScore?.heroesKilled ?? null,
          exp: s.heroScore?.expGained ?? null,
          unitsProduced: s.unitScore?.unitsProduced ?? null,
          unitsKilled: s.unitScore?.unitsKilled ?? null,
          largestArmy: s.unitScore?.largestArmy ?? null,
          heroes: s.heroes || [],
        };
      });
    return {
      winners: toPlayers(matchDetail.teams[winnerIdx]),
      losers: toPlayers(matchDetail.teams[1 - winnerIdx]),
    };
  }, [matchDetail, matchScores]);

  // Parse fact sheet into stats + chat + rivalries sections
  const { mainFacts, chatLines, rivals } = useMemo(() => {
    const winnerNames = new Set((winners || []).map((p) => p.name));
    const parsed = parseFactSheet(factSheet, winnerNames);
    return { mainFacts: parsed.main, chatLines: parsed.chat, rivals: parsed.rivals };
  }, [factSheet, winners]);

  const generate = async () => {
    if (!selected || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await api("blurb-lab/preview", {
        method: "POST",
        body: JSON.stringify({ matchId: selected.id, systemPrompt: prompt }),
      });
      if (output) setOutputHistory((h) => [output, ...h].slice(0, 8));
      setOutput({ instant: data.instant, reactions: data.reactions });
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const keyRejected = !!error && /api key/i.test(error);

  const chatContent = (() => {
    if (!chatLines.length) {
      return (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxxs)", color: "var(--grey-mid)", padding: "var(--space-2) 0" }}>
          {sheetLoading ? "Loading chat…" : "No lounge chat for this game."}
        </div>
      );
    }
    const afterMsgs = chatLines.filter((m) => {
      const rel = relTime(m.receivedAt, endTimeMs);
      return rel && (rel.startsWith("+") || rel === "at whistle");
    });
    const beforeMsgs = chatLines.filter((m) => {
      const rel = relTime(m.receivedAt, endTimeMs);
      return !rel || (!rel.startsWith("+") && rel !== "at whistle");
    });
    const renderMsg = (msg, i) => {
      const player = playerByName.get(msg.userName);
      const raceIcon = player?.race != null ? raceMapping[player.race] : raceIcons.random;
      const rel = relTime(msg.receivedAt, endTimeMs);
      const isAfter = rel && (rel.startsWith("+") || rel === "at whistle");
      const absTime = formatTime(msg.receivedAt + " UTC");
      return (
        <ChatMsg key={i}>
          <ChatMsgHeader>
            <ChatAvatar src={raceIcon} alt="" />
            <ChatName>{msg.userName}</ChatName>
            {player?.mmr != null && <ChatMmr>{player.mmr} MMR</ChatMmr>}
            <ChatMmr>{absTime}</ChatMmr>
            {rel && <ChatRelTime $after={isAfter}>{rel}</ChatRelTime>}
          </ChatMsgHeader>
          <ChatText>{msg.message}</ChatText>
        </ChatMsg>
      );
    };
    return (
      <ChatMessages>
        {afterMsgs.length > 0 && (
          <>
            <ChatSectionHeader $after>after game</ChatSectionHeader>
            {afterMsgs.map(renderMsg)}
          </>
        )}
        {beforeMsgs.length > 0 && (
          <>
            {afterMsgs.length > 0 && <ChatDivider />}
            <ChatSectionHeader>before game</ChatSectionHeader>
            {beforeMsgs.map(renderMsg)}
          </>
        )}
      </ChatMessages>
    );
  })();

  if (!authed || keyRejected) {
    return (
      <KeyGate>
        {keyRejected ? (
          <ErrorText>The stored admin key was rejected by the relay — enter it again.</ErrorText>
        ) : (
          <div>Blurb Lab needs the relay admin key.</div>
        )}
        <input
          type="password"
          placeholder="Admin API key"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.value.trim()) {
              setError(null);
              setAdminKey(e.target.value.trim());
            }
          }}
        />
      </KeyGate>
    );
  }

  const mapImg = selected ? getMapImageUrl(selected.mapName) : null;
  const duration = selected
    ? `${Math.round(selected.durationInSeconds / 60)} min`
    : null;
  const matchPath = selected ? `/match/${encodeURIComponent(selected.id)}` : null;

  return (
    <Page>
      <Title>Blurb Lab</Title>
      <Subtitle>
        Pick a game to inspect the fact sheet and blurb, then edit the prompt and regenerate.
        Lab runs are never saved — production blurbs are unaffected.
      </Subtitle>
      {error && <ErrorText>{error}</ErrorText>}
      {/* ── Stage 1: pick a game ── */}
      {!selected && (
        <PickerGrid>
          {matches.map((m) => (
            <PickerCard key={m.id} onClick={() => selectMatch(m)}>
              <PickerMapImg
                src={getMapImageUrl(m.mapName)}
                alt=""
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <PickerCardBody>
                <PickerMapName>{m.mapName}</PickerMapName>
                <PickerMeta>{Math.round(m.durationInSeconds / 60)} min · {formatTime(m.endTime)}</PickerMeta>
                <PickerMeta>{m.players?.slice(0, 4).join(", ")}</PickerMeta>
                {m.cachedBlurb && <PickerBlurb>{stripBlurbMarkup(m.cachedBlurb)}</PickerBlurb>}
              </PickerCardBody>
              <PickerDot $has={!!m.cachedBlurb} />
            </PickerCard>
          ))}
          {matches.length === 0 && !error && <PeonLoader size="sm" />}
        </PickerGrid>
      )}

      {/* ── Stage 2: blurb workbench ── */}
      {selected && (
        <WorkbenchWrap>
          <BackButton onClick={() => { setSelected(null); setOutput(null); setFactSheet(null); setOutputHistory([]); }}>
            ← all games
          </BackButton>

          <WorkbenchColumns>
            {/* Left: lounge chat */}
            <ChatColumn>
              <ChatColumnLabel>Lounge chat</ChatColumnLabel>
              {chatContent}
            </ChatColumn>

            {/* Right: workbench controls */}
            <div>
          {selected && (
            <GameHeader>
              {mapImg && (
                <Link to={matchPath}>
                  <GameHeaderMap src={mapImg} alt="" onError={(e) => { e.target.style.display = "none"; }} />
                </Link>
              )}
              <GameHeaderInfo>
                <GameHeaderTitle>{selected.mapName}</GameHeaderTitle>
                <GameHeaderMeta>{duration} · ended {formatTime(selected.endTime)} · <Link to={matchPath} style={{ color: "var(--grey-light)" }}>score screen →</Link></GameHeaderMeta>
                {winners && losers ? (
                  <GameHeaderTeams>
                    <MiniTeamsRow
                      teamA={{ players: winners, winner: true }}
                      teamB={{ players: losers, winner: false }}
                      dimLosers
                      showChart
                    />
                  </GameHeaderTeams>
                ) : (
                  <GameHeaderMeta>{selected.players?.join(", ")}</GameHeaderMeta>
                )}
              </GameHeaderInfo>
            </GameHeader>
          )}
          {matchScores.length > 0 && winners && losers && (
            <Section>
              <MiniScorecard winners={winners} losers={losers} />
            </Section>
          )}
          <ControlsDivider />
          {selected && (
            <Section>
              <FactSheetToggle $open={factSheetOpen} onClick={() => setFactSheetOpen((v) => !v)}>
                {sheetLoading ? "Building fact sheet…" : "Fact sheet — stats & head-to-heads"}
                <ToggleArrow $open={factSheetOpen}>▶</ToggleArrow>
              </FactSheetToggle>
              {factSheetOpen && (
                mainFacts
                  ? <FactSheet>{mainFacts}</FactSheet>
                  : <FactSheet style={{ color: "var(--grey-mid)" }}>
                      {sheetLoading ? "Loading…" : "No fact sheet available."}
                    </FactSheet>
              )}
            </Section>
          )}

          <Section>
            <FactSheetToggle $open={promptOpen} onClick={() => setPromptOpen((v) => !v)}>
              System prompt
              <ToggleArrow $open={promptOpen}>▶</ToggleArrow>
            </FactSheetToggle>
            {promptOpen && (
              <PromptArea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                spellCheck={false}
                style={{ borderTop: "none", borderRadius: "0 0 var(--radius-md) var(--radius-md)" }}
              />
            )}
            <ButtonRow>
              <GenerateButton onClick={generate} disabled={!selected || generating || sheetLoading}>
                {generating ? "Generating…" : !selected ? "Pick a game first" : output && !output.cached ? "Regenerate" : "Generate blurb"}
              </GenerateButton>
              <ResetButton onClick={() => setPrompt(defaultPrompt)}>reset to default</ResetButton>
            </ButtonRow>
          </Section>

          {(output || outputHistory.length > 0) && (
            <Section>
              <Label>Generated output</Label>
              {output && !output.cached && (
                <>
                  <CompareCard $new style={{ marginBottom: "var(--space-2)" }}>
                    <CompareLabel $new>New (not saved)</CompareLabel>
                    {rivals.length > 0 && <RivalryBadge rivals={rivals} />}
                    {badges.length > 0 && <StreakBadges badges={badges} />}
                    <PhaseLabel>At the whistle (pre-reactions)</PhaseLabel>
                    <CompareBlurb $new $passed={!output.instant}>
                      {output.instant ? renderBlurbText(output.instant) : "PASS"}
                    </CompareBlurb>
                    <PhaseLabel>After reactions (5 min post-game)</PhaseLabel>
                    <CompareBlurb $new $passed={!output.reactions}>
                      {output.reactions ? renderBlurbText(output.reactions) : "PASS"}
                      {output.reactions === output.instant && output.reactions && <Unchanged> (same)</Unchanged>}
                    </CompareBlurb>
                  </CompareCard>
                  <button
                    onClick={() => setShowSaved((v) => !v)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "var(--text-xxxs)", color: "var(--grey-light)", padding: "0 0 var(--space-2) 0" }}
                  >
                    {showSaved ? "▾ hide saved blurb" : "▸ show saved blurb"}
                  </button>
                  {showSaved && (
                    <CompareCard style={{ marginBottom: "var(--space-2)" }}>
                      <CompareLabel>Saved in DB</CompareLabel>
                      {cachedRivals.length > 0 && <RivalryBadge rivals={cachedRivals} />}
                      {badges.length > 0 && <StreakBadges badges={badges} />}
                      <CompareBlurb $passed={!selected.cachedBlurb}>
                        {selected.cachedBlurb ? renderBlurbText(selected.cachedBlurb) : "No stored blurb"}
                      </CompareBlurb>
                    </CompareCard>
                  )}
                </>
              )}
              {output?.cached && (
                <>
                  <PhaseLabel>Stored blurb (final)</PhaseLabel>
                  <Output $passed={!output.reactions}>
                    {output.reactions ? renderBlurbText(output.reactions) : "PASS — nothing notable"}
                  </Output>
                </>
              )}
              {outputHistory.length > 0 && (
                <History>
                  {outputHistory.map((h, i) => (
                    <HistoryRow key={i}>{h.reactions ? renderBlurbText(h.reactions) : "PASS"}</HistoryRow>
                  ))}
                </History>
              )}
            </Section>
          )}

            </div>
            {/* end WorkbenchColumns right column */}
          </WorkbenchColumns>
        </WorkbenchWrap>
      )}
    </Page>
  );
}
