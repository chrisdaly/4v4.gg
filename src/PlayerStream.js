import React, { Component } from "react";
import Navbar from "./Navbar.js";
import Match from "./Match.js";
import Player from "./Player.js";
import LineGraphPlotSection from "./LineGraphPlotSection.js";

import { Grid, Container, Flag, Divider } from "semantic-ui-react";
import { Header } from "semantic-ui-react";

import {standardDeviation, arithmeticMean, getUniqueListBy} from "./utils.js"

import logo from "./logos/logo.svg";


class PlayerStream extends Component {
  state = {
    matches: [],
    isLoaded: false,
    ongoingGame: {},
    transition: false,
    sparklinePlayersData: {},
    race: 0,
    gameModeStats: [],
    ladderRanks: []
  };

  componentDidMount() {
    this.loadInitData();
    this.loadNewData()
    let intervalId = setInterval(this.loadNewData, 10000);
    let transitionId = setInterval(() => this.setState({ transition: !this.state.transition }), 10000);

    this.setState({ intervalId, transitionId });
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
    clearInterval(this.state.transitionId);
  }

  loadInitData = async () => {
    console.log("LOADING INIT DATA")

    const pageUrl = new URL(window.location.href);
    const player = pageUrl.pathname.split("/").slice(-1)[0]; //
    const playerTag = player.replace("%23", "#");
    const gameMode = 4;
    const gateway = 20;

    const season = 12;
    try {
      var url = new URL(`https://website-backend.w3champions.com/api/players/${player}`);
      var response = await fetch(url);
      var result = await response.json();
      const race = result.winLosses.sort((a, b) => b.games - a.games)[0].race
      this.setState({ ...result, race });
      
      var url = new URL(`https://website-backend.w3champions.com/api/personal-settings/${player}`);
      var response = await fetch(url);
      var result = await response.json();
      this.setState({ ...result });

      var url = new URL(`https://website-backend.w3champions.com/api/players/${player}/game-mode-stats`);
      var params = { gateway: 20, season };
      url.search = new URLSearchParams(params).toString();
      var response = await fetch(url);
      var result = await response.json();
      var gameModeStats = result.filter((d) => d.gameMode === 4)[0];
      this.setState({ gameModeStats, isLoaded: true });

      var url = new URL("https://website-backend.w3champions.com/api/ladder/0?gateWay=20&gameMode=4&season=12");
      var params = {gateway, season, gameMode};
      url.search = new URLSearchParams(params).toString();

      var response = await fetch(url);
      var result = await response.json();
      this.setState({ "ladderRanks": result.slice(0, 20) });
      
    } catch(e){}
  }

  loadNewData = async () => {
    console.log("CHECKING FOR NEW GAME")
    const pageUrl = new URL(window.location.href);
    const player = pageUrl.pathname.split("/").slice(-1)[0]; //
    const playerTag = player.replace("%23", "#");
    const gameMode = 4;
    const gateway = 20;

    const season = 12;
    try {
      var url = new URL("https://website-backend.w3champions.com/api/matches/ongoing");
      var params = { offset: 0, gateway, pageSize: 50, gameMode, map: "Overall" };
      url.search = new URLSearchParams(params).toString();

      var response = await fetch(url);
      var result = await response.json();
      // console.log("oingoing", result);

      let ongoingGame = this.state.ongoingGame;

      result.matches.forEach((m) =>
        m.teams.forEach((t) => {
          let players = t.players.map((p) => p.battleTag);
          if (players.includes(playerTag) & m.id !== ongoingGame.id) {
            ongoingGame = m;
            console.log("NEW GAME", ongoingGame);
            this.setState({ matches: [ongoingGame], ongoingGame, isLoaded: true });
          }
        })
      );

      if (Object.keys(ongoingGame).length === 0){
        console.log("NO CURRENT GAME", ongoingGame)
        let offset = 0;

        var url = new URL(
          `https://website-backend.w3champions.com/api/matches/search?playerId=${player}&gateway=20&offset=${offset}&pageSize=200&season=${season}&gameMode=4`
        );
        var params = { gateway: 20, season, playerId: playerTag, pageSize: 20, gameMode: 4 };
        url.search = new URLSearchParams(params).toString();
        var response = await fetch(url);
        var result = await response.json();
        // console.log("matches", result);
        let matches = [...this.state.matches, result.matches[0]];
  
        if (Object.keys(ongoingGame).length === 0) {
          ongoingGame = matches[0];
        }
        console.log("MATCHES", matches);
        this.setState({ matches: matches, ongoingGame, isLoaded: true });
      }

    } catch (e) {
      console.log(e);
    }
      
  };

