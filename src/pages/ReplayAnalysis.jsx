import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { FiArrowLeft } from "react-icons/fi";
import { PageLayout, RaceIcon } from "../components/ui";
import PeonLoader from "../components/PeonLoader";
import TransitionGlyph from "../components/replay-lab/TransitionGlyph";
import PlaystyleReport from "../components/replay-lab/PlaystyleReport";
import ActionTimeline from "../components/replay-lab/ActionTimeline";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RACE_MAP = {
  0: "random", 1: "human", 2: "orc", 4: "nightelf", 8: "undead",
  Human: "human", Orc: "orc", "Night Elf": "nightelf", Undead: "undead", Random: "random",
};

const TEAM_COLORS = ["var(--team-blue)", "var(--team-red)", "var(--gold)", "var(--cyan)"];

function formatDuration(seconds) {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

// Map order IDs to color categories for display
const OID_COLOR = (oid, id) => {
  if (!oid) {
    if (id === 0x18) return "#c8a84b";   // hotkey
    if (id === 0x17) return "#e67e22";   // assign
    if (id === 0x16) return "#5a5a6a";   // select
    if (id === 0x19) return "#555";      // tab (noise)
    if (id === 0x11 || id === 0x13) return "#4a9eff";  // point-target = move
    if (id === 0x12 || id === 0x14) return "#ef5350";  // unit-target = attack
    if (id === 0x10) return "#26c6da";   // instant ability
    return "rgba(255,255,255,0.4)";
  }
  if (oid === "move" || oid === "smart" || oid === "ssto") return "#4a9eff";
  if (oid === "amov" || oid === "Amov") return "#26c6da";
  if (oid === "satt" || oid === "Aatk") return "#ef5350";
  if (oid === "stop" || oid === "hold") return "rgba(255,255,255,0.4)";
  // Hero abilities (start with uppercase letter then uppercase)
  if (/^[A-Z][A-Z]/.test(oid)) return "#9b59b6";
  return "rgba(255,255,255,0.6)";
};

const NOISE_IDS = new Set([0x19, 0x16]); // Tab, Select

// Parse "4:30" or "4m30s" or plain seconds into milliseconds
function parseTimeInput(str) {
  const s = str.trim();
  const colonMatch = s.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    return (parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2])) * 1000;
  }
  const secOnly = s.match(/^(\d+)$/);
  if (secOnly) return parseInt(secOnly[1]) * 1000;
  return null;
}

