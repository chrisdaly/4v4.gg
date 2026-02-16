import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useHistory } from "react-router-dom";
import useChatStream from "../lib/useChatStream";
import { FiRefreshCw } from "react-icons/fi";
import DigestBanner from "../components/news/DigestBanner";
import TopicTrends from "../components/news/TopicTrends";
import BeefTracker from "../components/news/BeefTracker";
import PeonLoader from "../components/PeonLoader";
import useAdmin from "../lib/useAdmin";
import "../styles/pages/News.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const formatDigestLabel = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return "Today";
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === yesterday) return "Yesterday";
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

const groupDigestsByMonth = (digests) => {
  const groups = {};
  digests.forEach((digest, idx) => {
    const date = new Date(digest.date + "T12:00:00");
    const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ ...digest, originalIdx: idx });
  });
  return groups;
};

const formatMonthLabel = (yearMonth) => {
  const [year, month] = yearMonth.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(month) - 1]} ${year}`;
};

const formatWeeklyLabel = (weekStart, weekEnd) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const s = new Date(weekStart + "T12:00:00");
  const e = new Date(weekEnd + "T12:00:00");
  const sMonth = months[s.getMonth()];
  const eMonth = months[e.getMonth()];
  if (sMonth === eMonth) {
    return `${sMonth} ${s.getDate()}-${e.getDate()}`;
  }
  return `${sMonth} ${s.getDate()} - ${eMonth} ${e.getDate()}`;
};

const News = () => {
  const { onlineUsers, messages } = useChatStream();
  const [allDigests, setAllDigests] = useState([]);
  const [digestIdx, setDigestIdx] = useState(0);
  const [weeklyDigests, setWeeklyDigests] = useState([]);
  const [weeklyIdx, setWeeklyIdx] = useState(0);
  const [viewMode, setViewMode] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(null);
  const [currentDayInMonth, setCurrentDayInMonth] = useState(0);

  const location = useLocation();
  const history = useHistory();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlDate = searchParams.get("date");
  const urlPlayer = searchParams.get("player");

  const { adminKey, isAdmin, showAdmin, setAdminKey: setAdminKeyHook } = useAdmin();
  const [previewReader, setPreviewReader] = useState(false);
  const effectiveAdmin = isAdmin && !previewReader;
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState(null);

  const handleKeySubmit = useCallback(async () => {
    const key = keyInput.trim();
    if (!key) return;
    // Validate against a lightweight authenticated endpoint
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/bot`, {
        headers: { "X-API-Key": key },
      });
      if (!res.ok) {
        setKeyError("Invalid API key");
        return;
      }
    } catch {
      setKeyError("Could not validate key");
      return;
    }
    setKeyError(null);
    setAdminKeyHook(key);
    setKeyInput("");
  }, [keyInput, setAdminKeyHook]);

  // Fetch all digests (today + past) and weekly digests
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${RELAY_URL}/api/admin/stats/today`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${RELAY_URL}/api/admin/digests`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${RELAY_URL}/api/admin/weekly-digests`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([today, past, weekly]) => {
      const combined = [];
      if (today?.digest) combined.push(today);
      for (const d of past) {
        if (!combined.some((c) => c.date === d.date)) combined.push(d);
      }
      setAllDigests(combined);
      setWeeklyDigests(weekly);
      setLoading(false);

      // Handle URL date param - set the month and day
      if (urlDate && combined.length > 0) {
        const targetDigest = combined.find((d) => d.date === urlDate);
        if (targetDigest) {
          const date = new Date(targetDigest.date + "T12:00:00");
          const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
          setCurrentMonth(monthKey);

          // Find the day index within that month
          const monthDigests = combined.filter(d => {
            const dDate = new Date(d.date + "T12:00:00");
            const dMonthKey = `${dDate.getFullYear()}-${(dDate.getMonth() + 1).toString().padStart(2, "0")}`;
            return dMonthKey === monthKey;
          }).sort((a, b) => b.date.localeCompare(a.date));

          const dayIdx = monthDigests.findIndex(d => d.date === urlDate);
          if (dayIdx >= 0) setCurrentDayInMonth(dayIdx);
        }
      }
    });
  }, []);

  // Build name set + name->battleTag map for digest highlighting
  const { nameSet, nameToTag } = useMemo(() => {
    const names = new Set();
    const tagMap = new Map();
    for (const u of onlineUsers) {
      const tag = u.battleTag;
      const name = tag?.split("#")[0];
      if (name) {
        names.add(name);
        tagMap.set(name, tag);
      }
    }
    for (const m of messages) {
      const tag = m.battle_tag || m.battleTag;
      const name = tag?.split("#")[0];
      if (name) {
        names.add(name);
        if (!tagMap.has(name)) tagMap.set(name, tag);
      }
    }
    return { nameSet: names, nameToTag: tagMap };
  }, [onlineUsers, messages]);

  // Group digests by month
  const monthGroups = useMemo(() => groupDigestsByMonth(allDigests), [allDigests]);
  const monthKeys = useMemo(() => Object.keys(monthGroups).sort().reverse(), [monthGroups]);

  // Derive effective month — use currentMonth if valid, else fall back to first available
  const effectiveMonth = (currentMonth && monthGroups[currentMonth]) ? currentMonth : monthKeys[0] || null;

  // Get current month's digests and current digest
  const currentMonthDigests = effectiveMonth ? monthGroups[effectiveMonth] || [] : [];
  const safeDayIdx = currentDayInMonth < currentMonthDigests.length ? currentDayInMonth : 0;
  const currentDigest = currentMonthDigests[safeDayIdx] || null;
  const digestLabel = currentDigest ? formatDigestLabel(currentDigest.date) : null;

  // Month navigation
  const monthIdx = effectiveMonth ? monthKeys.indexOf(effectiveMonth) : -1;
  const canGoPrevMonth = monthIdx >= 0 && monthIdx < monthKeys.length - 1;
  const canGoNextMonth = monthIdx > 0;

  const handlePrevMonth = () => {
    if (canGoPrevMonth) {
      setCurrentMonth(monthKeys[monthIdx + 1]);
      setCurrentDayInMonth(0);
    }
  };

  const handleNextMonth = () => {
    if (canGoNextMonth) {
      setCurrentMonth(monthKeys[monthIdx - 1]);
      setCurrentDayInMonth(0);
    }
  };

  // Update URL date param when switching tabs (edit mode only)
  const setDigestIdxAndUrl = useCallback((idx) => {
    setCurrentDayInMonth(idx);
    if (showAdmin && currentMonthDigests[idx]) {
      const params = new URLSearchParams(location.search);
      params.set("date", currentMonthDigests[idx].date);
      history.replace({ search: params.toString() });
    }
  }, [showAdmin, currentMonthDigests, history, location.search]);

  const currentWeekly = weeklyDigests[weeklyIdx] || null;
  const weeklyLabel = currentWeekly ? formatWeeklyLabel(currentWeekly.week_start, currentWeekly.week_end) : null;

  const hasWeekly = weeklyDigests.length > 0;

  const handleDigestUpdated = useCallback((newDigestText) => {
    if (!currentDigest) return;
    setAllDigests((prev) =>
      prev.map((d) =>
        d.date === currentDigest.date ? { ...d, digest: newDigestText } : d
      )
    );
  }, [currentDigest]);

  // Refresh "today so far" digest (admin only, busts server cache)
  const [refreshing, setRefreshing] = useState(false);
  const isViewingToday = currentDigest?.date === new Date().toISOString().slice(0, 10);
  const handleRefreshToday = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/stats/today?refresh=1`, {
        headers: { "X-API-Key": adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.digest) {
          setAllDigests((prev) =>
            prev.map((d) => (d.date === data.date ? { ...d, digest: data.digest } : d))
          );
        }
      }
    } catch (err) {
      console.warn('[News] Refresh failed:', err.message);
    }
    setRefreshing(false);
  }, [adminKey, refreshing]);

  if (loading) {
    return (
      <div className="news">
        <div className="news-container">
          <div className="page-loader">
            <PeonLoader />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="news">
      <div className="news-container">
        {(hasWeekly || isAdmin) && <div className="news-view-toggle">
          {hasWeekly && (
            <>
              <button
                className={`news-view-btn${viewMode === "daily" ? " news-view-btn--active" : ""}`}
                onClick={() => setViewMode("daily")}
              >
                Daily
              </button>
              <button
                className={`news-view-btn${viewMode === "weekly" ? " news-view-btn--active" : ""}`}
                onClick={() => setViewMode("weekly")}
              >
                Weekly
              </button>
            </>
          )}
          {isAdmin && (
            <>
              <button
                className={`news-view-btn${!previewReader ? " news-view-btn--active" : ""}`}
                onClick={() => setPreviewReader(false)}
              >
                Admin
              </button>
              <button
                className={`news-view-btn${previewReader ? " news-view-btn--active" : ""}`}
                onClick={() => setPreviewReader(true)}
              >
                Reader
              </button>
            </>
          )}
        </div>}
        {viewMode === "daily" ? (
          allDigests.length > 0 ? (
            <>
              {/* Month Navigation */}
              <div className="month-nav">
                <button
                  className="month-nav-btn"
                  onClick={handlePrevMonth}
                  disabled={!canGoPrevMonth}
                >
                  ←
                </button>
                <span className="month-nav-label">
                  {effectiveMonth ? formatMonthLabel(effectiveMonth) : "Loading..."}
                </span>
                <button
                  className="month-nav-btn"
                  onClick={handleNextMonth}
                  disabled={!canGoNextMonth}
                >
                  →
                </button>
              </div>

              <DigestBanner
                digest={currentDigest}
                nameSet={nameSet}
                nameToTag={nameToTag}
                label={digestLabel}
                isAdmin={effectiveAdmin}
                apiKey={adminKey}
                onDigestUpdated={handleDigestUpdated}
                filterPlayer={urlPlayer}
                dateTabs={currentMonthDigests.map((d, i) => ({
                  label: formatDigestLabel(d.date),
                  active: i === safeDayIdx,
                  onClick: () => setDigestIdxAndUrl(i),
                }))}
              />
            </>
          ) : (
            <div className="news-empty">No digests available yet.</div>
          )
        ) : (
          weeklyDigests.length > 0 ? (
            <DigestBanner
              digest={currentWeekly ? { digest: currentWeekly.digest, date: currentWeekly.week_start, clips: currentWeekly.clips } : null}
              nameSet={nameSet}
              nameToTag={nameToTag}
              label={weeklyLabel}
              clips={currentWeekly?.clips}
              stats={currentWeekly?.stats}
              dateTabs={weeklyDigests.map((w, i) => ({
                label: formatWeeklyLabel(w.week_start, w.week_end),
                active: i === weeklyIdx,
                onClick: () => setWeeklyIdx(i),
              }))}
            />
          ) : (
            <div className="news-empty">No weekly digests available yet.</div>
          )
        )}
        {isAdmin && viewMode === "daily" && isViewingToday && (
          <button
            className="digest-editor-refresh"
            onClick={handleRefreshToday}
            disabled={refreshing}
          >
            <FiRefreshCw size={12} className={refreshing ? "spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh today"}
          </button>
        )}
        {showAdmin && viewMode === "daily" && !adminKey && (
          <div className="digest-editor">
            <div className="digest-editor-header">
              <span className="digest-editor-title">Admin Key Required</span>
            </div>
            <div className="digest-editor-key-prompt">
              <input
                type="password"
                className="digest-editor-key-input"
                placeholder="Paste admin API key..."
                value={keyInput}
                onChange={(e) => { setKeyInput(e.target.value); setKeyError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleKeySubmit()}
              />
              <button className="digest-editor-key-btn" onClick={handleKeySubmit} disabled={!keyInput.trim()}>
                Save
              </button>
            </div>
            {keyError && <div className="digest-editor-key-error">{keyError}</div>}
          </div>
        )}
        {isAdmin && viewMode === "daily" && isViewingToday && !previewReader && (
          <span className="digest-today-notice">
            Live digest — editing available after the day ends
          </span>
        )}
        {viewMode === "daily" && allDigests.length > 1 && (
          <>
            <TopicTrends digests={allDigests} />
            <BeefTracker digests={allDigests} nameToTag={nameToTag} />
          </>
        )}
      </div>
    </div>
  );
};

export default News;
