import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";

const posts = [
  {
    slug: "alls-fair",
    title: "All's Fair in Love and Warcraft",
    description: "How I visualize whether a 4v4 match is fair—and why it's harder than it sounds.",
    date: "Feb 2025",
    tags: ["dataviz", "design", "wc3"],
  },
];

// Style A: Minimal list
const StyleA = ({ post }) => (
  <Link to={`/blog/${post.slug}`} className="blog-style-a">
    <span className="date">{post.date}</span>
    <span className="title">{post.title}</span>
    <span className="arrow">→</span>
  </Link>
);

// Style B: Current (gold left border)
const StyleB = ({ post }) => (
  <Link to={`/blog/${post.slug}`} className="blog-style-b">
    <div className="tags">
      {post.tags?.map((tag) => <span key={tag} className="tag">{tag}</span>)}
    </div>
    <h2 className="title">{post.title}</h2>
    <p className="desc">{post.description}</p>
    <div className="footer">
      <span className="date">{post.date}</span>
      <span className="read">Read →</span>
    </div>
  </Link>
);

// Style C: Full gold border box
const StyleC = ({ post }) => (
  <Link to={`/blog/${post.slug}`} className="blog-style-c">
    <div className="top">
      <span className="date">{post.date}</span>
      <div className="tags">
        {post.tags?.map((tag) => <span key={tag} className="tag">{tag}</span>)}
      </div>
    </div>
    <h2 className="title">{post.title}</h2>
    <p className="desc">{post.description}</p>
  </Link>
);

// Style D: Big title, minimal
const StyleD = ({ post }) => (
  <Link to={`/blog/${post.slug}`} className="blog-style-d">
    <h2 className="title">{post.title}</h2>
    <div className="meta">
      <span className="date">{post.date}</span>
      <span className="sep">·</span>
      {post.tags?.map((tag, i) => (
        <span key={tag} className="tag">{tag}{i < post.tags.length - 1 ? ", " : ""}</span>
      ))}
    </div>
  </Link>
);

// Style E: Two-column
const StyleE = ({ post }) => (
  <Link to={`/blog/${post.slug}`} className="blog-style-e">
    <div className="left">
      <span className="date">{post.date}</span>
      <div className="tags">
        {post.tags?.map((tag) => <span key={tag} className="tag">{tag}</span>)}
      </div>
    </div>
    <div className="right">
      <h2 className="title">{post.title}</h2>
      <p className="desc">{post.description}</p>
    </div>
  </Link>
);

const styles = [
  { id: "a", name: "Minimal Row", component: StyleA },
  { id: "b", name: "Left Border", component: StyleB },
  { id: "c", name: "Gold Box", component: StyleC },
  { id: "d", name: "Big Title", component: StyleD },
  { id: "e", name: "Two Column", component: StyleE },
];

const Blog = () => {
  const [activeStyle, setActiveStyle] = useState("b");
  const ActiveComponent = styles.find(s => s.id === activeStyle)?.component || StyleB;

  return (
    <div className="blog-page">
      <Navbar />

      <div className="blog-container">
        <header className="blog-header">
          <h1>Blog</h1>
        </header>

        {/* Style switcher */}
        <div className="blog-style-switcher">
          {styles.map((style) => (
            <button
              key={style.id}
              className={`blog-style-btn ${activeStyle === style.id ? "active" : ""}`}
              onClick={() => setActiveStyle(style.id)}
            >
              {style.name}
            </button>
          ))}
        </div>

        <div className="blog-list">
          {posts.map((post) => (
            <ActiveComponent key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Blog;
