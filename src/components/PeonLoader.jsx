import React, { useState, useEffect, useRef } from "react";

/**
 * PeonLoader — Gold spinner + cycling WC3 peon quotes
 *
 * Usage:
 *   <PeonLoader />                   — default (page-level, lg spinner)
 *   <PeonLoader size="sm" />         — inline/compact
 *   <PeonLoader size="md" />         — medium
 *   <PeonLoader interval={4000} />   — custom cycle speed (ms)
 */

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

function randomIndex(exclude) {
  let idx;
  do { idx = Math.floor(Math.random() * quotes.length); } while (idx === exclude && quotes.length > 1);
  return idx;
}

const PeonLoader = ({ size = "lg", interval = 3000 }) => {
  const sizeClass = size === "lg" ? " lg" : size === "sm" ? " sm" : "";
  const [idx, setIdx] = useState(() => randomIndex(-1));
  const prevRef = useRef(idx);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((prev) => {
        const next = randomIndex(prev);
        prevRef.current = next;
        return next;
      });
    }, interval);
    return () => clearInterval(id);
  }, [interval]);

  return (
    <div className="peon-loader">
      <div className={`loader-spinner${sizeClass}`} />
      <span className="peon-text" key={idx}>{quotes[idx]}</span>
    </div>
  );
};

export default PeonLoader;
