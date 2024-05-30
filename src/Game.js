import React, { useState, useEffect } from "react";
import { Flag, Table } from "semantic-ui-react";
import * as d3 from "d3";
import { Sparklines, SparklinesLine, SparklinesSpots } from "react-sparklines";
import { Link } from "react-router-dom";

import { MmrComparison } from "./MmrComparison.js";
import { MmrTrend } from "./MmrTrend.js";
import { calculatePercentiles, calculateElapsedTime, convertToLocalTime } from "./utils.js";
import human from "./icons/human.svg";
import orc from "./icons/orc.svg";
import elf from "./icons/elf.svg";
import undead from "./icons/undead.svg";
import random from "./icons/random.svg";
import king from "./icons/king.svg";
import medal from "./icons/medal.svg";

const Game = ({ playerData, metaData, profilePics, mmrTimeline, playerCountries, compact }) => {
  console.log("Game", "compact", compact);
  const excludedKeys = ["mercsHired", "itemsObtained", "lumberCollected"];
  const raceMapping = { 8: undead, 0: random, 4: elf, 2: orc, 1: human };

  const keyDisplayNameMapping = {
    heroesKilled: "Heroes Killed",
    expGained: "Experience Gained",
    goldCollected: "Gold Mined",
    unitsProduced: "Units Produced",
    unitsKilled: "Units Killed",
    largestArmy: "Largest Army",
    lumberCollected: "Lumber Harvested",
    goldUpkeepLost: "Gold Lost to Upkeep",
  };

  const calculatePercentiles = (arr) => {
    // console.log(arr);
    // Sort the array in ascending order
    const sortedArr = arr.slice().sort((a, b) => a - b);
    const n = sortedArr.length;

    // Calculate percentile for each element
    const percentiles = arr.map((num) => {
      // Find the index of the number in the sorted array
      const index = sortedArr.indexOf(num);

      // Calculate percentile using index and array length
      const percentile = (index / (n - 1)) * 100;
      return percentile;
    });
    // console.log(percentiles);
    return percentiles;
  };

  const getCellStyle = (percentile) => {
    let className = "white-text"; // Default color

    if (percentile >= 90) {
      className = "green-text"; // Top 20%
    } else if (percentile >= 25) {
      className = "white-text"; // Middle 60%
    } else {
      className = "red-text"; // Bottom 20%
    }
    // console.log("percentile", percentile, className);

    return className;
  };

  const renderTableCells = (scoreType, statName, teamIndex, percentiles) => {
    // Determine which team's total to use
    // console.log("renderTableCells");
    // console.log(scoreType, statName, teamIndex, percentiles);

    // Render table cells for each player in the team
    return playerData.slice(teamIndex * 4, (teamIndex + 1) * 4).map((playerScore, index) => {
      // console.log("index", teamIndex * 4 + index);
      // Determine the cell's style based on the player's value
      const value = playerScore[scoreType][statName];
      // console.log("value", value);
      // console.log(percentiles[index]);
      const className = getCellStyle(percentiles[teamIndex * 4 + index]);
      return (
        <Table.Cell key={`team${teamIndex + 1}-${index}`} className={`${className} number team-${teamIndex}`}>
          {value.toLocaleString("en-US")}
        </Table.Cell>
      );
    });
  };

  const renderTableRows = (scoreType) => {
    if (!playerData[0].unitScore) {
      return <></>;
    }
    return Object.entries(playerData[0][scoreType])
      .filter(([statName]) => !excludedKeys.includes(statName)) // Exclude keys specified in excludedKeys
      .map(([statName, _]) => {
        // Extract the scores for the current statName from all players
        const scores = playerData.map((player) => player[scoreType][statName]);

        // Calculate percentiles for the scores
        let percentiles = calculatePercentiles(scores);

        // If the statName is "goldUpkeepLost", reverse the percentiles
        if (statName === "goldUpkeepLost") {
          percentiles = percentiles.map((d) => 100 - d);
        }

        // Render the table row
        return (
          <Table.Row key={statName}>
            {renderTableCells(scoreType, statName, 0, percentiles)}
            <Table.Cell className="th-center key">{keyDisplayNameMapping[statName] || statName}</Table.Cell>
            {renderTableCells(scoreType, statName, 1, percentiles)}
          </Table.Row>
        );
      });
  };

  const renderHero = (hero, teamIndex) => {
    if (!playerData[0].heroes) {
      return <></>;
    }
    return (
      <div style={{ float: `${teamIndex == 0 ? "right" : "left"}`, textAlign: "center" }}>
        <img src={`${process.env.PUBLIC_URL}/heroes/${hero.icon}.jpeg`} alt="Hero Icon" className="hero-pic" />
        <p className="number heroLevel">{hero.level}</p>
      </div>
    );
  };

  const renderHeroRows = () => {
    if (!playerData[0].heroScore) {
      return <></>;
    }
    return (
      <Table.Row>
        {playerData.slice(0, 4).map((playerScore, index) => (
          <Table.Cell key={`team1-hero-${index}`} style={{ display: "table-cell" }}>
            <div className="team-0">
              {playerScore.heroes.map((hero, heroIndex) => (
                <div key={`team0-hero-${index}-${heroIndex}`} className="">
                  {renderHero(hero, 0)}
                </div>
              ))}
            </div>
          </Table.Cell>
        ))}
        <Table.Cell className="th-center key">Heroes</Table.Cell>

        {playerData.slice(4).map((playerScore, index) => (
          <Table.Cell key={`team2-hero-${index}`} style={{ display: "table-cell" }}>
            {playerScore.heroes.map((hero, heroIndex) => (
              <div key={`team1-hero-${index}-${heroIndex}`} className="">
                {renderHero(hero, 1)}
              </div>
            ))}
          </Table.Cell>
        ))}
      </Table.Row>
    );
  };

  const renderPlayerCell = (player, teamClassName) => {
    const { oldMmr, mmrChange } = { ...player };

    // Determine flag positioning based on team alignment
    const flagPosition = teamClassName === "team-0" ? { top: 0, right: 0 } : { top: 0, left: 0 };

    return (
      <Table.HeaderCell key={player.battleTag}>
        <div className={`${teamClassName} playerDiv ${compact ? "compact" : ""}`} style={{ position: "relative", float: teamClassName === "team-0" ? "right" : "left" }}>
          <div style={{ position: "relative" }}>
            {player.isMvp && teamClassName === "team-0" ? <img src={medal} alt={"won"} className={""} style={{ height: "50px" }} /> : ""}
            {profilePics[player.battleTag] ? <img src={profilePics[player.battleTag]} alt="Player Profile Pic" className="profile-pic " /> : null}
            {playerCountries[player.battleTag] ? <Flag name={playerCountries[player.battleTag].toLowerCase()} style={{ position: "absolute", ...flagPosition }} className={`${teamClassName} flag`}></Flag> : null}
            {player.isMvp && teamClassName === "team-1" ? <img src={medal} alt={"won"} className={""} style={{ height: "50px" }} /> : ""}
          </div>
          <div>
            <Link to={`/player/${player.battleTag.replace("#", "%23")}`}>
              <h2>{player.name}</h2>
            </Link>
          </div>
          <div style={{ alignItems: "center", height: "100%", paddingTop: "5px", paddingBottom: "5px" }}>
            <img src={raceMapping[player.race]} alt={player.race} className={"race"} style={{ height: "30px" }} />
          </div>
          <div>
            <p className="key">
              <span className="number value">{oldMmr}</span> <span className="key">MMR</span>
              {mmrChange ? (
                <span className={"number"} style={{ color: mmrChange > 0 ? "green" : "red" }}>
                  {mmrChange}
                </span>
              ) : (
                <></>
              )}
            </p>
          </div>
          <div
            style={{
              width: "75px",
              height: "15px",
              overflow: "hidden",
              display: "inline-block",
              marginTop: "10px",
              float: teamClassName === "team-0" ? "right" : "left",
            }}
          >
            {" "}
            {/* <div> */}
            <Sparklines data={mmrTimeline[player.battleTag]} style={{ width: "130px", height: "14px" }}>
              <SparklinesLine style={{ strokeWidth: 4, stroke: "white", fill: "none" }} />
            </Sparklines>
            {/* <MmrTrend data={{ mmrTimeline: mmrTimeline[playerScore.battleTag] }} id={"123"} /> */}
          </div>
        </div>
      </Table.HeaderCell>
    );
  };

  return (
    <div className="Game">
      <Table inverted compact size="small" basic>
        <Table.Header>
          <Table.Row>
            <th> </th>
            <th> </th>
            <th className="team-0">{playerData[0].won ? <img src={king} alt={"won"} className={"race"} style={{ height: "50px" }} /> : ""}</th>
            <th className="team-0">
              <div>
                <h2>TEAM 1</h2>
                <p className="key" style={{ marginBottom: "0px", marginTop: "-10px" }}>
                  <span className="number value">
                    {Math.round(
                      playerData
                        .slice(0, 4)
                        .map((d) => d.oldMmr)
                        .reduce((acc, curr) => acc + curr, 0) / 4
                    )}
                  </span>{" "}
                  <span className="key">MMR</span>
                </p>
                {playerData
                  .slice(0, 4)
                  .map((d) => d.race)
                  .sort((a, b) => b - a)
                  .map((race, i) => (
                    <img key={i} src={raceMapping[race]} alt={race} className={"race"} style={{ paddingLeft: "5px", width: "30px" }} />
                  ))}
              </div>
            </th>
            <th className="th-center" style={{ position: "relative" }}>
              <h2>VS</h2>
            </th>
            <th className="team-1">
              <div>
                <h2>TEAM 2</h2>
                <p className="key" style={{ marginBottom: "0px", marginTop: "-10px" }}>
                  <span className="number value">
                    {Math.round(
                      playerData
                        .slice(4)
                        .map((d) => d.oldMmr)
                        .reduce((acc, curr) => acc + curr, 0) / 4
                    )}
                  </span>{" "}
                  <span className="key">MMR</span>
                </p>
                {playerData
                  .slice(4)
                  .map((d) => d.race)
                  .sort((a, b) => b - a)
                  .map((race, i) => (
                    <img key={i} src={raceMapping[race]} alt={race} className={"race"} style={{ paddingLeft: "0px", paddingRight: "5px", width: "35px" }} />
                  ))}
              </div>
            </th>
            <th className="team-01">{playerData[4].won ? <img src={king} alt={"won"} className={"race"} style={{ height: "50px" }} /> : ""}</th>
            <th> </th>
            <td> </td>
          </Table.Row>
        </Table.Header>
        <Table.Header>
          <Table.Row>
            {[...playerData.slice(0, 4).reverse(), ...playerData.slice(4)].map((playerScore, index) => {
              const teamIndex = index < 4 ? 0 : 1;
              const teamClassName = `team-${teamIndex}`;
              return (
                <React.Fragment key={`player-${index}`}>
                  {renderPlayerCell(playerScore, teamClassName)}
                  {index === 3 && (
                    <th className={`th-center ${compact}`} style={{ position: "relative" }}>
                      <div style={{ height: "170px", overflow: "hidden", display: "inline-block" }}>
                        <MmrComparison data={{ teamOneMmrs: playerData.slice(0, 4).map((d) => d.oldMmr), teamTwoMmrs: playerData.slice(4).map((d) => d.oldMmr) }} id={"123"} />
                      </div>
                    </th>
                  )}
                </React.Fragment>
              );
            })}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {!playerData[0].unitScore ? (
            <></>
          ) : (
            <>
              {renderHeroRows()}

              {renderTableRows("heroScore")}
              <Table.Row>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
              </Table.Row>
              {renderTableRows("unitScore")}
              <Table.Row>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
              </Table.Row>
              {renderTableRows("resourceScore")}
              <Table.Row>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
              </Table.Row>
            </>
          )}
          <Table.Row className="meta">
            <td></td>
            <td> </td>
            <td className="th-center">
              <div>
                <div className="value">{metaData.location}</div>
                <div className="key">REGION</div>
              </div>
            </td>
            <td className="th-center">
              <div>
                <div className="value">{metaData.server}</div>
                <div className="key">SERVER</div>
              </div>
            </td>
            <td className="th-center">
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={`${process.env.PUBLIC_URL}/maps/${metaData.mapName}.png`}
                  alt="map"
                  style={{ width: "100px", height: "100px", display: "block" }} // Adjust the size as needed
                />
                <img
                  src={`${process.env.PUBLIC_URL}/icons/Classic_Frame.png`}
                  alt="Frame"
                  style={{ position: "absolute", top: 0, left: 0, width: "100px", height: "100px" }} // Adjust size and position as needed
                />
              </div>
              <div className="value">{metaData.mapName}</div>
              <div className="key">MAP</div>
            </td>
            <td className="th-center">
              <div>
                <div className="value">
                  {metaData.gameLength === "0:00" ? calculateElapsedTime(metaData.startTime) + " MINS" : metaData.gameLength + " MINS"}
                  {metaData.gameLength === "0:00" && <div className="live-indicator"></div>}
                </div>
                <div className="key">GAME LENGTH</div>
              </div>
            </td>
            <td className="th-center">
              <div>
                <div className="value">{convertToLocalTime(metaData.startTime)}</div>
                <div className="key">DATETIME</div>
              </div>
            </td>
            <td> </td>
            <td> </td>
          </Table.Row>
        </Table.Body>
      </Table>
    </div>
  );
};

export default Game;
