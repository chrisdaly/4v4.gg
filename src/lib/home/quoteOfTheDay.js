import { parseDigestSections, parseMentions } from "../digestUtils";
import { relayFetch } from "../relay";

/**
 * The home page's quote of the day from a daily digest: the first
 * speaker-attributed quote in BEST_OF_CHAT, else DRAMA_QUOTES, else the
 * quotes inside DRAMA. A digest with a JSON narrative (digestJson) is read
 * the same way from its bestOfChat / drama fields.
 *
 * quoteOfTheDay(digest) -> { text, speaker, battleTag } | null
 *   digest   { digest: "TOPICS: ...", digestJson? } (a relay digest row)
 */

const QUOTE_RE = /"([^"]+)"/g;
const SPEAKER_RE = /^([^\s:][^:]{0,40}?):\s+(.+)$/;

// "Name: text" -> { speaker, text }; unattributed quotes are skipped
function attributed(raw) {
  const m = String(raw || "").trim().match(SPEAKER_RE);
  if (!m) return null;
  const text = m[2].trim().replace(/^["“]|["”]$/g, "");
  if (text.length < 4) return null;
  return { speaker: m[1].trim(), text };
}

function quotesIn(content) {
  return [...String(content || "").matchAll(QUOTE_RE)].map((m) => m[1]);
}

function fromJson(json, sources) {
  const narrative = json?.narrative || {};
  const pools = [];
  if (sources.includes("BEST_OF_CHAT") && narrative.bestOfChat) pools.push(quotesIn(narrative.bestOfChat));
  if (sources.includes("DRAMA") || sources.includes("DRAMA_QUOTES")) {
    for (const item of narrative.drama || []) {
      pools.push((item.quotes || []).map((q) => (q.speaker ? `${q.speaker}: ${q.text}` : q.text)));
    }
  }
  return pools.flat();
}

const DEFAULT_SOURCES = ["BEST_OF_CHAT", "DRAMA_QUOTES", "DRAMA", "HIGHLIGHTS"];

export function quoteOfTheDay(digest, { sources = DEFAULT_SOURCES } = {}) {
  if (!digest) return null;
  const text = digest.digest || "";
  const sections = text ? parseDigestSections(text) : [];
  const find = (key) => sections.find((s) => s.key === key)?.content;
  const candidates = sources.flatMap((key) => quotesIn(find(key)));
  let json = digest.digestJson;
  if (typeof json === "string") {
    try {
      json = JSON.parse(json);
    } catch {
      json = null;
    }
  }
  if (json) candidates.push(...fromJson(json, sources));
  const pick = candidates.map(attributed).find(Boolean);
  if (!pick) return null;
  const mentions = parseMentions(sections);
  return { ...pick, battleTag: mentions.get(pick.speaker) || null };
}

/**
 * The chat message a quote came from, via the relay's search: the quote's
 * text (then, if the digest paraphrased, its first four words) by the
 * speaker, anywhere in the archive. Resolves { id, receivedAt } or null.
 */
export async function findQuoteMessage(quote, fetcher = relayFetch) {
  if (!quote?.text || !quote.speaker) return null;
  const words = quote.text.split(/\s+/).filter(Boolean);
  const attempts = [quote.text];
  if (words.length > 4) attempts.push(words.slice(0, 4).join(" "));
  for (const q of attempts) {
    if (q.length < 2) continue;
    try {
      const sp = new URLSearchParams({ q, player: quote.speaker, since: "all", limit: "1" });
      const res = await fetcher(`/api/chat/search?${sp.toString()}`);
      if (!res.ok) continue;
      const data = await res.json();
      const hit = data?.results?.[0];
      if (hit?.id != null) return { id: hit.id, receivedAt: hit.received_at || hit.receivedAt || null };
    } catch {
      // the relay is optional here; the quote still links to /chat
    }
  }
  return null;
}
