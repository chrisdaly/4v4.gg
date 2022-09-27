import React, { Component } from "react";
import { Grid, Flag } from "semantic-ui-react";

import Mmr from "./Mmr.js";

import {Sparklines, SparklinesLine, SparklinesSpots} from "react-sparklines";

import {akaLookup} from "./utils.js"


import human from "./icons/human.png";
import orc from "./icons/orc.png";
import elf from "./icons/elf.png";
import undead from "./icons/undead.png";
import random from "./icons/random.png";

class Player extends Component {
  state = {
    race: 0,
    sparklinePlayersData: []
  }

  componentDidMount() {
    this.loadData();
  }

  loadData = async () => {
    const pageUrl = new URL(window.location.href);
    const player = this.props.data.battleTag.replace("#", "%23");
    console.log(`LOADING PLAYER DATA FOR ${player}`)
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
      var params = { gateway, season };
      url.search = new URLSearchParams(params).toString();
      var response = await fetch(url);
      var result = await response.json();
      var gameModeStats = result.filter((d) => d.gameMode === 4)[0];
      this.setState({ gameModeStats });

      // MMR TIMELINE
      // const putPlayerMmrInState = (player) =>{
        
      // }
      var url = new URL(`https://website-backend.w3champions.com/api/players/${player}/mmr-rp-timeline`);
      var params = { gateway, season, race: this.state.race, gameMode: 4 }; //hardcodig race at the moment
      url.search = new URLSearchParams(params).toString();
      var response = await fetch(url);
      var result = await response.json();
      if ("mmrRpAtDates" in result) {
        const newsparklinePlayersData =  result.mmrRpAtDates.map(d => d.mmr)
        this.setState({ sparklinePlayersData: newsparklinePlayersData});
      }

    } catch (e) {
      console.log(e);
    }
  }

  
  render() {
    let { race, oldMmr, name, location, battleTag } = this.props.data;
    let aka = akaLookup(name)
    let sparklinePlayersData = this.state.sparklinePlayersData
    sparklinePlayersData = sparklinePlayersData || {};
    let rank = this.props.rank || [];
    if (rank.length > 0){
      rank = rank[0].rankNumber
    } else {
      rank = null;
    }
    // console.log(rank)

    if (this.props.data.battleTag !== undefined) {
      // console.log(this.state)
    
      // console.log({sparklinePlayersData})
      battleTag = battleTag === undefined ? "" : battleTag;
      let countryCode = (location === undefined) | (location === null) ? "" : location.toLowerCase();
  
      const raceMapping = {
        8: undead,
        0: random,
        4: elf,
        2: orc,
        1: human,
      };
      const raceIcon = raceMapping[race];
      // const iconStyle = { width: "5px", height: "5px" };
  
      const PlayerMmrStatistic = () => {
        if (this.props.transition & sparklinePlayersData !== undefined & sparklinePlayersData.length > 0){
          // console.log({sparklinePlayersData})
          return (
          <Sparklines data={sparklinePlayersData} style={{width: "70px", height: "12px"}}>
            <SparklinesLine style={{ strokeWidth: 5, stroke: "white", fill: "none" }} />
            {/* <SparklinesSpots size={10}/> */}
            </Sparklines>)
        } else {
          return <Mmr data={oldMmr}></Mmr>
        }
      }

      const LeftSlot = () => {
        if (this.props.side === "left"){
          if (this.props.transition){
            return (<p>{rank  ? `#${rank}`: ""}</p>)
          } else {
            return (<Flag name={countryCode}></Flag>)
          }
        } else {
            return (<img src={raceIcon} alt={race} className={"race"} />)
          }
      }

      const RightSlot = () => {
        if (this.props.side === "right"){
          if (this.props.transition){
            return (<p className="number">{rank  ? `#${rank}`: ""}</p>)
          } else {
            return (<Flag name={countryCode}></Flag>)
          }
        } else {
            return (<img src={raceIcon} alt={race} className={"race"} />)
          }
      }

      const Name = () => {
        if (aka !== null){
          if (this.props.transition){
            return (name)
          } else {
            return (aka)
          }
        } else {
            return (name)
          }
      }
  
      return (
        <Grid divided="vertically" className={"playerCard"}>
          <Grid.Row columns={1} className={"playerTop"}>
            <Grid.Column width={16} className="playerName">
              <a target="_blank" href={`/player/${battleTag.replace("#", "%23")}`} rel="noreferrer" className={(aka? "playerMMrstat":"")}>
                <Name></Name>
              </a>
            </Grid.Column>
          </Grid.Row>
  
          <Grid.Row columns={3} className={"playerBottom"}>
            <Grid.Column width={4} className={(this.props.side === "left" ? "playerMMrstat": "")}>
              <LeftSlot/>
            </Grid.Column>
            <Grid.Column width={8} className="playerMMrstat">
              <PlayerMmrStatistic/>
            </Grid.Column>
            <Grid.Column width={4} className={(this.props.side === "right" ? "playerMMrstat": "")}>
              <RightSlot/>

              {/* {this.props.side === "left" ? <img src={raceIcon} alt={race} className={"race"} /> : <Flag name={countryCode}></Flag>} */}
              {/* <img src={raceIcon} alt={race} className={"race"} /> */}
            </Grid.Column>
          </Grid.Row>
        </Grid>
      );
    } else {
      return (
        <Grid divided="vertically" className={"playerCard"}>
          <Grid.Row columns={1} className={"playerTop"}>
            <Grid.Column width={16} className="playerName">
              <a target="_blank" href={`/player/${battleTag.replace("#", "%23")}`} rel="noreferrer">
                {name}
              </a>
            </Grid.Column>
          </Grid.Row>
  
          <Grid.Row columns={3} className={"playerBottom"}>
            <Grid.Column width={4}>
              {this.props.side === "left" ? <Flag name={"ie"} style={{"opacity": 0}}></Flag> : <img src={"random"} alt={race} className={"race"} style={{"opacity": 0}}/>}
            </Grid.Column>
            <Grid.Column width={8} className={"playerMMrstat"}>
            <Sparklines data={[0, 0, 0]} style={{width: "70px", height: "12px"}} >
              <SparklinesLine style={{ strokeWidth: 1, stroke: "white", fill: "none" }} />
            </Sparklines>
            </Grid.Column>
            <Grid.Column width={4}>
              {/* {this.props.side === "left" ? <img src={raceIcon} alt={race} className={"race"} /> : <Flag name={countryCode}></Flag>} */}
              {/* <img src={raceIcon} alt={race} className={"race"} /> */}
            </Grid.Column>
          </Grid.Row>
        </Grid>
      )
    }
    
    
  }
}

export default Player;
