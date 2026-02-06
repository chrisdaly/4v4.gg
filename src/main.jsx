import React from "react";
import { createRoot } from "react-dom/client";
import Router from "./Router.jsx";
import { initSeason } from "./lib/params";

import "./styles/index.css";
import "./styles/App.css";

// Fetch current season before rendering
initSeason().then(() => {
  createRoot(document.getElementById("root")).render(<Router />);
});
