import React, { Suspense, lazy } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";

// Homepage loaded eagerly (initial route)
import OngoingGames from "./pages/OngoingGames";

// Pages (lazy-loaded)
const Ladder = lazy(() => import("./pages/Ladder"));
const PlayerProfile = lazy(() => import("./pages/PlayerProfile"));
const PlayerStream = lazy(() => import("./pages/PlayerStream"));
const FinishedGamePage = lazy(() => import("./pages/FinishedGamePage"));
const RecentlyFinished = lazy(() => import("./pages/RecentlyFinished"));
const Stats = lazy(() => import("./pages/Stats"));
const MyStreamPage = lazy(() => import("./pages/MyStreamPage"));
const Blog = lazy(() => import("./pages/Blog"));
const DesignLab = lazy(() => import("./pages/DesignLab"));
const MmrLab = lazy(() => import("./pages/MmrLab"));
const Chat = lazy(() => import("./pages/Chat"));

// Overlay pages (lazy-loaded)
const OverlayIndex = lazy(() => import("./pages/overlay/OverlayIndex"));
const MatchOverlayPage = lazy(() => import("./pages/overlay/MatchOverlayPage"));
const PlayerOverlayPage = lazy(() => import("./pages/overlay/PlayerOverlayPage"));
const LastGameOverlayPage = lazy(() => import("./pages/overlay/LastGameOverlayPage"));

// Dev/demo pages (lazy-loaded)
const VisualizationDemo = lazy(() => import("./pages/VisualizationDemo"));
const StyleReference = lazy(() => import("./pages/StyleReference"));
const IconDemo = lazy(() => import("./pages/IconDemo"));
const Assets = lazy(() => import("./pages/Assets"));
const ChatMockups = lazy(() => import("./pages/ChatMockups"));

const PageLoader = () => (
  <div className="page-loader">
    <div className="loader-spinner lg"></div>
  </div>
);

const Router = () => (
  <BrowserRouter>
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Stream overlays - no Navbar */}
        <Route path="/overlay/match" component={MatchOverlayPage} />
        <Route path="/overlay/player" component={PlayerOverlayPage} />
        <Route path="/overlay/lastgame" component={LastGameOverlayPage} />
        <Route exact path="/overlay" component={OverlayIndex} />
        <Route path="/stream" component={PlayerStream} />
        <Route path="/mystream" component={MyStreamPage} />
        <Route path="/chat" component={Chat} />

        {/* All other pages - Navbar + ErrorBoundary */}
        <Route>
          <Navbar />
          <ErrorBoundary>
            <Switch>
              <Route exact path="/" component={OngoingGames} />
              <Route path="/ongoing" component={OngoingGames} />
              <Route path="/finished" component={RecentlyFinished} />
              <Route path="/ladder" component={Ladder} />
              <Route path="/stats" component={Stats} />
              <Route path="/player" component={PlayerProfile} />
              <Route path="/match" component={FinishedGamePage} />
              <Route exact path="/blog" component={Blog} />
              <Route path="/blog/dots-not-numbers" component={DesignLab} />
              <Route path="/demo" component={VisualizationDemo} />
              <Route path="/styles" component={StyleReference} />
              <Route path="/icons" component={IconDemo} />
              <Route path="/assets" component={Assets} />
              <Route path="/mockups" component={ChatMockups} />

              <Route path="/mmr-lab" component={MmrLab} />
            </Switch>
          </ErrorBoundary>
        </Route>
      </Switch>
    </Suspense>
  </BrowserRouter>
);

export default Router;
