import React, { Component } from "react";
import { Container, Grid, Dimmer, Loader, Checkbox } from "semantic-ui-react";

import Navbar from "./Navbar.js";
import Match from "./Match.js";
import toast, { Toaster } from "react-hot-toast";

import { standardDeviation, arithmeticMean } from "./utils.js";
import { gameMode, gateway, season } from "./params";

const pageUrl = new URL(window.location.href);
const matchId = pageUrl.pathname.split("/").slice(-1)[0]; //

class MatchPage extends Component {
  state = {
    match: null,
    isLoaded: false,
    ladderRanks: [],
    ongoing: true,
  };

  componentDidMount() {
    this.loadInitData();
    let intervalId = setInterval(this.loadNewData, 1000);
    let transitionId = setInterval(() => this.setState({ transition: !this.state.transition }), 10000);

    this.setState({ intervalId, transitionId });
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }

  loadNewData = async () => {
    if (this.state.ongoing === true) {
      console.log("checking update on game");

      var urlLive = new URL("https://website-backend.w3champions.com/api/matches/ongoing");
      var params = {
        offset: 0,
        gateway,
        pageSize: 50,
        gameMode,
        map: "Overall",
      };
      urlLive.search = new URLSearchParams(params).toString();

      let response = await fetch(urlLive);
      var result1 = await response.json();
      let matches = result1.matches;

      let match = matches.filter((d) => d.id === matchId);
      console.log("match", match);
      if (match.length === 0) {
        console.log("setting false");
        this.setState({ ongoing: false });
        toast("Game finished!", { icon: "🏁" });
        var audio = new Audio("http://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a");
        audio.play();
      } else {
      }
    }
  };

  loadInitData = async () => {
    var audio = new Audio("http://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a");
    audio.play();

    let ongoing = this.state.ongoing;
    let url = new URL(`https://website-backend.w3champions.com/api/matches/${matchId}`);
    let match = null;

    var response = await fetch(url);
    var result = await response.json();

    if (result.match === null) {
      var urlLive = new URL("https://website-backend.w3champions.com/api/matches/ongoing");
      ongoing = true;
      var params = {
        offset: 0,
        gateway,
        pageSize: 50,
        gameMode,
        map: "Overall",
      };
      urlLive.search = new URLSearchParams(params).toString();

      response = await fetch(urlLive);
      var result1 = await response.json();
      let matches = result1.matches;

      matches = matches.filter((d) => d.id === matchId);
      matches.forEach((m) => {
        let matchMmr = 0;
        m.teams.forEach((t) => {
          let playerMmrs = t.players.map((d) => d.oldMmr);
          let teamAverage = arithmeticMean(playerMmrs);
          let teamDeviation = standardDeviation(playerMmrs);
          t.teamAverage = teamAverage;
          t.teamDeviation = teamDeviation;
          matchMmr += teamAverage;
        });

        m.matchMmr = Math.round(matchMmr / 2);
      });

      match = matches[0];
    } else {
    }

    console.log("match", match);
    if ((match !== undefined) & (match !== null)) {
      let matchMmr = 0;
      match.teams.forEach((t) => {
        let playerMmrs = t.players.map((d) => d.oldMmr);
        let teamAverage = arithmeticMean(playerMmrs);
        let teamDeviation = standardDeviation(playerMmrs);
        t.teamAverage = teamAverage;
        t.teamDeviation = teamDeviation;
        matchMmr += teamAverage;
      });

      match.matchMmr = Math.round(matchMmr / 2);

      url = new URL(`https://website-backend.w3champions.com/api/ladder/0?gateWay=20&gameMode=4&season=${season}`);
      params = { gateway, season, gameMode };
      url.search = new URLSearchParams(params).toString();
      var response = await fetch(url);
      var result2 = await response.json();
      let ladderRanks = result2.slice(0, 20);

      this.setState({
        ...result1,
        match,
        ladderRanks: [ladderRanks],
        isLoaded: true,
        ongoing,
      });
    }
  };

  render() {
    const queueDict = this.state.QUEUED_PLAYER_COUNT ? this.state.QUEUED_PLAYER_COUNT.filter((d) => d.gateway === 20 && d.gameMode === 4)[0] : {};
    const numQueued = queueDict ? queueDict.count : 0;
    const playerPoolPlaying = this.state.playerPoolPlaying;
    const playerPoolRecent = this.state.playerPoolRecent;
    const { match, ladderRanks } = this.state;

    if (this.state.isLoaded === true) {
      return (
        <Container>
          <Navbar />

          <div className="matches">
            <Match match={match} transition={this.state.transition} ladderRanks={ladderRanks} sparklinePlayersData={{}}></Match>
            <Toaster
              containerStyle={{
                top: 400,
                left: 20,
                bottom: 20,
                right: 20,
              }}
              toastOptions={{
                // Define default options
                className: "",
                duration: 500000,
                style: {
                  background: "white",
                  color: "black",
                },
              }}
            />
          </div>
        </Container>
      );
    } else {
      return (
        <Container>
          <Navbar />
          <Grid columns={3}>
            <Grid.Row columns={3}>
              {/* <Segment> */}
              <Dimmer active>
                <Loader />
              </Dimmer>
              {/* <Toaster
                containerStyle={{
                  top: 400,
                  left: 20,
                  bottom: 20,
                  right: 20,
                }}
                toastOptions={{
                  // Define default options
                  className: "",
                  duration: 500000,
                  style: {
                    background: "white",
                    color: "black",
                  },
                }}
              /> */}
            </Grid.Row>
          </Grid>
        </Container>
      );
    }
  }
}

export default MatchPage;
