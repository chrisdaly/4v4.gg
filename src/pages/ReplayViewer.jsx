import React, { useState, useCallback, useRef } from "react";
import styled from "styled-components";
import { FiUpload, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { PageLayout, PageHero, RaceIcon } from "../components/ui";
import PeonLoader from "../components/PeonLoader";
import TransitionGlyph from "../components/replay-lab/TransitionGlyph";
import PlaystyleReport from "../components/replay-lab/PlaystyleReport";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RACE_MAP = {
  0: "random", 1: "human", 2: "orc", 4: "nightelf", 8: "undead",
  Human: "human", Orc: "orc", "Night Elf": "nightelf", Undead: "undead", Random: "random",
};

// Format game time as mm:ss
const formatTime = (ms) => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

// Format duration in seconds as mm:ss
const formatDuration = (seconds) => {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export default function ReplayViewer() {
  const fileRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const resetUpload = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const uploadFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".w3g")) {
      setError("Please select a .w3g replay file");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append("replay", file);

    try {
      const res = await fetch(`${RELAY_URL}/api/replays/parse`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "Parse failed");
        setUploading(false);
        return;
      }

      setResult(data);
      setUploading(false);
    } catch (err) {
      setError(err.message || "Parse failed");
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer?.files;
    if (files?.length > 0) uploadFile(files[0]);
  }, [uploadFile]);

  const handleFileSelect = useCallback((e) => {
    const files = e.target?.files;
    if (files?.length > 0) uploadFile(files[0]);
    if (fileRef.current) fileRef.current.value = "";
  }, [uploadFile]);

  const chatMessages = result?.chat || [];
  const mapName = result?.metadata?.mapName?.replace(/^.*[/\\]/, '').replace(/\.w3x$/i, '') || "Unknown Map";

  return (
    <PageLayout bare header={
      <PageHero
        eyebrow="Old Replay Viewer"
        title="Chat & Playstyles"
        lead="Upload a .w3g to view in-game chat and player fingerprints"
        lg
      />
    }>
      <Inner>
        {result ? (
          <>
            {/* Game Header */}
            <GameHeader>
              <MapName>{mapName}</MapName>
              <GameMeta>
                {formatDuration(result.metadata?.gameDuration)} · {result.metadata?.matchType || "?"} · {chatMessages.length} messages
              </GameMeta>
            </GameHeader>

            {/* Two Column Layout */}
            <ContentGrid>
              {/* Chat Column */}
              <ChatColumn>
                <SectionLabel>Chat Log</SectionLabel>
                {chatMessages.length === 0 ? (
                  <EmptyState>No chat messages</EmptyState>
                ) : (
                  <ChatLog>
                    {chatMessages.map((msg, i) => (
                      <ChatMessage key={i} $isAllies={msg.mode === "Allies"}>
                        <ChatTime>{formatTime(msg.timeMs)}</ChatTime>
                        <ChatSender>{msg.playerName}:</ChatSender>
                        <ChatText>{msg.message}</ChatText>
                      </ChatMessage>
                    ))}
                  </ChatLog>
                )}
              </ChatColumn>

              {/* Players Column */}
              <PlayersColumn>
                <SectionLabel>Players</SectionLabel>
                <ProfileList>
                  {(result.profiles || []).map((player, i) => (
                    <PlayerProfileCard key={i} player={player} />
                  ))}
                </ProfileList>
              </PlayersColumn>
            </ContentGrid>

            <UploadAnother onClick={resetUpload}>
              Upload another replay
            </UploadAnother>
          </>
        ) : (
          <>
            <DropZone
              $active={dragActive}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onClick={() => !uploading && fileRef.current?.click()}
            >
              {uploading ? (
                <>
                  <PeonLoader size="sm" />
                  <DropLabel>Parsing replay...</DropLabel>
                </>
              ) : (
                <>
                  <DropIcon size={32} $active={dragActive} />
                  <DropLabel $active={dragActive}>
                    {dragActive ? "Drop .w3g file here" : "Drop .w3g file or click to browse"}
                  </DropLabel>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".w3g"
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />
            </DropZone>

            {error && <ErrorText>{error}</ErrorText>}

            <Hint>
              Nothing is stored — purely ephemeral parsing for old replays.
            </Hint>
          </>
        )}
      </Inner>
    </PageLayout>
  );
}

// Player profile card (matches Upload.jsx style)
function PlayerProfileCard({ player }) {
  const [expanded, setExpanded] = useState(false);
  const race = RACE_MAP[player.race] || "random";
  const pd = player.profileData || {};

  // Extract metrics
  const getMetrics = () => {
    if (!pd?.averaged?.segments) return null;
    const { segments } = pd.averaged;
    const { apm = [0, 0, 0] } = segments;
    const meanApm = Math.round(apm[0] * 300);

    const activeGroups = (pd.groupUsage || []).filter(
      (g) => (g.used + g.assigned) > 0
    ).length;

    const reassignRatio = pd.actionCounts?.reassignRatio || 0;

    return { meanApm, activeGroups, reassignRatio };
  };

  const metrics = getMetrics();

  return (
    <ProfileCard $expanded={expanded}>
      <ProfileHeader onClick={() => setExpanded(!expanded)}>
        <RaceIcon race={race} size={28} />
        <PlayerName>{player.playerName}</PlayerName>
        <ExpandButton>
          {expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
        </ExpandButton>
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

        {metrics && (
          <MetricsRow>
            <Metric>
              <MetricValue>{metrics.meanApm}</MetricValue>
              <MetricLabel>APM</MetricLabel>
            </Metric>
            <Metric>
              <MetricValue>{metrics.activeGroups}</MetricValue>
              <MetricLabel>Groups</MetricLabel>
            </Metric>
            <Metric>
              <MetricValue>{metrics.reassignRatio}%</MetricValue>
              <MetricLabel>Rebind</MetricLabel>
            </Metric>
          </MetricsRow>
        )}
      </ProfileSummary>

      {expanded && (
        <ProfileDetails>
          <PlaystyleReport profileData={pd} />
        </ProfileDetails>
      )}
    </ProfileCard>
  );
}

// ── Styled Components ────────────────────────────

const Inner = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
`;

const DropZone = styled.div`
  border: 2px dashed ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
  border-radius: var(--radius-md);
  padding: var(--space-12) var(--space-4);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${(p) => (p.$active ? "var(--gold-tint)" : "var(--surface-1)")};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);

  &:hover {
    border-color: var(--gold);
    background: var(--gold-tint);
  }
`;

const DropLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};
`;

const DropIcon = styled(FiUpload)`
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
`;

const ErrorText = styled.div`
  margin-top: var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--red);
  text-align: center;
  padding: var(--space-3);
  background: var(--red-tint);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: var(--radius-sm);
`;

const Hint = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-align: center;
  margin-top: var(--space-6);
`;

// Game Header
const GameHeader = styled.div`
  margin-bottom: var(--space-4);
`;

const MapName = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin: 0 0 var(--space-1) 0;
`;

const GameMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--grey-light);
`;

// Two column grid
const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const SectionLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-3);
`;

