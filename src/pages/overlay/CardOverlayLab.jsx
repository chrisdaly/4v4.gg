import React, { useMemo, useState, useEffect } from "react";
import { CountryFlag, RaceIcon } from "../../components/ui";
import { MmrComparison } from "../../components/MmrComparison";
import FormDots from "../../components/FormDots";
import { geometricMean, getMapImageUrl } from "../../lib/formatters";
import { raceMapping } from "../../lib/constants";
import { buildATGroupIdMap } from "../../lib/utils";
import { getPlayerProfile } from "../../lib/api";
import styled from "styled-components";

// ─── Demo data ────────────────────────────────────────────────────────────────

const GATEWAY_LABELS = { 20: "Europe", 10: "Americas", 30: "Asia" };

const MATCH = {
  mapName: "Painted World",
  gateWay: 20,
  serverName: "Germany Central 4",
  teams: [
    { players: [
      { battleTag: "Lacoste#22218",   name: "Lacoste",   race: 2, currentMmr: 2049 },
      { battleTag: "bongzilla#21528", name: "bongzilla", race: 4, currentMmr: 1807 },
      { battleTag: "ANALysis#21996",  name: "ANALysis",  race: 0, currentMmr: 1695 },
      { battleTag: "riggen1337#2770", name: "riggen1337",race: 8, currentMmr: 1653 },
    ]},
    { players: [
      { battleTag: "Tunafish#21774",     name: "Tunafish",    race: 2, currentMmr: 2037 },
      { battleTag: "ThxForNothin#2370",  name: "ThxForNothin",race: 1, currentMmr: 1826 },
      { battleTag: "ThebestHum#1842",    name: "ThebestHum",  race: 8, currentMmr: 1661 },
      { battleTag: "Heavenwaits#21353",  name: "Heavenwaits", race: 1, currentMmr: 1616 },
    ]},
  ],
};

