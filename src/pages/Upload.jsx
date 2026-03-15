import React, { useState, useCallback, useRef } from "react";
import styled from "styled-components";
import { FiUpload, FiCheck, FiChevronDown, FiChevronUp } from "react-icons/fi";
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

export default function Upload() {
  const fileRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [profiles, setProfiles] = useState([]);

  const resetUpload = useCallback(() => {
    setResult(null);
    setProfiles([]);
    setError(null);
  }, []);

  const uploadFile = useCallback(
    async (file) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".w3g")) {
        setError("Please select a .w3g replay file");
        return;
      }

      setUploading(true);
      setError(null);
      setResult(null);
      setProfiles([]);

      const form = new FormData();
      form.append("replay", file);

      try {
        const res = await fetch(`${RELAY_URL}/api/fingerprints/upload`, {
          method: "POST",
          body: form,
        });
        const data = await res.json();

        if (!data.ok) {
          setError(data.error || "Upload failed");
          setUploading(false);
          return;
        }

        // Show success state with replay info
        setResult({
          id: data.replay?.id,
          filename: file.name,
          mapName: data.replay?.mapName,
          duration: data.replay?.gameDuration,
          players: data.players || [],
        });

        // Fetch full profile data for this replay
        if (data.replay?.id) {
          try {
            const profileRes = await fetch(`${RELAY_URL}/api/fingerprints/replay/${data.replay.id}/profiles`);
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              setProfiles(profileData.profiles || []);
            }
          } catch (e) {
            console.error("Failed to fetch profiles:", e);
          }
        }

        setUploading(false);
      } catch (err) {
        setError(err.message || "Upload failed");
        setUploading(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragActive(false);
      const files = e.dataTransfer?.files;
      if (files?.length > 0) uploadFile(files[0]);
    },
    [uploadFile]
  );

  const handleFileSelect = useCallback(
    (e) => {
      const files = e.target?.files;
      if (files?.length > 0) uploadFile(files[0]);
      if (fileRef.current) fileRef.current.value = "";
    },
    [uploadFile]
  );

  // Format duration as m:ss
  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Extract key metrics from profile
  const getMetrics = (profileData) => {
    if (!profileData?.averaged?.segments) return null;
    const { segments } = profileData.averaged;
    const { apm = [0, 0, 0] } = segments;
    const meanApm = Math.round(apm[0] * 300);

    // Count active groups
    const activeGroups = (profileData.groupUsage || []).filter(
      (g) => (g.used + g.assigned) > 0
    ).length;

    // Get reassign ratio
    const reassignRatio = profileData.actionCounts?.reassignRatio || 0;

    return { meanApm, activeGroups, reassignRatio };
  };

  // Individual player card with expandable details
  const PlayerProfileCard = ({ player }) => {
    const [expanded, setExpanded] = useState(false);
    const race = RACE_MAP[player.race] || "random";
    const metrics = getMetrics(player.profileData);
    const pd = player.profileData || {};

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
  };

  return (
    <PageLayout bare>
      <Inner>
        <PageHero title="Upload Replay" lead="Drop a .w3g file to analyze" />

        {result ? (
          // Success state
          <SuccessCard>
            <SuccessHeader>
              <FiCheck size={24} />
              <span>Replay Analyzed</span>
            </SuccessHeader>

            <ReplayInfo>
              <InfoRow>
                <InfoLabel>File</InfoLabel>
                <InfoValue>{result.filename}</InfoValue>
              </InfoRow>
              {result.mapName && (
                <InfoRow>
                  <InfoLabel>Map</InfoLabel>
                  <InfoValue>{result.mapName}</InfoValue>
                </InfoRow>
              )}
              {result.duration && (
                <InfoRow>
                  <InfoLabel>Duration</InfoLabel>
                  <InfoValue>{formatDuration(result.duration)}</InfoValue>
                </InfoRow>
              )}
              <InfoRow>
                <InfoLabel>Players</InfoLabel>
                <InfoValue>{result.players.length}</InfoValue>
              </InfoRow>
            </ReplayInfo>

            {profiles.length > 0 ? (
              <PlayerSection>
                <PlayerLabel>Player Playstyles</PlayerLabel>
                <ProfileList>
                  {profiles.map((p, i) => (
                    <PlayerProfileCard key={i} player={p} />
                  ))}
                </ProfileList>
              </PlayerSection>
            ) : result.players.length > 0 ? (
              <PlayerSection>
                <PlayerLabel>Players</PlayerLabel>
                <PlayerGrid>
                  {result.players.map((p, i) => {
                    const tag = p.battleTag || p.player_name || p.playerName || `Player ${i + 1}`;
                    const race = RACE_MAP[p.race] || "random";
                    return (
                      <PlayerCard key={i}>
                        <RaceIcon race={race} size={24} />
                        <PlayerNameSimple>{tag.split("#")[0]}</PlayerNameSimple>
                      </PlayerCard>
                    );
                  })}
                </PlayerGrid>
              </PlayerSection>
            ) : null}

            <UploadAnother onClick={resetUpload}>
              Upload another replay
            </UploadAnother>
          </SuccessCard>
        ) : (
          // Upload state
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
                  <DropLabel>Analyzing replay...</DropLabel>
                </>
              ) : (
                <>
                  <DropIcon size={32} $active={dragActive} />
                  <DropLabel $active={dragActive}>
                    {dragActive
                      ? "Drop .w3g file here"
                      : "Drop .w3g file or click to browse"}
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
              Replays are parsed to extract player fingerprints based on APM, hotkey
              usage, action patterns, and timing.
            </Hint>
          </>
        )}
      </Inner>
    </PageLayout>
  );
}

// ── Styled Components ────────────────────────────

const Inner = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);

  > * {
    animation: reveal-up 600ms cubic-bezier(0.17, 0.76, 0.28, 1) both;
  }

  > *:nth-child(1) { animation-delay: 0.05s; }
  > *:nth-child(2) { animation-delay: 0.1s; }
  > *:nth-child(3) { animation-delay: 0.15s; }

  @keyframes reveal-up {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion) {
    > * {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
`;

const DropZone = styled.div`
  max-width: 600px;
  margin: 0 auto;
  border: 2px dashed ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
  border-radius: var(--radius-md);
  padding: var(--space-12) var(--space-4);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.17, 0.76, 0.28, 1);
  background: ${(p) => (p.$active ? "var(--gold-tint)" : "var(--surface-1)")};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);

  &:hover {
    border-color: var(--gold);
    background: var(--gold-tint);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
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
  max-width: 600px;
  margin: var(--space-4) auto 0;
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

// Success state styles
const SuccessCard = styled.div`
  background: var(--surface-1);
  border: var(--border-thick) solid var(--green);
  border-radius: var(--radius-md);
  padding: var(--space-6);
`;

const SuccessHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--green);
  font-family: var(--font-display);
  font-size: var(--text-lg);
  margin-bottom: var(--space-6);
`;

const ReplayInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--grey-mid);
  margin-bottom: var(--space-6);
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const InfoLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const InfoValue = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: #fff;
`;

const PlayerSection = styled.div`
  margin-bottom: var(--space-6);
`;

const PlayerLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-4);
`;

// Profile list (vertical stack)
const ProfileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

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

// Simple player cards fallback
const PlayerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-3);
`;

const PlayerCard = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
`;

const PlayerNameSimple = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: #fff;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const UploadAnother = styled.button`
  width: 100%;
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
