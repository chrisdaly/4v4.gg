import React from "react";

/**
 * Blog post registry — single source of truth.
 * Add new posts here; Blog index + Router consume this automatically.
 *
 * coverImage: optional path to a hero image (rendered as magazine-style card)
 */

/** Four gold dots on dark — matches the "Dots, Not Numbers" theme */
const DotsPreview = () => (
  <svg viewBox="0 0 320 160" className="bl-card-preview-svg">
    <circle cx="120" cy="60" r="18" fill="#D4A843" />
    <circle cx="200" cy="60" r="18" fill="#D4A843" />
    <circle cx="120" cy="108" r="18" fill="#D4A843" />
    <circle cx="200" cy="108" r="18" fill="#D4A843" />
  </svg>
);

export const blogPosts = [
  {
    slug: "dots-not-numbers",
    title: "Dots, Not Numbers",
    description: "How the MMR charts work on 4v4.gg.",
    date: "Feb 2025",
    tags: ["dataviz", "design", "wc3"],
    type: "component",
    component: () => import("../pages/DesignLab"),
    preview: DotsPreview,
  },

  // ── Draft mockups (skeletons — not published) ──────────────
  {
    slug: "can-ai-tell-who-you-are",
    title: "Can AI Tell Who You Are From Your Clicks?",
    description:
      "Using neural networks and behavioral fingerprints to detect smurfs in Warcraft III.",
    date: "Draft",
    tags: ["ml", "replays", "smurf-detection"],
    coverImage: "/blog/fingerprint-cover.svg",
    draft: true,
  },
  {
    slug: "4v4-meta-report",
    title: "The 4v4 Meta Report",
    description:
      "Which race combos dominate? Which heroes get picked — and which ones win? A data-driven breakdown of the current 4v4 meta.",
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
      "How we parse WC3 replay files — from raw hex bytes to action timelines, APM curves, and player behavior.",
    date: "Draft",
    tags: ["engineering", "replays", "wc3"],
    coverImage: "/blog/replay-cover.svg",
    draft: true,
  },
];
