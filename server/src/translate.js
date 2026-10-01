import Anthropic from '@anthropic-ai/sdk';
import { broadcast } from './sse.js';
import { setTranslation } from './db.js';
import config from './config.js';

// Matches CJK, Cyrillic, Arabic, Thai, Korean, Devanagari, and other non-Latin scripts
const NON_LATIN_RE = /[\u0400-\u052F\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u1100-\u11FF\u3000-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;

export function needsTranslation(text) {
  return NON_LATIN_RE.test(text);
}

/**
 * Translate a message to English when it is not already Latin script, store
 * it on the row and push it to anyone watching. Results are permanent: the
 * archive and search carry them too.
 */
export async function maybeTranslate(messageId, text, { broadcastLive = true } = {}) {
  if (!config.ANTHROPIC_API_KEY) return false;
  if (!needsTranslation(text)) return false;

  try {
    const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Translate the following chat message to English. Respond with ONLY the English translation, nothing else. Keep it casual and natural.\n\n${text}`
      }],
    });

    const translated = msg.content[0]?.text?.trim();
    if (!translated) return false;

    // Stored first, then broadcast: the live stream shows it at once and a
    // reader who arrives tomorrow still gets it with the message. A backfill
    // skips the broadcast, since nobody is watching those lines arrive.
    setTranslation(messageId, translated);
    if (broadcastLive) broadcast('translation', { id: messageId, translated });
    console.log(`[Translate] ${text.substring(0, 30)} -> ${translated.substring(0, 50)}`);
    return true;
  } catch (err) {
    console.error('[Translate] Error:', err.message);
    return false;
  }
}
