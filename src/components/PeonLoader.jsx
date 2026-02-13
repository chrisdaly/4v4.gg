import React from "react";

/**
 * PeonLoader — Gold spinner + random WC3 peon quote
 *
 * Usage:
 *   <PeonLoader />                   — default (page-level, lg spinner)
 *   <PeonLoader size="sm" />         — inline/compact
 *   <PeonLoader size="md" />         — medium
 */

const PeonLoader = ({ size = "lg" }) => {
  const sizeClass = size === "lg" ? " lg" : size === "sm" ? " sm" : "";

  return (
    <div className="peon-loader">
      <div className={`loader-spinner${sizeClass}`} />
      <span className="peon-text">{randomQuote()}</span>
    </div>
  );
};

const quotes = [
  "Work work...",
  "Something need doing?",
  "Me busy, leave me alone.",
  "Okie dokie.",
  "I'd be happy to.",
  "Dabu.",
  "Zug zug.",
  "Ready to work.",
  "What you want?",
  "More work?",
  "Right-o.",
  "Yes, me lord.",
  "Whaaat?",
  "Job's done.",
];

function randomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export default PeonLoader;
