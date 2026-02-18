import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Route, Switch, Link, Redirect } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import PeonLoader from "./components/PeonLoader";
import { ThemeProvider } from "./lib/ThemeContext";

// Homepage loaded eagerly (initial route)
import Home from "./pages/Home";

// Core nav pages — lazy-loaded but preloaded after first paint
const pageImports = {
  ongoing: () => import("./pages/OngoingGames"),
  finished: () => import("./pages/RecentlyFinished"),
  ladder: () => import("./pages/Ladder"),
  stats: () => import("./pages/Stats"),
  chat: () => import("./pages/Chat"),
  player: () => import("./pages/PlayerProfile"),
};

const OngoingGames = lazy(pageImports.ongoing);
const RecentlyFinished = lazy(pageImports.finished);
const Ladder = lazy(pageImports.ladder);
const Stats = lazy(pageImports.stats);
const Chat = lazy(pageImports.chat);
const PlayerProfile = lazy(pageImports.player);

// Secondary pages (lazy-loaded on demand)
const News = lazy(() => import("./pages/News"));
const FinishedGamePage = lazy(() => import("./pages/FinishedGamePage"));
const PlayerStream = lazy(() => import("./pages/PlayerStream"));
const MyStreamPage = lazy(() => import("./pages/MyStreamPage"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Clips = lazy(() => import("./pages/Clips"));
const Replay = lazy(() => import("./pages/Replay"));
const ReplayLab = lazy(() => import("./pages/ReplayLab"));

// Overlay pages (lazy-loaded)
const OverlayIndex = lazy(() => import("./pages/overlay/OverlayIndex"));
const MatchOverlayPage = lazy(() => import("./pages/overlay/MatchOverlayPage"));
const PlayerOverlayPage = lazy(() => import("./pages/overlay/PlayerOverlayPage"));
const LastGameOverlayPage = lazy(() => import("./pages/overlay/LastGameOverlayPage"));

// Dev/demo pages (lazy-loaded)
const StyleReference = lazy(() => import("./pages/StyleReference"));
const IconDemo = lazy(() => import("./pages/IconDemo"));
const Assets = lazy(() => import("./pages/Assets"));
const ChatMockups = lazy(() => import("./pages/ChatMockups"));
const Admin = lazy(() => import("./pages/Admin"));
const DevTools = lazy(() => import("./pages/DevTools"));
const Themes = lazy(() => import("./pages/Themes"));
const FaviconMockups = lazy(() => import("./pages/FaviconMockups"));

// Preload core nav pages after initial paint so they're instant on click
const preloadCorePages = () => {
  const load = () => Object.values(pageImports).forEach(fn => fn());
  if (window.requestIdleCallback) {
    window.requestIdleCallback(load, { timeout: 2000 });
  } else {
    setTimeout(load, 2000);
  }
};

const PageLoader = () => (
  <div className="page-loader fade-in">
    <PeonLoader />
  </div>
);

// Theme overlay removed — new visitors get the default theme
// and can pick one from the Themes page whenever they want.

const Preloader = () => {
  useEffect(() => { preloadCorePages(); }, []);
  return null;
};

const Router = () => (
  <BrowserRouter>
    <ThemeProvider>
      <Preloader />
      <Switch>
        {/* Stream overlays - no Navbar */}
        <Route path="/overlay/match">
          <Suspense fallback={<PageLoader />}><MatchOverlayPage /></Suspense>
        </Route>
        <Route path="/overlay/player">
          <Suspense fallback={<PageLoader />}><PlayerOverlayPage /></Suspense>
        </Route>
        <Route path="/overlay/lastgame">
          <Suspense fallback={<PageLoader />}><LastGameOverlayPage /></Suspense>
        </Route>
        <Route exact path="/overlay">
          <Suspense fallback={<PageLoader />}><OverlayIndex /></Suspense>
        </Route>
        <Route path="/stream">
          <Suspense fallback={<PageLoader />}><PlayerStream /></Suspense>
        </Route>
        <Route path="/mystream">
          <Suspense fallback={<PageLoader />}><MyStreamPage /></Suspense>
        </Route>

        {/* All other pages - Navbar stays mounted, only content suspends */}
        <Route>
          <Navbar />
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route exact path="/" component={Home} />
                <Route path="/news" component={News} />
                <Route path="/live" component={OngoingGames} />
                <Route path="/ongoing" component={OngoingGames} />
                <Route path="/finished" component={RecentlyFinished} />
                <Route path="/ladder" component={Ladder} />
                <Route path="/stats" component={Stats} />
                <Route path="/player" component={PlayerProfile} />
                <Route path="/match" component={FinishedGamePage} />
                <Route exact path="/blog" component={Blog} />
                <Route path="/blog/:slug" component={BlogPost} />
                <Route path="/style" component={StyleReference} />
                <Route path="/icons" component={IconDemo} />
                <Route path="/assets" component={Assets} />
                <Route path="/chat" component={Chat} />
                <Route path="/clips" component={Clips} />
                <Route path="/mockups" component={ChatMockups} />
                <Route path="/themes" component={Themes} />
                <Route path="/admin" component={Admin} />
                <Route path="/dev" component={DevTools} />
                <Route path="/favicons" component={FaviconMockups} />

                <Redirect from="/magazine" to="/news" />
                <Route path="/replay-lab" component={ReplayLab} />
                <Route path="/replay" component={Replay} />

                {/* 404 catch-all */}
                <Route>
                  <div className="not-found-page">
                    <h1 className="not-found-title">404</h1>
                    <p className="not-found-text">Page not found</p>
                    <Link to="/" className="not-found-link">Back to home</Link>
                  </div>
                </Route>
              </Switch>
            </Suspense>
          </ErrorBoundary>
        </Route>
      </Switch>
    </ThemeProvider>
  </BrowserRouter>
);

export default Router;