export default function ReplayAnalysis() {
  const { id } = useParams();
  const replayId = parseInt(id);

  const [replay, setReplay] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("players");

  // Chat
  const [chat, setChat] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Sequences (raw commands)
  const [sequences, setSequences] = useState(null);
  const [seqLoading, setSeqLoading] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [hideNoise, setHideNoise] = useState(true);

  // Shared brush state from timeline
  const [brushMs, setBrushMs] = useState(null);
  const [timeInput, setTimeInput] = useState("");

  const applyTimeInput = useCallback((val) => {
    const ms = parseTimeInput(val || timeInput);
    if (ms == null) return;
    const totalMs = (replay?.gameDuration || 0) * 1000;
    const startMs = Math.max(0, ms);
    const endMs = totalMs > 0 ? Math.min(totalMs, ms + 60000) : ms + 60000;
    setBrushMs({ startMs, endMs });
    setTimeInput("");
  }, [timeInput, replay]);

  useEffect(() => {
    if (!replayId) return;
    setLoading(true);
    fetch(`${RELAY_URL}/api/fingerprints/replay/${replayId}/profiles`)
      .then((r) => r.json())
      .then((data) => {
        setReplay(data.replay || null);
        setProfiles(data.profiles || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [replayId]);

  const loadChat = useCallback(() => {
    if (chat !== null || chatLoading) return;
    setChatLoading(true);
    fetch(`${RELAY_URL}/api/fingerprints/replay/${replayId}/chat`)
      .then((r) => r.json())
      .then((data) => {
        setChat(data.messages || []);
        setChatLoading(false);
      })
      .catch(() => {
        setChat([]);
        setChatLoading(false);
      });
  }, [replayId, chat, chatLoading]);

  const loadSequences = useCallback(() => {
    if (sequences !== null || seqLoading) return;
    setSeqLoading(true);
    fetch(`${RELAY_URL}/api/fingerprints/replay/${replayId}/sequence`)
      .then((r) => r.json())
      .then((data) => {
        const seqs = data.sequences || [];
        setSequences(seqs);
        if (seqs.length > 0) setSelectedPlayerId(seqs[0].playerId);
        setSeqLoading(false);
      })
      .catch(() => {
        setSequences([]);
        setSeqLoading(false);
      });
  }, [replayId, sequences, seqLoading]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "chat") loadChat();
    if (tab === "commands") loadSequences();
  };

  // Filter sequence for display (selected player + optional brush window + noise filter)
  const displayedActions = useMemo(() => {
    if (!sequences) return [];
    const player = sequences.find((s) => s.playerId === selectedPlayerId);
    if (!player) return [];
    let actions = player.actions;
    if (hideNoise) actions = actions.filter((a) => !NOISE_IDS.has(a.id));
    if (!brushMs) return actions;
    return actions.filter((a) => a.ms >= brushMs.startMs && a.ms <= brushMs.endMs);
  }, [sequences, selectedPlayerId, brushMs, hideNoise]);

  const durationMs = (replay?.gameDuration || 0) * 1000;
  const mapName = replay?.mapName?.replace(/^.*[/\\]/, "").replace(/\.w3x$/i, "") || "Unknown Map";

  if (loading) {
    return (
      <PageLayout bare>
        <Centered>
          <PeonLoader />
        </Centered>
      </PageLayout>
    );
  }

  if (error || !replay) {
    return (
      <PageLayout bare>
        <Centered>
          <ErrorMsg>{error || "Replay not found"}</ErrorMsg>
          <BackLink to="/upload">← Upload a replay</BackLink>
        </Centered>
      </PageLayout>
    );
  }

  return (
    <PageLayout bare>
      <Inner>
        {/* Header */}
        <Header>
          <BackLink to="/upload">
            <FiArrowLeft size={14} /> Upload
          </BackLink>
          <ReplayMeta>
            <MapName>{mapName}</MapName>
            <MetaPill>{formatDuration(replay.gameDuration)}</MetaPill>
            {replay.matchType && <MetaPill>{replay.matchType}</MetaPill>}
            {replay.matchDate && (
              <MetaPill>{new Date(replay.matchDate).toLocaleDateString()}</MetaPill>
            )}
          </ReplayMeta>
        </Header>

        {/* Timeline */}
        {profiles.length > 0 && durationMs > 0 && (
          <TimelineSection>
            <ActionTimeline
              players={profiles.map((p) => ({
                playerName: p.playerName,
                race: p.race,
                timeline: p.profileData?.timeline,
              }))}
              durationMs={durationMs}
              brushMs={brushMs}
              onBrushChange={setBrushMs}
            />
            <TimelineControls>
              <TimeInputWrap>
                <TimeInputField
                  type="text"
                  value={timeInput}
                  placeholder="4:30"
                  onChange={(e) => setTimeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyTimeInput()}
                />
                <GoBtn onClick={() => applyTimeInput()}>+1 min</GoBtn>
              </TimeInputWrap>
              {brushMs && (
                <ClearBrush onClick={() => setBrushMs(null)}>
                  ✕ {formatMs(brushMs.startMs)} – {formatMs(brushMs.endMs)}
                </ClearBrush>
              )}
            </TimelineControls>
          </TimelineSection>
        )}

        {/* Tabs */}
        <TabBar>
          {["players", "chat", "commands"].map((t) => (
            <Tab key={t} $active={activeTab === t} onClick={() => handleTabChange(t)}>
              {t === "players" && `Players (${profiles.length})`}
              {t === "chat" && "Chat"}
              {t === "commands" && "Commands"}
            </Tab>
          ))}
        </TabBar>

        {/* Players tab */}
        {activeTab === "players" && (
          <PlayersGrid>
            {profiles.map((p, i) => (
              <PlayerCard key={i} profile={p} />
            ))}
          </PlayersGrid>
        )}

        {/* Chat tab */}
        {activeTab === "chat" && (
          <ChatPanel>
            {chatLoading ? (
              <Centered><PeonLoader size="sm" /></Centered>
            ) : chat === null ? (
              <Centered><dim>Loading…</dim></Centered>
            ) : chat.length === 0 ? (
              <EmptyState>No chat messages in this replay</EmptyState>
            ) : (
              <ChatLog>
                {chat.map((m, i) => (
                  <ChatMsg key={i} $allies={m.mode === "Allies"}>
                    <ChatTime>{formatMs(m.timeMs)}</ChatTime>
                    <ChatMode $allies={m.mode === "Allies"}>
                      {m.mode === "Allies" ? "[Allies]" : "[All]"}
                    </ChatMode>
                    <ChatSender>{m.playerName}:</ChatSender>
                    <ChatText>{m.message}</ChatText>
                  </ChatMsg>
                ))}
              </ChatLog>
            )}
          </ChatPanel>
        )}

        {/* Commands tab */}
        {activeTab === "commands" && (
          <CommandsPanel>
            {seqLoading ? (
              <Centered><PeonLoader size="sm" /></Centered>
            ) : sequences === null ? (
              <Centered><dim>Loading…</dim></Centered>
            ) : (
              <>
                <PlayerPicker>
                  {sequences.map((s) => {
                    const race = RACE_MAP[s.race] || "random";
                    return (
                      <PlayerTab
                        key={s.playerId}
                        $active={selectedPlayerId === s.playerId}
                        onClick={() => setSelectedPlayerId(s.playerId)}
                      >
                        <RaceIcon race={race} size={14} />
                        {s.playerName.split("#")[0]}
                      </PlayerTab>
                    );
                  })}
                </PlayerPicker>

                <SeqToolbar>
                  <SeqMeta>
                    {brushMs
                      ? `${displayedActions.length} actions · ${formatMs(brushMs.startMs)} – ${formatMs(brushMs.endMs)}`
                      : `${displayedActions.length} actions`}
                  </SeqMeta>
                  <NoiseToggle $active={hideNoise} onClick={() => setHideNoise((h) => !h)}>
                    {hideNoise ? "Tab/Select hidden" : "Show all"}
                  </NoiseToggle>
                </SeqToolbar>

                <SeqList>
                  {displayedActions.slice(0, 2000).map((a, i) => (
                    <SeqRow key={i}>
                      <SeqTime>{formatMs(a.ms)}</SeqTime>
                      <SeqLabel style={{ color: OID_COLOR(a.oid, a.id) }}>
                        {a.label}
                      </SeqLabel>
                      {/* Show raw ability code as secondary when unrecognized */}
                      {a.oid && a.label === a.oid && /^[A-Z]/.test(a.oid) && (
                        <SeqGloss>{a.oid}</SeqGloss>
                      )}
                    </SeqRow>
                  ))}
                  {displayedActions.length > 2000 && (
                    <TruncNote>Showing first 2000 of {displayedActions.length} actions</TruncNote>
                  )}
                </SeqList>
              </>
            )}
          </CommandsPanel>
        )}
      </Inner>
    </PageLayout>
  );
}

// ── Player card component ──────────────────────────────────────────────────────

function PlayerCard({ profile }) {
  const [expanded, setExpanded] = useState(false);
  const race = RACE_MAP[profile.race] || "random";
  const pd = profile.profileData || {};
  const apm = pd.averaged?.segments
    ? Math.round((pd.averaged.segments.apm?.[0] || 0) * 300)
    : null;

  return (
    <ProfileCard $expanded={expanded}>
      <ProfileHeader onClick={() => setExpanded(!expanded)}>
        <RaceIcon race={race} size={22} />
        <ProfileName>{profile.playerName}</ProfileName>
        {apm != null && <ProfileApm>{apm} APM</ProfileApm>}
        <Chevron>{expanded ? "▲" : "▼"}</Chevron>
      </ProfileHeader>

      <ProfileSummary>
        <GlyphWrap>
          <TransitionGlyph
            transitionPairs={pd.transitionPairs || []}
            groupUsage={pd.groupUsage || []}
            groupCompositions={pd.groupCompositions || {}}
            segments={pd.averaged?.segments}
            playerName=""
            mini
          />
        </GlyphWrap>
      </ProfileSummary>

      {expanded && (
        <ProfileDetails>
          <PlaystyleReport profileData={pd} />
        </ProfileDetails>
      )}
    </ProfileCard>
  );
}

// ── Styled Components ──────────────────────────────────────────────────────────

const Inner = styled.div`
  max-width: 1300px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) var(--space-12);
`;

const Centered = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) 0;
  gap: var(--space-4);
`;

const ErrorMsg = styled.div`
  font-family: var(--font-mono);
  color: var(--red);
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--grey-light);
  text-decoration: none;
  margin-bottom: var(--space-4);
  transition: color 0.2s;

  &:hover {
    color: var(--gold);
  }
`;

const Header = styled.div`
  margin-bottom: var(--space-4);
`;

const ReplayMeta = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
`;

const MapName = styled.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin: 0;
`;

const MetaPill = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--grey-light);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--grey-mid);
  border-radius: 20px;
  padding: 4px 14px;
`;

const TimelineSection = styled.div`
  margin-bottom: var(--space-4);
`;

const TimelineControls = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-2);
`;

const TimeInputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const TimeInputField = styled.input`
  width: 80px;
  padding: 5px 10px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
  color: var(--grey-light);
  outline: none;
  text-align: center;

  &:focus {
    border-color: var(--gold);
    color: #fff;
  }

  &::placeholder {
    color: #3a3a4a;
  }
