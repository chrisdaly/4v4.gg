import React, { Component } from "react";
import { Container, Grid, Header, Divider } from "semantic-ui-react";

import Navbar from "./Navbar.js";
import Player from "./Player.js";

const socket = new WebSocket(
  "ws://157.90.1.251:25058/?%7B%22battleTag%22:%22WEAREFOALS%25231522%22,%22gateway%22:20,%22gatewayPing%22:218,%22toonName%22:%22WEAREFOALS%25231522%22,%22token%22:%22%22,%22country%22:%22GB%22,%22ipAddress%22:%2237.156.72.6%22%7D"
);

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
  };

  componentWillMount() {
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const type = msg.type;
      const data = msg.data;

      //   this.setState({
      //     matches: relevantMatches, // ? result.matches.filter((d) => d.gameMode === 2) : [],
      //     [type]: data,
      //     playerPoolPlaying: playerPoolPlaying,
      //   });

      fetch("https://website-backend.w3champions.com/api/matches?offset=0&gateway=20&pageSize=50&gameMode=4&map=Overall")
        .then((response) => response.json())
        .then(
          (result) => {
            result.matches.forEach((d) => (d["timePassedSinceMatch"] = (Date.now() - new Date(d.endTime)) / (60 * 1000)));
            console.log("MATCHES", result.matches);
            const recentMatches = result.matches.filter((d) => d["timePassedSinceMatch"] <= timeCuttoffForRecent);
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
            playerPoolRecent = [...new Map(playerPoolRecent.map((item) => [item["battleTag"], item])).values()];
            playerPoolRecent.sort((a, b) => b.currentMmr - a.currentMmr);
            this.setState({ recentMatches, playerPoolRecent: playerPoolRecent });
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
            const relevantMatches = result.matches ? result.matches.filter((d) => d.gateWay === 20 && d.gameMode === 4) : [];
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
            playerPoolPlaying = [...new Map(playerPoolPlaying.map((item) => [item["battleTag"], item])).values()];
            playerPoolPlaying.sort((a, b) => b.oldMmr - a.oldMmr);
            // console.log("relevantMatches", relevantMatches);
            this.setState({
              matches: relevantMatches, // ? result.matches.filter((d) => d.gameMode === 2) : [],
              [type]: data,
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
  }

  render() {
    const queueDict = this.state.QUEUED_PLAYER_COUNT ? this.state.QUEUED_PLAYER_COUNT.filter((d) => d.gateway === 20 && d.gameMode === 4)[0] : {};
    const numQueued = queueDict ? queueDict.count : 0;
    const playerPoolPlaying = this.state.playerPoolPlaying;
    const playerPoolRecent = this.state.playerPoolRecent;

    return (
      <Container>
        <Navbar />

        <p>Total players online: {this.state.ONLINE_PLAYER_COUNT[0]}</p>
        <p>Players queuing: {numQueued}</p>

        <div className={"teamDiv"}></div>
        {/* <p>Recent games: {this.state.recentMatches.length}</p> */}

        {/* <div className="matches">
          {Object.keys(matches).map((key) => (
            <Match match={matches[key]} key={matches[key].id}></Match>
          ))}
        </div> */}

        <Grid columns={3}>
          <Grid.Row columns={3}>
            <Grid.Column width={6}>
              <Grid.Column className="playerName">
                <div className={"gameStatus"}>
                  <span>IN GAME</span>
                  <br />
                  <span>n = {this.state.playerPoolPlaying.length}</span>
                </div>
              </Grid.Column>
              {Object.keys(playerPoolPlaying).map((key) => (
                <Player key={playerPoolPlaying[key].name} data={playerPoolPlaying[key]}></Player>
              ))}
            </Grid.Column>
            <Grid.Column width={2} />
            <Grid.Column width={6}>
              <Grid.Column className="playerName">
                <div className={"gameStatus"}>
                  <span>RECENTLY FINISHED</span>
                  <br />
                  <span>n = {this.state.playerPoolRecent.length}</span>
                </div>
              </Grid.Column>

              {/* <TeamHeader teamNum={1000} teamMmr={2000} won={true}></TeamHeader> */}
              {Object.keys(playerPoolRecent).map((key) => (
                <Player key={playerPoolRecent[key].name} data={playerPoolRecent[key]}></Player>
              ))}
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <Divider />
      </Container>
    );
  }
}

export default Queue;
