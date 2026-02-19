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

/** Extract just the headline (text before the | pipe) from the DRAMA section */
const extractHeadline = (digestText) => {
  const sections = parseDigestSections(digestText);
  const drama = sections.find((s) => s.key === "DRAMA");
  if (!drama) return "";
  const { summary } = splitQuotes(drama.content);
  const firstItem = summary.split(/;\s*/)[0]?.trim() || "";
  const pipeSplit = firstItem.split(/\s*\|\s*/);
  return pipeSplit.length > 1 ? pipeSplit[0].trim() : firstItem;
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

const INITIAL_COUNT = 10;

const NewsIndex = () => {
  const [weeklyDigests, setWeeklyDigests] = useState([]);
  const [dailyDigests, setDailyDigests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

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

  // Latest weekly goes up top as hero; rest merge into timeline
  const latestWeekly = weeklyDigests.length > 0 ? weeklyDigests[0] : null;
  const olderWeeklies = weeklyDigests.slice(1);

  const timeline = useMemo(() => {
    const items = [];
    for (const w of olderWeeklies) {
      items.push({ type: "weekly", sortDate: w.week_end, data: w });
    }
    for (const d of dailyDigests) {
      items.push({ type: "daily", sortDate: d.date, data: d });
    }
    items.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
    return items;
  }, [olderWeeklies, dailyDigests]);

  if (loading) {
    return (
      <div className="news-page nw-index">
        <div className="page-loader fade-in"><PeonLoader /></div>
      </div>
    );
  }

  const visible = showAll ? timeline : timeline.slice(0, INITIAL_COUNT);
  const hasMore = timeline.length > INITIAL_COUNT;

  return (
    <div className="news-page nw-index">
      <header className="nw-hero reveal" style={{ "--delay": "0.05s" }}>
        <span className="nw-eyebrow">4v4.gg News</span>
        <h1 className="nw-title">The Digest</h1>
        <p className="nw-lead">
          Weekly roundups and daily recaps of 4v4 competitive Warcraft III — drama, stats, and highlights.
        </p>
      </header>

      {latestWeekly && (
        <section className="nw-section reveal" style={{ "--delay": "0.10s" }}>
          <h2 className="nw-section-title">Weekly Issues</h2>
          <WeeklyHero weekly={latestWeekly} />
        </section>
      )}

      {timeline.length > 0 && (
        <section className="nw-section reveal" style={{ "--delay": "0.15s" }}>
          <h2 className="nw-section-title">Daily Digests</h2>
          <div className="nw-timeline">
          {visible.map((item, i) =>
            item.type === "weekly" ? (
              <TimelineWeekly key={`w-${item.data.week_start}`} weekly={item.data} delay={0.08 + i * 0.03} />
            ) : (
              <TimelineDaily key={`d-${item.data.date}`} digest={item.data} delay={0.08 + i * 0.03} />
            )
          )}
          {hasMore && !showAll && (
            <button className="nw-show-more" onClick={() => setShowAll(true)}>
              Show {timeline.length - INITIAL_COUNT} older
            </button>
          )}
          </div>
        </section>
      )}

      {!latestWeekly && timeline.length === 0 && (
        <p className="nw-empty">No digests published yet. Check back soon.</p>
      )}
    </div>
  );
};

const WeeklyHero = ({ weekly }) => {
  const fallbackBg = COVER_BACKGROUNDS[hashDate(weekly.week_start) % COVER_BACKGROUNDS.length];
  const coverUrl = `${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/cover.jpg`;
  const [coverBg, setCoverBg] = useState(fallbackBg);
  const headline = weekly.digest ? extractHeadline(weekly.digest) : "";

  useEffect(() => {
    const img = new Image();
    img.onload = () => setCoverBg(coverUrl);
    img.onerror = () => setCoverBg(fallbackBg);
    img.src = coverUrl;
  }, [coverUrl, fallbackBg]);

  return (
    <Link to={`/news?week=${weekly.week_start}`} className="nw-hero-card reveal" style={{ "--delay": "0.05s" }}>
      <div className="nw-hero-card-bg" style={{ backgroundImage: `url(${coverBg})` }} />
      <div className="nw-hero-card-overlay" />
      <div className="nw-hero-card-content">
        <span className="nw-hero-card-eyebrow">The 4v4 Weekly</span>
        <h3 className="nw-hero-card-date">{formatWeekRange(weekly.week_start, weekly.week_end)}</h3>
        {headline && <h2 className="nw-hero-card-title">{headline}</h2>}
      </div>
    </Link>
  );
};

const TimelineWeekly = ({ weekly, delay }) => {
  const teaser = weekly.digest ? extractTeaser(weekly.digest) : "";

  return (
    <Link to={`/news?week=${weekly.week_start}`} className="nw-timeline-item nw-timeline-item--weekly reveal" style={{ "--delay": `${delay}s` }}>
      <div className="nw-timeline-date">
        <span className="nw-timeline-badge">Weekly</span>
        <span className="nw-timeline-date-label">{formatWeekRange(weekly.week_start, weekly.week_end)}</span>
      </div>
      <div className="nw-timeline-content">
        {teaser && <p className="nw-timeline-teaser">{teaser}</p>}
      </div>
    </Link>
  );
};

const TimelineDaily = ({ digest, delay }) => {
  const teaser = digest.digest ? extractTeaser(digest.digest) : "";
  const label = formatDigestLabel(digest.date);
  const dayName = formatDigestDay(digest.date);

  return (
    <Link to={`/news?day=${digest.date}`} className="nw-timeline-item reveal" style={{ "--delay": `${delay}s` }}>
      <div className="nw-timeline-date">
        <span className="nw-timeline-date-day">{dayName}</span>
        <span className="nw-timeline-date-label">{label}</span>
      </div>
      <div className="nw-timeline-content">
        {teaser && <p className="nw-timeline-teaser">{teaser}</p>}
      </div>
    </Link>
  );
};

export default News;
