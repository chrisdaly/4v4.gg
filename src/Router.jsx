import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";

// Pages
import OngoingGames from "./pages/OngoingGames";
import Ladder from "./pages/Ladder";
import PlayerProfile from "./pages/PlayerProfile";
import PlayerStream from "./pages/PlayerStream";
import FinishedGamePage from "./pages/FinishedGamePage";
import RecentlyFinished from "./pages/RecentlyFinished";
import Stats from "./pages/Stats";
import MyStreamPage from "./pages/MyStreamPage";
import VisualizationDemo from "./pages/VisualizationDemo";
import StyleReference from "./pages/StyleReference";
import IconDemo from "./pages/IconDemo";
import DesignLab from "./pages/DesignLab";
import Blog from "./pages/Blog";
import MmrLab from "./pages/MmrLab";

// Overlay pages
import OverlayIndex from "./pages/overlay/OverlayIndex";
import MatchOverlayPage from "./pages/overlay/MatchOverlayPage";
import PlayerOverlayPage from "./pages/overlay/PlayerOverlayPage";
import LastGameOverlayPage from "./pages/overlay/LastGameOverlayPage";

const Router = () => (
  <BrowserRouter>
    <Switch>
      {/* Main pages */}
      <Route exact path="/" component={OngoingGames} />
      <Route path="/ongoing" component={OngoingGames} />
      <Route path="/finished" component={RecentlyFinished} />
      <Route path="/ladder" component={Ladder} />
      <Route path="/stats" component={Stats} />
      <Route path="/player" component={PlayerProfile} />
      <Route path="/match" component={FinishedGamePage} />

      {/* Blog */}
      <Route exact path="/blog" component={Blog} />
      <Route path="/blog/dots-not-numbers" component={DesignLab} />

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
      <Route path="/mmr-lab" component={MmrLab} />
    </Switch>
  </BrowserRouter>
);

export default Router;
