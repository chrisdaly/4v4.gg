import React, { useMemo } from "react";
import { CountryFlag, RaceIcon } from "./ui";
import { MmrComparison } from "./MmrComparison";
import FormDots from "./FormDots";
import { geometricMean, getMapImageUrl } from "../lib/formatters";
import { raceMapping } from "../lib/constants";
import { buildATGroupIdMap } from "../lib/utils";
import styled from "styled-components";

// ─── Shared layout shells ─────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  z-index: 200;

  &.slide-in  { animation: card-in  0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  &.slide-out { animation: card-out 1.2s ease-in forwards; }

  @keyframes card-in  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes card-out { from { opacity: 1; } to { opacity: 0; } }
`;

const Card = styled.div`
  background: rgba(8, 5, 2, 0.92);
  border: 1px solid rgba(252, 219, 51, 0.4);
  border-radius: var(--radius-lg);
  padding: 18px 28px 22px;
  width: 96%;
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  backdrop-filter: blur(8px);
  overflow: hidden;
`;

const MapLabel = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  text-align: center;
`;

const Body = styled.div`
  display: flex;
  align-items: flex-start;
  min-width: 0;
`;

const TeamPlayers = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  gap: 6px;

  &.side-left  { border-right: 2px solid rgba(77, 166, 255, 0.45); padding-right: 10px; }
  &.side-right { border-left:  2px solid rgba(239, 68, 68, 0.45);  padding-left:  10px; }

  .playerDiv {
    width: auto;
    flex: 1;
    min-width: 0;
    min-height: unset;
    padding: 0 4px;
  }

  .profile-pic { width: 84px; }

  .player-name-row h2 {
    color: var(--gold);
    font-size: var(--text-sm);
  }

  .mmr-value { font-size: var(--text-base); }
`;

const Center = styled.div`
  flex-shrink: 0;
  width: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
`;

const ChartWrap = styled.div`
  width: 100%;
  height: 130px;
`;

const MapImg = styled.img`
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--radius-md);
  border: 1px solid rgba(184, 134, 11, 0.4);
  opacity: 0.88;
`;

// ─── Player card — exact Game.jsx structure ───────────────────────────────────

const PlayerCard = ({ player, avatarUrls, countries, sessionData, teamClass }) => {
  const avatarUrl = avatarUrls?.[player.battleTag];
  const country   = countries?.[player.battleTag];
  const mmr       = player.currentMmr || player.oldMmr || 0;
  const form      = sessionData?.[player.battleTag]?.recentGames;

  return (
    <div className={`playerDiv ${teamClass}`}>
      <div style={{ position: "relative", display: "inline-block" }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="profile-pic" />
        ) : (
          <img
            src={raceMapping[player.race]}
            alt=""
            className="profile-pic"
            style={{ objectFit: "contain", background: "rgba(0,0,0,0.3)", padding: 10, border: "2px solid rgba(255,255,255,0.08)" }}
          />
        )}
        {country && (
          <CountryFlag name={country.toLowerCase()} className={`${teamClass} flag player-flag`} />
        )}
        <img src={raceMapping[player.race]} alt="" className="race-overlay" />
      </div>

      <div className="player-name-row">
        <h2>{player.name}</h2>
      </div>

      <div className="player-mmr-line">
        {mmr > 0 ? (
          <>
            <span className="mmr-value">{mmr.toLocaleString("en-US")}</span>
            <span className="mmr-label"> MMR</span>
          </>
        ) : (
          <span className="mmr-label-muted">Unranked</span>
        )}
      </div>

      <div className="form-dots-wrapper">
        <FormDots form={form} size="small" />
      </div>
    </div>
  );
};

// ─── Header variants ──────────────────────────────────────────────────────────

// Variant 1: two rows — name row / stats row (most breathing room)
const Header1 = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  padding-bottom: 12px;
`;
const H1Row = styled.div`
  display: flex;
  align-items: center;
`;
const H1Name = styled.div`
  flex: 1;
  h2.team-name { font-size: 2rem !important; }
  &.left  { text-align: left; }
  &.right { text-align: right; }
`;
const H1Vs = styled.div`
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: rgba(255,255,255,0.2);
  padding: 0 24px;
  flex-shrink: 0;
`;
const H1Stats = styled.div`
  display: flex;
  align-items: center;
`;
const H1Side = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  &.left  { justify-content: flex-start; }
  &.right { justify-content: flex-end; }
