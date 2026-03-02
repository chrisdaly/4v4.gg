import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import useChatStream from "../lib/useChatStream";
import { getOngoingMatches, getOngoingMatchesCached, getFinishedMatches, getPlayerProfile } from "../lib/api";
import { getMapImageUrl, formatElapsedTime } from "../lib/formatters";
import { RaceIcon, CountryFlag } from "../components/ui";
import { MmrComparison } from "../components/MmrComparison";
import GameCard from "../components/game/GameCard";
import PeonLoader from "../components/PeonLoader";
import { blogPosts } from "../lib/blogPosts";
import {
  parseDigestSections,
  splitQuotes,
  parseStatLine,
  DIGEST_SECTIONS,
  COVER_BACKGROUNDS,
  hashDate,
  formatWeekRange,
} from "../lib/digestUtils";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

// High-res backgrounds for hero cards (not the tiny minimap images)
const HERO_BACKGROUNDS = [
  "/backgrounds/themes/arena-reforged.jpg",
  "/backgrounds/themes/frozen-throne-chronicle.jpg",
  "/backgrounds/themes/blackrock-firelands.jpg",
  "/backgrounds/themes/ashenvale.jpg",
  "/backgrounds/themes/lordaeron.jpg",
  "/backgrounds/themes/dalaran.jpg",
  "/backgrounds/themes/outland.jpg",
];

// Pick a consistent background based on a string hash
const pickHeroBg = (str) => {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return HERO_BACKGROUNDS[Math.abs(h) % HERO_BACKGROUNDS.length];
};

const sortByMMR = (matches) => {
  if (!matches) return [];
  return matches.slice().sort((a, b) => {
    const avgA = getAvgMmr(a);
    const avgB = getAvgMmr(b);
    return avgB - avgA;
  });
};

const getAvgMmr = (match) => {
  const teams = match.teams || [];
  const mmrs = teams.flatMap((t) =>
    (t.players || []).map((p) => p.oldMmr || p.currentMmr || 0)
  );
  const valid = mmrs.filter((m) => m > 0);
  return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
};

/* ── Hero Spotlight ─────────────────────────────────── */

const getTeamMmr = (team) => {
  const mmrs = (team?.players || []).map((p) => p.oldMmr || p.currentMmr || 0).filter((m) => m > 0);
  return mmrs.length > 0 ? Math.round(mmrs.reduce((a, b) => a + b, 0) / mmrs.length) : 0;
};

