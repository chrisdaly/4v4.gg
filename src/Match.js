import React, { Component } from "react";
import Team from "./Team.js";
import Timer from "./Time.js";
import MatchHeader from "./MatchHeader.js";

import toast, { Toaster } from "react-hot-toast";

import RangePlotSection from "./RangePlotSection.js";

import * as d3 from "d3";

import { Grid, Checkbox, Segment, Divider } from "semantic-ui-react";
import { gameMode, gateway } from "./params";

class Match extends Component {
  state = {
    isChecked: false,
    intervalId: null,
    ongoing: true,
    mmrsGathered: [],
    allMmrsgathered: false,
    transitionId: null,
    transition: false,
  };

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
    clearInterval(this.state.transitionId);
  }

  toggleChange = () => {
    this.setState({
      isChecked: !this.state.isChecked,
    });
    if (this.state.intervalId === null) {
      let intervalId = setInterval(this.getGameData, 1000);
      this.setState({ intervalId });
    } else {
      clearInterval(this.state.intervalId);
    }
  };

  noteApiAttempted = (id) => {
    let mmrsGathered = [...this.state.mmrsGathered, id];
    let allMmrsgathered = this.state.allMmrsgathered;
    let transitionId = this.state.transitionId;
    if (mmrsGathered.length === 8) {
      // console.log("ALL MMRS GATHERED, STARTING TRANSITION COUNTERS");
      allMmrsgathered = true;
      transitionId = setInterval(
        () => this.setState({ transition: !this.state.transition }),
        10000
      );
    }
    this.setState({ mmrsGathered, allMmrsgathered, transitionId });
  };

  getGameData = async () => {
    if (!this.state.ongoing) {
      return;
    }
    let matchId = this.props.match.id;
    var urlLive = new URL(
      "https://website-backend.w3champions.com/api/matches/ongoing"
    );
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
    // console.log("match", match);
    if (match.length === 0) {
      toast("Game finished!", { icon: "🏁" });
      this.setState({ ongoing: false });
      var audio = new Audio(
        "https://notificationsounds.com/storage/sounds/file-sounds-1348-ill-make-it-possible.mp3"
      );
      audio.play();
    } else {
    }

    try {
    } catch (e) {
      console.log(e);
    }
  };

  render() {
    const { match, battleTag } = this.props;
    const teams = match.teams;
    let teamOneMmrs, teamTwoMmrs, teamOne, teamTwo;

    let teamOnePlayers = match.teams[0].players.map((d) => d.battleTag);
    if (teamOnePlayers.includes(battleTag)) {
      teamOne = teams[0];
      teamTwo = teams[1];
      teamOneMmrs = teams[0].players.map((d) => d.oldMmr);
      teamTwoMmrs = teams[1].players.map((d) => d.oldMmr);
    } else {
      teamOne = teams[1];
      teamTwo = teams[0];
      teamOneMmrs = teams[1].players.map((d) => d.oldMmr);
      teamTwoMmrs = teams[0].players.map((d) => d.oldMmr);
    }

    const teamOneAverageMmr = teams[0].teamAverage;
    const teamTwoAverageMmr = teams[1].teamAverage;

    const gameMmr = Math.round((teamOneAverageMmr + teamTwoAverageMmr) / 2);
    const threshold = d3
      .scaleThreshold()
      .domain([1000, 1200, 1300, 1400, 1500, 1600, 1700])
      .range([
        "grass",
        "bronze",
        "silver",
        "gold",
        "platinum",
        "diamond",
        "adept",
        "master",
        "grandmaster",
      ]);

    const league = threshold(gameMmr);
    const data = {
      teamOneMmrs,
      teamOneAverageMmr,
      teamTwoMmrs,
      teamTwoAverageMmr,
      league,
    };
    const startDate = new Date(this.props.match.startTime);
    const map = this.props.match.map;
    const ongoing = this.props.match.durationInSeconds === 0;

    return (
      <div className="match">
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
            duration: 5000,
            style: {
              background: "white",
              color: "black",
            },
          }}
        /> */}

        <Grid columns={3}>
          <Grid.Column />
          <Grid.Column>
            {this.props.render === false ? (
              <div />
            ) : (
              <MatchHeader
                id={this.props.match.id}
                league={league}
                startDate={startDate}
                map={map}
                ongoing={ongoing}
                durationInSeconds={this.props.match.durationInSeconds}
              ></MatchHeader>
            )}
          </Grid.Column>
          <Grid.Column />

          <Grid.Row columns={3}>
            <Grid.Column width={6}>
              <Team
                team={teamOne}
                teamNum={1}
                teamAverage={teamOne.teamAverage}
                teamDeviation={teamOne.teamDeviation}
                side="left"
                transition={this.state.transition}
                sparklinePlayersData={this.props.sparklinePlayersData}
                ladderRanks={this.props.ladderRanks}
                noteApiAttempted={this.noteApiAttempted}
                transitionId={this.state.transitionId}
                allMmrsgathered={this.state.allMmrsgathered}
              ></Team>
            </Grid.Column>
            <Grid.Column width={4}>
              <RangePlotSection data={data} id={match.id} />
            </Grid.Column>
            <Grid.Column width={6}>
              <Team
                team={teamTwo}
                teamNum={2}
                teamAverage={teamTwo.teamAverage}
                teamDeviation={teamTwo.teamDeviation}
                side="right"
                transition={this.state.transition}
                sparklinePlayersData={this.props.sparklinePlayersData}
                ladderRanks={this.props.ladderRanks}
                noteApiAttempted={this.noteApiAttempted}
                transitionId={this.state.transitionId}
                allMmrsgathered={this.state.allMmrsgathered}
              ></Team>
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
  }
}

export default Match;
