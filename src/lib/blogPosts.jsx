import React from "react";

/**
 * Blog post registry — single source of truth.
 * Add new posts here; Blog index + Router consume this automatically.
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
    component: () => import("../pages/DesignLab"),
    preview: DotsPreview,
  },
];
