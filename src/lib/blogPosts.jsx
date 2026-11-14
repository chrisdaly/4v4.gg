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

export const blogPosts = [
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
