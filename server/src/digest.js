import Anthropic from '@anthropic-ai/sdk';
import { getMessagesByDate, getDigest, setDigest } from './db.js';
import config from './config.js';

export async function generateDigest(date) {
  // Return cached if exists
  const existing = getDigest(date);
  if (existing) return existing.digest;

  if (!config.ANTHROPIC_API_KEY) return null;

  const messages = getMessagesByDate(date);
  if (messages.length < 10) return null; // Not enough messages to summarize

  const log = messages.map(m => `[${m.user_name}]: ${m.message}`).join('\n');

  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Summarize this Warcraft III 4v4 chat room's day. Write a SHORT digest with these sections (skip if nothing fits):

TOPICS: 1-2 lines on what people discussed
DRAMA: Who argued with who and about what (1-2 lines)
HIGHLIGHTS: Funniest moments or best burns (1-2 lines)
MVP: Most active chatter (1 line)

Rules:
- No title, no date header, jump straight into TOPICS:
- Use player names, be specific
- State facts only, no commentary (no "classic", "brutal", "chaos", etc)
- ASCII only
- Each section max 2 short lines
- Total under 500 chars

Chat log (${messages.length} messages):
${log}`
    }],
  });

  const digest = msg.content[0]?.text?.trim();
  if (!digest) return null;

  // Cache in DB
  setDigest(date, digest);
  console.log(`[Digest] Generated for ${date} (${messages.length} messages)`);
  return digest;
}
