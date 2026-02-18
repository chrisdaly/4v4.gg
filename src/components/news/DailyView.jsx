import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FiRefreshCw } from "react-icons/fi";
import useChatStream from "../../lib/useChatStream";
import useAdmin from "../../lib/useAdmin";
import { PageNav } from "../ui";
import DigestBanner from "./DigestBanner";
import PeonLoader from "../PeonLoader";

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

const DailyView = ({ dayParam }) => {
  const { onlineUsers, messages } = useChatStream();
  const [allDigests, setAllDigests] = useState([]);
  const [dayIdx, setDayIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const { adminKey, isAdmin, showAdmin, setAdminKey: setAdminKeyHook } = useAdmin();
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState(null);

  const handleKeySubmit = useCallback(async () => {
    const key = keyInput.trim();
    if (!key) return;
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

  // Fetch all digests (today + past)
  useEffect(() => {
    setLoading(true);
    const noCacheOpts = { cache: "no-store" };
    Promise.all([
      fetch(`${RELAY_URL}/api/admin/stats/today`, noCacheOpts)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${RELAY_URL}/api/admin/digests`, noCacheOpts)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([today, past]) => {
      const combined = [];
      if (today?.digest) combined.push(today);
      for (const d of past) {
        if (!combined.some((c) => c.date === d.date)) combined.push(d);
      }
      setAllDigests(combined);

      // If dayParam provided, find that day
      if (dayParam && combined.length > 0) {
        const idx = combined.findIndex((d) => d.date === dayParam);
        if (idx >= 0) setDayIdx(idx);
      }

      setLoading(false);
    });
  }, [dayParam]);

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

  const currentDigest = allDigests[dayIdx] || null;
  const digestLabel = currentDigest ? formatDigestLabel(currentDigest.date) : null;

  // Day navigation
  const canGoOlder = dayIdx < allDigests.length - 1;
  const canGoNewer = dayIdx > 0;

  const handleDigestUpdated = useCallback((newDigestText) => {
    if (!currentDigest) return;
    setAllDigests((prev) =>
      prev.map((d) =>
        d.date === currentDigest.date ? { ...d, digest: newDigestText } : d
      )
    );
  }, [currentDigest]);

  // Refresh "today so far" digest (admin only)
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
      console.warn('[DailyView] Refresh failed:', err.message);
    }
    setRefreshing(false);
  }, [adminKey, refreshing]);

  if (loading) {
    return (
      <div className="page-loader">
        <PeonLoader />
      </div>
    );
  }

  return (
    <div className="news-daily-content">
      {/* Back + day tabs */}
      <PageNav
        backTo="/news"
        backLabel="News"
        tabs={allDigests.slice(0, 7).map((d, i) => ({
          key: String(i),
          label: formatDigestLabel(d.date),
        }))}
        activeTab={String(dayIdx)}
        onTab={(key) => setDayIdx(Number(key))}
      />

      {allDigests.length > 0 ? (
        <DigestBanner
          digest={currentDigest}
          nameSet={nameSet}
          nameToTag={nameToTag}
          label={digestLabel}
          isAdmin={isAdmin}
          apiKey={adminKey}
          onDigestUpdated={handleDigestUpdated}
        />
      ) : (
        <div className="news-empty">No digests available yet.</div>
      )}

      {isAdmin && isViewingToday && (
        <button
          className="digest-editor-refresh"
          onClick={handleRefreshToday}
          disabled={refreshing}
        >
          <FiRefreshCw size={12} className={refreshing ? "spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh today"}
        </button>
      )}

      {showAdmin && !adminKey && (
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

      {isAdmin && isViewingToday && (
        <span className="digest-today-notice">
          Live digest — editing available after the day ends
        </span>
      )}
    </div>
  );
};

export default DailyView;
