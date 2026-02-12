import React, { useState, useEffect, useMemo } from "react";
import { Link, useHistory } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import crownIcon from "../assets/icons/king.svg";
import { raceMapping } from "../lib/constants";
import { getMapImageUrl, formatElapsedTime } from "../lib/formatters";
import { MmrComparison } from "./MmrComparison";
import { Skeleton } from "./ui";

const Sidebar = styled.aside`
  width: 460px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 768px) {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100dvh;
    z-index: 10001;
    transform: ${(p) => (p.$mobileVisible ? "translateY(0)" : "translateY(100%)")};
    transition: transform 0.25s ease;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`;

const SidebarContent = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: ${(p) => p.$theme?.bg || "rgba(10, 8, 6, 0.25)"};
  backdrop-filter: ${(p) => p.$theme?.blur || "blur(1px)"};
  border: ${(p) => p.$theme?.border || "8px solid transparent"};
  border-image: ${(p) => p.$theme?.borderImage || 'url("/frames/chat/ChatFrameBorder.png") 30 / 8px stretch'};
  box-shadow: ${(p) => p.$theme?.shadow || "none"};
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

const SortButton = styled.button`
  background: none;
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 3px 8px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: var(--gold);
    border-color: rgba(160, 130, 80, 0.4);
  }
`;

const CloseButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: var(--grey-light);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: #fff;
  }

  @media (max-width: 768px) {
    display: block;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1) var(--space-4);

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

/* ── Match Card (Layout C: Split Team Tint) ──── */

const Card = styled(Link)`
  display: block;
  text-decoration: none;
  color: inherit;
  margin: var(--space-4) 0;
  border-radius: var(--radius-md);
  border: 1px solid rgba(160, 130, 80, 0.12);
  overflow: hidden;
  transition: all 0.15s;

  &:hover {
    border-color: rgba(160, 130, 80, 0.25);
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6) var(--space-2);
  background: rgba(255, 255, 255, 0.02);
`;

const MapImg = styled.img`
  width: 72px;
  height: 72px;
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
  font-size: var(--text-lg);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MmrRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 4px;
`;

const MmrValue = styled.span`
  font-family: var(--font-mono);
  font-size: 18px;
  color: #fff;
  font-weight: 700;
`;

const MmrLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  opacity: 0.7;
`;

const ChartCol = styled.div`
  width: 80px;
  flex-shrink: 0;
  align-self: stretch;
  padding: var(--space-2) 0;
  box-sizing: border-box;
`;

const Elapsed = styled.div`
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--grey-light);
  margin-top: 3px;
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


const TeamsSection = styled.div`
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-6) var(--space-3);
  gap: 0;
`;

const TeamCol = styled.div`
  flex: 1;
  min-width: 0;
`;

const PlayerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-direction: ${(p) => (p.$reverse ? "row-reverse" : "row")};

  &:last-child {
    margin-bottom: 0;
  }
`;

const RaceIcon = styled.img`
  width: 22px;
  height: 22px;
  flex-shrink: 0;
`;

const PlayerName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
  text-align: ${(p) => (p.$right ? "right" : "left")};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

/* ── Finished Match Styles ────────────────────── */

const finishedFadeOut = keyframes`
  0% { opacity: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; }
`;

const crownAnimate = keyframes`
  0% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 0; }
  20% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  50% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  100% { top: 55%; left: var(--crown-end-x); transform: translate(-50%, -50%); width: 28px; height: 28px; opacity: 1; }
`;

const FinishedCard = styled(Link)`
  display: block;
  text-decoration: none;
  color: inherit;
  position: relative;
  margin: var(--space-4) 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold);
  overflow: hidden;
  animation: ${finishedFadeOut} 8s ease forwards;
`;

const CrownImg = styled.img`
  position: absolute;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 0 12px rgba(252, 219, 51, 0.6)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
  animation: ${crownAnimate} 2s ease-out forwards;
`;

const CrownBackdrop = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.5);
  animation: backdropFade 2s ease-out forwards;

  @keyframes backdropFade {
    0% { opacity: 0; }
    20% { opacity: 1; }
    50% { opacity: 1; }
    100% { opacity: 0; }
  }
`;

const WinnerTeamCol = styled.div`
  flex: 1;
  min-width: 0;
`;

const LoserTeamCol = styled.div`
  flex: 1;
  min-width: 0;
  opacity: 0.35;
`;

