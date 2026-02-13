import React, { Suspense, lazy, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import PeonLoader from "../components/PeonLoader";
import { blogPosts } from "../lib/blogPosts";

const BlogPost = () => {
  const { slug } = useParams();
  const post = blogPosts.find((p) => p.slug === slug);

  const PostComponent = useMemo(
    () => (post ? lazy(post.component) : null),
    [post]
  );

  if (!post || !PostComponent) {
    return (
      <div className="not-found-page">
        <h1 className="not-found-title">404</h1>
        <p className="not-found-text">Post not found</p>
        <Link to="/blog" className="not-found-link">Back to blog</Link>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="page-loader fade-in">
          <PeonLoader />
        </div>
      }
    >
      <PostComponent />
    </Suspense>
  );
};

export default BlogPost;
