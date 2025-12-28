import React from "react";
import { Link } from "react-router-dom";
import { Header, Grid } from "semantic-ui-react";

const Navbar = () => {
  return (
    <div className="navbar">
      <Header as="h1" textAlign="center">
        <Header.Content>4v4.GG</Header.Content>
      </Header>
      <Grid columns={4} textAlign="center">
        <Grid.Column>
          <h3><Link to="/ongoing">Live Games</Link></h3>
        </Grid.Column>
        <Grid.Column>
          <h3><Link to="/finished">Recently Finished Games</Link></h3>
        </Grid.Column>
        <Grid.Column>
          <h3><Link to="/queue">Queue</Link></h3>
        </Grid.Column>
        <Grid.Column>
          <h3><Link to="/ladder">Ladder</Link></h3>
        </Grid.Column>
      </Grid>
    </div>
  );
};

export default Navbar;
