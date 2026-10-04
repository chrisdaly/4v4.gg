import { Router } from 'express';
import { publicLimiter } from '../middleware/rateLimit.js';
import { getMatchPlayerScoresByIds } from '../db.js';

const router = Router();

router.use(publicLimiter);

const MAX_IDS = 50;
const ID_RE = /^[0-9a-f]{24}$/;

// The five headline stats behind the MVP badge, the same five the match
// page ranks on (src/lib/matchNotes.js MVP_KEYS). Each player's score is the
// sum over the five of how many players in the match they are at or above.
const MVP_COLS = ['heroes_killed', 'exp_gained', 'gold_collected', 'units_killed', 'largest_army'];

function computeMvp(rows) {
  let best = null;
  let bestScore = -Infinity;
  for (const r of rows) {
    let sum = 0;
    for (const col of MVP_COLS) {
      const v = r[col] ?? 0;
      sum += rows.filter((o) => (o[col] ?? 0) <= v).length;
    }
    if (sum > bestScore) {
      bestScore = sum;
      best = r.battle_tag;
    }
  }
  return best;
}

// GET /api/matches/mvp?ids=a,b,c
// -> { mvp: { "a": "Tag#123" | null } }
//
// The per-player score lines behind this are fetched nightly for the previous
// day's 4v4 games (digest.js fetchDailyMatchScores), so a match from today, or
// a 1v1, comes back null rather than costing a W3C round trip here.
router.get('/mvp', (req, res) => {
  const ids = String(req.query.ids || '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => ID_RE.test(id))
    .slice(0, MAX_IDS);
  if (ids.length === 0) {
    return res.status(400).json({ error: 'ids query parameter is required' });
  }

  const byMatch = new Map(ids.map((id) => [id, []]));
  for (const row of getMatchPlayerScoresByIds(ids)) {
    byMatch.get(row.match_id)?.push(row);
  }
  const mvp = {};
  for (const [id, rows] of byMatch) {
    mvp[id] = rows.length ? computeMvp(rows) : null;
  }

  // A stored result never changes; a missing one fills in overnight
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ mvp });
});

export default router;
