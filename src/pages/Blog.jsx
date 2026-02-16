import React from "react";
import { Link } from "react-router-dom";
import { blogPosts } from "../lib/blogPosts";
import "../styles/pages/Blog.css";

const Blog = () => {
  return (
    <div className="bl-page">

      <header className="bl-hero bl-reveal" style={{ "--delay": "0.05s" }}>
        <div className="bl-eyebrow">4v4.gg Blog</div>
        <h1>Writing about Warcraft III 4v4.</h1>
        <p className="bl-lead">
          Design decisions, data visualization, and competitive analysis
          from the 4v4.gg project.
        </p>
      </header>

      <div className="bl-post-list">
        {blogPosts.map((post, i) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className={`bl-post-card bl-reveal${post.preview ? " bl-post-card--has-preview" : ""}`}
            style={{ "--delay": `${0.12 + i * 0.06}s` }}
          >
            {post.preview && (
              <div className="bl-card-preview">
                <post.preview />
              </div>
            )}
            <div className="bl-card-body">
              <div className="bl-card-tags">
                {post.tags?.map((tag) => (
                  <span key={tag} className="bl-card-tag">{tag}</span>
                ))}
              </div>
              <h2 className="bl-card-title">{post.title}</h2>
              <p className="bl-card-desc">{post.description}</p>
              <div className="bl-card-footer">
                <span className="bl-card-date">{post.date}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Blog;
