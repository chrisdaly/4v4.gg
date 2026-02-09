import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { blogPosts } from "../lib/blogPosts";

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

const Blog = () => {
  // Force classic (black) theme on blog pages
  useEffect(() => {
    const s = document.body.style;
    const prev = {
      bgImg: s.getPropertyValue("--theme-bg-img"),
      bgOverlay: s.getPropertyValue("--theme-bg-overlay"),
    };
    s.setProperty("--theme-bg-img", "none");
    s.setProperty("--theme-bg-overlay", "none");
    return () => {
      s.setProperty("--theme-bg-img", prev.bgImg);
      s.setProperty("--theme-bg-overlay", prev.bgOverlay);
    };
  }, []);

  return (
    <div className="blog-page">
      <div className="blog-container">
        <header className="blog-header">
          <h1>Blog</h1>
        </header>

        <div className="blog-list">
          {blogPosts.map((post) => (
            <BlogPost key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Blog;
