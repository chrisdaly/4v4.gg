import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Match from "./Match";
import { Grid, Container, Divider, Flag, Image } from "semantic-ui-react";
import { standardDeviation, arithmeticMean } from "./utils.js";

import { gameMode, gateway, season } from "./params";

const PlayerProfile = () => {
  const [matches, setMatches] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [ongoingGame, setOngoingGame] = useState({});
  const [transition, setTransition] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [ladderRanks, setLadderRanks] = useState([]);

  useEffect(() => {
    loadData();
    const intervalId = setInterval(loadData, 30000);
    const transitionId = setInterval(() => setTransition(!transition), 10000);
    return () => {
      clearInterval(intervalId);
      clearInterval(transitionId);
    };
  }, []);

  const loadData = async () => {
    const pageUrl = new URL(window.location.href);
    const player = pageUrl.pathname.split("/").slice(-1)[0];

    try {
      const playerResponse = await fetch(`https://website-backend.w3champions.com/api/players/${player}`);
      const playerResult = await playerResponse.json();
      console.log("playerResult", playerResult);
      setPlayerData(playerResult);

      const ongoingResponse = await fetch("https://website-backend.w3champions.com/api/matches/ongoing");
      const ongoingResult = await ongoingResponse.json();
      const ongoingGame = ongoingResult.matches.find((m) => m.teams.some((t) => t.players.map((p) => p.battleTag).includes(player)));
      setOngoingGame(ongoingGame || {});

      const searchParams = new URLSearchParams({
        offset: 0,
        gateway,
        pageSize: 200,
        season,
        gameMode: 4,
        playerId: playerResult.battleTag,
      });
      var url = new URL("https://website-backend.w3champions.com/api/ladder/0");
      var params = { gateway, season, gameMode };
      url.search = new URLSearchParams(params).toString();

      var response = await fetch(url);
      var result = await response.json();
      setLadderRanks(result.slice(0, 20));

      const matchesResponse = await fetch(`https://website-backend.w3champions.com/api/matches/search?${searchParams}`);
      const matchesResult = await matchesResponse.json();
      let matches = matchesResult.matches;
      matches.forEach((m) => {
        let matchMmr = 0;
        m.teams.forEach((t) => {
          let playerMmrs = t.players.map((d) => d.oldMmr);
          let teamAverage = arithmeticMean(playerMmrs);
          let teamDeviation = standardDeviation(playerMmrs);
          t.teamAverage = teamAverage;
          t.teamDeviation = teamDeviation;
          matchMmr += teamAverage;
        });

        m.matchMmr = Math.round(matchMmr / 2);
      });
      setMatches(matches);
      setIsLoaded(true);
    } catch (error) {
      console.error(error);
    }
  };

  if (!isLoaded || !playerData) return null;

  return (
    <Container>
      <Navbar />
      <div id="profileCard">
        <Grid>
          <Grid.Row>
            <Grid.Column width={4}>
              <Image src={playerData.profilePicture} />
            </Grid.Column>
            <Grid.Column width={8}>
              <h3>{playerData.name}</h3>
            </Grid.Column>
          </Grid.Row>
          <div className="matches">
            {Object.keys(matches).map((key) => (
              <div>
                <Match match={matches[key]} key={matches[key].id} ladderRanks={ladderRanks} />
                <Divider />
              </div>
            ))}
          </div>
        </Grid>
      </div>
    </Container>
  );
};

export default PlayerProfile;
