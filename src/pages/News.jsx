import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import WeeklyMagazine from "../components/news/WeeklyMagazine";
import DailyView from "../components/news/DailyView";
import PeonLoader from "../components/PeonLoader";
import useAdmin from "../lib/useAdmin";
import { PageLayout } from "../components/PageLayout";
import { PageHero, Button } from "../components/ui";
import IssueCover from "../components/news/IssueCover";
import { issueNumber } from "../lib/news/issueRules";
import { formatDigestLabel, formatDigestDay, extractTeaser } from "../lib/digestUtils";
import "../styles/pages/News.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/** "N ISSUES SINCE MAR 2026" for the index header. */
export function issueCountLabel(weeklies) {
  const n = weeklies.length;
  if (n === 0) return null;
  const oldest = [...weeklies].sort((a, b) => a.week_start.localeCompare(b.week_start))[0];
  const since = new Date(`${oldest.week_start}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
  return { count: n, label: `${n === 1 ? "ISSUE" : "ISSUES"} SINCE ${since}` };
}


const News = () => {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const weekParam = params.get("week");
  const dayParam = params.get("day");
  const { adminKey, isAdmin } = useAdmin();

  // If detail param present, render the detail view directly
  if (weekParam) return <PageLayout bare><WeeklyMagazine weekParam={weekParam} isAdmin={isAdmin} apiKey={adminKey} /></PageLayout>;
  if (dayParam) return <PageLayout bare><DailyView dayParam={dayParam} /></PageLayout>;

  return <NewsIndex isAdmin={isAdmin} adminKey={adminKey} />;
};

const INITIAL_COUNT = 10;

const NewsIndex = ({ isAdmin, adminKey: rawAdminKey }) => {
  const adminKey = isAdmin ? rawAdminKey : "";
  const [weeklyDigests, setWeeklyDigests] = useState([]);
  const [dailyDigests, setDailyDigests] = useState([]);
  const [todayDigest, setTodayDigest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let done = 0;
    const check = () => { if (++done >= 3) setLoading(false); };

    const headers = adminKey ? { "X-API-Key": adminKey } : {};
    fetch(`${RELAY_URL}/api/admin/weekly-digests`, { cache: "no-store", headers })
      .then((r) => (r.ok ? r.json() : []))
      .then(setWeeklyDigests)
      .catch(() => {})
      .finally(check);

    fetch(`${RELAY_URL}/api/admin/digests`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setDailyDigests)
      .catch(() => {})
      .finally(check);

    fetch(`${RELAY_URL}/api/admin/stats/today`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.digest) setTodayDigest(data); })
      .catch(() => {})
      .finally(check);
  }, [adminKey]);

  // The latest issue is the banner, the rest the back-issue grid; the
  // daily digests keep their own timeline below
  const latestWeekly = weeklyDigests.length > 0 ? weeklyDigests[0] : null;
  const olderWeeklies = weeklyDigests.slice(1);
  const issues = issueCountLabel(weeklyDigests);

  const timeline = useMemo(() => {
    const items = [];
    for (const d of dailyDigests) {
      items.push({ type: "daily", sortDate: d.date, data: d });
    }
    // Prepend today's live digest if it's not already in dailyDigests
    if (todayDigest) {
      const alreadyExists = dailyDigests.some((d) => d.date === todayDigest.date);
      if (!alreadyExists) {
        items.push({ type: "daily", sortDate: todayDigest.date, data: todayDigest, isLive: true });
      }
    }
    items.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
    return items;
  }, [dailyDigests, todayDigest]);

  const newsHeader = (
    <div className="nw-index-head">
      <PageHero
        eyebrow="4v4.gg News"
        title="The Digest"
        lead="Weekly roundups and daily recaps of 4v4 competitive Warcraft III - drama, stats, and highlights."
        lg
      />
      {issues && (
        <div className="nw-issue-count" data-issue-count={issues.count}>
          <span className="nw-issue-count-num">{issues.count}</span>
          <span className="nw-issue-count-label">{issues.label}</span>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <PageLayout maxWidth="1200px" bare header={newsHeader}>
        <div className="page-loader fade-in"><PeonLoader /></div>
      </PageLayout>
    );
  }

  const visible = showAll ? timeline : timeline.slice(0, INITIAL_COUNT);
  const hasMore = timeline.length > INITIAL_COUNT;

  return (
    <PageLayout maxWidth="1200px" bare header={newsHeader}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {latestWeekly && (
        <section className="nw-section" data-latest-issue>
          <IssueCover weekly={latestWeekly} issueNo={issueNumber(weeklyDigests, latestWeekly.week_start)} variant="latest" delay={0.1} />
          {isAdmin && <AdminWeeklyButton />}
        </section>
      )}

      {olderWeeklies.length > 0 && (
        <section className="nw-section" data-back-issues>
          <span className="nw-eyebrow">Back issues</span>
          <div className="nw-issue-grid">
            {olderWeeklies.map((w, i) => (
              <IssueCover key={w.week_start} weekly={w} issueNo={issueNumber(weeklyDigests, w.week_start)} variant="grid" delay={0.25 + i * 0.09} />
            ))}
          </div>
        </section>
      )}

      {timeline.length > 0 && (
        <section className="nw-section reveal" style={{ "--delay": "0.15s" }}>
          <span className="nw-eyebrow">Daily digests</span>
          <div className="nw-timeline">
          {visible.map((item, i) => (
            <TimelineDaily key={`d-${item.data.date}`} digest={item.data} delay={0.08 + i * 0.03} isLive={item.isLive} />
          ))}
          {hasMore && !showAll && (
            <Button $pill className="nw-show-more" onClick={() => setShowAll(true)}>
              Show {timeline.length - INITIAL_COUNT} older
            </Button>
          )}
          </div>
        </section>
      )}

      {!latestWeekly && timeline.length === 0 && (
        <p className="nw-empty">No digests published yet. Check back soon.</p>
      )}
      </div>
    </PageLayout>
  );
};

const TimelineDaily = ({ digest, delay, isLive }) => {
  const teaser = digest.digest ? extractTeaser(digest.digest) : "";
  const label = formatDigestLabel(digest.date);
  const dayName = formatDigestDay(digest.date);
  const cls = `nw-timeline-item${isLive ? " nw-timeline-item--live" : ""} reveal`;

  return (
    <Link to={`/news?day=${digest.date}`} className={cls} style={{ "--delay": `${delay}s` }}>
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

const AdminWeeklyButton = () => {
  const now = new Date();
  const day = now.getDay();
  // Find this week's Monday
  const offset = day === 0 ? 6 : day - 1;
  const thisMon = new Date(now);
  thisMon.setDate(now.getDate() - offset);
  // The latest completed week started 7 days before this Monday
  const lastMon = new Date(thisMon);
  lastMon.setDate(thisMon.getDate() - 7);
  const weekStr = lastMon.toISOString().slice(0, 10);

  return (
    <Link to={`/news?week=${weekStr}`} className="nw-admin-weekly-btn">
      Edit this week's magazine
    </Link>
  );
};

export default News;