`;

const GoBtn = styled.button`
  padding: 5px 14px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: rgba(200, 168, 75, 0.1);
  border: 1px solid rgba(200, 168, 75, 0.4);
  border-radius: var(--radius-sm);
  color: var(--gold);
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(200, 168, 75, 0.2);
  }
`;

const ClearBrush = styled.button`
  background: none;
  border: none;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-mid);
  cursor: pointer;
  padding: 0;

  &:hover {
    color: var(--gold);
  }
`;

const TabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--grey-mid);
  margin-bottom: var(--space-6);
`;

const Tab = styled.button`
  background: none;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? "var(--gold)" : "transparent")};
  padding: var(--space-4) var(--space-6);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  transition: color 0.2s, border-color 0.2s;
  margin-bottom: -1px;

  &:hover {
    color: var(--gold);
  }
`;

const PlayersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(560px, 1fr));
  gap: var(--space-4);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

// Player card
const ProfileCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${(p) => (p.$expanded ? "var(--gold)" : "var(--grey-mid)")};
  border-radius: var(--radius-md);
  padding: var(--space-4);
  transition: border-color 0.2s;
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  margin-bottom: var(--space-3);

  &:hover span:first-of-type {
    color: var(--gold);
  }
`;

const ProfileName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ProfileApm = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--grey-light);
`;

