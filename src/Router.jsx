import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import OnGoingGames from "./OnGoingGames";
import Ladder from "./Ladder";
import PlayerProfile from "./PlayerProfile";
import PlayerStream from "./PlayerStream";
import FinishedGamePage from "./FinishedGamePage";
import RecentlyFinished from "./RecentlyFinished";
import MyStreamPage from "./MyStreamPage";
import VisualizationDemo from "./VisualizationDemo";
import StyleReference from "./StyleReference";
import IconDemo from "./IconDemo";
import OverlayIndex from "./OverlayIndex";
import MatchOverlayPage from "./MatchOverlayPage";
import PlayerOverlayPage from "./PlayerOverlayPage";
import LastGameOverlayPage from "./LastGameOverlayPage";
import DesignLab from "./DesignLab";

const Router = () => (
  <BrowserRouter>
    <Switch>
      {/* Main pages */}
      <Route exact path="/" component={OnGoingGames} />
      <Route path="/ongoing" component={OnGoingGames} />
      <Route path="/finished" component={RecentlyFinished} />
      <Route path="/ladder" component={Ladder} />
      <Route path="/player" component={PlayerProfile} />
      <Route path="/match" component={FinishedGamePage} />

      {/* Stream overlays */}
      <Route exact path="/overlay" component={OverlayIndex} />
      <Route path="/overlay/match" component={MatchOverlayPage} />
      <Route path="/overlay/player" component={PlayerOverlayPage} />
      <Route path="/overlay/lastgame" component={LastGameOverlayPage} />
      <Route path="/stream" component={PlayerStream} />
      <Route path="/mystream" component={MyStreamPage} />

      {/* Dev/demo pages */}
      <Route path="/demo" component={VisualizationDemo} />
      <Route path="/styles" component={StyleReference} />
      <Route path="/icons" component={IconDemo} />
      <Route path="/design" component={DesignLab} />
    </Switch>
  </BrowserRouter>
);

export default Router;
