import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import App from "./App";
import Queue from "./Queue";
import MatchPage from "./MatchPage";
import Ladder from "./Ladder";
import PlayerProfile from "./PlayerProfile";

const Router = () => (
  <BrowserRouter>
    <Switch>
      <Route exact path="/" component={App} />
      <Route exact path="/queue" component={Queue} />
      <Route path="/ladder" component={Ladder} />
      <Route path="/player" component={PlayerProfile} />
      <Route path="/match" component={MatchPage} />
    </Switch>
  </BrowserRouter>
);

export default Router;
