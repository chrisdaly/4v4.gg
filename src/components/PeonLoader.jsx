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

// Quotes with optional {name} placeholder — used when `subject` prop is provided
// Mix of investigation-specific + WC3 unit lines that fit the scouting/detection vibe
const subjectQuotes = [
  // Investigation-specific
  "Investigating {name}...",
  "Analyzing {name}'s replays...",
  "Checking {name}'s hotkeys...",
  "Scouting {name}...",
  "Studying {name}'s build order...",
  "Who is {name}, really?",
  "{name} looks suspicious...",
  "Cross-referencing {name}...",
  // Far Seer
  "I see {name}...",
  // Warden
  "{name} shall not escape.",
  "My prey draws near...",
  // Shadow Hunter
  "The voodoo never lies.",
  "Stay cool, mon.",
  // Dark Ranger
  "The hunt is on.",
  // Shade
  "{name} cannot hide from my sight.",
  // Archmage
  "I'll look into it.",
  // Paladin
  "Justice has come.",
  // Blood Mage
  "Your magic betrays you.",
  // Witch Doctor
  "It's all in da reflexes.",
  // Demon Hunter
  "I am my scars.",
];

function randomIndex(exclude, len) {
  let idx;
  do { idx = Math.floor(Math.random() * len); } while (idx === exclude && len > 1);
  return idx;
}

const PeonLoader = ({ size = "lg", interval = 3000, subject }) => {
  const sizeClass = size === "lg" ? " lg" : size === "sm" ? " sm" : "";
  const pool = subject ? subjectQuotes : quotes;
  const [idx, setIdx] = useState(() => randomIndex(-1, pool.length));
  const prevRef = useRef(idx);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((prev) => {
        const next = randomIndex(prev, pool.length);
        prevRef.current = next;
        return next;
      });
    }, interval);
    return () => clearInterval(id);
  }, [interval, pool.length]);

  const text = subject ? pool[idx % pool.length].replace("{name}", subject) : pool[idx % pool.length];

  return (
    <div className="peon-loader">
      <div className={`loader-spinner${sizeClass}`} />
      <span className="peon-text" key={idx}>{text}</span>
    </div>
  );
};

export default PeonLoader;
