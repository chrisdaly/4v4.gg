import React, { useState, useEffect } from "react";
import { Grid, Flag } from "semantic-ui-react";
import Mmr from "./Mmr.js";
import { Sparklines, SparklinesLine } from "react-sparklines";
import { akaLookup, raceLookup } from "./utils.js";
import human from "./icons/human.png";
import orc from "./icons/orc.png";
import elf from "./icons/elf.png";
import undead from "./icons/undead.png";
import random from "./icons/random.png";

import { gameMode, gateway, season } from "./params";

const Player = ({ data, side, transition, allMmrsgathered }) => {
  const [sparklinePlayersData, setSparklinePlayersData] = useState([]);
  const { race, oldMmr, name, location, battleTag, rank } = data;
  const aka = akaLookup(name);
  const raceMapping = { 8: undead, 0: random, 4: elf, 2: orc, 1: human };
  const raceIcon = raceMapping[race];

  useEffect(() => {
    const fetchData = async () => {
      const player = data.battleTag.replace("#", "%23");
      const fetchURL = (url) => {
        return fetch(url).then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        });
      };

      try {
        const url1 = new URL(`https://website-backend.w3champions.com/api/players/${player}/mmr-rp-timeline`);
        const params1 = { gateway, season, race, gameMode: 4 };
        url1.search = new URLSearchParams(params1).toString();
        const result1 = await fetchURL(url1);
        const prevSeasonMMrs = result1.mmrRpAtDates
          .slice(1)
          .slice(-20)
          .map((d) => d.mmr);
        const url2 = new URL(`https://website-backend.w3champions.com/api/players/${player}/mmr-rp-timeline`);
        const params2 = { gateway, season, race, gameMode: 4 };
        url2.search = new URLSearchParams(params2).toString();
        const result2 = await fetchURL(url2);
        const thisSeasonMMrs = result2.mmrRpAtDates.map((d) => d.mmr);
        setSparklinePlayersData([...prevSeasonMMrs, ...thisSeasonMMrs]);
      } catch (error) {
        console.error("Error fetching player data:", error);
      }
    };

    fetchData();
  }, [data, race]);

  const PlayerMmrStatistic = () => {
    if (transition && sparklinePlayersData && sparklinePlayersData.length > 0) {
      return (
        <Sparklines data={sparklinePlayersData} style={{ width: "70px", height: "12px" }}>
          <SparklinesLine style={{ strokeWidth: 4, stroke: "white", fill: "none" }} />
        </Sparklines>
      );
    } else {
      return <Mmr data={oldMmr}></Mmr>;
    }
  };

  const LeftSlot = () => {
    if (side === "left") {
      return transition ? <p className="number">{rank ? `#${rank}` : ""}</p> : <Flag name={location?.toLowerCase()}></Flag>;
    } else {
      return <img src={raceIcon} alt={race} className={"race"} />;
    }
  };

  const RightSlot = () => {
    if (side === "right") {
      return transition ? <p className="number">{rank ? `#${rank}` : ""}</p> : <Flag name={location?.toLowerCase()}></Flag>;
    } else {
      return <img src={raceIcon} alt={race} className={"race"} />;
    }
  };

  const Name = () => {
    return aka !== null && transition ? aka : name;
  };

  return (
    <Grid divided="vertically" className={"playerCard"}>
      <Grid.Row columns={1} className={"playerTop"}>
        <Grid.Column width={16} className="playerName">
          <h2>
            <Name />
            {/* <a target="_blank" href={`/player/${battleTag.replace("#", "%23")}`} rel="noreferrer" className={aka && transition ? "playerMMrstat" : ""}>
              <Name></Name>
            </a> */}
          </h2>
        </Grid.Column>
      </Grid.Row>

      <Grid.Row columns={3} className={"playerBottom"}>
        <Grid.Column width={4} className={(side === "left") & allMmrsgathered ? "playerMMrstat number" : "number"}>
          <LeftSlot />
        </Grid.Column>
        <Grid.Column width={8} className={allMmrsgathered ? "playerMMrstat" : ""}>
          <PlayerMmrStatistic />
        </Grid.Column>
        <Grid.Column width={4} className={(side === "right") & allMmrsgathered ? "playerMMrstat number" : "number"}>
          <RightSlot />
        </Grid.Column>
      </Grid.Row>
    </Grid>
  );
};

export default Player;
