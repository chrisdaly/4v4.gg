import React, { Component } from "react";
import Navbar from "./Navbar.js";
import Match from "./Match.js";
import Player from "./Player.js";

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
  };

  componentDidMount() {
    this.loadData();
    // let intervalId = setInterval(this.loadData, 30000);
    // if (queryParams.player !== undefined) {

    // }
    this.setState({}); //intervalId
  }

  componentWillUnmount() {
    // clearInterval(this.state.intervalId);
  }

  loadData = async () => {
    const pageUrl = new URL(window.location.href);
    const player = pageUrl.pathname.split("/").slice(-1)[0]; //
    const playerTag = player.replace("%23", "#");
    const season = 9;
    try {
      var url = new URL(`https://website-backend.w3champions.com/api/players/${player}`);
      var response = await fetch(url);
      var result = await response.json();
      this.setState({ ...result });

      var url = new URL("https://website-backend.w3champions.com/api/matches/search");
      var params = { playerId: playerTag, gateway: 20, offset: 0, gameMode: 4, season, pageSize: 100 };
      url.search = new URLSearchParams(params).toString();
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

      let offset = 0;

      var url = new URL(
        `https://website-backend.w3champions.com/api/matches/search?playerId=${player}&gateway=20&offset=${offset}&pageSize=200&season=7&gameMode=4`
      );
      var params = { gateway: 20, season, playerId: playerTag, pageSize: 20, gameMode: 4 };
      url.search = new URLSearchParams(params).toString();
      var response = await fetch(url);
      var result = await response.json();
      console.log("matches", result);
      this.setState({ matches: result.matches, isLoaded: true });
    } catch (e) {
      console.log(e);
    }
  };

  render() {
    if (this.state.isLoaded === true && this.state.matches.length > 0) {
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
      const iconStyle = { width: "185px" };

      let numIcon = profilePicture.pictureId;
      let raceIcon = profilePicture.race;
      let matches = this.state.matches;
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
      console.log("profilePic", profilePic);
      const racePic = `${process.env.PUBLIC_URL}/icons/${playedRace}.png`;

      let countryCodeIcon = countryCode !== null ? countryCode.toLowerCase() : location.toLowerCase();

      let winrate = Math.round(gameModeStats.winrate * 10000) / 100;
      let leagueId = gameModeStats.leagueId;
      let leagueBadge = badgeMapping[leagueId];

      const leaguePic = `${process.env.PUBLIC_URL}/icons/${leagueBadge}.png`;
      console.log("leagueId", leagueBadge);

      return (
        <Container>
          <Navbar />
          {/* <div className={"navbarPlayerCard"}> */}
          <Grid>
            <Grid.Row columns={3}>
              <Grid.Column width={6}>
                <img src={profilePic} alt={"test"} className={"profilePic"} />
                {/* <Player data={{ ...this.state, oldMmr: mmr }}></Player> */}

                <Flag name={countryCodeIcon} style={iconStyle}></Flag>
                <img src={racePic} alt={""} />

                <br />

                <img src={leaguePic} alt={"test"} />

                <p>
                  | {gameModeStats.wins}W - {gameModeStats.losses}L ({winrate}%)
                </p>
              </Grid.Column>
            </Grid.Row>
          </Grid>
          {/* </div> */}
          <Divider />
          <div className="matches">
            {Object.keys(matches).map((key) => (
              <Match match={matches[key]} key={matches[key].id}></Match>
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
