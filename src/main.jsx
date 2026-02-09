import React from "react";
import { createRoot } from "react-dom/client";
import Router from "./Router.jsx";
import { initSeason } from "./lib/params";

import "./styles/index.css";
import "./styles/App.css";

// Start fetching season immediately but don't block render —
// the navbar and theme shell should appear instantly.
// Season resolves before component useEffects fire their first API calls.
initSeason();
createRoot(document.getElementById("root")).render(<Router />);
