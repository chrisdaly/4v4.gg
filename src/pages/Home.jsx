import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import useChatStream from "../lib/useChatStream";
import useOngoingMatches from "../lib/useOngoingMatches";
import usePlayerMeta from "../lib/usePlayerMeta";
import useGameEvents, { buildEndEvent } from "../lib/chat/useGameEvents";
import useTwitchLive from "../lib/chat/useTwitchLive";
import { getOngoingMatchesCached, getFinishedMatches, getMatch, getPlayerProfile } from "../lib/api";
import { computeMvp, computeNote } from "../lib/matchNotes";
import { blogPosts } from "../lib/blogPosts";
import { COVER_BACKGROUNDS, hashDate, formatWeekRange, extractHeadline } from "../lib/digestUtils";
import { quoteOfTheDay, findQuoteMessage } from "../lib/home/quoteOfTheDay";
import { todayStats, useTodayEvents } from "../lib/home/todayStats";
import Scoreboard from "../components/home/Scoreboard";
import LiveGamePanel from "../components/home/LiveGamePanel";
import WhosHere from "../components/home/WhosHere";
import StreamerCarousel from "../components/home/StreamerCarousel";
import ReadsCarousel from "../components/home/ReadsCarousel";

/**
 * The homepage (design handoff "Homepage redesign"): the scoreboard header
 * (players online, games live, quote of the day, ENTER THE JUNGLE), the
 * live game panel rotating through the ongoing games highest-rated first
 * with the LIVE NOW bar, and the right column: Who's here (map, today's
 * numbers, online by MMR), the streamer carousel and the reads carousel
 * (latest weekly issue and blog post). The page background is the art of
 * the current live slide, crossfading. Under 640px everything stacks.
 */

const RELAY_URL = import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";
const ROTATE_SECONDS = 6;

// High-res art behind the page, one per live slide (not the minimap)
const HERO_BACKGROUNDS = [
  "/backgrounds/themes/arena-reforged.jpg",
  "/backgrounds/themes/frozen-throne-chronicle.jpg",
  "/backgrounds/themes/blackrock-firelands.jpg",
  "/backgrounds/themes/ashenvale.jpg",
  "/backgrounds/themes/lordaeron.jpg",
  "/backgrounds/themes/dalaran.jpg",
  "/backgrounds/themes/outland.jpg",
];

const pickBg = (str) => {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return HERO_BACKGROUNDS[Math.abs(h) % HERO_BACKGROUNDS.length];
};

const avgMmr = (match) => {
  const mmrs = (match.teams || []).flatMap((t) => (t.players || []).map((p) => p.oldMmr || p.currentMmr || 0)).filter((m) => m > 0);
  return mmrs.length ? mmrs.reduce((a, b) => a + b, 0) / mmrs.length : 0;
};

// Highest average MMR first, as on /live
const sortByMmr = (matches) => (matches || []).slice().sort((a, b) => avgMmr(b) - avgMmr(a));

const subjectOf = (players) => {
  const first = players[0]?.name || players[0]?.battleTag?.split("#")[0];
  return first ? `${first} and team` : "Team";
};

const avgGain = (players) => {
  const gains = players.map((p) => p.mmrGain).filter((g) => g != null);
  if (!gains.length) return null;
  const avg = Math.round(gains.reduce((a, b) => a + b, 0) / gains.length);
  return `${avg >= 0 ? "+" : "-"}${Math.abs(avg)}`;
};

/* ── Data hooks ─────────────────────────────────────── */

