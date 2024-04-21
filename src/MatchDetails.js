import React, { useState, useEffect } from "react";
import { Container, Header, Segment, Table } from "semantic-ui-react";

const MatchDetails = ({ match, playerScores }) => {
  console.log(match, playerScores);
  const [playerProfilePics, setPlayerProfilePics] = useState({});

  const getPlayerProfilePicUrl = async (battleTag) => {
    try {
      // Fetch player's profile data
      const response = await fetch(`https://website-backend.w3champions.com/api/personal-settings/${encodeURIComponent(battleTag)}`);
      const profileData = await response.json();

      // Extract pictureId
      const { profilePicture } = profileData;
      if (!profilePicture || !profilePicture.pictureId) {
        return null; // No profile picture available
      }

      const { pictureId, race } = profilePicture;

      const raceMapping = {
        64: "starter",
        16: "total",
        8: "undead",
        0: "random",
        4: "elf",
        2: "orc",
        1: "human",
      };

      // Check if pictureId is in specialPictures array
      const { specialPictures } = profileData;
      if (specialPictures.map((d) => d.pictureId).includes(pictureId)) {
        // Construct URL for special profile picture
        return `https://w3champions.wc3.tools/prod/integration/icons/specialAvatars/SPECIAL_${pictureId}.jpg`;
      } else {
        // Construct URL for regular profile picture
        return `https://w3champions.wc3.tools/prod/integration/icons/raceAvatars/classic/${raceMapping[race].toUpperCase()}_${pictureId}.jpg`;
      }
    } catch (error) {
      console.error("Error fetching player profile picture:", error);
      return null;
    }
  };
  const excludedKeys = ["mercsHired", "itemsObtained"];

  const getPlayerMmrAndChange = (battleTag) => {
    for (const team of match.teams) {
      for (const player of team.players) {
        if (player.battleTag === battleTag) {
          const mmr = player.currentMmr;
          const oldMmr = player.oldMmr;
          let mmrChange = player.mmrGain.toString(); // Convert mmrChange to a string
          if (player.mmrGain > 0) {
            mmrChange = `+${mmrChange}`; // Add "+" sign if mmrChange is positive
          }
          return { oldMmr, mmrChange };
        }
      }
    }
    return null;
  };

  // Determine the CSS class based on the comparison result
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

  useEffect(() => {
    const fetchPlayerProfilePics = async () => {
      const profilePics = {};
      for (const team of match.teams) {
        for (const player of team.players) {
          const profilePicUrl = await getPlayerProfilePicUrl(player.battleTag);
          profilePics[player.battleTag] = profilePicUrl;
        }
      }
      setPlayerProfilePics(profilePics);
    };

    fetchPlayerProfilePics();
  }, [match]);

  const renderTableCells = (scoreType, statName, teamIndex, team0Total, team1Total) => {
    // Determine which team's total to use
    const total = teamIndex === 0 ? team0Total : team1Total;

    // Calculate team total for the specified scoreType and statName
    const teamTotal0 = playerScores.slice(0, 4).reduce((acc, playerScore) => acc + playerScore[scoreType][statName], 0);
    const teamTotal1 = playerScores.slice(4).reduce((acc, playerScore) => acc + playerScore[scoreType][statName], 0);

    // Determine the cell's style based on the comparison with the opposing team
    const className = getCellStyle(teamIndex, teamTotal0 - teamTotal1, statName);

    // Render table cells for each player in the team
    return playerScores.slice(teamIndex * 4, (teamIndex + 1) * 4).map((playerScore, index) => (
      <Table.Cell key={`team${teamIndex + 1}-${index}`} className={`${className} number team-${teamIndex}`}>
        {playerScore[scoreType][statName].toLocaleString("en-US")}
      </Table.Cell>
    ));
  };

  const renderTableRows = (scoreType) => {
    return Object.entries(playerScores[0][scoreType])
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
        <p className="number">{hero.level}</p>
      </div>
    );
  };

  const renderHeroRows = () => {
    return (
      <Table.Row>
        {playerScores.slice(0, 4).map((playerScore, index) => (
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

        {playerScores.slice(4).map((playerScore, index) => (
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
    const { oldMmr, mmrChange } = getPlayerMmrAndChange(player.battleTag);

    return (
      <Table.HeaderCell key={player.battleTag}>
        <div className={`${teamClassName} max-width-cell`}>
          <div>{playerProfilePics[player.battleTag] ? <img src={playerProfilePics[player.battleTag]} alt="Player Profile Pic" className="profile-pic " /> : null}</div>
          <div>
            <h2>{player.name}</h2>
          </div>
          <div>
            <p className="key">
              <span className="number value">{oldMmr}</span> <span className="key">MMR</span> (<span style={{ color: mmrChange > 0 ? "green" : "red" }}>{mmrChange}</span>)
            </p>
          </div>
        </div>
      </Table.HeaderCell>
    );
  };

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

  return (
    <div className="matchDetails" style={{ width: "maxContent" }}>
      <Segment.Group>
        <Segment>
          <Table inverted size="medium" basic>
            <Table.Header>
              <Table.Row>
                {playerScores.map((playerScore, index) => {
                  // Find the corresponding player object in match.teams
                  //   const teamIndex = match.teams.findIndex((team) => team.players.some((player) => player.battleTag === playerScore.battleTag));
                  const teamIndex = playerScore.teamIndex;

                  const teamClassName = `team-${teamIndex}`;
                  const allPlayers = match.teams.flatMap((team) => team.players);

                  // Now, you can find the corresponding player using the battleTag
                  const player = allPlayers.find((p) => p.battleTag === playerScore.battleTag);
                  // Find the corresponding player object
                  //   const player = match.teams[teamIndex].players.find((p) => p.battleTag === playerScore.battleTag);

                  return (
                    <React.Fragment key={`player-${index}`}>
                      {renderPlayerCell(player, teamClassName)}
                      {index === 3 && ( // Render the "VS" element in the middle
                        <th className="th-center">
                          {/* <img src={`${process.env.PUBLIC_URL}/maps/${match.mapName}.png`} alt="Map Icon" className="map-icon" /> */}
                          <h2>VS</h2>
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
                    <div className="value">{match.serverInfo.location ? match.serverInfo.location.toUpper() : ""}</div>
                    <div className="key">REGION</div>
                  </div>
                </td>
                <td className="th-center">
                  <div>
                    <div className="value">{match.serverInfo.name.toUpperCase()}</div>
                    <div className="key">SERVER</div>
                  </div>
                </td>
                <td className="th-center">
                  <div>
                    <img
                      src={`${process.env.PUBLIC_URL}/maps/Nightopia.png`}
                      alt="Map Icon"
                      style={{ width: "100px", height: "100px" }} // Adjust the size as needed
                    />
                    <div className="value">NIGHTOPIA</div>
                    <div className="key">MAP</div>
                  </div>
                </td>
                <td className="th-center">
                  <div>
                    <div className="value">{`${Math.floor(match.durationInSeconds / 60)}:${(match.durationInSeconds % 60).toString().padStart(2, "0")}`}</div>
                    <div className="key">GAME LENGTH</div>
                  </div>
                </td>
                <td className="th-center">
                  <div>
                    <div className="value">{match.startTime.slice(0, 16)}</div>
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
