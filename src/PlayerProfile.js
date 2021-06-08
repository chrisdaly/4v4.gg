import React, { Component } from "react";
import Navbar from "./Navbar.js";

import { Container, Flag } from "semantic-ui-react";

class PlayerProfile extends Component {
  state = {
    matches: [],
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
    try {
      var url = new URL(`https://website-backend.w3champions.com/api/players/${player}`);
      var response = await fetch(url);
      var result = await response.json();
      this.setState({ ...result });

      var url = new URL("https://website-backend.w3champions.com/api/matches/search");
      var params = { playerId: playerTag, gateway: 20, offset: 0, gameMode: 4, season: 7, pageSize: 100 };
      url.search = new URLSearchParams(params).toString();
      var response = await fetch(url);
      var result = await response.json();
      this.setState({ ...result });

      var url = new URL(`https://website-backend.w3champions.com/api/personal-settings/${player}`);
      var response = await fetch(url);
      var result = await response.json();
      this.setState({ ...result });

      var url = new URL(`https://website-backend.w3champions.com/api/players/${player}/game-mode-stats`);
      var params = { gateway: 20, season: 7 };
      url.search = new URLSearchParams(params).toString();
      var response = await fetch(url);
      var result = await response.json();
      var gameModeStats = result.filter((d) => d.gameMode === 4)[0];
      this.setState({ gameModeStats });
    } catch (e) {
      console.log(e);
    }
  };

  render() {
    if ((this.state.profilePicture !== undefined) & (this.state.countryCode !== undefined) & (this.state.gameModeStats !== undefined)) {
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
          <div>
            <p>{this.state.name}</p>

            <Flag name={countryCodeIcon} style={iconStyle}></Flag>
            <img src={racePic} alt={""} />

            <br />
            <img src={profilePic} alt={"test"} />
            <img src={leaguePic} alt={"test"} />

            <p>
              {gameModeStats.mmr} MMR | {gameModeStats.wins}W - {gameModeStats.losses}L ({winrate}%)
            </p>
          </div>
        </Container>
      );
    } else {
      return <div></div>;
    }

    //   <Container>

    // <p>test</p>
    //   </Container>
  }
}

export default PlayerProfile;
