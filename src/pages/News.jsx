import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useHistory } from "react-router-dom";
import useChatStream from "../lib/useChatStream";
import { FiRefreshCw } from "react-icons/fi";
import DigestBanner from "../components/news/DigestBanner";
import TopicTrends from "../components/news/TopicTrends";
import BeefTracker from "../components/news/BeefTracker";
import useAdmin from "../lib/useAdmin";
import "../styles/pages/News.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const formatDigestLabel = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dateFormatted = `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return `Today so far \u00B7 ${dateFormatted}`;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === yesterday) {
    const todayMD = new Date().toISOString().slice(5, 10);
    if (todayMD === "02-14") return `Valentine's Eve \u00B7 ${dateFormatted}`;
    return `Yesterday \u00B7 ${dateFormatted}`;
  }
  return dateFormatted;
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

  const location = useLocation();
  const history = useHistory();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlDate = searchParams.get("date");
  const urlPlayer = searchParams.get("player");

  const { adminKey, isAdmin, showAdmin, setAdminKey: setAdminKeyHook } = useAdmin();
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
      if (urlDate && combined.length > 0) {
        const idx = combined.findIndex((d) => d.date === urlDate);
        if (idx >= 0) setDigestIdx(idx);
      }
      setLoading(false);
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

  // Update URL date param when switching tabs (edit mode only)
  const setDigestIdxAndUrl = useCallback((idx) => {
    setDigestIdx(idx);
    if (showAdmin && allDigests[idx]) {
      const params = new URLSearchParams(location.search);
      params.set("date", allDigests[idx].date);
      history.replace({ search: params.toString() });
    }
  }, [showAdmin, allDigests, history, location.search]);

  const currentDigest = allDigests[digestIdx] || null;
  const digestLabel = currentDigest ? formatDigestLabel(currentDigest.date) : null;

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
          <div className="news-loading">Loading digests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="news">
      <div className="news-container">
        {hasWeekly && (
          <div className="news-view-toggle">
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
          </div>
        )}
        {viewMode === "daily" ? (
          allDigests.length > 0 ? (
            <DigestBanner
              digest={currentDigest}
              nameSet={nameSet}
              nameToTag={nameToTag}
              label={digestLabel}
              isAdmin={isAdmin}
              apiKey={adminKey}
              onDigestUpdated={handleDigestUpdated}
              filterPlayer={urlPlayer}
              dateTabs={allDigests.map((d, i) => ({
                label: formatDigestLabel(d.date),
                active: i === digestIdx,
                onClick: () => setDigestIdxAndUrl(i),
              }))}
            />
          ) : (
            <div className="news-empty">No digests available yet.</div>
          )
        ) : (
          weeklyDigests.length > 0 ? (
            <DigestBanner
              digest={currentWeekly ? { digest: currentWeekly.digest, date: currentWeekly.week_start } : null}
              nameSet={nameSet}
              nameToTag={nameToTag}
              label={weeklyLabel}
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
        {isAdmin && viewMode === "daily" && (
          <div className="digest-admin-bar">
            {isViewingToday && (
              <span className="digest-today-notice">
                Live digest — editing available after the day ends
              </span>
            )}
            <button className="digest-admin-logout" onClick={() => setAdminKeyHook("")}>
              Logout
            </button>
          </div>
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