const Chevron = styled.span`
  font-size: 13px;
  color: var(--grey-light);
`;

const ProfileSummary = styled.div``;

const GlyphWrap = styled.div`
  width: 140px;
  height: 140px;
`;

const ProfileDetails = styled.div`
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--grey-mid);
`;

// Chat
const ChatPanel = styled.div`
  max-height: 600px;
  overflow-y: auto;
`;

const ChatLog = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ChatMsg = styled.div`
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding: 6px var(--space-3);
  border-radius: var(--radius-sm);
  background: ${(p) => (p.$allies ? "rgba(74, 158, 255, 0.05)" : "transparent")};

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const ChatTime = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.35);
  min-width: 40px;
  flex-shrink: 0;
`;

const ChatMode = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: ${(p) => (p.$allies ? "var(--team-blue)" : "var(--grey-light)")};
  min-width: 56px;
  flex-shrink: 0;
`;

const ChatSender = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  min-width: 0;
  white-space: nowrap;
`;

const ChatText = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.9);
`;

// Commands
const CommandsPanel = styled.div``;

const PlayerPicker = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
`;

const PlayerTab = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  background: ${(p) => (p.$active ? "rgba(200,168,75,0.1)" : "rgba(255,255,255,0.03)")};
  border: 1px solid ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
  border-radius: var(--radius-sm);
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
  }
`;

const SeqToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
`;

const SeqMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
`;

const NoiseToggle = styled.button`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: ${(p) => (p.$active ? "rgba(200,168,75,0.1)" : "rgba(255,255,255,0.04)")};
  border: 1px solid ${(p) => (p.$active ? "rgba(200,168,75,0.4)" : "var(--grey-mid)")};
  border-radius: var(--radius-sm);
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
  }
`;

const SeqList = styled.div`
  height: 560px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
`;

const SeqRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: 5px var(--space-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);

  &:nth-child(even) {
    background: rgba(255, 255, 255, 0.02);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`;

const SeqTime = styled.span`
  color: rgba(255, 255, 255, 0.45);
  min-width: 48px;
  flex-shrink: 0;
`;

const SeqLabel = styled.span`
  font-size: var(--text-sm);
  min-width: 110px;
  font-weight: 500;
`;

const SeqGloss = styled.span`
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.35);
  font-style: italic;
`;


const TruncNote = styled.div`
  padding: var(--space-3);
  text-align: center;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-mid);
`;

const EmptyState = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-align: center;
  padding: var(--space-8) 0;
`;