/* ── Helpers ─────────────────────────────────── */

function getMatchAvgMmr(match) {
  const teams = match.teams || match.match?.teams || [];
  const mmrs = teams.flatMap((t) => t.players?.map((p) => p.oldMmr || 0) || []);
  return mmrs.length > 0 ? mmrs.reduce((s, v) => s + v, 0) / mmrs.length : 0;
}

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
  const history = useHistory();
  const mapName = match.mapName || match.match?.mapName;
  const cleanMapName = mapName?.replace(/^\(\d\)\s*/, "") || "Unknown";
  const mapUrl = getMapImageUrl(mapName);
  const teams = match.teams || match.match?.teams || [];
  const startTime = match.startTime || match.match?.startTime;

  const team1 = teams[0];
  const team2 = teams[1];

  const team1Mmrs = team1?.players?.map((p) => p.oldMmr || 0) || [];
  const team2Mmrs = team2?.players?.map((p) => p.oldMmr || 0) || [];

  const allMmrs = [...team1Mmrs, ...team2Mmrs];
  const gameAvgMmr =
    allMmrs.length > 0
      ? Math.round(allMmrs.reduce((s, v) => s + v, 0) / allMmrs.length)
      : null;

  const mmrData = {
    teamOneMmrs: team1Mmrs,
    teamTwoMmrs: team2Mmrs,
  };

  const matchId = match.id || match.match?.id;

  return (
    <Card to={matchId ? `/match/${matchId}` : "/"}>
      <CardTop>
        {mapUrl && <MapImg src={mapUrl} alt="" />}
        <MapInfo>
          <MapName>{cleanMapName}</MapName>
          {gameAvgMmr != null && (
            <MmrRow>
              <MmrValue>{gameAvgMmr}</MmrValue>
              <MmrLabel>MMR</MmrLabel>
            </MmrRow>
          )}
          {startTime && <ElapsedTimer startTime={startTime} />}
        </MapInfo>
      </CardTop>
      <TeamsSection>
        <TeamCol $team={1}>
          {team1?.players?.map((p, i) => (
            <PlayerRow key={i}>
              <RaceIcon src={raceMapping[p.race]} alt="" />
              <PlayerName onClick={(e) => { e.preventDefault(); e.stopPropagation(); history.push(`/player/${encodeURIComponent(p.battleTag)}`); }}>{p.name}</PlayerName>
            </PlayerRow>
          ))}
        </TeamCol>
        <ChartCol>
          <MmrComparison
            data={mmrData}
            compact
            hideLabels
            showMean={false}
            showStdDev={false}
          />
        </ChartCol>
        <TeamCol $team={2}>
          {team2?.players?.map((p, i) => (
            <PlayerRow key={i} $reverse>
              <RaceIcon src={raceMapping[p.race]} alt="" />
              <PlayerName $right onClick={(e) => { e.preventDefault(); e.stopPropagation(); history.push(`/player/${encodeURIComponent(p.battleTag)}`); }}>{p.name}</PlayerName>
            </PlayerRow>
          ))}
        </TeamCol>
      </TeamsSection>
    </Card>
  );
}

/* ── Finished Match Card ─────────────────────── */