const FORM = {
  "Lacoste#22218":   [true,true,false,true,true],
  "bongzilla#21528": [false,true,false,true,false],
  "ANALysis#21996":  [true,true,true,false,true],
  "riggen1337#2770": [true,false,true,true,true],
  "Tunafish#21774":  [false,false,true,true,false],
  "ThxForNothin#2370":[true,true,true,true,false],
  "ThebestHum#1842": [true,false,false,true,true],
  "Heavenwaits#21353":[false,true,true,false,true],
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

const team1 = MATCH.teams[0].players;
const team2 = MATCH.teams[1].players;
const mmr1  = Math.round(geometricMean(team1.map(p => p.currentMmr)));
const mmr2  = Math.round(geometricMean(team2.map(p => p.currentMmr)));

// Highest MMR closest to center: team1 ascending (highest rightmost), team2 descending (highest leftmost)
const team1Sorted = [...team1].sort((a, b) => a.currentMmr - b.currentMmr);
const team2Sorted = [...team2].sort((a, b) => b.currentMmr - a.currentMmr);
const mapImgUrl   = getMapImageUrl(MATCH.mapName);
const serverLabel = MATCH.serverName || GATEWAY_LABELS[MATCH.gateWay] || "";

const ChartData = {
  teamOneMmrs: team1.map(p => p.currentMmr),
  teamTwoMmrs: team2.map(p => p.currentMmr),
  teamOneAT: [0,0,0,0],
  teamTwoAT: [0,0,0,0],
};

// ─── Lab wrapper ──────────────────────────────────────────────────────────────

const Lab = styled.div`
  min-height: 100vh;
  background: #0a0a0c;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  gap: 60px;
`;

const Variant = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const VariantLabel = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  padding-left: 4px;
  span { color: var(--gold); margin-right: 8px; }
`;

// ─── Shared player card (used by all variants) ────────────────────────────────

const PlayerCard = ({ player, teamClass, avatarSize = 80, avatarUrls = {}, countries = {} }) => {
  const mmr     = player.currentMmr || 0;
  const form    = FORM[player.battleTag];
  const avatar  = avatarUrls[player.battleTag];
  const country = countries[player.battleTag];

  return (
    <div className={`playerDiv ${teamClass}`} style={{ flex: 1, minWidth: 0, width: "auto", padding: "0 4px" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        {avatar ? (
          <img src={avatar} alt="" className="profile-pic" style={{ width: avatarSize }} />
        ) : (
          <img
            src={raceMapping[player.race]}
            alt=""
            className="profile-pic"
            style={{ width: avatarSize, objectFit: "contain", background: "rgba(0,0,0,0.3)", padding: 10, border: "2px solid rgba(255,255,255,0.08)" }}
          />
        )}
        {country && (
          <CountryFlag name={country.toLowerCase()} className={`${teamClass} flag player-flag`} />
        )}
        <img src={raceMapping[player.race]} alt="" className="race-overlay" />
      </div>
      <div className="player-name-row"><h2 style={{ color: "var(--gold)", fontSize: "var(--text-sm)" }}>{player.name}</h2></div>
      <div className="player-mmr-line">
        <span className="mmr-value">{mmr.toLocaleString("en-US")}</span>
        <span className="mmr-label"> MMR</span>
      </div>
      <div className="form-dots-wrapper" style={{ marginTop: 6 }}><FormDots form={form} size="small" /></div>
    </div>
  );
};

// ─── VARIANT A: Cinematic ─────────────────────────────────────────────────────
// Full-bleed race-colored edge glow, large team names, dramatic

const CardA = styled.div`
  background: linear-gradient(90deg,
    rgba(77,166,255,0.12) 0%,
    rgba(6,4,2,0.94) 25%,
    rgba(6,4,2,0.94) 75%,
    rgba(239,68,68,0.12) 100%
  );
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
  outline: 1px solid rgba(252,219,51,0.25);
`;

const CinematicHeader = styled.div`
  display: flex;
  align-items: stretch;
`;

const CinematicSide = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 22px 28px 18px;
  align-items: center;
  h2.team-name { font-size: 2.2rem !important; letter-spacing: 0.04em; }
  .image-container { justify-content: center; }
`;

const CinematicVs = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 32px;
  font-family: var(--font-display);
  font-size: 2.8rem;
  color: rgba(255,255,255,0.28);
  letter-spacing: 0.1em;
  flex-shrink: 0;
`;

const CinematicBody = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 18px 20px 20px;
  gap: 0;
`;

const CinematicTeam = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  gap: 4px;
  &.left  { padding-right: 12px; }
  &.right { padding-left:  12px; }
  .playerDiv { min-height: unset; }
`;

const CinematicCenter = styled.div`
  flex-shrink: 0;
  width: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
`;


const VariantA = ({ avatarUrls, countries }) => (
  <CardA className="Game">
    <CinematicHeader>
      <CinematicSide className="left team-0">
        <h2 className="team-name">TEAM 1</h2>
        <div className="image-container">
          {team1.map((p,i) => <RaceIcon key={i} race={p.race} className="race teamHeaderRace" />)}
        </div>
        <div className="team-mmr-line">
          <span className="mmr-value">{mmr1.toLocaleString("en-US")}</span>
          <span className="mmr-label"> MMR</span>
        </div>
      </CinematicSide>
      <CinematicVs>VS</CinematicVs>
      <CinematicSide className="right team-1">
        <h2 className="team-name">TEAM 2</h2>
        <div className="image-container">
          {team2.map((p,i) => <RaceIcon key={i} race={p.race} className="race teamHeaderRace" />)}
        </div>
        <div className="team-mmr-line">
          <span className="mmr-value">{mmr2.toLocaleString("en-US")}</span>
          <span className="mmr-label"> MMR</span>
        </div>
      </CinematicSide>
    </CinematicHeader>
    <CinematicBody>
      <CinematicTeam className="left">
        {team1Sorted.map(p => <PlayerCard key={p.battleTag} player={p} teamClass="team-0" avatarUrls={avatarUrls} countries={countries} />)}
      </CinematicTeam>
      <CinematicCenter>
        <div style={{ width:"100%", height:130 }}>
          <MmrComparison data={ChartData} variant="scorecard" localScale />
        </div>
        {mapImgUrl && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <img src={mapImgUrl} alt="" style={{ width:96, height:96, objectFit:"cover", borderRadius:6, border:"1px solid rgba(184,134,11,0.4)", opacity:0.88 }} onError={e=>{e.target.style.display="none"}} />
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, marginTop:4 }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:13, color:"#fff", textTransform:"uppercase", letterSpacing:"0.12em", textAlign:"center", lineHeight:1.2 }}>
                {MATCH.mapName}
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.1em" }}>
                {serverLabel}
              </div>
            </div>
          </div>
        )}
      </CinematicCenter>
      <CinematicTeam className="right">
        {team2Sorted.map(p => <PlayerCard key={p.battleTag} player={p} teamClass="team-1" avatarUrls={avatarUrls} countries={countries} />)}
      </CinematicTeam>
    </CinematicBody>
  </CardA>
);

// ─── VARIANT B: Minimal ───────────────────────────────────────────────────────
// No card border, dark glass, subtle separators, let avatars breathe

const CardB = styled.div`
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(16px);
  border-radius: 10px;
  padding: 0;
  overflow: hidden;
`;

const MinimalHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 18px 24px 14px;
`;

const MinimalSide = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  h2 {
    font-family: var(--font-display) !important;
    font-size: 1rem !important;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(255,255,255,0.4) !important;
    margin: 0 !important;
  }
`;

const MinimalVs = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  color: rgba(255,255,255,0.15);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  padding: 0 20px;
`;

const MinimalMmr = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  color: var(--white);
  font-weight: 600;
  line-height: 1;
`;

const MinimalMmrLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: rgba(255,255,255,0.3);
  margin-left: 3px;
`;

const MinimalBody = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 16px 16px 18px;
`;

const MinimalTeam = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  gap: 2px;
  &.left  { padding-right: 10px; }
  &.right { padding-left:  10px; }
  .playerDiv { min-height: unset; }
  .player-name-row h2 { font-size: var(--text-xs) !important; color: rgba(255,255,255,0.8) !important; }
  .mmr-value { font-size: var(--text-xs) !important; color: rgba(255,255,255,0.5) !important; }
  .mmr-label { color: rgba(255,255,255,0.25) !important; }
`;

const MinimalCenter = styled.div`
  flex-shrink: 0;
  width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
`;

const MinimalMapName = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  color: rgba(255,255,255,0.3);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  text-align: center;
  padding-top: 16px;
`;

const VariantB = ({ avatarUrls, countries }) => (
  <CardB className="Game">
    <MinimalMapName>{MATCH.mapName}</MinimalMapName>
    <MinimalHeader>
      <MinimalSide className="left team-0">
        <h2>Team 1</h2>
        <div className="image-container">
          {team1.map((p,i) => <RaceIcon key={i} race={p.race} className="race teamHeaderRace" />)}
        </div>
        <MinimalMmr>{mmr1.toLocaleString("en-US")}<MinimalMmrLabel>MMR</MinimalMmrLabel></MinimalMmr>
      </MinimalSide>
      <MinimalVs>vs</MinimalVs>
      <MinimalSide className="right team-1">
        <h2>Team 2</h2>
        <div className="image-container">
          {team2.map((p,i) => <RaceIcon key={i} race={p.race} className="race teamHeaderRace" />)}
        </div>
        <MinimalMmr>{mmr2.toLocaleString("en-US")}<MinimalMmrLabel>MMR</MinimalMmrLabel></MinimalMmr>
      </MinimalSide>
    </MinimalHeader>
    <MinimalBody>
      <MinimalTeam className="left">
        {team1Sorted.map(p => <PlayerCard key={p.battleTag} player={p} teamClass="team-0" avatarSize={72} avatarUrls={avatarUrls} countries={countries} />)}
      </MinimalTeam>
      <MinimalCenter>
        <div style={{ width:"100%", height:120 }}>
          <MmrComparison data={ChartData} variant="scorecard" localScale />
        </div>
        {mapImgUrl && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <img src={mapImgUrl} alt="" style={{ width:92, height:92, objectFit:"cover", borderRadius:6, border:"1px solid rgba(184,134,11,0.35)", opacity:0.82 }} onError={e=>{e.target.style.display="none"}} />
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, marginTop:4 }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:13, color:"#fff", textTransform:"uppercase", letterSpacing:"0.12em", textAlign:"center", lineHeight:1.2 }}>
                {MATCH.mapName}
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.1em" }}>
                {serverLabel}
              </div>
            </div>
          </div>
        )}
      </MinimalCenter>
      <MinimalTeam className="right">
        {team2Sorted.map(p => <PlayerCard key={p.battleTag} player={p} teamClass="team-1" avatarSize={72} avatarUrls={avatarUrls} countries={countries} />)}
      </MinimalTeam>
    </MinimalBody>
  </CardB>
);

// ─── VARIANT C: Scorecard ─────────────────────────────────────────────────────
// Blue/red team bars, tight grid, sports-broadcast feel

const CardC = styled.div`
  background: rgba(8,5,2,0.95);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
`;

const ScorecardTop = styled.div`
  display: flex;
`;

const ScorecardBar = styled.div`
  flex: 1;
  padding: 14px 20px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  &.blue {
    background: rgba(77,166,255,0.12);
    border-bottom: 3px solid var(--team-blue);
    align-items: flex-start;
  }
  &.red {
    background: rgba(239,68,68,0.12);
    border-bottom: 3px solid var(--team-red);
    align-items: flex-end;
  }
  h2 {
    font-family: var(--font-display) !important;
    font-size: 1.5rem !important;
    margin: 0 !important;
  }
  &.blue h2 { color: var(--team-blue) !important; }
  &.red  h2 { color: var(--team-red)  !important; }
`;

const ScorecardMid = styled.div`
  width: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-bottom: 3px solid rgba(255,255,255,0.1);
  background: rgba(0,0,0,0.3);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: rgba(255,255,255,0.2);
  letter-spacing: 0.2em;
  flex-shrink: 0;
`;

const ScorecardBody = styled.div`
  display: flex;
  padding: 14px 16px 16px;
  gap: 0;
`;

const ScorecardTeam = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  gap: 4px;
  &.left  { border-right: 2px solid rgba(77,166,255,0.25);  padding-right: 10px; }
  &.right { border-left:  2px solid rgba(239,68,68,0.25); padding-left:  10px; }
  .playerDiv { min-height: unset; }
`;

const ScorecardCenter = styled.div`
  flex-shrink: 0;
  width: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 6px;
`;

const VariantC = () => (
  <CardC className="Game">
    <ScorecardTop>
      <ScorecardBar className="blue team-0">
        <h2>TEAM 1</h2>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div className="team-mmr-line">
            <span className="mmr-value" style={{ color:"var(--team-blue)" }}>{mmr1.toLocaleString("en-US")}</span>
            <span className="mmr-label"> MMR</span>
          </div>
          <div className="image-container">
            {team1.map((p,i) => <RaceIcon key={i} race={p.race} className="race teamHeaderRace" />)}
          </div>
        </div>
      </ScorecardBar>
      <ScorecardMid>VS</ScorecardMid>
      <ScorecardBar className="red team-1">
        <h2>TEAM 2</h2>
        <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
          <div className="image-container" style={{ justifyContent:"flex-end" }}>
            {team2.map((p,i) => <RaceIcon key={i} race={p.race} className="race teamHeaderRace" />)}
          </div>
          <div className="team-mmr-line">
            <span className="mmr-value" style={{ color:"var(--team-red)" }}>{mmr2.toLocaleString("en-US")}</span>
            <span className="mmr-label"> MMR</span>
          </div>
        </div>
      </ScorecardBar>
    </ScorecardTop>
    <ScorecardBody>
      <ScorecardTeam className="left">
        {team1.map(p => <PlayerCard key={p.battleTag} player={p} teamClass="team-0" avatarSize={76} />)}
      </ScorecardTeam>
      <ScorecardCenter>
        <div style={{ width:"100%", height:110 }}>
          <MmrComparison data={ChartData} variant="scorecard" localScale />
        </div>
        {mapImgUrl && <img src={mapImgUrl} alt="" style={{ width:60, height:60, objectFit:"cover", borderRadius:4, border:"1px solid rgba(184,134,11,0.3)", opacity:0.85 }} onError={e=>{e.target.style.display="none"}} />}
      </ScorecardCenter>
      <ScorecardTeam className="right">
        {team2.map(p => <PlayerCard key={p.battleTag} player={p} teamClass="team-1" avatarSize={76} />)}
      </ScorecardTeam>
    </ScorecardBody>
  </CardC>
);

// ─── VARIANT D: Panel (lower-third) ──────────────────────────────────────────
// Thin strip docked to bottom, avatars in one row, very compact

const CardD = styled.div`
  background: rgba(6,4,2,0.95);
  border-top: 2px solid rgba(252,219,51,0.5);
  border-radius: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const PanelTop = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 20px 6px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.3);
`;

const PanelSide = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  &.right { justify-content: flex-end; }
  h2 {
    font-family: var(--font-display) !important;
    font-size: 1.1rem !important;
    color: var(--gold) !important;
    margin: 0 !important;
  }
`;

const PanelVs = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  color: rgba(255,255,255,0.2);
  letter-spacing: 0.2em;
  padding: 0 16px;
  flex-shrink: 0;
`;

const PanelBody = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 16px 10px;
`;

const PanelTeam = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  gap: 2px;
  align-items: center;
  &.left  { border-right: 2px solid rgba(77,166,255,0.3);  padding-right: 8px; }
  &.right { border-left:  2px solid rgba(239,68,68,0.3); padding-left:  8px; }
  .playerDiv {
    min-height: unset !important;
    align-items: center;
    .player-name-row h2 { font-size: 11px !important; color: var(--gold) !important; }
    .mmr-value { font-size: 11px !important; }
    .mmr-label { font-size: 9px !important; }
    .form-dots-wrapper { display: none; }
  }
`;

const PanelCenter = styled.div`
  flex-shrink: 0;
  width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
`;

const PanelPlayerCard = ({ player, teamClass }) => (
  <div className={`playerDiv ${teamClass}`} style={{ flex:1, minWidth:0, width:"auto", padding:"0 2px" }}>
    <div style={{ position:"relative", display:"inline-block" }}>
      <img
        src={raceMapping[player.race]}
        alt=""
        className="profile-pic"
        style={{ width:48, objectFit:"contain", background:"rgba(0,0,0,0.3)", padding:6, border:"1px solid rgba(255,255,255,0.08)" }}
      />
      <img src={raceMapping[player.race]} alt="" className="race-overlay" />
    </div>
    <div className="player-name-row"><h2>{player.name}</h2></div>
    <div className="player-mmr-line">
      <span className="mmr-value">{player.currentMmr.toLocaleString("en-US")}</span>
      <span className="mmr-label"> MMR</span>
    </div>
  </div>
);

const VariantD = () => (
  <CardD className="Game">
    <PanelTop>
      <PanelSide className="left team-0">
        <h2 className="team-name">TEAM 1</h2>
        <div className="team-mmr-line">
          <span className="mmr-value">{mmr1.toLocaleString("en-US")}</span>
          <span className="mmr-label"> MMR</span>
        </div>
        <div className="image-container">
          {team1.map((p,i) => <RaceIcon key={i} race={p.race} className="race teamHeaderRace" />)}
        </div>
      </PanelSide>
      <PanelVs>VS</PanelVs>
      <PanelSide className="right team-1">
        <div className="image-container" style={{ justifyContent:"flex-end" }}>
          {team2.map((p,i) => <RaceIcon key={i} race={p.race} className="race teamHeaderRace" />)}
        </div>
        <div className="team-mmr-line">
          <span className="mmr-value">{mmr2.toLocaleString("en-US")}</span>
          <span className="mmr-label"> MMR</span>
        </div>
        <h2 className="team-name">TEAM 2</h2>
      </PanelSide>
    </PanelTop>
    <PanelBody>
      <PanelTeam className="left">
        {team1.map(p => <PanelPlayerCard key={p.battleTag} player={p} teamClass="team-0" />)}
      </PanelTeam>
      <PanelCenter>
        <div style={{ width:"100%", height:70 }}>
          <MmrComparison data={ChartData} variant="scorecard" localScale />
        </div>
      </PanelCenter>
      <PanelTeam className="right">
        {team2.map(p => <PanelPlayerCard key={p.battleTag} player={p} teamClass="team-1" />)}
      </PanelTeam>
    </PanelBody>
  </CardD>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const ALL_TAGS = [
  ...team1.map(p => p.battleTag),
  ...team2.map(p => p.battleTag),
];

const VARIANTS = [
  { id: "A", label: "Cinematic", desc: "race-colored edge glow, large team names, dramatic", Component: VariantA },
  { id: "B", label: "Minimal",   desc: "dark glass, no border, large MMR, subtle typography", Component: VariantB },
];

const CardOverlayLab = () => {
  const [avatarUrls, setAvatarUrls] = useState({});
  const [countries, setCountries]   = useState({});

  useEffect(() => {
    Promise.all(ALL_TAGS.map(tag => getPlayerProfile(tag).catch(() => ({}))))
      .then(profiles => {
        setAvatarUrls(Object.fromEntries(
          profiles.map((p, i) => [ALL_TAGS[i], p.profilePicUrl]).filter(([, u]) => u)
        ));
        setCountries(Object.fromEntries(
          profiles.map((p, i) => [ALL_TAGS[i], p.country]).filter(([, c]) => c)
        ));
      });
  }, []);

  return (
    <Lab>
      {VARIANTS.map(({ id, label, desc, Component }) => (
        <Variant key={id}>
          <VariantLabel>
            <span>{id}</span>{label} — <span style={{ color:"var(--grey-light)", fontFamily:"var(--font-mono)", fontSize:11 }}>{desc}</span>
          </VariantLabel>
          <Component avatarUrls={avatarUrls} countries={countries} />
        </Variant>
      ))}
    </Lab>
  );
};

export default CardOverlayLab;
