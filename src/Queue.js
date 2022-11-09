import React, { Component } from "react";
import {
  Container,
  Grid,
  Statistic,
  Divider,
  Dimmer,
  Loader,
} from "semantic-ui-react";

import Navbar from "./Navbar.js";
import Player from "./Player.js";

// const socket = new WebSocket(
//   "ws://157.90.1.251:25058/?%7B%22battleTag%22:%22WEAREFOALS%25231522%22,%22gateway%22:20,%22gatewayPing%22:218,%22toonName%22:%22WEAREFOALS%25231522%22,%22token%22:%22%22,%22country%22:%22GB%22,%22ipAddress%22:%2237.156.72.6%22%7D"
// );

const timeCuttoffForRecent = 20;
class Queue extends Component {
  state = {
    ONLINE_PLAYER_COUNT: [],
    QUEUED_PLAYER_COUNT: [],
    queue: [],
    matches: [],
    recentMatches: [],
    playerPoolRecent: [],
    playerPoolPlaying: [],
    playerPool: [],
    isLoaded: false,
  };

  componentDidMount() {
    this.loadData();
    let intervalId = setInterval(this.loadData, 30000);

    this.setState({ intervalId });
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }

  loadData = async () => {
    fetch(
      "https://website-backend.w3champions.com/api/matches?offset=0&gateway=20&pageSize=50&gameMode=4&map=Overall"
    )
      .then((response) => response.json())
      .then(
        (result) => {
          result.matches.forEach(
            (d) =>
              (d["timePassedSinceMatch"] =
                (Date.now() - new Date(d.endTime)) / (60 * 1000))
          );
          // console.log("MATCHES", result.matches);
          const recentMatches = result.matches.filter(
            (d) => d["timePassedSinceMatch"] <= timeCuttoffForRecent
          );

          console.log("recentMatches", recentMatches);

          let playerPoolRecent = [];
          recentMatches.forEach((d) =>
            d.teams.forEach((team) =>
              team.players.forEach((player) => {
                player["ingame"] = false;
                player["timePassedSinceMatch"] = d.timePassedSinceMatch;
                //   player["timePassedSinceMatch"] = ;
                playerPoolRecent.push(player);
              })
            )
          );

          // playerPoolRecent = [...this.state.playerPool, ...playerPoolRecent];
          playerPoolRecent = [
            ...new Map(
              playerPoolRecent.map((item) => [item["battleTag"], item])
            ).values(),
          ];
          let playersPlaying = this.state.playerPoolPlaying.map(
            (d) => d["battleTag"]
          );
          playerPoolRecent = playerPoolRecent.filter(
            (d) => !playersPlaying.includes(d["battleTag"])
          );
          // playerPoolRecent = playerPoolRecent.filter((x) => this.state.playerPoolPlaying.map((d) => d["battleTag"].includes(x.id)));
          playerPoolRecent.sort((a, b) => b.currentMmr - a.currentMmr);
          this.setState({
            recentMatches,
            playerPoolRecent: playerPoolRecent,
            isLoaded: true,
          });
        },
        (error) => {
          this.setState({
            isLoaded: true,
            error,
          });
        }
      );

    fetch("https://website-backend.w3champions.com/api/matches/ongoing")
      .then((response) => response.json())
      .then(
        (result) => {
          const relevantMatches = result.matches
            ? result.matches.filter((d) => d.gateWay === 20 && d.gameMode === 4)
            : [];
          let playerPoolPlaying = [];
          relevantMatches.forEach((d) =>
            d.teams.forEach((team) =>
              team.players.forEach((player) => {
                player["ingame"] = true;
                playerPoolPlaying.push(player);
              })
            )
          );
          playerPoolPlaying = [...this.state.playerPool, ...playerPoolPlaying];
          playerPoolPlaying = [
            ...new Map(
              playerPoolPlaying.map((item) => [item["battleTag"], item])
            ).values(),
          ];
          playerPoolPlaying.sort((a, b) => b.oldMmr - a.oldMmr);
          console.log("relevantMatches", relevantMatches);
          this.setState({
            matches: relevantMatches, // ? result.matches.filter((d) => d.gameMode === 2) : [],
            // [type]: data,
            playerPoolPlaying: playerPoolPlaying,
          });
        },
        (error) => {
          this.setState({
            isLoaded: true,
            error,
          });
        }
      );
  };

  //   componentWillMount() {

  //       //   this.setState({
  //       //     matches: relevantMatches, // ? result.matches.filter((d) => d.gameMode === 2) : [],
  //       //     [type]: data,
  //       //     playerPoolPlaying: playerPoolPlaying,
  //       //   });

  //   }

  render() {
    // socket.onmessage = (event) => {
    //   const msg = JSON.parse(event.data);
    //   const type = msg.type;
    //   const data = msg.data;
    //   console.log(msg, type, data);
    // };

    const queueDict = this.state.QUEUED_PLAYER_COUNT
      ? this.state.QUEUED_PLAYER_COUNT.filter(
          (d) => d.gateway === 20 && d.gameMode === 4
        )[0]
      : {};
    const numQueued = queueDict ? queueDict.count : 0;
    const playerPoolPlaying = this.state.playerPoolPlaying;
    const playerPoolRecent = this.state.playerPoolRecent;

    if (this.state.isLoaded === true) {
      return (
        <Container>
          <Navbar />

          <Grid columns={3}>
            <Grid.Row columns={3}>
              <Grid.Column width={6}>
                <Statistic inverted>
                  <Statistic.Value>
                    {this.state.playerPoolPlaying.length}
                  </Statistic.Value>
                  <Statistic.Label>Currently Playing</Statistic.Label>
                </Statistic>
                {Object.keys(playerPoolPlaying).map((key) => (
                  <Player
                    key={playerPoolPlaying[key].name}
                    data={playerPoolPlaying[key]}
                    noteApiAttempted={function () {
                      return;
                    }}
                  ></Player>
                ))}
              </Grid.Column>
              <Grid.Column width={2} />
              <Grid.Column width={6}>
                <Statistic inverted>
                  <Statistic.Value>
                    {this.state.playerPoolRecent.length}
                  </Statistic.Value>
                  <Statistic.Label>Recently Finished</Statistic.Label>
                </Statistic>
                {/* <TeamHeader teamNum={1000} teamMmr={2000} won={true}></TeamHeader> */}
                {Object.keys(playerPoolRecent).map((key) => (
                  <Player
                    key={playerPoolRecent[key].name}
                    data={playerPoolRecent[key]}
                  ></Player>
                ))}
              </Grid.Column>
            </Grid.Row>
          </Grid>
          <Divider />
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
            </Grid.Row>
          </Grid>
        </Container>
      );
    }
  }
}

export default Queue;
