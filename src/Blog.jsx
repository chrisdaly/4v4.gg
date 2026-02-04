import React from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";

const posts = [
  {
    slug: "alls-fair",
    title: "All's Fair in Love and Warcraft",
    description: "How we visualize whether a 4v4 match is fair—and why it's harder than it sounds.",
    date: "February 2026",
  },
];

const BlogCard = ({ post }) => (
  <Link
    to={`/blog/${post.slug}`}
    style={{
      display: "block",
      background: "var(--surface-1)",
      border: "1px solid var(--grey-mid)",
      borderRadius: "8px",
      padding: "24px",
      textDecoration: "none",
      transition: "border-color 150ms ease, background 150ms ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = "var(--gold)";
      e.currentTarget.style.background = "var(--surface-2)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = "var(--grey-mid)";
      e.currentTarget.style.background = "var(--surface-1)";
    }}
  >
    <div style={{
      color: "var(--grey-mid)",
      fontSize: "13px",
      fontFamily: "var(--font-mono)",
      marginBottom: "8px"
    }}>
      {post.date}
    </div>
    <h2 style={{
      color: "var(--gold)",
      fontFamily: "var(--font-display)",
      fontSize: "22px",
      margin: "0 0 12px 0",
      fontWeight: "normal"
    }}>
      {post.title}
    </h2>
    <p style={{
      color: "var(--grey-light)",
      fontSize: "15px",
      lineHeight: 1.6,
      margin: 0
    }}>
      {post.description}
    </p>
  </Link>
);

const Blog = () => (
  <div>
    <Navbar />

    <div style={{ padding: "48px 32px 80px", background: "#0a0a0a", minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        <h1 style={{
          color: "var(--gold)",
          fontFamily: "var(--font-display)",
          fontSize: "36px",
          margin: "0 0 16px 0",
          fontWeight: "normal"
        }}>
          Blog
        </h1>

        <p style={{
          color: "var(--grey-light)",
          fontSize: "17px",
          lineHeight: 1.6,
          margin: "0 0 48px 0"
        }}>
          Notes on building 4v4.gg
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>

      </div>
    </div>
  </div>
);

export default Blog;
