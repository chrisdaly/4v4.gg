import { relayFetch } from "../relay";

/**
 * Inline unfurls for the /chat feed: Twitch clips and YouTube videos.
 *
 *   detectUnfurl(text) -> { kind: "twitch" | "youtube", id, url, host } | null
 *   fetchUnfurl(target) -> Promise<{ title, thumbnail, author } | null>
 *
 * One card per message: detectUnfurl returns the first supported URL.
 * Metadata is cached per id in module scope for the life of the page;
 * a failed lookup is cached too so the feed never re-asks for a dead link.
 */

const URL_RE = /https?:\/\/[^\s<>"']+/g;
const SLUG_RE = /^[A-Za-z0-9_-]+$/;
const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function twitchSlugFrom(u) {
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  if (host === "clips.twitch.tv") {
    return parts[0] && SLUG_RE.test(parts[0]) ? parts[0] : null;
  }
  if (host === "twitch.tv") {
    const i = parts.indexOf("clip");
    if (i >= 1 && parts[i + 1] && SLUG_RE.test(parts[i + 1])) return parts[i + 1];
  }
  return null;
}

function youtubeIdFrom(u) {
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  let id = null;
  if (host === "youtu.be") {
    id = parts[0] || null;
  } else if (host === "youtube.com" || host === "music.youtube.com") {
    if (parts[0] === "watch") id = u.searchParams.get("v");
    else if (parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed") id = parts[1] || null;
  }
  return id && YT_ID_RE.test(id) ? id : null;
}

export function detectUnfurl(text) {
  if (!text || !text.includes("http")) return null;
  const matches = text.match(URL_RE);
  if (!matches) return null;
  for (const raw of matches) {
    let u;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    const slug = twitchSlugFrom(u);
    if (slug) {
      return { kind: "twitch", id: slug, url: `https://clips.twitch.tv/${slug}`, host: "clips.twitch.tv" };
    }
    const yt = youtubeIdFrom(u);
    if (yt) {
      return { kind: "youtube", id: yt, url: `https://www.youtube.com/watch?v=${yt}`, host: "youtube.com" };
    }
  }
  return null;
}

const cache = new Map(); // `${kind}:${id}` -> Promise<meta | null>

async function loadTwitch(id) {
  const res = await relayFetch(`/api/twitch/clip/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const c = await res.json();
  if (!c || !c.title) return null;
  return { title: c.title, thumbnail: c.thumbnail_url || null, author: c.broadcaster_name || null, url: c.url || null };
}

async function loadYoutube(id) {
  const target = encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);
  const res = await fetch(`https://www.youtube.com/oembed?url=${target}&format=json`);
  if (!res.ok) return null;
  const o = await res.json();
  if (!o || !o.title) return null;
  return { title: o.title, thumbnail: o.thumbnail_url || null, author: o.author_name || null, url: null };
}

export function fetchUnfurl(target) {
  if (!target) return Promise.resolve(null);
  const key = `${target.kind}:${target.id}`;
  let p = cache.get(key);
  if (!p) {
    const loader = target.kind === "twitch" ? loadTwitch : loadYoutube;
    p = loader(target.id).catch(() => null);
    cache.set(key, p);
  }
  return p;
}

export function resetUnfurlCache() {
  cache.clear();
}