const ChatColumn = styled.div`
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  max-height: 600px;
  overflow-y: auto;
`;

const PlayersColumn = styled.div`
  max-height: 600px;
  overflow-y: auto;
`;

const ChatLog = styled.div`
  display: flex;
  flex-direction: column;
`;

const ChatMessage = styled.div`
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: ${(p) => (p.$isAllies ? "rgba(76, 175, 80, 0.05)" : "transparent")};
  border-left: 2px solid ${(p) => (p.$isAllies ? "var(--green)" : "transparent")};

  &:hover {
    background: rgba(255,255,255,0.02);
  }
`;

const ChatTime = styled.span`
  color: var(--grey-mid);
  min-width: 40px;
  flex-shrink: 0;
`;

const ChatSender = styled.span`
  color: var(--gold);
  flex-shrink: 0;
  min-width: 100px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChatText = styled.span`
  color: #fff;
  word-break: break-word;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: var(--space-8);
  color: var(--grey-light);
  font-family: var(--font-mono);
`;

const ProfileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

// Profile card (matches Upload.jsx)
const ProfileCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${(p) => (p.$expanded ? "var(--gold)" : "var(--grey-mid)")};
  border-radius: var(--radius-md);
  padding: var(--space-4);
  transition: border-color 0.2s ease;
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--grey-mid);
  margin-bottom: var(--space-3);

  &:hover {
    color: var(--gold);
  }
`;

const PlayerName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ExpandButton = styled.span`
  color: var(--grey-light);
  display: flex;
  align-items: center;
  transition: color 0.2s ease;

  ${ProfileHeader}:hover & {
    color: var(--gold);
  }
`;

const ProfileSummary = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-6);

  @media (max-width: 500px) {
    flex-direction: column;
  }
`;

const GlyphWrap = styled.div`
  width: 160px;
  height: 160px;
  flex-shrink: 0;
`;

const MetricsRow = styled.div`
  display: flex;
  gap: var(--space-6);
  flex: 1;
  justify-content: center;
`;

const Metric = styled.div`
  text-align: center;
`;

const MetricValue = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  color: #fff;
  font-weight: 600;
`;

const MetricLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ProfileDetails = styled.div`
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--grey-mid);
`;

const UploadAnother = styled.button`
  width: 100%;
  margin-top: var(--space-4);
  padding: var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--grey-light);
  background: transparent;
  border: 1px dashed var(--grey-mid);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--gold);
    border-color: var(--gold);
  }
`;
