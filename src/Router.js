import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import App from "./App";
import Queue from "./Queue";
import OnGoingGames from "./OnGoingGames";
import Ladder from "./Ladder";
import PlayerProfile from "./PlayerProfile";
import PlayerStream from "./PlayerStream";
import FinishedGamePage from "./FinishedGamePage";
import RecentlyFinished from "./RecentlyFinished";

const Router = () => (
  <BrowserRouter>
    <Switch>
      <Route exact path="/" component={App} />
      <Route exact path="/queue" component={Queue} />
      <Route path="/ongoing" component={OnGoingGames} />
      <Route path="/finished" component={RecentlyFinished} />
      <Route path="/ladder" component={Ladder} />
      <Route path="/player" component={PlayerProfile} />
      <Route path="/stream" component={PlayerStream} />
      <Route path="/match" component={FinishedGamePage} />
    </Switch>
  </BrowserRouter>
);

export default Router;