`;
const H1Spacer = styled.div`width: 160px; flex-shrink: 0;`;

const HeaderVariant1 = ({ team1, team2, team1Mmr, team2Mmr }) => (
  <Header1>
    <H1Row>
      <H1Name className="left">
        <h2 className="team-name">TEAM 1</h2>
      </H1Name>
      <H1Vs>VS</H1Vs>
      <H1Name className="right">
        <h2 className="team-name">TEAM 2</h2>
      </H1Name>
    </H1Row>
    <H1Stats>
      <H1Side className="left team-0">
        <div className="team-mmr-line">
          <span className="mmr-value">{team1Mmr.toLocaleString("en-US")}</span>
          <span className="mmr-label"> MMR</span>
        </div>
        <div className="image-container">
          {team1.map((p, i) => <RaceIcon key={i} race={p.race} rndRace={p.rndRace} className="race teamHeaderRace" />)}
        </div>
      </H1Side>
      <H1Spacer />
      <H1Side className="right team-1">
        <div className="image-container">
          {team2.map((p, i) => <RaceIcon key={i} race={p.race} rndRace={p.rndRace} className="race teamHeaderRace" />)}
        </div>
        <div className="team-mmr-line">
          <span className="mmr-value">{team2Mmr.toLocaleString("en-US")}</span>
          <span className="mmr-label"> MMR</span>
        </div>
      </H1Side>
    </H1Stats>
  </Header1>
);

// Variant 2: stacked columns — each side is name / icons / mmr stacked
const Header2 = styled.div`
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  padding-bottom: 14px;
`;
const H2Side = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  &.left  { align-items: flex-start; }
  &.right { align-items: flex-end; }
  h2.team-name { font-size: 1.8rem !important; }
`;
const H2Vs = styled.div`
  font-family: var(--font-display);
  font-size: 2rem;
  color: rgba(255,255,255,0.15);
  padding: 0 32px;
  flex-shrink: 0;
  letter-spacing: 0.05em;
`;

const HeaderVariant2 = ({ team1, team2, team1Mmr, team2Mmr }) => (
  <Header2>
    <H2Side className="left team-0">
      <h2 className="team-name">TEAM 1</h2>
      <div className="image-container">
        {team1.map((p, i) => <RaceIcon key={i} race={p.race} rndRace={p.rndRace} className="race teamHeaderRace" />)}
      </div>
      <div className="team-mmr-line">
        <span className="mmr-value">{team1Mmr.toLocaleString("en-US")}</span>
        <span className="mmr-label"> MMR</span>
      </div>
    </H2Side>
    <H2Vs>VS</H2Vs>
    <H2Side className="right team-1">
      <h2 className="team-name">TEAM 2</h2>
      <div className="image-container" style={{ justifyContent: "flex-end" }}>
        {team2.map((p, i) => <RaceIcon key={i} race={p.race} rndRace={p.rndRace} className="race teamHeaderRace" />)}
      </div>
      <div className="team-mmr-line">
        <span className="mmr-value">{team2Mmr.toLocaleString("en-US")}</span>
        <span className="mmr-label"> MMR</span>
      </div>
    </H2Side>
  </Header2>
);

// Variant 3: single row, same as current but more spacious
const Header3 = styled.div`
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  padding: 6px 0 14px;
`;
const H3Side = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  &.left  { justify-content: flex-start; }
  &.right { justify-content: flex-end; }
  h2.team-name { font-size: 1.6rem !important; }
`;
const H3Vs = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: rgba(255,255,255,0.2);
  padding: 0 24px;
  flex-shrink: 0;
`;

