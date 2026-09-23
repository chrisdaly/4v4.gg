import React, { useState, useEffect } from "react";
import { fetchAndCacheProfile, getCachedProfile } from "../lib/profileCache";
import ChatMessage from "./chat/ChatMessage";
import "./RecentConversations.css";

import { RELAY_URL } from "../lib/relay";

const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes = new conversation
const MAX_CONVERSATIONS = 3;
const CONTEXT_PADDING_MINUTES = 2; // minutes before first and after last player message

function parseTimestamp(ts) {
  if (!ts) return null;
  return new Date(ts.endsWith?.("Z") ? ts : ts + "Z");
}

// Relay timestamps are "YYYY-MM-DD HH:MM:SS" UTC; ChatMessage wants ISO
function toIso(ts) {
  const d = parseTimestamp(ts);
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : undefined;
}

function formatDateShort(ts) {
  const d = parseTimestamp(ts);
  if (!d) return "";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Consecutive same-author messages -> one ChatMessage group
export function groupMessages(messages) {
  const groups = [];
  messages.forEach((msg, i) => {
    const tag = msg.battle_tag || "";
    const line = {
      id: `rc-${i}`,
      text: msg.message || msg.text || "",
      sentAt: toIso(msg.received_at || msg.sent_at),
    };
    const last = groups[groups.length - 1];
    if (last && last.author.battleTag === tag) {
      last.lines.push(line);
    } else {
      groups.push({
        author: { battleTag: tag, userName: msg.user_name || msg.name || tag.split("#")[0] },
        lines: [line],
      });
    }
  });
  return groups;
}

/**
 * RecentConversations - Shows recent chat sessions where a player participated,
 * including surrounding context (other players' messages)
 */
export default function RecentConversations({ battleTag, playerName }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState(new Map());
  const [activeIdx, setActiveIdx] = useState(0);

  const playerNameLower = playerName?.toLowerCase() || "";

  // Fetch player messages and build conversations
  useEffect(() => {
    setActiveIdx(0);
    if (!playerName) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const fetchConversations = async () => {
      setLoading(true);
      try {
        // Get player's messages from recent history
        const res = await fetch(
          `${RELAY_URL}/api/admin/messages/search?player=${encodeURIComponent(playerName)}&limit=50`
        );
        if (!res.ok) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const data = await res.json();
        const playerMessages = data.results || [];

        if (playerMessages.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Group into sessions (gaps > SESSION_GAP_MS)
        const sessions = [];
        let currentSession = [];

        for (let i = 0; i < playerMessages.length; i++) {
          const msg = playerMessages[i];
          const msgTime = parseTimestamp(msg.received_at || msg.sent_at);

          if (currentSession.length === 0) {
            currentSession.push(msg);
          } else {
            const lastMsg = currentSession[currentSession.length - 1];
            const lastTime = parseTimestamp(lastMsg.received_at || lastMsg.sent_at);

            if (lastTime && msgTime && Math.abs(lastTime - msgTime) > SESSION_GAP_MS) {
              sessions.push(currentSession);
              currentSession = [msg];
            } else {
              currentSession.push(msg);
            }
          }
        }
        if (currentSession.length > 0) {
          sessions.push(currentSession);
        }

        // Take first N sessions (most recent)
        const recentSessions = sessions.slice(0, MAX_CONVERSATIONS);

        // For each session, fetch messages around the time range
        // The context endpoint uses center + padding, so we calculate:
        // - Center: midpoint between first and last player message
        // - Padding: half the duration + extra context padding
        const convos = await Promise.all(
          recentSessions.map(async (session) => {
            const times = session
              .map(m => parseTimestamp(m.received_at || m.sent_at))
              .filter(Boolean)
              .sort((a, b) => a - b);

            if (times.length === 0) {
              return {
                playerMessages: session,
                contextMessages: session,
                startTime: null,
                endTime: null,
              };
            }

            const startTime = times[0];
            const endTime = times[times.length - 1];

            // Calculate center point and padding to cover the full range
            const centerTime = new Date((startTime.getTime() + endTime.getTime()) / 2);
            const durationMinutes = (endTime - startTime) / 60000;
            const paddingMinutes = Math.ceil(durationMinutes / 2) + CONTEXT_PADDING_MINUTES;

            // Format center time for API
            const formatForApi = (d) => d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");

            try {
              const ctxRes = await fetch(
                `${RELAY_URL}/api/admin/messages/search/context?received_at=${encodeURIComponent(formatForApi(centerTime))}&padding=${paddingMinutes}`
              );
              if (ctxRes.ok) {
                const ctxData = await ctxRes.json();
                return {
                  playerMessages: session,
                  contextMessages: ctxData || [],
                  startTime: formatDateShort(startTime),
                  endTime,
                };
              }
            } catch (err) {
              console.error("Context fetch failed:", err);
            }

            return {
              playerMessages: session,
              contextMessages: session,
              startTime: formatDateShort(startTime),
              endTime,
            };
          })
        );

        setConversations(convos);

        // Fetch profiles for all participants
        const allTags = new Set();
        for (const convo of convos) {
          for (const msg of convo.contextMessages) {
            if (msg.battle_tag) allTags.add(msg.battle_tag);
          }
        }
        for (const tag of allTags) {
          const cached = getCachedProfile(tag);
          if (cached) {
            setProfiles((prev) => new Map(prev).set(tag, cached));
          } else {
            fetchAndCacheProfile(tag).then((p) => {
              if (p) setProfiles((prev) => new Map(prev).set(tag, p));
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
        setConversations([]);
      }
      setLoading(false);
    };

    fetchConversations();
  }, [playerName]);

  if (loading) {
    return <div className="rc-loading">Loading conversations...</div>;
  }

  if (conversations.length === 0) {
    return <div className="rc-empty">No recent conversations</div>;
  }

  const activeConvo = conversations[activeIdx];
  const groups = activeConvo ? groupMessages(activeConvo.contextMessages) : [];

  // Get unique participants for each conversation (for tab labels)
  const getParticipants = (convo) => {
    const names = new Set();
    for (const msg of convo.contextMessages) {
      const name = (msg.user_name || msg.name || "").toLowerCase();
      if (name && name !== playerNameLower) {
        names.add(msg.user_name || msg.name);
      }
    }
    return [...names].slice(0, 2);
  };

  return (
    <div className="rc-container">
      {/* Vertical tabs */}
      <div className="rc-tabs">
        {conversations.map((convo, idx) => {
          const participants = getParticipants(convo);
          const isActive = idx === activeIdx;

          return (
            <button
              key={idx}
              className={`rc-tab ${isActive ? "rc-tab--active" : ""}`}
              onClick={() => setActiveIdx(idx)}
            >
              <span className="rc-tab-date">{convo.startTime}</span>
              <span className="rc-tab-count">
                {convo.playerMessages.length} msg{convo.playerMessages.length !== 1 ? "s" : ""}
              </span>
              {participants.length > 0 && (
                <span className="rc-tab-with">
                  w/ {participants.join(", ")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active conversation messages */}
      <div className="rc-messages">
        {groups.length === 0 ? (
          <div className="rc-empty">No messages</div>
        ) : (
          groups.map((group, gi) => (
            <ChatMessage
              key={gi}
              variant="transcript"
              group={group}
              meta={{ avatarUrl: profiles.get(group.author.battleTag)?.pic }}
              target={group.author.userName?.toLowerCase() === playerNameLower}
            />
          ))
        )}
      </div>
    </div>
  );
}
