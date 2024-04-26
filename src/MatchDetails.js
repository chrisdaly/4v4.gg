import React, { useState, useEffect } from "react";
import { Flag, Segment, Table } from "semantic-ui-react";
import * as d3 from "d3";
import { Sparklines, SparklinesLine, SparklinesSpots } from "react-sparklines";

import { MmrComparison } from "./MmrComparison.js";
import { MmrTrend } from "./MmrTrend.js";

import human from "./icons/human.png";
import orc from "./icons/orc.png";
import elf from "./icons/elf.png";
import undead from "./icons/undead.png";
import random from "./icons/random.png";

const MatchDetails = ({ playerData, metaData, profilePics, mmrTimeline, playerCountries }) => {
  console.log("MatchDetails", playerData, profilePics, mmrTimeline, playerCountries);
  const excludedKeys = ["mercsHired", "itemsObtained"];
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
    // Add more key-value pairs as needed
  };

  const getCellStyle = (teamIndex, diff, statName) => {
    if (teamIndex === 0) {
      if (statName === "goldUpkeepLost" && diff < 0) {
        return "green-text";
      }
      if (diff > 0) {
        return "green-text";
      }
      if (diff < 0) {
        return "red-text";
      }
      if (diff === 0) {
        return "white-text";
      }
    }
    if (teamIndex === 1) {
      if (statName === "goldUpkeepLost" && diff < 0) {
        return "red-text";
      }
      if (diff > 0) {
        return "red-text";
      }
      if (diff < 0) {
        return "green-text";
      }
      if (diff === 0) {
        return "white-text";
      }
    }
  };

  const renderTableCells = (scoreType, statName, teamIndex, team0Total, team1Total) => {
    // Determine which team's total to use
    const total = teamIndex === 0 ? team0Total : team1Total;

    // Calculate team total for the specified scoreType and statName
    const teamTotal0 = playerData.slice(0, 4).reduce((acc, playerScore) => acc + playerScore[scoreType][statName], 0);
    const teamTotal1 = playerData.slice(4).reduce((acc, playerScore) => acc + playerScore[scoreType][statName], 0);

    // Determine the cell's style based on the comparison with the opposing team
    const className = getCellStyle(teamIndex, teamTotal0 - teamTotal1, statName);

    // Render table cells for each player in the team
    return playerData.slice(teamIndex * 4, (teamIndex + 1) * 4).map((playerScore, index) => (
      <Table.Cell key={`team${teamIndex + 1}-${index}`} className={`${className} number team-${teamIndex}`}>
        {playerScore[scoreType][statName].toLocaleString("en-US")}
      </Table.Cell>
    ));
  };

  const renderTableRows = (scoreType) => {
    return Object.entries(playerData[0][scoreType])
      .filter(([statName]) => !excludedKeys.includes(statName)) // Exclude keys specified in excludedKeys
      .map(([statName, _]) => (
        <Table.Row key={statName}>
          {renderTableCells(scoreType, statName, 0)}
          <Table.Cell className="th-center key">{keyDisplayNameMapping[statName] || statName}</Table.Cell>

          {renderTableCells(scoreType, statName, 1)}
        </Table.Row>
      ));
  };

  const renderHero = (hero, teamIndex) => {
    return (
      <div style={{ float: `${teamIndex == 0 ? "right" : "left"}`, textAlign: "center" }}>
        <img src={`${process.env.PUBLIC_URL}/heroes/${hero.icon}.jpeg`} alt="Hero Icon" className="hero-pic" />
        <p className="number heroLevel">{hero.level}</p>
      </div>
    );
  };

  const renderHeroRows = () => {
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
        <div className={`${teamClassName} max-width-cell`} style={{ position: "relative" }}>
          <div style={{ position: "relative" }}>
            {profilePics[player.battleTag] ? <img src={profilePics[player.battleTag]} alt="Player Profile Pic" className="profile-pic " /> : null}
            {playerCountries[player.battleTag] ? <Flag name={playerCountries[player.battleTag].toLowerCase()} style={{ position: "absolute", ...flagPosition }} className={`${teamClassName} flag`}></Flag> : null}
          </div>
          <div>
            <h2>{player.name}</h2>
          </div>
          <div>
            <img src={raceMapping[player.race]} alt={player.race} className={"race"} />
          </div>
          <div>
            <p className="key">
              <span className="number value">{oldMmr}</span> <span className="key">MMR</span> (
              <span className={"number"} style={{ color: mmrChange > 0 ? "green" : "red" }}>
                {mmrChange}
              </span>
              )
            </p>
          </div>
          <div style={{ width: "200px", height: "20px", overflow: "hidden", display: "inline-block", marginTop: "10px" }}>
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
    <div className="matchDetails" style={{ width: "maxContent" }}>
      <Segment.Group>
        <Segment>
          <Table inverted size="large" basic>
            <Table.Header>
              <Table.Row>
                <th> </th>
                <th> </th>
                <th></th>
                <th className="team-0">
                  <div>
                    <h2>
                      <span>{playerData[0].won ? "👑 " : ""}</span>TEAM 1
                    </h2>
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
                      .map((race) => (
                        <img src={raceMapping[race]} alt={race} className={"race"} style={{ padding: "2px", width: "22px" }} />
                      ))}
                  </div>
                </th>
                <th className="th-center" style={{ position: "relative" }}>
                  <h2>VS</h2>
                </th>
                <th className="team-1">
                  <div>
                    <h2>
                      TEAM 2 <span>{playerData[4].won ? "👑 " : ""}</span>
                    </h2>
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
                      .map((race) => (
                        <img src={raceMapping[race]} alt={race} className={"race"} style={{ padding: "2px", width: "22px" }} />
                      ))}
                  </div>
                </th>
                <th> </th>
                <th> </th>
                <td> </td>
              </Table.Row>
            </Table.Header>
            <Table.Header>
              <Table.Row>
                {playerData.map((playerScore, index) => {
                  const teamIndex = index < 4 ? 0 : 1;
                  const teamClassName = `team-${teamIndex}`;
                  return (
                    <React.Fragment key={`player-${index}`}>
                      {renderPlayerCell(playerScore, teamClassName)}
                      {index === 3 && (
                        <th className="th-center" style={{ position: "relative" }}>
                          <div style={{ width: "100px", height: "130px", overflow: "hidden", display: "inline-block" }}>
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

              <Table.Row>
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
                  <div>
                    <img
                      src={`${process.env.PUBLIC_URL}/maps/Nightopia.png`}
                      alt={metaData.mapName}
                      style={{ width: "100px", height: "100px" }} // Adjust the size as needed
                    />
                    <div className="value">{metaData.mapName}</div>
                    <div className="key">MAP</div>
                  </div>
                </td>
                <td className="th-center">
                  <div>
                    <div className="value">{metaData.gameLength}</div>
                    <div className="key">GAME LENGTH</div>
                  </div>
                </td>
                <td className="th-center">
                  <div>
                    <div className="value">{metaData.startTime}</div>
                    <div className="key">DATETIME</div>
                  </div>
                </td>
                <td> </td>
                <td> </td>
              </Table.Row>
            </Table.Body>
          </Table>
        </Segment>
      </Segment.Group>
    </div>
  );
};

export default MatchDetails;
