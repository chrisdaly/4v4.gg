import { timingSafeEqual } from 'crypto';
import config from '../config.js';

export function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!config.ADMIN_API_KEY || typeof key !== 'string' || key.length === 0) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  const provided = Buffer.from(key);
  const expected = Buffer.from(config.ADMIN_API_KEY);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}
