import React from "react";
import { createRoot } from "react-dom/client";
import Router from "./Router.jsx";
import { initSeason } from "./params.jsx";

import "semantic-ui-css/semantic.min.css";
import "./index.css";
import "./App.css";

// Fetch current season before rendering
initSeason().then(() => {
  createRoot(document.getElementById("root")).render(<Router />);
});