const HeaderVariant3 = ({ team1, team2, team1Mmr, team2Mmr }) => (
  <Header3>
    <H3Side className="left team-0">
      <h2 className="team-name">TEAM 1</h2>
      <div className="team-mmr-line">
        <span className="mmr-value">{team1Mmr.toLocaleString("en-US")}</span>
        <span className="mmr-label"> MMR</span>
      </div>
      <div className="image-container">
        {team1.map((p, i) => <RaceIcon key={i} race={p.race} rndRace={p.rndRace} className="race teamHeaderRace" />)}
      </div>
    </H3Side>
    <H3Vs>VS</H3Vs>
    <H3Side className="right team-1">
      <div className="image-container">
        {team2.map((p, i) => <RaceIcon key={i} race={p.race} rndRace={p.rndRace} className="race teamHeaderRace" />)}
      </div>
      <div className="team-mmr-line">
        <span className="mmr-value">{team2Mmr.toLocaleString("en-US")}</span>
        <span className="mmr-label"> MMR</span>
      </div>
      <h2 className="team-name">TEAM 2</h2>
    </H3Side>
  </Header3>
);

const HEADER_VARIANTS = { "1": HeaderVariant1, "2": HeaderVariant2, "3": HeaderVariant3 };

// ─── Main component ───────────────────────────────────────────────────────────

const GameCardOverlay = ({ matchData, avatarUrls = {}, countries = {}, sessionData = {}, atGroups = {}, slideOut = false, headerVariant = "1" }) => {
  if (!matchData?.teams || matchData.teams.length < 2) return null;

  const team1 = matchData.teams[0]?.players || [];
  const team2 = matchData.teams[1]?.players || [];

  const team1Mmr = Math.round(geometricMean(team1.map(p => p.currentMmr || p.oldMmr || 0)));
  const team2Mmr = Math.round(geometricMean(team2.map(p => p.currentMmr || p.oldMmr || 0)));

  const atGroupIdMap = useMemo(() => buildATGroupIdMap(atGroups), [atGroups]);
  const getATGroupId = (tag) => atGroupIdMap[tag.toLowerCase()] || 0;

  const mapName     = matchData.mapName || matchData.map || "";
  const mapImgUrl   = getMapImageUrl(mapName);
  const serverLabel = matchData.serverInfo?.name || "";

  const Header = HEADER_VARIANTS[headerVariant] || HeaderVariant1;

  return (
    <Overlay className={slideOut ? "slide-out" : "slide-in"}>
      <Card className="Game">
        <Header team1={team1} team2={team2} team1Mmr={team1Mmr} team2Mmr={team2Mmr} />

        <Body>
          <TeamPlayers className="side-left">
            {team1.map(p => (
              <PlayerCard key={p.battleTag} player={p} avatarUrls={avatarUrls} countries={countries} sessionData={sessionData} teamClass="team-0" />
            ))}
          </TeamPlayers>

          <Center>
            <ChartWrap>
              <MmrComparison
                data={{
                  teamOneMmrs: team1.map(p => p.currentMmr || p.oldMmr || 0),
                  teamTwoMmrs: team2.map(p => p.currentMmr || p.oldMmr || 0),
                  teamOneAT: team1.map(p => getATGroupId(p.battleTag)),
                  teamTwoAT: team2.map(p => getATGroupId(p.battleTag)),
                }}
                variant="scorecard"
                localScale
              />
            </ChartWrap>
            {mapImgUrl && (
              <MapImg src={mapImgUrl} alt={mapName} onError={e => { e.target.style.display = "none"; }} />
            )}
            {(mapName || serverLabel) && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, marginTop:4 }}>
                {mapName     && <div style={{ fontFamily:"var(--font-display)", fontSize:13, color:"#fff", textTransform:"uppercase", letterSpacing:"0.12em", textAlign:"center", lineHeight:1.2 }}>{mapName}</div>}
                {serverLabel && <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.1em" }}>{serverLabel}</div>}
              </div>
            )}
          </Center>

          <TeamPlayers className="side-right">
            {team2.map(p => (
              <PlayerCard key={p.battleTag} player={p} avatarUrls={avatarUrls} countries={countries} sessionData={sessionData} teamClass="team-1" />
            ))}
          </TeamPlayers>
        </Body>
      </Card>
    </Overlay>
  );
};

export default GameCardOverlay;
