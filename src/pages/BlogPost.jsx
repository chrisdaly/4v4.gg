import React, { Suspense, lazy, useMemo, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PeonLoader from "../components/PeonLoader";
import { blogPosts } from "../lib/blogPosts";
import useAdmin from "../lib/useAdmin";
import { PageLayout } from "../components/PageLayout";
import "../styles/pages/Blog.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const BlogPost = () => {
  const { slug } = useParams();
  const { adminKey, isAdmin } = useAdmin();

  // Check legacy component posts first
  const legacyPost = blogPosts.find((p) => p.slug === slug);
  const PostComponent = useMemo(
    () => (legacyPost?.component ? lazy(legacyPost.component) : null),
    [legacyPost]
  );

  // For non-legacy posts, fetch from API
  const [dbPost, setDbPost] = useState(null);
  const [loading, setLoading] = useState(!legacyPost);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (legacyPost) return;
    const headers = isAdmin ? { "X-API-Key": adminKey } : {};
    fetch(`${RELAY_URL}/api/blog/${slug}`, { headers })
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDbPost(data);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [slug, legacyPost, isAdmin, adminKey]);

  const handleTogglePublish = () => {
    fetch(`${RELAY_URL}/api/blog/${slug}/publish`, {
      method: "PUT",
      headers: { "X-API-Key": adminKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setDbPost((prev) => ({ ...prev, published: data.published ? 1 : 0 }));
        }
      })
      .catch(() => {});
  };

  // Legacy component post
  if (legacyPost && PostComponent) {
    return (
      <PageLayout maxWidth="1200px" bare>
        <Suspense
          fallback={
            <div className="page-loader fade-in">
              <PeonLoader />
            </div>
          }
        >
          <PostComponent />
        </Suspense>
      </PageLayout>
    );
  }

  // Loading
  if (loading) {
    return (
      <PageLayout maxWidth="1200px" bare>
        <div className="page-loader fade-in"><PeonLoader /></div>
      </PageLayout>
    );
  }

  // Not found
  if (notFound || !dbPost) {
    return (
      <div className="not-found-page">
        <h1 className="not-found-title">404</h1>
        <p className="not-found-text">Post not found</p>
        <Link to="/blog" className="not-found-link">Back to blog</Link>
      </div>
    );
  }

  // Markdown post from DB — compact article header matching legacy posts
  return (
    <PageLayout maxWidth="1200px" bare>
      <div className="bl-content">
        <Link to="/blog" className="bl-back">&larr; Blog</Link>
        <div className="bl-card-tags" style={{ marginBottom: 16 }}>
          {dbPost.tags?.map((tag) => (
            <span key={tag} className="bl-card-tag">{tag}</span>
          ))}
        </div>
        <h1 className="bl-article-title">{dbPost.title}</h1>
        {dbPost.description && <p className="bl-article-lead">{dbPost.description}</p>}
        <div style={{ marginBottom: 24 }}>
          <span className="bl-card-tag">{dbPost.date}</span>
          {isAdmin && (
            <button
              className={`bl-publish-btn ${dbPost.published ? "bl-publish-btn--published" : ""}`}
              onClick={handleTogglePublish}
              style={{ marginLeft: 12 }}
            >
              {dbPost.published ? "Unpublish" : "Publish"}
            </button>
          )}
        </div>
        <div className="bl-section bl-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{dbPost.content}</ReactMarkdown>
        </div>
      </div>
    </PageLayout>
  );
};

export default BlogPost;
