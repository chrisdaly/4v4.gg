import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Match from "./Match";
import { Grid, Container, Divider, Flag, Image } from "semantic-ui-react";
import { findPlayerInOngoingMatches, findPlayerRaceInMatch, findPlayerMmrInMatch, fetchMMRTimeline, getPlayerProfilePicUrl, getPlayerCountry, standardDeviation, arithmeticMean } from "./utils.js";
import { Sparklines, SparklinesLine, SparklinesSpots } from "react-sparklines";
import OnGoingGame from "./OngoingGame.js";
import { gameMode, gateway, season } from "./params";
import { Link } from "react-router-dom";

import human from "./icons/human.svg";
import orc from "./icons/orc.svg";
import elf from "./icons/elf.svg";
import undead from "./icons/undead.svg";
import random from "./icons/random.svg";
import FinishedGame from "./FinishedGame.js";

const getMatchData = async (matchId) => {
  const url = `https://website-backend.w3champions.com/api/matches/${matchId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch match data");
  }
  return response.json();
};

const PlayerProfile = () => {
  const [matchHistory, setMatchHistory] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [ongoingGame, setOngoingGame] = useState(null);
  const [transition, setTransition] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [ladderRanks, setLadderRanks] = useState([]);
  const [profilePic, setProfilePic] = useState(null);
  const [country, setCountry] = useState(null);
  const [mmrTimeLine, setMmrTimeline] = useState(null);
  const [mmr, setMmr] = useState(null);
  const raceMapping = { 8: undead, 0: random, 4: elf, 2: orc, 1: human };
  const [race, setRace] = useState(null);
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const pageUrl = new URL(window.location.href);
    const player = pageUrl.pathname.split("/").slice(-1)[0];

    try {
      const playerResponse = await fetch(`https://website-backend.w3champions.com/api/players/${player}`);
      const playerResult = await playerResponse.json();
      console.log("playerResult", playerResult);
      setPlayerData(playerResult);

      const ongoingResponse = await fetch("https://website-backend.w3champions.com/api/matches/ongoing");
      const ongoingResult = await ongoingResponse.json();
      const ongoingGame = findPlayerInOngoingMatches(ongoingResult, playerResult.battleTag);
      setOngoingGame(ongoingGame);

      const searchParams = new URLSearchParams({
        offset: 0,
        gateway,
        pageSize: 200,
        season,
        gameMode: 4,
        playerId: playerResult.battleTag,
      });

      var url = new URL("https://website-backend.w3champions.com/api/ladder/0");
      var params = { gateway, season, gameMode };
      url.search = new URLSearchParams(params).toString();

      var response = await fetch(url);
      var result = await response.json();
      setLadderRanks(result.slice(0, 20));

      const profilePic = await getPlayerProfilePicUrl(playerResult.battleTag);
      setProfilePic(profilePic);

      const country = await getPlayerCountry(playerResult.battleTag);
      setCountry(country);

      const matchesResponse = await fetch(`https://website-backend.w3champions.com/api/matches/search?${searchParams}`);
      const matchesResult = await matchesResponse.json();
      let recentMatches = matchesResult.matches.slice(0, 5);
      const matchDataPromises = recentMatches.map((match) => getMatchData(match.id));
      const matchDataResults = await Promise.all(matchDataPromises);
      setMatchHistory(matchDataResults);

      const race = findPlayerRaceInMatch(recentMatches[0], playerResult.battleTag);
      setRace(race);

      const mmrCurrent = findPlayerMmrInMatch(recentMatches[0], playerResult.battleTag);
      setMmr(mmrCurrent);

      const mmrData = await fetchMMRTimeline(playerResult.battleTag, race); // Fetch MMR timeline data
      setMmrTimeline(mmrData);

      setIsLoaded(true);
    } catch (error) {
      console.error(error);
    }
  };

  if (!isLoaded || !playerData || !mmrTimeLine) return null;
  return (
    <div>
      {!ongoingGame ? (
        <></>
      ) : (
        <div id="ongoing">
          {/* <h1>Ongoing Game</h1> */}
          <OnGoingGame ongoingGameData={ongoingGame} />
        </div>
      )}
      {/* {!matchHistory ? (
        <></>
      ) : (
        <div id="history">
          <h1>Game History</h1>
          {matchHistory.map((d) => (
            <FinishedGame data={d} />
          ))}
        </div>
      )} */}
    </div>
  );
};

export default PlayerProfile;

{
  /* <Navbar />
<div className={`team-0 max-width-cell`} style={{ position: "relative" }}>
  <div style={{ position: "relative" }}>
    <img src={profilePic} alt="Player Profile Pic" className="profile-pic " />
    <Flag name={country.toLowerCase()} style={{ position: "absolute", top: 0, right: 0 }} className={`flag`}></Flag>
  </div>
  <div>
    <Link to={`/player/${playerData.battleTag.replace("#", "%23")}`}>
      <h2>{playerData.name}</h2>
    </Link>
  </div>
  <div>
    <img src={raceMapping[race]} alt={race} className={"race"} style={{ height: "40px" }} />
  </div>
  <div>
    <p className="key">
      <span className="number value">{mmr}</span> <span className="key">MMR</span>
    </p>
  </div>
  <div style={{ width: "200px", height: "20px", overflow: "hidden", display: "inline-block", marginTop: "10px" }}>
    {mmrTimeLine && mmrTimeLine.length > 0 ? (
      <Sparklines data={mmrTimeLine} style={{ width: "130px", height: "14px" }}>
        <SparklinesLine style={{ strokeWidth: 4, stroke: "white", fill: "none" }} />
      </Sparklines>
    ) : (
      <div>No data available</div>
    )}
  </div>
</div> */
}
