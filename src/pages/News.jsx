import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import WeeklyMagazine from "../components/news/WeeklyMagazine";
import DailyView from "../components/news/DailyView";
import PeonLoader from "../components/PeonLoader";
import useAdmin from "../lib/useAdmin";
import {
  COVER_BACKGROUNDS,
  hashDate,
  formatWeekRange,
  formatDigestLabel,
  formatDigestDay,
  parseDigestSections,
  splitQuotes,
} from "../lib/digestUtils";
import "../styles/pages/News.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/** Extract a short teaser from the DRAMA section (or first narrative section) */
const extractTeaser = (digestText) => {
  const sections = parseDigestSections(digestText);
  const drama = sections.find((s) => s.key === "DRAMA");
  const source = drama || sections.find((s) => !["TOPICS", "MENTIONS"].includes(s.key));
  if (!source) return "";
  const { summary } = splitQuotes(source.content);
  const cleaned = summary.split(/;\s*/)[0].replace(/\n+/g, " ").trim();
  return cleaned.length > 160 ? cleaned.slice(0, 157) + "..." : cleaned;
};

const News = () => {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const weekParam = params.get("week");
  const dayParam = params.get("day");
  const { adminKey, isAdmin } = useAdmin();

  // If detail param present, render the detail view directly
  if (weekParam) return <div className="news-page"><WeeklyMagazine weekParam={weekParam} isAdmin={isAdmin} apiKey={adminKey} /></div>;
  if (dayParam) return <div className="news-page"><DailyView dayParam={dayParam} /></div>;

  return <NewsIndex />;
};

const DAILY_INITIAL = 7;

const NewsIndex = () => {
  const [weeklyDigests, setWeeklyDigests] = useState([]);
  const [dailyDigests, setDailyDigests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllDaily, setShowAllDaily] = useState(false);

  useEffect(() => {
    let done = 0;
    const check = () => { if (++done >= 2) setLoading(false); };

    fetch(`${RELAY_URL}/api/admin/weekly-digests`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setWeeklyDigests)
      .catch(() => {})
      .finally(check);

    fetch(`${RELAY_URL}/api/admin/digests`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setDailyDigests)
      .catch(() => {})
      .finally(check);
  }, []);

  if (loading) {
    return (
      <div className="news-page nw-index">
        <div className="page-loader fade-in"><PeonLoader /></div>
      </div>
    );
  }

  const visibleDaily = showAllDaily ? dailyDigests : dailyDigests.slice(0, DAILY_INITIAL);
  const hasMoreDaily = dailyDigests.length > DAILY_INITIAL;

  return (
    <div className="news-page nw-index">
      {/* Hero */}
      <header className="nw-hero reveal" style={{ "--delay": "0.05s" }}>
        <span className="nw-eyebrow">4v4.gg News</span>
        <h1 className="nw-title">The Digest</h1>
        <p className="nw-lead">
          Weekly roundups and daily recaps of 4v4 competitive Warcraft III — drama, stats, and highlights.
        </p>
      </header>

      {/* Weekly Issues */}
      {weeklyDigests.length > 0 && (
        <section className="nw-section reveal" style={{ "--delay": "0.10s" }}>
          <h2 className="nw-section-title">Weekly Issues</h2>
          <div className="nw-card-list">
            {weeklyDigests.map((w, i) => (
              <WeeklyCard key={w.week_start} weekly={w} delay={0.12 + i * 0.04} />
            ))}
          </div>
        </section>
      )}

      {/* Daily Digests */}
      {dailyDigests.length > 0 && (
        <section className="nw-section reveal" style={{ "--delay": `${0.15 + weeklyDigests.length * 0.04}s` }}>
          <h2 className="nw-section-title">Daily Digests</h2>
          <div className="nw-daily-list">
            {visibleDaily.map((d, i) => (
              <DailyCard key={d.date} digest={d} delay={0.18 + weeklyDigests.length * 0.04 + i * 0.03} />
            ))}
          </div>
          {hasMoreDaily && !showAllDaily && (
            <button className="nw-show-more" onClick={() => setShowAllDaily(true)}>
              Show {dailyDigests.length - DAILY_INITIAL} older digests
            </button>
          )}
        </section>
      )}

      {weeklyDigests.length === 0 && dailyDigests.length === 0 && (
        <p className="nw-empty">No digests published yet. Check back soon.</p>
      )}
    </div>
  );
};

const WeeklyCard = ({ weekly, delay }) => {
  const fallbackBg = COVER_BACKGROUNDS[hashDate(weekly.week_start) % COVER_BACKGROUNDS.length];
  const coverUrl = `${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/cover.jpg`;
  const [coverBg, setCoverBg] = useState(fallbackBg);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setCoverBg(coverUrl);
    img.onerror = () => setCoverBg(fallbackBg);
    img.src = coverUrl;
  }, [coverUrl, fallbackBg]);

  const teaser = weekly.digest ? extractTeaser(weekly.digest) : "";
  const stats = weekly.stats;

  return (
    <Link to={`/news?week=${weekly.week_start}`} className="nw-card reveal" style={{ "--delay": `${delay}s` }}>
      <div className="nw-card-bg" style={{ backgroundImage: `url(${coverBg})` }} />
      <div className="nw-card-overlay" />
      <div className="nw-card-content">
        <span className="nw-card-eyebrow">The 4v4 Weekly</span>
        <h3 className="nw-card-title">{formatWeekRange(weekly.week_start, weekly.week_end)}</h3>
        {teaser && <p className="nw-card-teaser">{teaser}</p>}
        {stats && (
          <div className="nw-card-stats">
            {stats.totalGames != null && (
              <div className="nw-stat">
                <span className="nw-stat-value">{stats.totalGames.toLocaleString()}</span>
                <span className="nw-stat-label">Games</span>
              </div>
            )}
            {stats.uniquePlayers != null && (
              <div className="nw-stat">
                <span className="nw-stat-value">{stats.uniquePlayers}</span>
                <span className="nw-stat-label">Players</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

const DailyCard = ({ digest, delay }) => {
  const teaser = digest.digest ? extractTeaser(digest.digest) : "";
  const label = formatDigestLabel(digest.date);
  const dayName = formatDigestDay(digest.date);

  return (
    <Link to={`/news?day=${digest.date}`} className="nw-daily-card reveal" style={{ "--delay": `${delay}s` }}>
      <div className="nw-daily-date">
        <span className="nw-daily-date-day">{dayName}</span>
        <span className="nw-daily-date-label">{label}</span>
      </div>
      <div className="nw-daily-content">
        {teaser && <p className="nw-daily-teaser">{teaser}</p>}
      </div>
    </Link>
  );
};

export default News;
