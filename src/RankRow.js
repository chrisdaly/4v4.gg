import React, { Component } from "react";

import { Container, Flag, Header, Table, Rating } from "semantic-ui-react";
import { Sparklines, SparklinesLine, SparklinesSpots } from "react-sparklines";

import { gameMode, gateway, season } from "./params";

import human from "./icons/human.png";
import orc from "./icons/orc.png";
import elf from "./icons/elf.png";
import undead from "./icons/undead.png";
import random from "./icons/random.png";

class RankRow extends Component {
  state = {
    race: 0,
    sparklinePlayersData: [],
  };

  componentDidMount() {
    this.loadData();
    console.log(this.props);
  }

  loadData = async () => {
    const player = this.props.rank.playersInfo[0].battleTag.replace("#", "%23");
    const race = this.props.rank.playersInfo[0].calculatedRace;
    this.setState({ race });

    try {
      let sparklinePlayersData = [];
      var url = new URL(
        `https://website-backend.w3champions.com/api/players/${player}/mmr-rp-timeline`
      );
      var params = {
        gateway,
        season: season - 1,
        race,
        gameMode: 4,
      };
      url.search = new URLSearchParams(params).toString();
      var response = await fetch(url);
      var result = await response.json();
      if ("mmrRpAtDates" in result) {
        const prevSeasonMMrs = result.mmrRpAtDates
          .map((d) => d.mmr)
          .slice(1)
          .slice(-20);
        sparklinePlayersData = [...sparklinePlayersData, ...prevSeasonMMrs];
      }

      var url = new URL(
        `https://website-backend.w3champions.com/api/players/${player}/mmr-rp-timeline`
      );
      var params = { gateway, season, race, gameMode: 4 }; //hardcodig race at the moment
      url.search = new URLSearchParams(params).toString();
      var response = await fetch(url);
      var result = await response.json();
      if ("mmrRpAtDates" in result) {
        const thisSeasonMMrs = result.mmrRpAtDates.map((d) => d.mmr);
        sparklinePlayersData = [...sparklinePlayersData, ...thisSeasonMMrs];
        this.setState({ sparklinePlayersData, attemptedAPI: true });
      }
    } catch (e) {
      console.log("cannot fetch data for a player", player, e);
      this.setState({ attemptedAPI: true });
    }
  };

  render() {
    const { name, mmr, wins, losses, winrate } = { ...this.props.rank.player };
    const battleTag = this.props.rank.playersInfo[0].battleTag;
    const raceMapping = {
      8: undead,
      0: random,
      4: elf,
      2: orc,
      1: human,
    };
    const raceIcon = raceMapping[this.state.race];

    return (
      <Table.Row>
        <Table.Cell>
          <Header textAlign="center" inverted>
            {this.props.rank.rankNumber}
          </Header>
        </Table.Cell>
        <Table.Cell>{this.props.rank.rankingPoints.toFixed(2)}</Table.Cell>
        <Table.Cell textAlign="center">
          <img
            src={raceIcon}
            alt={this.state.race}
            className={"race"}
            textAlign="center"
          />
        </Table.Cell>
        <Table.Cell singleLine>
          <a
            target="_blank"
            href={`/player/${battleTag.replace("#", "%23")}`}
            rel="noreferrer"
          >
            {name}
          </a>
        </Table.Cell>

        <Table.Cell textAlign="right">{mmr}</Table.Cell>
        <Table.Cell>{wins}</Table.Cell>
        <Table.Cell>{losses}</Table.Cell>
        <Table.Cell>{Math.round(winrate * 10000) / 100}%</Table.Cell>

        <Table.Cell>
          <Sparklines
            data={this.state.sparklinePlayersData}
            style={{ width: "70px", height: "12px" }}
          >
            <SparklinesLine
              style={{ strokeWidth: 4, stroke: "white", fill: "none" }}
            />
          </Sparklines>
        </Table.Cell>
      </Table.Row>
    );
  }
}

export default RankRow;
