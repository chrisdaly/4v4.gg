import React from "react";
import { createRoot } from "react-dom/client"; // Import createRoot from "react-dom/client"
import Router from "./Router";

import "./index.css";

createRoot(document.getElementById("root")).render(<Router />);
