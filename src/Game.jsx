import React from "react";
import { Flag, Table } from "semantic-ui-react";
import { Link } from "react-router-dom";

import { MmrComparison } from "./MmrComparison.jsx";
import { calculateElapsedTime, convertToLocalTime, calculatePercentiles } from "./utils.jsx";
import human from "./icons/human.svg";
import orc from "./icons/orc.svg";
import elf from "./icons/elf.svg";
import undead from "./icons/undead.svg";
import random from "./icons/random.svg";

// Map images stored locally in /public/maps/
const getMapImageUrl = (mapId) => {
  if (!mapId) return null;
  // Strip parentheses prefix like "(4)", spaces, and apostrophes
  const cleanName = mapId.replace(/^\(\d\)/, "").replace(/ /g, "").replace(/'/g, "");
  return `/maps/${cleanName}.png`;
};

const Game = ({ playerData: rawPlayerData, metaData, profilePics, playerCountries, sessionData, compact }) => {
  const excludedKeys = ["mercsHired", "itemsObtained", "lumberCollected"];
  const raceMapping = { 8: undead, 0: random, 4: elf, 2: orc, 1: human };
  // Reorder team 1 players (reverse) for display, don't mutate props
  const playerData = [...rawPlayerData.slice(0, 4).reverse(), ...rawPlayerData.slice(4)];

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
          <Table.Row key={statName} className="stat-row">
            {renderTableCells(scoreType, statName, 0, percentiles)}
            <Table.Cell className="th-center stat-label">{keyDisplayNameMapping[statName] || statName}</Table.Cell>
            {renderTableCells(scoreType, statName, 1, percentiles)}
          </Table.Row>
        );
      });
  };

  const renderHero = (hero) => {
    return (
      <div className="hero-container">
        <img src={`/heroes/${hero.icon}.jpeg`} alt="Hero Icon" className="hero-pic" />
        <span className="hero-level">{hero.level}</span>
      </div>
    );
  };

  const renderHeroRows = () => {
    if (!playerData[0].heroScore) {
      return <></>;
    }
    return (
      <Table.Row className="heroes-row">
        {playerData.slice(0, 4).map((playerScore, index) => (
          <Table.Cell key={`team1-hero-${index}`} className="hero-cell">
            <div className="heroes-wrapper">
              {playerScore.heroes.map((hero, heroIndex) => (
                <React.Fragment key={`team0-hero-${index}-${heroIndex}`}>
                  {renderHero(hero)}
                </React.Fragment>
              ))}
            </div>
          </Table.Cell>
        ))}
        <Table.Cell className="th-center stat-label">Heroes</Table.Cell>

        {playerData.slice(4).map((playerScore, index) => (
          <Table.Cell key={`team2-hero-${index}`} className="hero-cell">
            <div className="heroes-wrapper">
              {playerScore.heroes.map((hero, heroIndex) => (
                <React.Fragment key={`team1-hero-${index}-${heroIndex}`}>
                  {renderHero(hero)}
                </React.Fragment>
              ))}
            </div>
          </Table.Cell>
        ))}
      </Table.Row>
    );
  };

  const renderPlayerCell = (player, teamClassName) => {
    const { oldMmr } = player;
    const flagPosition = teamClassName === "team-0" ? { top: 0, right: 0 } : { top: 0, left: 0 };
    const playerSession = sessionData?.[player.battleTag];
    const sessionDelta = playerSession?.mmrChange || 0;

    return (
      <Table.HeaderCell key={player.battleTag}>
        <div
          className={`playerDiv ${compact ? "compact" : ""}`}
          style={{ position: "relative" }}
        >
          {/* Profile pic with flag and MVP badge */}
          <div style={{ position: "relative", display: "inline-block" }}>
            {profilePics[player.battleTag] ? (
              <img
                src={profilePics[player.battleTag]}
                alt="Player Profile Pic"
                className={`profile-pic ${player.isMvp ? "mvp" : ""}`}
              />
            ) : null}
            {playerCountries[player.battleTag] ? (
              <Flag
                name={playerCountries[player.battleTag].toLowerCase()}
                style={{ position: "absolute", ...flagPosition }}
                className={`${teamClassName} flag`}
              />
            ) : null}
            {player.isMvp && (
              <div className={`mvp-badge ${teamClassName}`}>
                <span className="mvp-star">⭐</span>
                <span className="mvp-text">MVP</span>
              </div>
            )}
          </div>

          {/* Player name */}
          <div>
            <Link to={`/player/${player.battleTag.replace("#", "%23")}`}>
              <h2>{player.name}</h2>
            </Link>
          </div>

          {/* MMR line */}
          <div className="player-mmr-line">
            {oldMmr && oldMmr > 0 ? (
              <>
                <span className="mmr-value">{oldMmr}</span>
                <span className="mmr-label"> MMR</span>
              </>
            ) : (
              <span className="mmr-label-muted">Unranked</span>
            )}
          </div>

          {/* Session info */}
          <div className="session-info">
            {playerSession && playerSession.form && playerSession.form.length > 0 ? (
              <>
                <span className="session-record">{playerSession.wins}W-{playerSession.losses}L</span>
                {sessionDelta !== 0 && (
                  <span className={`session-delta ${sessionDelta >= 0 ? 'positive' : 'negative'}`}>
                    {sessionDelta >= 0 ? ' ↑' : ' ↓'}{Math.abs(sessionDelta)}
                  </span>
                )}
              </>
            ) : null}
          </div>

          {/* Form dots - oldest on left, newest (latest) on right */}
          <div className="form-dots-wrapper">
            {playerSession?.form && playerSession.form.length > 0 ? (
              <div className="form-dots">
                {playerSession.form.map((won, i, arr) => (
                  <span
                    key={i}
                    className={`form-dot ${won ? "win" : "loss"} ${i === arr.length - 1 ? "latest" : ""}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Table.HeaderCell>
    );
  };

  const team1Won = playerData[0].won;
  const team2Won = playerData[4].won;

  return (
    <div className="Game">
      <Table inverted size="small" basic className={`${compact ? "compactTable" : ""}`}>
        <Table.Header>
          <Table.Row>
            <th> </th>
            <th> </th>
            <th> </th>
            <th className={`team-0 team-header ${team1Won ? "winner" : ""}`}>
              <div>
                <h2 className="team-name">{team1Won && <span className="crown">👑</span>} TEAM 1</h2>
                <div className="team-mmr-line">
                  <span className="mmr-value">
                    {Math.round(
                      playerData
                        .slice(0, 4)
                        .map((d) => d.oldMmr)
                        .reduce((acc, curr) => acc + curr, 0) / 4
                    )}
                  </span>
                  <span className="mmr-label"> MMR</span>
                </div>
                <div className="image-container">
                  {playerData
                    .slice(0, 4)
                    .map((d, i) => (
                      <img
                        key={i}
                        src={raceMapping[d.race]}
                        alt={d.race}
                        className={"race teamHeaderRace"}
                      />
                    ))}
                </div>
              </div>
            </th>
            <th className="th-center" style={{ position: "relative" }}>
              <h2>VS</h2>
            </th>
            <th className={`team-1 team-header ${team2Won ? "winner" : ""}`}>
              <div>
                <h2 className="team-name">TEAM 2 {team2Won && <span className="crown">👑</span>}</h2>
                <div className="team-mmr-line">
                  <span className="mmr-value">
                    {Math.round(
                      playerData
                        .slice(4)
                        .map((d) => d.oldMmr)
                        .reduce((acc, curr) => acc + curr, 0) / 4
                    )}
                  </span>
                  <span className="mmr-label"> MMR</span>
                </div>
                <div className="image-container">
                  {playerData
                    .slice(4)
                    .map((d, i) => (
                      <img
                        key={i}
                        src={raceMapping[d.race]}
                        alt={d.race}
                        className={"race teamHeaderRace"}
                      />
                    ))}
                </div>
              </div>
            </th>
            <th> </th>
            <th> </th>
            <th> </th>
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
                    <th className={`th-center ${compact}`} style={{ position: "relative", verticalAlign: "top" }}>
                      <div style={{ height: "220px", width: "60px", overflow: "hidden", display: "inline-block" }}>
                        <MmrComparison
                          data={{
                            teamOneMmrs: playerData.slice(0, 4).map((d) => d.oldMmr),
                            teamTwoMmrs: playerData.slice(4).map((d) => d.oldMmr),
                          }}
                          id={"123"}
                        />
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
              <Table.Row className="section-divider">
                <td colSpan={9}></td>
              </Table.Row>
              {renderTableRows("unitScore")}
              <Table.Row className="section-divider">
                <td colSpan={9}></td>
              </Table.Row>
              {renderTableRows("resourceScore")}
            </>
          )}
          <Table.Row className="meta">
            <td colSpan={9}>
              <div className="meta-bar">
                <div className="meta-map-centered">
                  <img
                    src={getMapImageUrl(metaData.mapId)}
                    alt="map"
                    className="meta-map-img"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="meta-map-info">
                    <span className="meta-map-name">{metaData.mapName}</span>
                    <span className="meta-details">
                      {metaData.server} · {metaData.gameLength === "0:00"
                        ? calculateElapsedTime(metaData.startTime)
                        : metaData.gameLength} mins
                      {metaData.gameLength === "0:00" && <span className="live-dot"></span>}
                    </span>
                  </div>
                </div>
                {metaData.matchId && (
                  <Link to={`/match/${metaData.matchId}`} className="meta-match-id">
                    #{metaData.matchId}
                  </Link>
                )}
              </div>
            </td>
          </Table.Row>
        </Table.Body>
      </Table>
    </div>
  );
};

export default Game;
