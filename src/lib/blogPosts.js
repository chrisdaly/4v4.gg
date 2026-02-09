/**
 * Blog post registry — single source of truth.
 * Add new posts here; Blog index + Router consume this automatically.
 */
export const blogPosts = [
  {
    slug: "dots-not-numbers",
    title: "Dots, Not Numbers",
    description: "How the MMR charts work on 4v4.gg.",
    date: "February 2025",
    tags: ["dataviz", "design", "wc3"],
    component: () => import("../pages/DesignLab"),
  },
];