// The latest finished game as a game_end event with MVP and note, for the
// empty state
function useLatestFinished(enabled) {
  const [finished, setFinished] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    getFinishedMatches(5, 0).then(async ({ matches }) => {
      const match = (matches || []).find((m) => m.teams?.length === 2);
      if (!match || cancelled) return;
      const everyone = new Set((match.teams || []).flatMap((t) => (t.players || []).map((p) => p.battleTag?.toLowerCase())).filter(Boolean));
      const event = buildEndEvent(match, match.id, everyone);
      if (!event) return;
      setFinished({ event, note: event.note });
      const detail = await getMatch(match.id).catch(() => null);
      if (cancelled || !detail?.playerScores) return;
      const matchPlayers = (detail.match?.teams || []).flatMap((t) => t.players || []);
      const mvp = computeMvp(detail.playerScores);
      const note = computeNote(event, { playerScores: detail.playerScores, matchPlayers });
      setFinished({ event: { ...event, mvp }, note });
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return finished;
}

// The latest event worth a flash on the LIVE NOW bar: a game that started
// or finished while the page is open (useGameEvents marks those live), or
// someone joining the channel
function useLiveFlash(gameEvents, onlineUsers, avatars, stats) {
  const [flash, setFlash] = useState(null);
  const seenEventsRef = useRef(new Set());
  const rosterRef = useRef(null);

  useEffect(() => {
    for (const ev of gameEvents) {
      if (!ev.live || seenEventsRef.current.has(ev.id)) continue;
      seenEventsRef.current.add(ev.id);
      const map = ev.mapName || "";
      if (ev.type === "game_end") {
        const gain = avgGain(ev.winners || []);
        setFlash({ id: ev.id, tag: "FINISHED", text: [map, `${subjectOf(ev.winners || [])}${gain ? ` ${gain}` : ""}`].filter(Boolean).join(" · ") });
      } else if (ev.type === "game_start") {
        const avg = ev.teamMmrs?.filter(Boolean);
        const lobby = avg?.length ? Math.round(avg.reduce((a, b) => a + b, 0) / avg.length) : null;
        setFlash({ id: ev.id, tag: "STARTED", text: [map, lobby ? `${lobby.toLocaleString("en-US")} avg` : null].filter(Boolean).join(" · ") });
      }
    }
  }, [gameEvents]);

  useEffect(() => {
    const tags = new Set(onlineUsers.map((u) => u.battleTag).filter(Boolean));
    const prev = rosterRef.current;
    rosterRef.current = tags;
    if (!prev || prev.size === 0) return;
    const joined = onlineUsers.find((u) => u.battleTag && !prev.has(u.battleTag));
    if (!joined) return;
    const country = avatars?.get(joined.battleTag)?.country;
    const mmr = stats?.get(joined.battleTag)?.mmr;
    setFlash({
      id: `join-${joined.battleTag}-${Date.now()}`,
      tag: "JOINED",
      text: [joined.name || joined.battleTag.split("#")[0], country, mmr != null ? `${Math.round(mmr)} MMR` : null].filter(Boolean).join(" · "),
    });
    // the roster diff is the trigger; avatars/stats are read at that moment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineUsers]);

  return flash;
}

/* ── Page ───────────────────────────────────────────── */

const Home = () => {
  const { messages, onlineUsers, status } = useChatStream();
  const { data: ongoingData, matches: ongoingMatches } = useOngoingMatches();
  const liveMatches = useMemo(() => {
    if (ongoingData?.matches) return sortByMmr(ongoingData.matches);
    const cached = getOngoingMatchesCached();
    return cached?.matches ? sortByMmr(cached.matches) : null;
  }, [ongoingData]);
  const liveCount = liveMatches ? liveMatches.length : null;

  // Roster metadata: countries for the map, MMR for the strip, join flashes
  const rosterTags = useMemo(() => new Set(onlineUsers.map((u) => u.battleTag).filter(Boolean)), [onlineUsers]);
  const { avatars, stats } = usePlayerMeta(rosterTags);
  const inGameTags = useMemo(
    () => new Set((liveMatches || []).flatMap((m) => (m.teams || []).flatMap((t) => (t.players || []).map((p) => p.battleTag)))),
    [liveMatches]
  );
  const { gameEvents } = useGameEvents({ messages, onlineUsers, ongoingMatches });
  const flash = useLiveFlash(gameEvents, onlineUsers, avatars, stats);
  const liveStreamers = useTwitchLive(onlineUsers);
  const finished = useLatestFinished(liveCount === 0);
  const todayEvents = useTodayEvents();
  const today = useMemo(() => (todayEvents ? todayStats(todayEvents, onlineUsers.length) : null), [todayEvents, onlineUsers.length]);

  // Digest (for the quote), weekly issues and blog posts, once
  const [digest, setDigest] = useState(null);
  const [weeklies, setWeeklies] = useState([]);
  const [dbBlogPosts, setDbBlogPosts] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const json = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    (async () => {
      const [todayDigest, past, weekly, blog] = await Promise.all([
        json(`${RELAY_URL}/api/admin/stats/today`),
        json(`${RELAY_URL}/api/admin/digests?limit=3`),
        json(`${RELAY_URL}/api/admin/weekly-digests`),
        json(`${RELAY_URL}/api/blog`),
      ]);
      if (cancelled) return;
      const candidates = [todayDigest, ...(Array.isArray(past) ? past : [])].filter((d) => d?.digest);
      setDigest(candidates.find((d) => quoteOfTheDay(d)) || candidates[0] || null);
      if (Array.isArray(weekly)) setWeeklies(weekly.filter((w) => w.published == null || String(w.published) === "1"));
      if (Array.isArray(blog)) setDbBlogPosts(blog);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const quote = useMemo(() => quoteOfTheDay(digest), [digest]);
  // The speaker's avatar and flag: their profile by battleTag (the digest's
  // MENTIONS map, else a roster match on the name)
  const quoteTag = quote?.battleTag || onlineUsers.find((u) => u.name === quote?.speaker)?.battleTag || null;
  const [quoteProfile, setQuoteProfile] = useState(null);
  // The chat message behind the quote: /chat?m=<id>&at=<received_at> opens
  // the archive on it
  const [quoteHref, setQuoteHref] = useState(null);
  useEffect(() => {
    setQuoteHref(null);
    if (!quote) return undefined;
    let cancelled = false;
    findQuoteMessage(quote).then((hit) => {
      if (cancelled || !hit) return;
      setQuoteHref(`/chat?m=${encodeURIComponent(hit.id)}&at=${encodeURIComponent(hit.receivedAt)}`);
    });
    return () => {
      cancelled = true;
    };
  }, [quote]);
  useEffect(() => {
    if (!quoteTag) {
      setQuoteProfile(null);
      return undefined;
    }
    let cancelled = false;
    getPlayerProfile(quoteTag).then((p) => {
      if (!cancelled) setQuoteProfile(p || null);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [quoteTag]);

  const reads = useMemo(() => {
    const items = [];
    const latestWeekly = weeklies[0];
    if (latestWeekly) {
      const issueNo = weeklies.length;
      items.push({
        key: `weekly-${latestWeekly.week_start}`,
        kicker: `THIS WEEK'S ISSUE · No. ${issueNo}`,
        title: extractHeadline(latestWeekly.digest) || "This Week in 4v4",
        sub: `${formatWeekRange(latestWeekly.week_start, latestWeekly.week_end)} · Read →`,
        bg: `${RELAY_URL}/api/admin/weekly-digest/${latestWeekly.week_start}/cover.jpg`,
        fallbackBg: COVER_BACKGROUNDS[hashDate(latestWeekly.week_start) % COVER_BACKGROUNDS.length],
        href: `/news?week=${latestWeekly.week_start}`,
      });
    }
    const staticPublished = blogPosts.filter((p) => !p.draft);
    const legacySlugs = new Set(staticPublished.map((p) => p.slug));
    const merged = [...staticPublished, ...dbBlogPosts.filter((p) => String(p.published) === "1" && !legacySlugs.has(p.slug))];
    merged.sort((a, b) => new Date(b.date) - new Date(a.date));
    const post = merged[0];
    if (post) {
      items.push({
        key: `blog-${post.slug}`,
        kicker: "FROM THE BLOG",
        title: post.title,
        sub: `${post.date} · Read →`,
        bg: post.coverImage || pickBg(post.slug),
        href: `/blog/${post.slug}`,
      });
    }
    return items;
  }, [weeklies, dbBlogPosts]);

  // Background art follows the live slide, crossfading between two layers
  const [bg, setBg] = useState(() => ({ a: HERO_BACKGROUNDS[0], b: null, showB: false }));
  const onSlideChange = useCallback((idx, match) => {
    const next = pickBg(match?.id || String(idx));
    setBg((prev) => {
      const current = prev.showB ? prev.b : prev.a;
      if (current === next) return prev;
      return prev.showB ? { a: next, b: prev.b, showB: false } : { a: prev.a, b: next, showB: true };
    });
  }, []);

  return (
    <div className="hm-page" data-home>
      <div className="hm-bg" aria-hidden="true">
        <div className={`hm-bg-layer ${bg.showB ? "" : "is-on"}`} style={{ backgroundImage: `url(${bg.a})` }} />
        {bg.b && <div className={`hm-bg-layer ${bg.showB ? "is-on" : ""}`} style={{ backgroundImage: `url(${bg.b})` }} />}
        <div className="hm-bg-shade" />
      </div>
      <div className="hm-grid">
        <div className="hm-main">
          <Scoreboard
            online={status === "connecting" && onlineUsers.length === 0 ? null : onlineUsers.length}
            live={liveCount}
            quote={quote}
            quoteHref={quoteHref}
            profile={quoteProfile}
          />
          <LiveGamePanel
            matches={liveMatches}
            rotateSeconds={ROTATE_SECONDS}
            flash={flash}
            finished={finished}
            onSlideChange={onSlideChange}
          />
        </div>
        <aside className="hm-side">
          <WhosHere onlineUsers={onlineUsers} avatars={avatars} stats={stats} inGameTags={inGameTags} today={today} />
          <StreamerCarousel liveStreamers={liveStreamers} onlineUsers={onlineUsers} rotateSeconds={ROTATE_SECONDS} />
          <ReadsCarousel items={reads} rotateSeconds={ROTATE_SECONDS} />
        </aside>
      </div>
    </div>
  );
};

export default Home;