function FinishedMatchCard({ match }) {
  const mapName = match.mapName || match.match?.mapName;
  const cleanMapName = mapName?.replace(/^\(\d\)\s*/, "") || "Unknown";
  const mapUrl = getMapImageUrl(mapName);
  const teams = match.teams || match.match?.teams || [];
  const winnerTeam = match._winnerTeam;
  const durationSec = match.durationInSeconds;
  const durationStr = durationSec
    ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`
    : null;

  const team1 = teams[0];
  const team2 = teams[1];

  const team1Mmrs = team1?.players?.map((p) => p.oldMmr || 0) || [];
  const team2Mmrs = team2?.players?.map((p) => p.oldMmr || 0) || [];
  const allMmrs = [...team1Mmrs, ...team2Mmrs];
  const gameAvgMmr =
    allMmrs.length > 0
      ? Math.round(allMmrs.reduce((s, v) => s + v, 0) / allMmrs.length)
      : null;

  const matchId = match.id || match.match?.id;
  const Team1Col = winnerTeam === 0 ? WinnerTeamCol : LoserTeamCol;
  const Team2Col = winnerTeam === 1 ? WinnerTeamCol : LoserTeamCol;

  // Crown ends centered on winning team column
  // TeamsSection has padding 16px (space-4) each side, chart is 80px in center
  // Left team center ≈ 25%, right team center ≈ 75% (approximate)
  const crownEndX = winnerTeam === 0 ? "25%" : "75%";

  return (
    <FinishedCard to={matchId ? `/match/${matchId}` : "/"} style={{ "--crown-end-x": crownEndX }}>
      <CrownBackdrop />
      {winnerTeam != null && (
        <CrownImg src={crownIcon} alt="" />
      )}
      <CardTop>
        {mapUrl && <MapImg src={mapUrl} alt="" />}
        <MapInfo>
          <MapName>{cleanMapName}</MapName>
          {gameAvgMmr != null && (
            <MmrRow>
              <MmrValue>{gameAvgMmr}</MmrValue>
              <MmrLabel>MMR</MmrLabel>
            </MmrRow>
          )}
          {durationStr && <Elapsed>{durationStr}</Elapsed>}
        </MapInfo>
      </CardTop>
      <TeamsSection>
        <Team1Col>
          {team1?.players?.map((p, i) => (
            <PlayerRow key={i}>
              <RaceIcon src={raceMapping[p.race]} alt="" />
              <PlayerName>{p.name}</PlayerName>
            </PlayerRow>
          ))}
        </Team1Col>
        <ChartCol />
        <Team2Col>
          {team2?.players?.map((p, i) => (
            <PlayerRow key={i} $reverse>
              <RaceIcon src={raceMapping[p.race]} alt="" />
              <PlayerName $right>{p.name}</PlayerName>
            </PlayerRow>
          ))}
        </Team2Col>
      </TeamsSection>
    </FinishedCard>
  );
}

/* ── Sidebar ─────────────────────────────────── */

export default function ActiveGamesSidebar({ matches = [], finishedMatches = [], $mobileVisible, onClose, borderTheme }) {
  const [sortBy, setSortBy] = useState("mmr");

  const sortedMatches = useMemo(() => {
    const sorted = [...matches];
    if (sortBy === "mmr") {
      sorted.sort((a, b) => getMatchAvgMmr(b) - getMatchAvgMmr(a));
    } else {
      sorted.sort((a, b) => {
        const tA = new Date(a.startTime || a.match?.startTime || 0).getTime();
        const tB = new Date(b.startTime || b.match?.startTime || 0).getTime();
        return tB - tA;
      });
    }
    return sorted;
  }, [matches, sortBy]);

  return (
    <Sidebar $mobileVisible={$mobileVisible}>
      <SidebarContent $theme={borderTheme}>
        <Header $theme={borderTheme}>
          <HeaderTitle>Active Games</HeaderTitle>
          <HeaderCount>{matches.length}</HeaderCount>
          <SortButton onClick={() => setSortBy((s) => (s === "mmr" ? "recent" : "mmr"))}>
            {sortBy === "mmr" ? "MMR" : "Recent"}
          </SortButton>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </Header>
        {sortedMatches.length === 0 && finishedMatches.length === 0 ? (
          <Content>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ margin: "var(--space-4) 0", borderRadius: "var(--radius-md)", border: "1px solid rgba(160, 130, 80, 0.12)", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) var(--space-6) var(--space-2)" }}>
                  <Skeleton $w="72px" $h="72px" $radius="var(--radius-sm)" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <Skeleton $w="120px" $h="18px" />
                    <Skeleton $w="80px" $h="14px" />
                    <Skeleton $w="60px" $h="12px" />
                  </div>
                </div>
                <div style={{ display: "flex", padding: "var(--space-2) var(--space-6) var(--space-3)", gap: "var(--space-4)" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {[...Array(4)].map((_, j) => <Skeleton key={j} $w={`${60 + Math.random() * 30}%`} $h="14px" />)}
                  </div>
                  <div style={{ width: 80 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                    {[...Array(4)].map((_, j) => <Skeleton key={j} $w={`${60 + Math.random() * 30}%`} $h="14px" />)}
                  </div>
                </div>
              </div>
            ))}
          </Content>
        ) : (
          <Content>
            {finishedMatches.map((match) => (
              <FinishedMatchCard key={`fin-${match.id}`} match={match} />
            ))}
            {sortedMatches.map((match) => (
              <MatchCard key={match.id || match.match?.id} match={match} />
            ))}
          </Content>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
