import React from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";

const posts = [
  {
    slug: "alls-fair",
    title: "All's Fair in Love and Warcraft",
    description: "How I visualize whether a 4v4 match is fair—and why it's harder than it sounds.",
    date: "February 2025",
    tags: ["dataviz", "design", "wc3"],
  },
];

const BlogPost = ({ post }) => (
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

const Blog = () => (
  <div className="blog-page">
    <Navbar />

    <div className="blog-container">
      <header className="blog-header">
        <h1>Blog</h1>
      </header>

      <div className="blog-list">
        {posts.map((post) => (
          <BlogPost key={post.slug} post={post} />
        ))}
      </div>
    </div>
  </div>
);

export default Blog;
