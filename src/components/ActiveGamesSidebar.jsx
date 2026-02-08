import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { raceMapping } from "../lib/constants";
import { getMapImageUrl, formatElapsedTime } from "../lib/formatters";
import { MmrComparison } from "./MmrComparison";

const Sidebar = styled.aside`
  width: 268px;
  height: 100%;
  box-sizing: border-box;
  border: 24px solid transparent;
  border-image: url("/frames/launcher/Maon_Border.png") 120 / 24px stretch;
  background: rgba(10, 8, 6, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 768px) {
    display: none;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.06) 0%, transparent 100%);
`;

const HeaderTitle = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`;

const HeaderCount = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1) 0;

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

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: var(--space-4);
`;

/* ── Match Card ──────────────────────────────── */

const Card = styled(Link)`
  display: block;
  text-decoration: none;
  color: inherit;
  padding: var(--space-2) var(--space-3);
  margin: 0 var(--space-1);
  border-radius: var(--radius-sm);
  border-bottom: 1px solid rgba(160, 130, 80, 0.08);
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
`;

const MapImg = styled.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
`;

const MapInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const MapName = styled.div`
  font-family: var(--font-display);
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Elapsed = styled.div`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
`;

const LiveDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  margin-right: 4px;
  animation: pulse 1.5s infinite;
`;

const ChartWrapper = styled.div`
  width: 100%;
  height: 80px;
  margin-bottom: var(--space-2);
`;

const TeamsRow = styled.div`
  display: flex;
  gap: var(--space-2);
`;

const TeamCol = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const TeamLabel = styled.div`
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => (p.$team === 1 ? "var(--blue, #4a9eff)" : "var(--red)")};
  opacity: 0.6;
  margin-bottom: 2px;
`;

const PlayerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const RaceIcon = styled.img`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
`;

const PlayerName = styled.span`
  font-family: var(--font-display);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`;

/* ── Elapsed Timer ───────────────────────────── */

function ElapsedTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(() => formatElapsedTime(startTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(formatElapsedTime(startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <Elapsed>
      <LiveDot />
      {elapsed}
    </Elapsed>
  );
}

/* ── Match Card Component ────────────────────── */

function MatchCard({ match }) {
  const mapName = match.mapName || match.match?.mapName;
  const cleanMapName = mapName?.replace(/^\(\d\)\s*/, "") || "Unknown";
  const mapUrl = getMapImageUrl(mapName);
  const teams = match.teams || match.match?.teams || [];
  const startTime = match.startTime || match.match?.startTime;

  const team1 = teams[0];
  const team2 = teams[1];

  const mmrData = {
    teamOneMmrs: team1?.players?.map((p) => p.oldMmr || 0) || [],
    teamTwoMmrs: team2?.players?.map((p) => p.oldMmr || 0) || [],
  };

  const matchId = match.id || match.match?.id;

  return (
    <Card to={matchId ? `/match/${matchId}` : "#"}>
      <CardTop>
        {mapUrl && <MapImg src={mapUrl} alt="" />}
        <MapInfo>
          <MapName>{cleanMapName}</MapName>
          {startTime && <ElapsedTimer startTime={startTime} />}
        </MapInfo>
      </CardTop>
      <ChartWrapper>
        <MmrComparison
          data={mmrData}
          compact
          hideLabels
          showMean={false}
          showStdDev={false}
        />
      </ChartWrapper>
      <TeamsRow>
        <TeamCol>
          <TeamLabel $team={1}>Team 1</TeamLabel>
          {team1?.players?.map((p, i) => (
            <PlayerRow key={i}>
              <RaceIcon src={raceMapping[p.race]} alt="" />
              <PlayerName>{p.name}</PlayerName>
            </PlayerRow>
          ))}
        </TeamCol>
        <TeamCol>
          <TeamLabel $team={2}>Team 2</TeamLabel>
          {team2?.players?.map((p, i) => (
            <PlayerRow key={i}>
              <RaceIcon src={raceMapping[p.race]} alt="" />
              <PlayerName>{p.name}</PlayerName>
            </PlayerRow>
          ))}
        </TeamCol>
      </TeamsRow>
    </Card>
  );
}

/* ── Sidebar ─────────────────────────────────── */

export default function ActiveGamesSidebar({ matches = [] }) {
  return (
    <Sidebar>
      <Header>
        <HeaderTitle>Active Games</HeaderTitle>
        <HeaderCount>{matches.length}</HeaderCount>
      </Header>
      {matches.length === 0 ? (
        <EmptyState>No active games</EmptyState>
      ) : (
        <Content>
          {matches.map((match) => (
            <MatchCard key={match.id || match.match?.id} match={match} />
          ))}
        </Content>
      )}
    </Sidebar>
  );
}