const HeroLive = ({ match }) => {
  const mapName = match.mapName || "";
  const cleanMap = mapName.replace(/^\(\d\)\s*/, "");
  const bgUrl = pickHeroBg(match.id || mapName);
  const mapThumb = getMapImageUrl(mapName);
  const teams = match.teams || [];
  const team1Mmr = getTeamMmr(teams[0]);
  const team2Mmr = getTeamMmr(teams[1]);

  const teamOneMmrs = (teams[0]?.players || []).map((p) => p.oldMmr || p.currentMmr || 0);
  const teamTwoMmrs = (teams[1]?.players || []).map((p) => p.oldMmr || p.currentMmr || 0);
  const mmrData = { teamOneMmrs, teamTwoMmrs, teamOneAT: [], teamTwoAT: [] };

  return (
    <Link to="/live" className="sc-hero sc-hero-live sc-panel">
      <div className="sc-hero-bg" style={{ backgroundImage: `url(${bgUrl})` }} />
      <div className="sc-hero-content">
        <div className="sc-hero-bottomleft">
          <span className="sc-hero-live-dot" />
          <span className="sc-hero-live-label">LIVE</span>
          {match.startTime && <span className="sc-hero-elapsed">{formatElapsedTime(match.startTime)}</span>}
        </div>
        <div className="sc-hero-topright">
          {mapThumb && <img src={mapThumb} alt="" className="sc-hero-map-thumb" />}
          <span>{cleanMap}</span>
          <span className="sc-hero-arrow">→</span>
        </div>
        <div className="sc-hero-teams">
          {teams[0] && (
            <div className="sc-hero-team-col">
              {team1Mmr > 0 && <span className="sc-hero-team-mmr">{team1Mmr} MMR</span>}
              <div className="sc-hero-team">
                {teams[0].players?.map((p, i) => (
                  <span key={i} className="sc-hero-player sc-hero-player-left">
                    {p.name}
                    <RaceIcon race={p.race} rndRace={p.rndRace} className="gc-race" />
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="sc-hero-chart">
            <MmrComparison data={mmrData} compact fitToData />
          </div>
          {teams[1] && (
            <div className="sc-hero-team-col">
              {team2Mmr > 0 && <span className="sc-hero-team-mmr">{team2Mmr} MMR</span>}
              <div className="sc-hero-team">
                {teams[1].players?.map((p, i) => (
                  <span key={i} className="sc-hero-player">
                    <RaceIcon race={p.race} rndRace={p.rndRace} className="gc-race" />
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

const HeroMagazine = ({ weekly }) => {
  const coverUrl = `${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/cover.jpg`;
  const fallbackBg = COVER_BACKGROUNDS[hashDate(weekly.week_start) % COVER_BACKGROUNDS.length];

  return (
    <Link to={`/news?week=${weekly.week_start}`} className="sc-hero sc-panel">
      <HeroBg url={coverUrl} fallback={fallbackBg} />
      <div className="sc-hero-content">
        <div className="sc-hero-badge">Weekly Magazine</div>
        <h2 className="sc-hero-title">{weekly.headline || "This Week in 4v4"}</h2>
        <div className="sc-hero-subtitle">{formatWeekRange(weekly.week_start, weekly.week_end)}</div>
      </div>
    </Link>
  );
};

const HeroBg = ({ url, fallback }) => {
  const [src, setSrc] = useState(url);
  return (
    <div
      className="sc-hero-bg"
      style={{ backgroundImage: `url(${src})` }}
      onError={() => { if (fallback && src !== fallback) setSrc(fallback); }}
    >
      {/* Preload cover, fallback on error */}
      <img
        src={url}
        alt=""
        style={{ display: "none" }}
        onError={() => { if (fallback) setSrc(fallback); }}
      />
    </div>
  );
};

const HeroFinished = ({ match }) => {
  const avgMmr = getAvgMmr(match);
  const mapName = match.mapName || match.match?.mapName || "";
  const cleanMap = mapName.replace(/^\(\d\)\s*/, "");
  const bgUrl = pickHeroBg(match.match?.id || match.id || mapName);
  const matchId = match.match?.id || match.id;

  return (
    <Link to={matchId ? `/match/${matchId}` : "/finished"} className="sc-hero sc-panel">
      <div className="sc-hero-bg" style={{ backgroundImage: `url(${bgUrl})` }} />
      <div className="sc-hero-content">
        <div className="sc-hero-badge">Latest Match</div>
        <div className="sc-hero-meta">
          {avgMmr > 0 && <><span className="sc-hero-mmr">{avgMmr} MMR</span><span className="sc-hero-sep">·</span></>}
          <span>{cleanMap}</span>
        </div>
      </div>
    </Link>
  );
};

/* ── Digest Section ─────────────────────────────────── */

const DigestSection = ({ digest }) => {
  const [profiles, setProfiles] = useState({});

  const { headlines, stats, dateStr } = useMemo(() => {
    if (!digest?.digest) return { headlines: [], stats: [], dateStr: null };

    const sections = parseDigestSections(digest.digest);
    const headlineItems = [];
    const statItems = [];

    // Collect DRAMA + HIGHLIGHTS headlines
    for (const s of sections) {
      if (s.key === "DRAMA" || s.key === "HIGHLIGHTS") {
        const { summary } = splitQuotes(s.content);
        const items = summary.split(/;\s*/).filter((t) => t.trim().length > 10);
        for (const item of items.slice(0, 2)) {
          headlineItems.push({ text: item.trim(), cls: s.key.toLowerCase() });
        }
      }
    }

    // Collect stat callouts
    const statSections = DIGEST_SECTIONS.filter((s) => s.stat);
    for (const def of statSections) {
      const section = sections.find((s) => s.key === def.key);
      if (!section) continue;
      const parsed = parseStatLine(section.content);
      if (parsed) {
        statItems.push({ ...parsed, key: def.key, label: def.label, cls: def.cls });
      }
    }

    return { headlines: headlineItems.slice(0, 3), stats: statItems.slice(0, 4), dateStr: digest.date };
  }, [digest]);

  // Fetch profiles (avatar + country) for stat card players
  useEffect(() => {
    if (stats.length === 0) return;
    const tags = stats.map((s) => s.battleTag).filter(Boolean);
    if (tags.length === 0) return;
    Promise.all(
      tags.map(async (tag) => {
        const profile = await getPlayerProfile(tag);
        return [tag, profile];
      })
    ).then((results) => {
      const map = {};
      for (const [tag, p] of results) { if (p) map[tag] = p; }
      setProfiles(map);
    });
  }, [stats]);

  if (headlines.length === 0 && stats.length === 0) return null;

  return (
    <section>
      <div className="sc-section-header">
        <span className="sc-section-title">Today's Digest</span>
        {dateStr && (
          <Link to={`/news?day=${dateStr}`} className="sc-section-link">
            Full Digest →
          </Link>
        )}
      </div>
      <div className="sc-digest-grid">
        {headlines.length > 0 && (
          <div className="sc-digest-headlines">
            {headlines.map((h, i) => (
              <div key={i} className={`sc-headline sc-headline-${h.cls}`}>
                {h.text}
              </div>
            ))}
          </div>
        )}
        {stats.length > 0 && (
          <div className="sc-digest-stats">
            {stats.map((s) => (
              <Link
                key={s.key}
                to={`/player/${encodeURIComponent(s.battleTag)}`}
                className={`sc-stat-card sc-panel sc-stat-${s.cls}`}
              >
                {profiles[s.battleTag]?.profilePicUrl && (
                  <img src={profiles[s.battleTag].profilePicUrl} alt="" className="sc-stat-avatar" />
                )}
                <span className="sc-stat-label">{s.label}</span>
                <span className="sc-stat-name">
                  {profiles[s.battleTag]?.country && (
                    <CountryFlag name={profiles[s.battleTag].country} style={{ marginRight: 6 }} />
                  )}
                  {s.name}
                </span>
                <span className="sc-stat-detail">{s.headline}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

/* ── Featured Content ───────────────────────────────── */

const FeaturedSection = ({ clips, weekly, blogPost }) => {
  const topClip = clips?.[0];
  if (!topClip && !weekly && !blogPost) return null;

  const coverUrl = weekly
    ? `${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/cover.jpg`
    : null;
  const fallbackBg = weekly
    ? COVER_BACKGROUNDS[hashDate(weekly.week_start) % COVER_BACKGROUNDS.length]
    : null;

  return (
    <section>
      <div className="sc-section-header">
        <span className="sc-section-title">Featured</span>
      </div>
      <div className="sc-featured-grid">
        {topClip && (
          <Link to="/clips" className="sc-featured-card sc-panel">
            {topClip.thumbnail_url && (
              <img src={topClip.thumbnail_url} alt={topClip.title} className="sc-clip-thumb" />
            )}
            <div className="sc-featured-content">
              <div className="sc-featured-label">Top Clip</div>
              <div className="sc-featured-title">{topClip.title}</div>
            </div>
          </Link>
        )}
        {weekly && (
          <Link to={`/news?week=${weekly.week_start}`} className="sc-featured-card sc-panel">
            <FeaturedBg url={coverUrl} fallback={fallbackBg} />
            <div className="sc-featured-content">
              <div className="sc-featured-label">Weekly Magazine</div>
              <div className="sc-featured-title">
                {weekly.headline || formatWeekRange(weekly.week_start, weekly.week_end)}
              </div>
            </div>
          </Link>
        )}
        {blogPost && (
          <Link to={`/blog/${blogPost.slug}`} className="sc-featured-card sc-panel">
            {blogPost.coverImage ? (
              <div className="sc-featured-bg" style={{ backgroundImage: `url(${blogPost.coverImage})` }} />
            ) : blogPost.preview ? (
              <div className="sc-featured-preview"><blogPost.preview /></div>
            ) : (
              <div className="sc-featured-bg" style={{ backgroundImage: `url(${pickHeroBg(blogPost.slug)})` }} />
            )}
            <div className="sc-featured-content">
              <div className="sc-featured-label">Blog</div>
              <div className="sc-featured-title">{blogPost.title}</div>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
};

const FeaturedBg = ({ url, fallback }) => {
  const [src, setSrc] = useState(url);
  return (
    <>
      <div className="sc-featured-bg" style={{ backgroundImage: `url(${src})` }} />
      <img
        src={url}
        alt=""
        style={{ display: "none" }}
        onError={() => { if (fallback && src !== fallback) setSrc(fallback); }}
      />
    </>
  );
};

/* ── Home Page ──────────────────────────────────────── */

const Home = () => {
  const { onlineUsers } = useChatStream();
  const [liveMatches, setLiveMatches] = useState(() => {
    const cached = getOngoingMatchesCached();
    return cached?.matches ? sortByMMR(cached.matches) : null;
  });
  const [finishedMatches, setFinishedMatches] = useState(null);
  const [digest, setDigest] = useState(null);
  const [clips, setClips] = useState(null);
  const [weeklyDigests, setWeeklyDigests] = useState(null);
  const [dbBlogPosts, setDbBlogPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all independent data in parallel on mount
  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.allSettled([
        getOngoingMatches(),
        getFinishedMatches(10, 0),
        fetch(`${RELAY_URL}/api/admin/stats/today`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${RELAY_URL}/api/clips?limit=3`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${RELAY_URL}/api/admin/weekly-digests`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${RELAY_URL}/api/blog`).then((r) => (r.ok ? r.json() : [])),
      ]);

      if (results[0].status === "fulfilled" && results[0].value?.matches) {
        setLiveMatches(sortByMMR(results[0].value.matches));
      }
      if (results[1].status === "fulfilled" && results[1].value?.matches) {
        setFinishedMatches(results[1].value.matches);
      }

      // Today's digest — fallback to most recent from digests list
      let digestData = null;
      if (results[2].status === "fulfilled" && results[2].value?.digest) {
        digestData = results[2].value;
      }
      if (!digestData) {
        // Fallback: fetch yesterday/recent
        try {
          const res = await fetch(`${RELAY_URL}/api/admin/digests?limit=1`);
          if (res.ok) {
            const past = await res.json();
            if (past?.length > 0 && past[0].digest) digestData = past[0];
          }
        } catch {}
      }
      setDigest(digestData);

      if (results[3].status === "fulfilled" && results[3].value?.clips) {
        setClips(results[3].value.clips);
      }
      if (results[4].status === "fulfilled" && results[4].value?.length > 0) {
        setWeeklyDigests(results[4].value);
      }
      if (results[5].status === "fulfilled" && Array.isArray(results[5].value)) {
        setDbBlogPosts(results[5].value);
      }

      setLoading(false);
    };

    fetchAll();
  }, []);

  // Poll live games every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await getOngoingMatches();
        if (data?.matches) setLiveMatches(sortByMMR(data.matches));
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const liveCount = liveMatches?.length || 0;
  const latestWeekly = weeklyDigests?.[0] || null;

  // Latest published blog post (merge static + DB, pick first non-draft)
  const latestBlog = useMemo(() => {
    const staticPublished = blogPosts.filter((p) => !p.draft);
    const dbPublished = dbBlogPosts.filter((p) => p.published);
    const legacySlugs = new Set(staticPublished.map((p) => p.slug));
    const merged = [...staticPublished, ...dbPublished.filter((p) => !legacySlugs.has(p.slug))];
    merged.sort((a, b) => new Date(b.date) - new Date(a.date));
    return merged[0] || null;
  }, [dbBlogPosts]);

  // Hero: best live game > latest magazine > latest finished
  const heroMatch = liveMatches?.length > 0 ? liveMatches[0] : null;

  if (loading && !liveMatches) {
    return (
      <div className="sc-home">
        <PeonLoader />
      </div>
    );
  }

  return (
    <div className="sc-home">
      {/* ══ RIGHT NOW ══ */}
      {heroMatch ? (
        <HeroLive match={heroMatch} />
      ) : (
        latestWeekly ? (
          <HeroMagazine weekly={latestWeekly} />
        ) : finishedMatches?.[0] ? (
          <HeroFinished match={finishedMatches[0]} />
        ) : (
          <div className="sc-empty">
            No games live right now. <Link to="/finished">View recent matches →</Link>
          </div>
        )
      )}

      {/* Pulse — always visible, right after hero */}
      <div className="sc-pulse sc-panel">
        <span className="sc-pulse-stat">
          <span className="sc-pulse-value">{onlineUsers.length}</span> players online
        </span>
        {liveCount > 0 && (
          <span className="sc-pulse-stat">
            <span className="sc-pulse-value">{liveCount}</span> games live
          </span>
        )}
        {liveCount > 1 && <Link to="/live">View All Live →</Link>}
      </div>

      {/* ══ CATCH UP ══ */}
      {digest && <DigestSection digest={digest} />}

      <FeaturedSection clips={clips} weekly={latestWeekly} blogPost={latestBlog} />
    </div>
  );
};

export default Home;