  render() {
    if (this.state.isLoaded === true && this.state.matches.length > 0 && this.state.battleTag !== "" ) { //&& Object.keys(this.state.gameModeStats).length > 0
      const raceMapping = {
        8: "UNDEAD",
        0: "RANDOM",
        4: "ELF",
        2: "ORC",
        1: "HUMAN",
        16: "TOTAL",
        32: "SPECIAL",
      };

      const badgeMapping = {
        0: "grandmaster",
        1: "adept",
        2: "master",
        3: "diamond",
        4: "platinum",
        5: "gold",
        6: "silver",
        7: "bronze",
        8: "grass",
      };

      const { countryCode, location, profilePicture, playerAkaData} = this.state; //gameModeStats


      // let numIcon = profilePicture.pictureId;
      // let raceIcon = profilePicture.race;
      let matches = getUniqueListBy(this.state.matches, "id");
      matches.forEach((m) => {
        let matchMmr = 0;
        m.teams.forEach((t) => {
          let playerMmrs = t.players.map((d) => d.oldMmr);
          let teamAverage = arithmeticMean(playerMmrs);
          let teamDeviation = standardDeviation(playerMmrs)
          t.teamAverage = teamAverage;
          t.teamDeviation = teamDeviation
        });

        m.matchMmr = Math.round(matchMmr / 2);
      });
      // const profilePic = `${process.env.PUBLIC_URL}/icons/profile/${raceMapping[raceIcon]}_${numIcon}.jpg`;

      // let playedRace = raceMapping[raceIcon];
      // playedRace = playedRace ? playedRace.toLowerCase() : "RANDOM";
      // const racePic = `${process.env.PUBLIC_URL}/icons/${playedRace}.png`;

      // let countryCodeIcon = countryCode !== null ? countryCode.toLowerCase() : location.toLowerCase();

      // let winrate = Math.round(gameModeStats.winrate * 10000) / 100;
      // let leagueId = gameModeStats.leagueId;
      // let leagueBadge = badgeMapping[leagueId];

      let playerCardData = {};
      matches[0].teams.forEach((t) => {
        let players = t.players.map((p) => p.battleTag);
        if (players.includes(this.state.battleTag)) {
          playerCardData = t.players.filter((d) => d.battleTag === this.state.battleTag)[0];
        }
      });

      let lastTenMatches = matches
        .filter((m) => m.durationInSeconds > 0)
        .slice(0, 10)
        .reverse();

      let lastTenResults = lastTenMatches.map((m) => {
        let t = m.teams[0];
        let players = t.players.map((p) => p.battleTag);
        let won = players.includes(this.state.battleTag) ? t.won : !t.won;
        return won;
      });

      // let sparklineData = this.state.mmrRpAtDates.map(d => )
      const {ladderRanks} = this.state;

      return (
        <Container style={{}}>
          <Header as="h2" icon textAlign="center">
            <div id="logoAndText">
              <img src={logo} alt={"asd"} className={"logo"} style={{ height: "42px", "marginBottom": "-10px" }} />
              <p style={{ "fontSize": "18px", margin: "0 0 0em" }}>4v4.GG</p>
            </div>
          </Header>
          <div className="ongoing">
            {Object.keys(this.state.ongoingGame).length !== 0 ? (
              <Match match={this.state.ongoingGame} render={false}  ladderRanks={ladderRanks} battleTag={this.state.battleTag} key={this.state.ongoingGame.id} 
              transition={this.state.transition} sparklinePlayersData={this.state.sparklinePlayersData}></Match>

            ) : (
              <div />
            )}
          </div>
        </Container>
      );
    } else {
      return <div></div>;
    }
  }
}

export default PlayerStream;
