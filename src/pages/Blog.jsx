import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { blogPosts } from "../lib/blogPosts";
import useAdmin from "../lib/useAdmin";
import { PageLayout } from "../components/PageLayout";
import { PageHero } from "../components/ui";
import "../styles/pages/Blog.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const Blog = () => {
  const { adminKey, isAdmin } = useAdmin();
  const [dbPosts, setDbPosts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const headers = isAdmin ? { "X-API-Key": adminKey } : {};
    fetch(`${RELAY_URL}/api/blog`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDbPosts(data);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [isAdmin, adminKey]);

  // Merge: legacy component posts take precedence, then DB posts (dedup by slug)
  const legacySlugs = new Set(blogPosts.map((p) => p.slug));
  const merged = [
    ...blogPosts,
    ...dbPosts.filter((p) => !legacySlugs.has(p.slug)),
  ];

  const blogHeader = (
    <PageHero
      eyebrow="4v4.gg Blog"
      title="Writing about Warcraft III 4v4."
      lead="Design decisions, data visualization, and competitive analysis from the 4v4.gg project."
      lg
    />
  );

  return (
    <PageLayout maxWidth="1200px" bare header={blogHeader}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="bl-post-list">
          {!loaded ? null : merged.map((post, i) => {
            const hasPreview = post.preview || post.coverImage;
            return (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className={`bl-post-card reveal${hasPreview ? " bl-post-card--has-preview" : ""}`}
              >
                {post.preview && (
                  <div className="bl-card-preview">
                    <post.preview />
                  </div>
                )}
                {!post.preview && post.coverImage && (
                  <div className="bl-card-preview">
                    <img src={post.coverImage} alt="" className="bl-card-preview-img" />
                  </div>
                )}
                <div className="bl-card-body">
                  <div className="bl-card-tags">
                    {post.tags?.map((tag) => (
                      <span key={tag} className="bl-card-tag">{tag}</span>
                    ))}
                    {isAdmin && !post.published && !post.type && (
                      <span className="bl-card-tag bl-card-tag--draft">draft</span>
                    )}
                  </div>
                  <h2 className="bl-card-title">{post.title}</h2>
                  <p className="bl-card-desc">{post.description}</p>
                  <div className="bl-card-footer">
                    <span className="bl-card-date">{post.date}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
};

export default Blog;
