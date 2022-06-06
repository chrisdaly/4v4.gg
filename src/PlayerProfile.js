import React, { Component } from "react";
import Navbar from "./Navbar.js";
import Match from "./Match.js";
import Player from "./Player.js";
import LineGraphPlotSection from "./LineGraphPlotSection.js";

import { Grid, Container, Flag, Divider } from "semantic-ui-react";

const arithmeticMean = (x) => {
  const product = x.reduce((p, c) => p * c, 1);
  const exponent = 1 / x.length;
  return Math.round(Math.pow(product, exponent));
};

class PlayerProfile extends Component {
  state = {
    matches: [],
    isLoaded: false,
    ongoingGame: {},
  };

  componentDidMount() {
    this.loadData();
    let intervalId = setInterval(this.loadData, 30000);
    let transitionId = setInterval(() => this.setState({ transition: !this.state.transition }), 1000);

    this.setState({ intervalId, transitionId });
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
    clearInterval(this.state.transitionId);
  }

  loadData = async () => {
    this.setState({});
    const pageUrl = new URL(window.location.href);
    const player = pageUrl.pathname.split("/").slice(-1)[0]; //
    const playerTag = player.replace("%23", "#");
    const gameMode = 4;
    const gateway = 20;

    const season = 11;
    try {
      var url = new URL(`https://website-backend.w3champions.com/api/players/${player}`);
      var response = await fetch(url);
      var result = await response.json();
      this.setState({ ...result });

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
      this.setState({ gameModeStats });

      // MMR TIMELINE
      // var url = new URL(`https://website-backend.w3champions.com/api/players/${player}/mmr-rp-timeline`);
      // var params = { gateway: 20, season, race: 0, gameMode: 4 }; //hardcodig race at the moment
      // url.search = new URLSearchParams(params).toString();
      // var response = await fetch(url);
      // var result = await response.json();
      // console.log("RESULT", result);
      // this.setState({ ...result });

      var url = new URL("https://website-backend.w3champions.com/api/matches/ongoing");
      var params = { offset: 0, gateway, pageSize: 50, gameMode, map: "Overall" };
      url.search = new URLSearchParams(params).toString();

      var response = await fetch(url);
      var result = await response.json();
      // console.log("oingoing", result);

      var ongoingGame = {};

      result.matches.forEach((m) =>
        m.teams.forEach((t) => {
          let players = t.players.map((p) => p.battleTag);
          if (players.includes(playerTag)) {
            ongoingGame = m;
            console.log("ongoingGame", ongoingGame);

            ongoingGame.teams.forEach((t) => {
              let playerMmrs = t.players.map((d) => d.oldMmr);
              let teamAverage = arithmeticMean(playerMmrs);
              t.teamAverage = teamAverage;
            });
          }
        })
      );

      this.setState({ ongoingGame, isLoaded: true });

      // var ongoingGames = result.matches.filter((t => t.forEach();
      // console.log("ongoingGames", ongoingGames);
      // this.setState({ gameModeStats });

      function getUniqueListBy(arr, key) {
        return [...new Map(arr.map((item) => [item[key], item])).values()];
      }

      let offset = 0;

      var url = new URL(
        `https://website-backend.w3champions.com/api/matches/search?playerId=${player}&gateway=20&offset=${offset}&pageSize=200&season=${season}&gameMode=4`
      );
      var params = { gateway: 20, season, playerId: playerTag, pageSize: 20, gameMode: 4 };
      url.search = new URLSearchParams(params).toString();
      var response = await fetch(url);
      var result = await response.json();
      // console.log("matches", result);
      let matches = [...this.state.matches, ...result.matches];

      // matches = getUniqueListBy(matches, "id");
      // console.log("MATCHES", matches);
      console.log("MATCHES", matches);
      this.setState({ matches: matches, isLoaded: true });
    } catch (e) {
      console.log(e);
    }
  };

