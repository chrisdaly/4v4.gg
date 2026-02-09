import Anthropic from '@anthropic-ai/sdk';
import { broadcast } from './sse.js';
import config from './config.js';

// Matches CJK, Cyrillic, Arabic, Thai, Korean, Devanagari, and other non-Latin scripts
const NON_LATIN_RE = /[\u0400-\u052F\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u1100-\u11FF\u3000-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;

export function needsTranslation(text) {
  return NON_LATIN_RE.test(text);
}

export async function maybeTranslate(messageId, text) {
  if (!config.ANTHROPIC_API_KEY) return;
  if (!needsTranslation(text)) return;

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
    if (!translated) return;

    broadcast('translation', { id: messageId, translated });
    console.log(`[Translate] ${text.substring(0, 30)} -> ${translated.substring(0, 50)}`);
  } catch (err) {
    console.error('[Translate] Error:', err.message);
  }
}
