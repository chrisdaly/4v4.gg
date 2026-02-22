import { Router } from 'express';
import config from '../config.js';
import { getBlogPosts, getBlogPost, createBlogPost, updateBlogPost, toggleBlogPostPublished, deleteBlogPost } from '../db.js';

const router = Router();

function isAdmin(req) {
  return req.headers['x-api-key'] === config.ADMIN_API_KEY && !!config.ADMIN_API_KEY;
}

function requireApiKey(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}

// List posts — admins see drafts too
router.get('/', (req, res) => {
  const admin = isAdmin(req);
  const posts = getBlogPosts(admin);
  // Parse tags JSON
  const result = posts.map(p => ({
    ...p,
    tags: JSON.parse(p.tags || '[]'),
    coverImage: p.cover_image || null,
  }));
  res.json(result);
});

// Single post with content
router.get('/:slug', (req, res) => {
  const admin = isAdmin(req);
  const post = getBlogPost(req.params.slug, admin);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  res.json({
    ...post,
    tags: JSON.parse(post.tags || '[]'),
    coverImage: post.cover_image || null,
  });
});

// Create new post
router.post('/', requireApiKey, (req, res) => {
  const { slug, title, description, date, tags, content, published, coverImage } = req.body;
  if (!slug || !title || !date) {
    return res.status(400).json({ error: 'slug, title, and date are required' });
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'slug must be lowercase alphanumeric with hyphens' });
  }
  const existing = getBlogPost(slug, true);
  if (existing) {
    return res.status(409).json({ error: 'Post with this slug already exists' });
  }
  createBlogPost({ slug, title, description, date, tags, content, published, coverImage });
  res.status(201).json({ ok: true, slug });
});

// Update content/metadata
router.put('/:slug', requireApiKey, (req, res) => {
  const existing = getBlogPost(req.params.slug, true);
  if (!existing) {
    return res.status(404).json({ error: 'Post not found' });
  }
  const { title, description, date, tags, content, published, coverImage } = req.body;
  const fields = {};
  if (title !== undefined) fields.title = title;
  if (description !== undefined) fields.description = description;
  if (date !== undefined) fields.date = date;
  if (tags !== undefined) fields.tags = tags;
  if (content !== undefined) fields.content = content;
  if (published !== undefined) fields.published = published;
  if (coverImage !== undefined) fields.coverImage = coverImage;
  updateBlogPost(req.params.slug, fields);
  res.json({ ok: true, slug: req.params.slug });
});

// Toggle published state
router.put('/:slug/publish', requireApiKey, (req, res) => {
  const existing = getBlogPost(req.params.slug, true);
  if (!existing) {
    return res.status(404).json({ error: 'Post not found' });
  }
  const result = toggleBlogPostPublished(req.params.slug);
  res.json({ ok: true, slug: req.params.slug, published: !!result?.published });
});

// Delete post
router.delete('/:slug', requireApiKey, (req, res) => {
  const existing = getBlogPost(req.params.slug, true);
  if (!existing) {
    return res.status(404).json({ error: 'Post not found' });
  }
  deleteBlogPost(req.params.slug);
  res.json({ ok: true, slug: req.params.slug });
});

export default router;