  render() {
    if (this.state.isLoaded === true && this.state.matches.length > 0 && this.state.battleTag !== "") {
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

      const { countryCode, location, profilePicture, playerAkaData, gameModeStats } = this.state;

      function getUniqueListBy(arr, key) {
        return [...new Map(arr.map((item) => [item[key], item])).values()];
      }

      let numIcon = profilePicture.pictureId;
      let raceIcon = profilePicture.race;
      let matches = getUniqueListBy(this.state.matches, "id");
      matches.forEach((m) => {
        let matchMmr = 0;
        m.teams.forEach((t) => {
          let playerMmrs = t.players.map((d) => d.oldMmr);
          let teamAverage = arithmeticMean(playerMmrs);
          t.teamAverage = teamAverage;
          matchMmr += teamAverage;
        });

        m.matchMmr = Math.round(matchMmr / 2);
      });
      const profilePic = `${process.env.PUBLIC_URL}/icons/profile/${raceMapping[raceIcon]}_${numIcon}.jpg`;

      let playedRace = raceMapping[raceIcon];
      playedRace = playedRace ? playedRace.toLowerCase() : "RANDOM";
      const racePic = `${process.env.PUBLIC_URL}/icons/${playedRace}.png`;

      let countryCodeIcon = countryCode !== null ? countryCode.toLowerCase() : location.toLowerCase();

      let winrate = Math.round(gameModeStats.winrate * 10000) / 100;
      let leagueId = gameModeStats.leagueId;
      let leagueBadge = badgeMapping[leagueId];

      const leaguePic = `${process.env.PUBLIC_URL}/icons/${leagueBadge}.png`;
      // console.log("leagueId", leagueBadge);

      // console.log("this.state.battleTag", this.state.battleTag);
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

      return (
        <Container>
          <Navbar />
          {/* <div className={"navbarPlayerCard"}> */}
          <div id="profileCard">
            <Grid>
              {/* <Grid.Row></Grid.Row> */}
              {/* <Grid.Row> */}
              <Grid columns={3}>
                <Grid.Column width={3} className={"leagueContainer"}>
                  <img src={leaguePic} alt={"test"} className={"leaguePic"} />
                </Grid.Column>
                <Grid.Column width={8}>
                  <Grid.Row divided>
                    <h5 className={"profileName"}>{this.state.name}</h5>
                  </Grid.Row>
                  <Grid.Row className={"middleprofilediv"}>{this.state.gameModeStats.mmr} MMR</Grid.Row>
                  {/* <p className={"leagueRank"}>Rank #{gameModeStats.rank}</p> */}
                  {lastTenResults.map((r, index) => (
                    <span key={index} className={r.toString()}>
                      {r === true ? "W" : "L"}
                    </span>
                  ))}

                  <Grid.Row>
                    {/* <img src={racePic} alt={""} /> */}
                    {/* <Flag name={countryCodeIcon} style={iconStyle}></Flag> */}
                    {/* <p className={"winloss"}>
                        {gameModeStats.wins}W - {gameModeStats.losses}L ({winrate}%)
                      </p> */}
                    {/* <p className={"league"}>{badgeMapping[leagueId]}</p> */}
                  </Grid.Row>
                </Grid.Column>
                <Grid.Column width={3}>
                  <img
                    src={profilePic}
                    alt={"test"}
                    className={"profilePic"}
                    onError={(event) => {
                      event.target.src = "https://m.media-amazon.com/images/I/51e6kpkyuIL._AC_SL1200_.jpg";
                      event.onerror = null;
                    }}
                  />
                </Grid.Column>
                <LineGraphPlotSection data={this.state.mmrRpAtDates} />

                {/* <img src={leaguePic} alt={"test"} /> */}
              </Grid>
              {/* </Grid.Row> */}
            </Grid>
          </div>
          <Divider />
          <div className="ongoing">
            {Object.keys(this.state.ongoingGame).length !== 0 ? (
              <div>
                <Match match={this.state.ongoingGame} key={this.state.ongoingGame.id} />
                <Divider />
              </div>
            ) : (
              <div />
            )}
          </div>
          <div className="matches">
            {Object.keys(matches).map((key) => (
              <div>
                <Match match={matches[key]} key={matches[key].id}></Match>
                <Divider />
              </div>
            ))}
          </div>
        </Container>
      );
    } else {
      return <div></div>;
    }
  }
}

export default PlayerProfile;
