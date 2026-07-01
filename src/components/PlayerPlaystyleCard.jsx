import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { RaceIcon } from "./ui";
import TransitionGlyph from "./replay-lab/TransitionGlyph";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

export default function PlayerPlaystyleCard({ battleTag, race, compact = false, preloadedProfile = null }) {
  const [profileData, setProfileData] = useState(preloadedProfile);
  const [loading, setLoading] = useState(!preloadedProfile);
  const [error, setError] = useState(false);

  const playerName = battleTag?.split("#")[0] || battleTag;
  const raceKey = race ?? 0;

  useEffect(() => {
    if (preloadedProfile) return;
    if (!battleTag) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError(false);
      try {
        const tag = encodeURIComponent(battleTag);
        const res = await fetch(`${RELAY_URL}/api/fingerprints/profile/${tag}`);
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [battleTag, preloadedProfile]);

  // When full_action_sequence is missing in the DB (old imports), derive group
  // usage from the averaged hotkey fingerprint segment instead.
  const getEffectiveGroupUsage = () => {
    if (profileData?.groupUsage?.length > 0) return profileData.groupUsage;
    const hotkey = profileData?.averaged?.segments?.hotkey;
    if (!hotkey) return [];
    const synthetic = [];
    for (let i = 0; i < 10; i++) {
      const sel = hotkey[i] || 0;
      const asgn = hotkey[10 + i] || 0;
      if (sel + asgn > 0.01) {
        synthetic.push({ group: i, used: Math.round(sel * 1000), assigned: Math.round(asgn * 1000) });
      }
    }
    return synthetic;
  };

  // Extract key metrics from profile
  const getMetrics = () => {
    if (!profileData?.averaged?.segments) return null;
    const { segments } = profileData.averaged;
    const { apm = [0, 0, 0] } = segments;
    const meanApm = Math.round(apm[0] * 300);
    const activeGroups = getEffectiveGroupUsage().filter(
      (g) => (g.used + g.assigned) > 0
    ).length;
    const reassignRatio = profileData.actionCounts?.reassignRatio || 0;
    return { meanApm, activeGroups, reassignRatio };
  };

  const metrics = getMetrics();

  if (loading) {
    return (
      <Card $compact={compact}>
        <Header>
          <RaceIconWrap>
            <RaceIcon race={raceKey} size={compact ? 24 : 32} />
          </RaceIconWrap>
          <PlayerName $compact={compact}>{playerName}</PlayerName>
        </Header>
        <LoadingState>Loading playstyle...</LoadingState>
      </Card>
    );
  }

  if (error || !profileData) {
    return (
      <Card $compact={compact} $muted>
        <Header>
          <RaceIconWrap>
            <RaceIcon race={raceKey} size={compact ? 24 : 32} />
          </RaceIconWrap>
          <PlayerName $compact={compact}>{playerName}</PlayerName>
        </Header>
        <MutedState>No playstyle data</MutedState>
      </Card>
    );
  }

  return (
    <Card $compact={compact}>
      <Header>
        <RaceIconWrap>
          <RaceIcon race={raceKey} size={compact ? 24 : 32} />
        </RaceIconWrap>
        <PlayerName $compact={compact}>{playerName}</PlayerName>
        <ProfileLink to={`/player/${encodeURIComponent(battleTag)}?tab=playstyle`}>
          View
        </ProfileLink>
      </Header>

      <GlyphWrap $compact={compact}>
        <TransitionGlyph
          transitionPairs={profileData.transitionPairs || []}
          groupUsage={profileData.groupUsage || []}
          groupCompositions={profileData.groupCompositions || {}}
          segments={profileData.averaged?.segments}
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
    </Card>
  );
}

// ── Styled Components ────────────────────────────

const Card = styled.div`
  background: var(--surface-1);
  border: var(--border-thin) solid ${(p) => (p.$muted ? "var(--grey-mid)" : "var(--grey-mid)")};
  border-radius: var(--radius-md);
  padding: ${(p) => (p.$compact ? "var(--space-3)" : "var(--space-4)")};
  transition: border-color 0.2s ease;
  opacity: ${(p) => (p.$muted ? 0.6 : 1)};

  &:hover {
    border-color: ${(p) => (p.$muted ? "var(--grey-mid)" : "var(--gold)")};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
`;

const RaceIconWrap = styled.div`
  flex-shrink: 0;
`;

const PlayerName = styled.span`
  font-family: var(--font-display);
  font-size: ${(p) => (p.$compact ? "var(--text-sm)" : "var(--text-base)")};
  color: var(--gold);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ProfileLink = styled(Link)`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-decoration: none;
  padding: 2px 8px;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;

  &:hover {
    color: var(--gold);
    border-color: var(--gold);
  }
`;

const GlyphWrap = styled.div`
  width: ${(p) => (p.$compact ? "120px" : "160px")};
  height: ${(p) => (p.$compact ? "120px" : "160px")};
  margin: 0 auto var(--space-3);
`;

const MetricsRow = styled.div`
  display: flex;
  justify-content: space-around;
  gap: var(--space-2);
`;

const Metric = styled.div`
  text-align: center;
`;

const MetricValue = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: #fff;
  font-weight: 600;
`;

const MetricLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const LoadingState = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-align: center;
  padding: var(--space-8) 0;
`;

const MutedState = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-mid);
  text-align: center;
  padding: var(--space-4) 0;
`;
