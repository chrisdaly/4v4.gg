import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useLocation, useHistory } from "react-router-dom";
import { FaTwitch } from "react-icons/fa";
import useAdmin from "../lib/useAdmin";
import { searchLadder } from "../lib/api";
import { Select, Badge, Button } from "../components/ui";
import "../styles/pages/Clips.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const PAGE_SIZE = 20;

const TAG_OPTIONS = [
  { value: "", label: "All tags" },
  { value: "highlight", label: "Highlight" },
  { value: "fail", label: "Fail" },
  { value: "flame", label: "Flame" },
];

function formatDuration(seconds) {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const remainder = s % 60;
  return m > 0
    ? `${m}:${String(remainder).padStart(2, "0")}`
    : `0:${String(remainder).padStart(2, "0")}`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function formatTag(tag) {
  if (!tag) return null;
  return tag.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Player tag search (mini autocomplete) ────

function parsePlayerTags(value) {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function PlayerTagSearch({ value, onAdd, onRemove }) {
  const tags = parsePlayerTags(value);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const data = await searchLadder(query);
      const seen = new Set(tags);
      const deduped = [];
      for (const r of (Array.isArray(data) ? data : [])) {
        const tag = r.playersInfo?.[0]?.battleTag || r.player?.playerIds?.[0]?.battleTag;
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        deduped.push({
          battleTag: tag,
          mmr: r.player?.mmr,
          wins: r.player?.wins || 0,
          losses: r.player?.losses || 0,
        });
      }
      setResults(deduped.slice(0, 6));
      setOpen(true);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (tag) => {
    setQuery("");
    setOpen(false);
    setResults([]);
    onAdd(tag);
  };

  return (
    <div className="clip-player-search" ref={wrapRef}>
      {tags.length > 0 && (
        <div className="clip-player-chips">
          {tags.map((tag) => (
            <span key={tag} className="clip-player-chip">
              {tag.split("#")[0]}
              <button className="clip-player-chip-x" onClick={() => onRemove(tag)}>&times;</button>
            </span>
          ))}
        </div>
      )}
      <input
        className="clip-player-search-input"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={tags.length ? "Add player..." : "Tag player..."}
      />
      {open && results.length > 0 && (
        <div className="clip-player-search-dropdown">
          {results.map((r) => {
            const [name, hash] = r.battleTag.split("#");
            return (
              <button
                key={r.battleTag}
                className="clip-player-search-result"
                onClick={() => handleSelect(r.battleTag)}
              >
                <span className="clip-player-search-info">
                  <span className="clip-player-search-name-row">
                    <span className="clip-player-search-name">{name}</span>
                    <span className="clip-player-search-hash">#{hash}</span>
                  </span>
                  <span className="clip-player-search-meta">
                    <span className="clip-player-search-w">{r.wins}W</span>
                    <span className="clip-player-search-l">{r.losses}L</span>
                  </span>
                </span>
                <span className="clip-player-search-mmr">
                  {r.mmr != null ? `${Math.round(r.mmr)} MMR` : "—"}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {searching && query.length >= 2 && !open && (
        <div className="clip-player-search-dropdown">
          <div className="clip-player-search-loading">Zug zug<span className="ellipsis-anim" /></div>
        </div>
      )}
    </div>
  );
}

// ── Admin actions ─────────────────────────────

async function adminAction(endpoint, body, apiKey) {
  const res = await fetch(`${RELAY_URL}/api/clips/admin/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}

// ── ClipMeta ──────────────────────────────────

function ClipMeta({ clip }) {
  const players = parsePlayerTags(clip.player_tag);
  return (
    <div className="clip-meta">
      <span className="clip-streamer">{clip.twitch_login}</span>
      {players.length > 0 && players.map((tag) => (
        <React.Fragment key={tag}>
          <span className="clip-meta-sep">&middot;</span>
          <Link
            className="clip-player-link"
            to={`/player/${encodeURIComponent(tag)}`}
            onClick={(e) => e.stopPropagation()}
          >
            {tag.split("#")[0]}
          </Link>
        </React.Fragment>
      ))}
      <span className="clip-meta-sep">&middot;</span>
      <span className="clip-views">
        {clip.view_count.toLocaleString()} views
      </span>
      <span className="clip-meta-sep">&middot;</span>
      <span className="clip-date">{timeAgo(clip.created_at)}</span>
      {clip.tag && <span className="clip-tag">{formatTag(clip.tag)}</span>}
    </div>
  );
}

// ── Admin controls on a card ──────────────────

function ClipAdminActions({ clip, apiKey, onUpdate }) {
  const isRelevant = !!clip.featured;
  const [tagValue, setTagValue] = useState(clip.tag || "");

  const handleTagChange = async (newTag) => {
    setTagValue(newTag);
    await adminAction("feature", { clipId: clip.clip_id, tag: newTag || null }, apiKey);
    onUpdate();
  };

  const handlePlayerAdd = async (battleTag) => {
    const existing = parsePlayerTags(clip.player_tag);
    if (existing.includes(battleTag)) return;
    const newValue = [...existing, battleTag].join(",");
    await adminAction("tag-player", { clipId: clip.clip_id, playerTag: newValue }, apiKey);
    onUpdate();
  };

  const handlePlayerRemove = async (battleTag) => {
    const existing = parsePlayerTags(clip.player_tag);
    const newValue = existing.filter((t) => t !== battleTag).join(",") || null;
    await adminAction("tag-player", { clipId: clip.clip_id, playerTag: newValue }, apiKey);
    onUpdate();
  };

  const handleRestore = async () => {
    const ok = await adminAction("unhide", { clipId: clip.clip_id }, apiKey);
    if (ok) onUpdate();
  };

  // Hidden clips just get a restore button
  if (clip.hidden) {
    return (
      <div className="clip-admin-actions">
        <Button $secondary onClick={handleRestore}>
          Restore
        </Button>
      </div>
    );
  }

  return (
    <div className="clip-admin-actions">
      <span className="clip-admin-label">4v4?</span>
      <Button
        $ghost
        className={isRelevant ? "clip-admin-vote--active" : ""}
        onClick={async () => {
          if (!isRelevant) {
            const ok = await adminAction("feature", { clipId: clip.clip_id, tag: null }, apiKey);
            if (ok) onUpdate();
          }
        }}
      >
        Yes
      </Button>
      <Button
        $ghost
        className={`clip-admin-vote--no ${!isRelevant ? "clip-admin-vote--active" : ""}`}
        onClick={async () => {
          const ok = await adminAction("hide", { clipId: clip.clip_id }, apiKey);
          if (ok) onUpdate();
        }}
      >
        No
      </Button>
      {isRelevant && (
        <Select
          value={tagValue}
          onChange={(e) => handleTagChange(e.target.value)}
        >
          <option value="">No tag</option>
          {TAG_OPTIONS.slice(1).map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
      )}
      <PlayerTagSearch
        value={clip.player_tag}
        onAdd={handlePlayerAdd}
        onRemove={handlePlayerRemove}
      />
    </div>
  );
}

// ── Grid card ─────────────────────────────────

function ClipGridCard({ clip, onClick, apiKey, onUpdate }) {
  return (
    <div className={`clip-card ${clip.featured ? "clip-card--featured" : ""}`} onClick={() => onClick(clip)}>
      <div className="clip-thumbnail-wrap">
        <img
          className="clip-thumbnail"
          src={clip.thumbnail_url}
          alt={clip.title}
          loading="lazy"
          onError={(e) => { e.target.style.display = "none"; }}
        />
        <div className="clip-play-overlay">
          <div className="clip-play-btn">
            <div className="clip-play-icon" />
          </div>
        </div>
        {clip.duration > 0 && (
          <span className="clip-duration">{formatDuration(clip.duration)}</span>
        )}
      </div>
      <div className="clip-info">
        <h3 className="clip-title">{clip.title}</h3>
        <ClipMeta clip={clip} />
      </div>
      {apiKey && (
        <div onClick={(e) => e.stopPropagation()}>
          <ClipAdminActions clip={clip} apiKey={apiKey} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

// ── Expanded modal ────────────────────────────

function ClipModal({ clip, onClose, apiKey, onUpdate }) {
  const backdropRef = useRef(null);
  const embedSrc = clip.embed_url
    ? `${clip.embed_url}&parent=4v4.gg&parent=localhost&autoplay=true`
    : `https://clips.twitch.tv/embed?clip=${clip.clip_id}&parent=4v4.gg&parent=localhost&autoplay=true`;

  useEffect(() => {
    backdropRef.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onClose]);

  return (
    <div className="clip-modal-backdrop" ref={backdropRef} tabIndex={-1} onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="clip-modal" onClick={(e) => e.stopPropagation()}>
        <button className="clip-modal-close" onClick={onClose}>
          &times;
        </button>
        <iframe
          className="clip-modal-embed"
          src={embedSrc}
          allowFullScreen
          title={clip.title}
        />
        <div className="clip-modal-info">
          <h2 className="clip-modal-title">{clip.title}</h2>
          <ClipMeta clip={clip} />
          {apiKey && (
            <ClipAdminActions clip={clip} apiKey={apiKey} onUpdate={onUpdate} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Clips page ────────────────────────────────

export default function Clips() {
  const location = useLocation();
  const history = useHistory();
  const urlPlayer = useMemo(() => new URLSearchParams(location.search).get("player") || "", [location.search]);

  const [clips, setClips] = useState([]);
  const [streamers, setStreamers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filterStreamer, setFilterStreamer] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [activeClip, setActiveClip] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const { adminKey, isAdmin } = useAdmin();

  const fetchClips = useCallback(
    async (currentOffset, append = false) => {
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(currentOffset),
        });
        if (filterStreamer) params.set("streamer", filterStreamer);
        if (filterTag) params.set("tag", filterTag);
        if (urlPlayer) params.set("player", urlPlayer);

        // Admins get all clips including hidden for triage
        const endpoint = isAdmin
          ? `${RELAY_URL}/api/clips/admin/all?${params}`
          : `${RELAY_URL}/api/clips?${params}`;

        const headers = isAdmin ? { "X-API-Key": adminKey } : {};
        const res = await fetch(endpoint, { headers });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();

        if (append) {
          setClips((prev) => [...prev, ...data.clips]);
        } else {
          setClips(data.clips);
        }
        setHasMore(data.clips.length === PAGE_SIZE);
      } catch (err) {
        console.error("[Clips] Fetch error:", err.message);
        if (!append) setClips([]);
        setHasMore(false);
      }
    },
    [filterStreamer, filterTag, urlPlayer, isAdmin, adminKey]
  );

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    fetchClips(0).finally(() => setLoading(false));
  }, [fetchClips]);

  useEffect(() => {
    fetch(`${RELAY_URL}/api/clips/streamers`)
      .then((r) => (r.ok ? r.json() : { streamers: [] }))
      .then((data) => setStreamers(data.streamers || []))
      .catch(() => {});
  }, []);

  const refreshClips = () => {
    setOffset(0);
    fetchClips(0);
  };

  const loadMore = async () => {
    const newOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    setOffset(newOffset);
    await fetchClips(newOffset, true);
    setLoadingMore(false);
  };

  // Split clips for admin view
  const relevantClips = isAdmin ? clips.filter((c) => !c.hidden) : clips;
  const hiddenClips = isAdmin ? clips.filter((c) => c.hidden) : [];

  return (
    <div className="clips">
      <div className="clips-container">
        <div className="clips-header">
          <h1 className="clips-title">
            <FaTwitch className="clips-twitch-icon" />
            Clips
          </h1>
          <p className="clips-subtitle">Top moments from WC3 streamers</p>
        </div>

        <div className="clips-filters">
          {urlPlayer && (
            <div className="clips-player-filter">
              <span className="clips-player-tag">{urlPlayer.split("#")[0]}</span>
              <button
                className="clips-player-clear"
                onClick={() => history.push("/clips")}
                title="Clear player filter"
              >&times;</button>
            </div>
          )}
          <Select
            value={filterStreamer}
            onChange={(e) => setFilterStreamer(e.target.value)}
          >
            <option value="">All streamers</option>
            {streamers.map((s) => (
              <option key={s.twitch_login} value={s.twitch_login}>
                {s.display_name}
              </option>
            ))}
          </Select>

          <Select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          >
            {TAG_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="clips-loading">Loading clips...</div>
        ) : relevantClips.length === 0 && hiddenClips.length === 0 ? (
          <div className="clips-empty">No clips found</div>
        ) : (
          <>
            {relevantClips.length > 0 && (
              <div className="clips-grid">
                {relevantClips.map((clip) => (
                  <ClipGridCard
                    key={clip.clip_id}
                    clip={clip}
                    onClick={setActiveClip}
                    apiKey={isAdmin ? adminKey : null}
                    onUpdate={refreshClips}
                  />
                ))}
              </div>
            )}
            {hasMore && (
              <div className="clips-load-more">
                <button
                  className="clips-load-more-btn"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}

            {isAdmin && hiddenClips.length > 0 && (
              <div className="clips-hidden-drawer">
                <button
                  className="clips-hidden-toggle"
                  onClick={() => setShowHidden((v) => !v)}
                >
                  {showHidden ? "Hide" : "Show"} irrelevant ({hiddenClips.length})
                </button>
                {showHidden && (
                  <div className="clips-grid clips-grid--hidden">
                    {hiddenClips.map((clip) => (
                      <ClipGridCard
                        key={clip.clip_id}
                        clip={clip}
                        onClick={setActiveClip}
                        apiKey={adminKey}
                        onUpdate={refreshClips}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {activeClip && (
        <ClipModal clip={activeClip} onClose={() => setActiveClip(null)} apiKey={isAdmin ? adminKey : null} onUpdate={() => { setActiveClip(null); refreshClips(); }} />
      )}
    </div>
  );
}
