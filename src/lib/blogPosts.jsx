import React from "react";

/**
 * Blog post registry - single source of truth.
 * Add new posts here; Blog index + Router consume this automatically.
 *
 * coverImage: optional path to a hero image (rendered as magazine-style card)
 */

/** Four gold dots on dark - matches the "Dots, Not Numbers" theme */
const DotsPreview = () => (
  <svg viewBox="0 0 320 160" className="bl-card-preview-svg">
    <circle cx="120" cy="60" r="18" fill="var(--gold)" />
    <circle cx="200" cy="60" r="18" fill="var(--gold)" />
    <circle cx="120" cy="108" r="18" fill="var(--gold)" />
    <circle cx="200" cy="108" r="18" fill="var(--gold)" />
  </svg>
);

/**
 * A session as dots, with a speech bubble where the player said "last game"
 * and the games they played after it - the motif of "Just One More Game"
 */
const LastGamePreview = () => {
  const before = [1, 0, 0, 1, 0];
  const after = [0, 0, 1, 1];
  const step = 28;
  const x0 = 34;
  const bubbleX = x0 + before.length * step;
  const dot = (won, i, x) => (
    <circle key={`${x}-${i}`} cx={x} cy="80" r="10" fill={won ? "var(--green)" : "var(--red)"} />
  );
  return (
    <svg viewBox="0 0 320 160" className="bl-card-preview-svg">
      {before.map((w, i) => dot(w, i, x0 + i * step))}
      <path
        transform={`translate(${bubbleX - 13} 66) scale(1.7)`}
        fill="var(--gold)"
        d="M2 1.5h12a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H8.2L4.5 14.8v-3.3H2A1.5 1.5 0 0 1 .5 10V3A1.5 1.5 0 0 1 2 1.5z"
      />
      {after.map((w, i) => dot(w, i, bubbleX + step + 6 + i * step))}
    </svg>
  );
};

/**
 * The post's own chart for its opening game (ToD on Mount Hyjal): rating up
 * the side, winners left and losers right, one bar per player for the MVP
 * score. The top of the losing column has the longest bar and a speech
 * bubble, and the blame curves down to a teammate - the motif of "The Blame
 * Game": the accusation comes from the top
 */
const BlamePreview = () => {
  const won = [[75, 72], [95, 52], [106, 60], [117, 42]];
  const lost = [[26, 72], [86, 27], [115, 37], [133, 60]];
  const lit = (i) => i === 0 || i === 2;
  return (
    <svg viewBox="0 0 320 160" className="bl-card-preview-svg">
      <line x1="160" y1="12" x2="160" y2="150" stroke="var(--grey-light)" strokeWidth="0.6" />
      <polyline points={won.map(([y]) => `148,${y}`).join(" ")} fill="none" stroke="var(--team-blue)" strokeWidth="1" opacity="0.5" />
      <polyline points={lost.map(([y]) => `172,${y}`).join(" ")} fill="none" stroke="var(--red)" strokeWidth="1" opacity="0.5" />
      {won.map(([y, len]) => (
        <g key={`w${y}`} opacity="0.45">
          <rect x={141 - len} y={y - 3.5} width={len} height="7" rx="2" fill="var(--team-blue)" />
          <circle cx="148" cy={y} r="4.5" fill="var(--team-blue)" />
        </g>
      ))}
      {lost.map(([y, len], i) => (
        <g key={`l${y}`} opacity={lit(i) ? 1 : 0.55}>
          <rect x="179" y={y - 3.5} width={len} height="7" rx="2" fill="var(--red)" />
          <circle cx="172" cy={y} r="4.5" fill="var(--red)" stroke={lit(i) ? "#fff" : "none"} strokeWidth="1.5" />
        </g>
      ))}
      <path
        transform="translate(258 8) scale(1.6)"
        fill="var(--gold)"
        d="M2 1.5h12a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H8.2L4.5 14.8v-3.3H2A1.5 1.5 0 0 1 .5 10V3A1.5 1.5 0 0 1 2 1.5z"
      />
      <path d="M276 34 Q300 80 232 112" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M224 116 L238 104 L239 118 Z" fill="var(--gold)" />
    </svg>
  );
};

export const blogPosts = [
  {
    slug: "the-blame-game",
    title: "The Blame Game",
    description: "Who says what in chat in the five minutes after a 4v4, and who gets the blame.",
    date: "Nov 16, 2026",
    tags: ["chat", "stats"],
    type: "component",
    component: () => import("../pages/blog/PostGameBlame"),
    preview: BlamePreview,
  },
  {
    slug: "one-more-game",
    title: "Just One More Game",
    description:
      "What happens after someone in 4v4 chat says \"last game\". Half of those who get the game play another.",
    date: "Nov 14, 2026",
    tags: ["chat", "stats"],
    type: "component",
    component: () => import("../pages/blog/OneMoreGame"),
    preview: LastGamePreview,
  },
  {
    slug: "where-the-demon-hunter-went",
    title: "Where the Demon Hunter Went",
    description:
      "In solo, Night Elf is built around the Demon Hunter. In 4v4, opening with him gets you called names.",
    date: "Oct 4, 2026",
    tags: ["heroes", "chat", "stats"],
    type: "component",
    component: () => import("../pages/blog/HeroUsage"),
    coverImage: "/blog/demonhunter-cover.svg",
  },
  {
    slug: "dots-not-numbers",
    title: "Dots, Not Numbers",
    description: "How the MMR charts work on 4v4.gg.",
    date: "Jan 25, 2026",
    tags: ["dataviz", "design", "wc3"],
    type: "component",
    component: () => import("../pages/DesignLab"),
    preview: DotsPreview,
  },

  // ── Draft mockups (skeletons - not published) ──────────────
  {
    slug: "can-ai-tell-who-you-are",
    title: "Can AI Tell Who You Are From Your Clicks?",
    description:
      "Using neural networks and behavioral fingerprints to detect smurfs in Warcraft III.",
    date: "Feb 16, 2026",
    tags: ["ml", "replays", "smurf-detection"],
    coverImage: "/blog/fingerprint-cover.svg",
    draft: true,
  },
  {
    slug: "4v4-meta-report",
    title: "The 4v4 Meta Report",
    description:
      "Which race combos dominate? Which heroes get picked - and which ones win? A data-driven breakdown of the current 4v4 meta.",
    date: "Draft",
    tags: ["meta", "stats", "wc3"],
    coverImage: "/blog/meta-cover.svg",
    draft: true,
  },
  {
    slug: "your-allies-matter",
    title: "Your Allies Matter More Than You Think",
    description:
      "A statistical deep dive into ally synergy, nemesis effects, and why your MMR is only half the story in 4v4.",
    date: "Draft",
    tags: ["stats", "allies", "dataviz"],
    coverImage: "/blog/allies-cover.svg",
    draft: true,
  },
  {
    slug: "anatomy-of-a-comeback",
    title: "The Anatomy of a Comeback",
    description:
      "What does momentum look like in a 4v4 game? Visualizing the turning points that flip lost games into wins.",
    date: "Draft",
    tags: ["replays", "dataviz", "storytelling"],
    coverImage: "/blog/comeback-cover.svg",
    draft: true,
  },
  {
    slug: "reading-the-replay",
    title: "Reading the Replay",
    description:
      "How we parse WC3 replay files - from raw hex bytes to action timelines, APM curves, and player behavior.",
    date: "Draft",
    tags: ["engineering", "replays", "wc3"],
    coverImage: "/blog/replay-cover.svg",
    draft: true,
  },
];
