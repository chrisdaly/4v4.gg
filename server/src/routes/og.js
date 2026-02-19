import { Router } from 'express';
import { getWeeklyDigest } from '../db.js';

const router = Router();

const SITE_URL = 'https://4v4.gg';
const RELAY_URL = 'https://4v4gg-chat-relay.fly.dev';

/**
 * GET /og/news?week=2026-02-09
 *
 * Returns HTML with Open Graph meta tags for Discord/Slack/Twitter link previews.
 * Bots get the OG tags; browsers get redirected to the SPA.
 */
router.get('/news', (req, res) => {
  const { week } = req.query;
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return res.redirect(`${SITE_URL}/news`);
  }

  const weekly = getWeeklyDigest(week);
  if (!weekly) {
    return res.redirect(`${SITE_URL}/news?week=${week}`);
  }

  // Extract headline and description from DRAMA section
  const digestText = weekly.digest || '';
  let title = '4v4.gg Weekly';
  let description = 'Weekly Warcraft III 4v4 roundup';

  const dramaMatch = digestText.match(/^DRAMA\s*:\s*(.+)/m);
  if (dramaMatch) {
    const dramaContent = dramaMatch[1].trim();
    // First item (before first semicolon)
    const firstItem = dramaContent.split(/;\s*/)[0] || '';
    // Strip quotes
    const stripped = firstItem.replace(/"[^"]+"/g, '').replace(/\s{2,}/g, ' ').trim();
    // Split on pipe: "Headline | body"
    const pipeParts = stripped.split(/\s*\|\s*/);
    if (pipeParts.length > 1) {
      title = pipeParts[0].trim();
      description = pipeParts.slice(1).join(' ').trim();
    } else {
      title = stripped.length > 70 ? stripped.slice(0, 67) + '...' : stripped;
      description = stripped;
    }
  }

  // Truncate description for OG
  if (description.length > 200) {
    description = description.slice(0, 197) + '...';
  }

  const pageUrl = `${SITE_URL}/news?week=${week}`;
  const imageUrl = `${RELAY_URL}/api/admin/weekly-digest/${week}/cover.jpg`;

  const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:image" content="${escHtml(imageUrl)}">
  <meta property="og:url" content="${escHtml(pageUrl)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="4v4.gg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(description)}">
  <meta name="twitter:image" content="${escHtml(imageUrl)}">
  <meta http-equiv="refresh" content="0;url=${escHtml(pageUrl)}">
  <title>${escHtml(title)} — 4v4.gg</title>
</head>
<body>
  <p>Redirecting to <a href="${escHtml(pageUrl)}">4v4.gg</a>...</p>
</body>
</html>`;

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(html);
});

export default router;
