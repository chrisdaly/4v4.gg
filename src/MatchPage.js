import React, { useState, useEffect } from "react";
import { Container, Grid, Dimmer, Loader } from "semantic-ui-react";
import Navbar from "./Navbar.js";
import MatchDetails from "./MatchDetails.js";

const pageUrl = new URL(window.location.href);
const matchId = pageUrl.pathname.split("/").slice(-1)[0]; //

const MatchPage = () => {
  const [match, setMatch] = useState(null);
  const [playerScores, setPlayerScores] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Track loading state

  useEffect(() => {
    loadInitData();
  }, []);

  const loadInitData = async () => {
    try {
      let url = new URL(`https://website-backend.w3champions.com/api/matches/${matchId}`);
      let response = await fetch(url);
      let result = await response.json();
      setMatch(result.match);
      setPlayerScores(result.playerScores); // Fixed typo here
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false); // Update loading state regardless of success or failure
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Navbar />
        <Grid columns={3}>
          <Grid.Row columns={3}>
            <Dimmer active>
              <Loader />
            </Dimmer>
          </Grid.Row>
        </Grid>
      </Container>
    );
  }

  if (!match || !playerScores) {
    return (
      <Container>
        <Navbar />
        <div>Match data loading...</div>
      </Container>
    );
  }

  return (
    <div>
      <MatchDetails match={match} playerScores={playerScores} />
    </div>
  );
};

export default MatchPage;
