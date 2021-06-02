import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import App from "./App";
import PlayerProfile from "./PlayerProfile";

const Router = () => (
  <BrowserRouter>
    <Switch>
      <Route exact path="/" component={App} />
      <Route path="/player" component={PlayerProfile} />
    </Switch>
  </BrowserRouter>
);

export default Router;
