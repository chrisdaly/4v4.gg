import React, { useState, useEffect } from "react";
import Team from "./Team.js";
import MatchHeader from "./MatchHeader.js";
import MmrComparison from "./MmrComparison.js";
import * as d3 from "d3";
import { Grid } from "semantic-ui-react";
import { gameMode, gateway } from "./params";

const Match = ({ match, battleTag, render, sparklinePlayersData, ladderRanks }) => {
  const [isChecked, setIsChecked] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [ongoing, setOngoing] = useState(true);
  const [mmrsGathered, setMmrsGathered] = useState([]);
  const [allMmrsgathered, setAllMmrsgathered] = useState(false);
  const [transitionId, setTransitionId] = useState(null);
  const [transition, setTransition] = useState(false);

  useEffect(() => {
    return () => {
      clearInterval(intervalId);
      clearInterval(transitionId);
    };
  }, [intervalId, transitionId]);

  const toggleChange = () => {
    setIsChecked(!isChecked);
    if (intervalId === null) {
      let newIntervalId = setInterval(getGameData, 1000);
      setIntervalId(newIntervalId);
    } else {
      clearInterval(intervalId);
    }
  };

  const noteApiAttempted = (id) => {
    let newMmrsGathered = [...mmrsGathered, id];
    let newAllMmrsgathered = allMmrsgathered;
    let newTransitionId = transitionId;
    if (newMmrsGathered.length === 8) {
      newAllMmrsgathered = true;
      newTransitionId = setInterval(() => setTransition(!transition), 10000);
    }
    setMmrsGathered(newMmrsGathered);
    setAllMmrsgathered(newAllMmrsgathered);
    setTransitionId(newTransitionId);
  };

  const getGameData = async () => {
    if (!ongoing) return;

    const matchId = match.id;
    const urlLive = new URL("https://website-backend.w3champions.com/api/matches/ongoing");
    const params = {
      offset: 0,
      gateway,
      pageSize: 50,
      gameMode,
      map: "Overall",
    };
    urlLive.search = new URLSearchParams(params).toString();

    try {
      const response = await fetch(urlLive);
      const result1 = await response.json();
      const matches = result1.matches;

      const filteredMatch = matches.filter((d) => d.id === matchId);
      if (filteredMatch.length === 0) {
        setOngoing(false);
        // toast("Game finished!", { icon: "🏁" });
        // const audio = new Audio("https://notificationsounds.com/storage/sounds/file-sounds-1348-ill-make-it-possible.mp3");
        // audio.play();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const teamOnePlayers = match.teams[0].players.map((d) => d.battleTag);
  const teamOne = teamOnePlayers.includes(battleTag) ? match.teams[0] : match.teams[1];
  const teamTwo = teamOnePlayers.includes(battleTag) ? match.teams[1] : match.teams[0];
  const teamOneMmrs = teamOne.players.map((d) => d.oldMmr);
  const teamTwoMmrs = teamTwo.players.map((d) => d.oldMmr);
  const teamOneAverageMmr = teamOne.teamAverage;
  const teamTwoAverageMmr = teamTwo.teamAverage;
  const gameMmr = Math.round((teamOneAverageMmr + teamTwoAverageMmr) / 2);
  const threshold = d3.scaleThreshold().domain([1000, 1200, 1300, 1400, 1500, 1600, 1700]).range(["grass", "bronze", "silver", "gold", "platinum", "diamond", "adept", "master", "grandmaster"]);
  const league = threshold(gameMmr);
  const data = {
    teamOneMmrs,
    teamOneAverageMmr,
    teamTwoMmrs,
    teamTwoAverageMmr,
    league,
  };
  const startDate = new Date(match.startTime);
  const map = match.mapName;
  const matchOngoing = match.durationInSeconds === 0;

  return (
    <div className="match">
      <Grid columns={3}>
        <Grid.Column />
        <Grid.Column>{render === false ? <div /> : <MatchHeader id={match.id} league={league} startDate={startDate} map={map} ongoing={matchOngoing} durationInSeconds={match.durationInSeconds} />}</Grid.Column>
        <Grid.Column />

        <Grid.Row columns={3}>
          <Grid.Column width={6}>
            <Team
              team={teamOne}
              teamNum={1}
              teamAverage={teamOneAverageMmr}
              teamDeviation={teamOne.teamDeviation}
              side="left"
              transition={transition}
              sparklinePlayersData={sparklinePlayersData}
              ladderRanks={ladderRanks}
              noteApiAttempted={noteApiAttempted}
              transitionId={transitionId}
              allMmrsgathered={allMmrsgathered}
            />
          </Grid.Column>
          <Grid.Column width={4}>
            <RangePlotSection data={data} id={match.id} />
          </Grid.Column>
          <Grid.Column width={6}>
            <Team
              team={teamTwo}
              teamNum={2}
              teamAverage={teamTwoAverageMmr}
              teamDeviation={teamTwo.teamDeviation}
              side="right"
              transition={transition}
              sparklinePlayersData={sparklinePlayersData}
              ladderRanks={ladderRanks}
              noteApiAttempted={noteApiAttempted}
              transitionId={transitionId}
              allMmrsgathered={allMmrsgathered}
            />
          </Grid.Column>
        </Grid.Row>
        {/* <div
            className={"checkboxDiv"}
            style={{ margin: "auto", paddingTop: "10px" }}
          >
            <Checkbox
              toggle
              // label={"notify me"}
              defaultChecked={this.state.isChecked}
              onChange={this.toggleChange}
            />
          </div> */}
      </Grid>
    </div>
  );
};

export default Match;
