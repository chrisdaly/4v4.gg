import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useLocation, useHistory } from "react-router-dom";
import useChatStream from "../lib/useChatStream";
import { getPlayerProfile } from "../lib/api";
import { CountryFlag } from "../components/ui";
import { FiExternalLink, FiCamera, FiRefreshCw } from "react-icons/fi";
import html2canvas from "html2canvas";
import ChatContext from "../components/news/ChatContext";
import {
  DIGEST_SECTIONS,
  parseDigestSections,
  parseMentions,
  parseStatLine,
  extractMentionedTags,
  splitQuotes,
} from "../lib/digestUtils";
import TopicTrends from "../components/news/TopicTrends";
import BeefTracker from "../components/news/BeefTracker";
import { raceMapping } from "../lib/constants";
import "../styles/pages/News.css";

const RACE_STR_TO_ID = { HU: 1, ORC: 2, NE: 4, UD: 8, RND: 0 };

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/* ── Local rendering helpers ──────────────────────────── */

const MATCH_ID_RE = /\b([a-f0-9]{24})\b/g;

const linkifyMatchIds = (text) => {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(MATCH_ID_RE)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <Link key={`m${match.index}`} to={`/match/${match[1]}`} className="digest-match-link">
        match <FiExternalLink size={11} />
      </Link>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
};

const highlightNames = (text, nameSet) => {
  const chunks = linkifyMatchIds(text);

  if (!nameSet || nameSet.size === 0) return chunks;
  const names = [...nameSet].sort((a, b) => b.length - a.length);
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

  const result = [];
  for (const chunk of chunks) {
    if (typeof chunk !== "string") {
      result.push(chunk);
      continue;
    }
    let last = 0;
    for (const match of chunk.matchAll(re)) {
      if (match.index > last) result.push(chunk.slice(last, match.index));
      result.push(
        <span key={match.index} className="digest-name">{match[0]}</span>
      );
      last = match.index + match[0].length;
    }
    if (last < chunk.length) result.push(chunk.slice(last));
  }
  return result;
};

const formatDigestLabel = (dateStr) => {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return "Today so far";
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === yesterday) return "Yesterday";
  const d = new Date(dateStr + "T12:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
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

/* ── Sub-components ──────────────────────────────────── */

const DigestAvatar = ({ src, country }) => (
  <span className="digest-avatar-wrap">
    <img
      src={src}
      alt=""
      className="digest-avatar"
      onError={(e) => { e.target.style.display = "none"; }}
    />
    {country && <CountryFlag name={country.toLowerCase()} className="digest-avatar-flag" />}
  </span>
);

const FormDots = ({ form }) => {
  if (!form) return null;
  return (
    <span className="digest-form-dots">
      {form.split("").map((c, i) => (
        <span
          key={i}
          className={`digest-form-dot ${c === "W" ? "digest-form-dot--w" : "digest-form-dot--l"}`}
        />
      ))}
    </span>
  );
};

const StatSection = ({ stat, cls, label, profiles, date, expanded, onToggle }) => {
  const profile = profiles.get(stat.battleTag);
  const raceId = stat.race ? RACE_STR_TO_ID[stat.race] : null;
  const raceIcon = raceId != null ? raceMapping[raceId] : null;
  return (
    <div className={`digest-section digest-section--${cls} digest-section--clickable`} onClick={onToggle}>
      <span className="digest-section-label">{label}</span>
      <div className="digest-stat">
        {profile?.pic && <DigestAvatar src={profile.pic} country={profile.country} />}
        {raceIcon && <img src={raceIcon} alt="" className="digest-stat-race" />}
        <Link
          to={`/player/${encodeURIComponent(stat.battleTag)}`}
          className="digest-stat-name"
          onClick={(e) => e.stopPropagation()}
        >
          {stat.name}
        </Link>
        <span className="digest-stat-headline">{stat.headline}</span>
        <FormDots form={stat.form} />
      </div>
      <ChatContext
        date={date}
        battleTags={[stat.battleTag]}
        playerOnly
        expanded={expanded}
      />
    </div>
  );
};

/* ── DigestBanner ────────────────────────────────────── */

const DigestBanner = ({ digest, nameSet, nameToTag, label = "Yesterday in 4v4", dateTabs, isAdmin, apiKey, onDigestUpdated }) => {
  const digestRef = useRef(null);
  const [copyState, setCopyState] = useState(null); // null | "copying" | "copied" | "saved"
  const [expandedItem, setExpandedItem] = useState(null); // { key, idx } or null
  const [matchContext, setMatchContext] = useState(null); // { battleTag: matchId[] }

  // Fetch match context for game links
  useEffect(() => {
    if (!digest?.date) return;
    setMatchContext(null);
    fetch(`${RELAY_URL}/api/admin/digest/${digest.date}/matches`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.matchContext) setMatchContext(data.matchContext);
      })
      .catch(() => {});
  }, [digest?.date]);

  const handleSaveQuotes = useCallback(async (sectionKey, itemIdx, newQuotes) => {
    if (!isAdmin || !apiKey || !digest?.date) return;
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/digest/${digest.date}/quotes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ section: sectionKey, itemIndex: itemIdx, newQuotes }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onDigestUpdated) onDigestUpdated(data.digest);
      }
    } catch { /* ignore */ }
  }, [isAdmin, apiKey, digest?.date, onDigestUpdated]);

  const handleScreenshot = async () => {
    if (!digestRef.current || copyState === "copying") return;
    setCopyState("copying");
    try {
      // Pre-convert cross-origin avatar images to data URLs via relay proxy
      const imgs = digestRef.current.querySelectorAll(".digest-avatar");
      const imgDataMap = new Map();
      await Promise.all([...imgs].map(async (img) => {
        if (!img.src || img.src.startsWith("data:")) return;
        try {
          const proxyUrl = `${RELAY_URL}/api/admin/image-proxy?url=${encodeURIComponent(img.src)}`;
          const resp = await fetch(proxyUrl);
          if (!resp.ok) return;
          const blob = await resp.blob();
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          imgDataMap.set(img.src, dataUrl);
        } catch { /* skip unloadable images */ }
      }));

      const canvas = await html2canvas(digestRef.current, {
        backgroundColor: "#0f0d0b",
        scale: 2,
        useCORS: true,
        onclone: (_doc, el) => {
          el.style.backdropFilter = "none";
          el.style.webkitBackdropFilter = "none";
          el.style.background = "#0f0d0b";
          el.style.padding = "24px 32px 28px";

          // Hide screenshot button and chat transcripts
          const btn = el.querySelector(".digest-screenshot-btn");
          if (btn) btn.style.display = "none";
          for (const ctx of el.querySelectorAll(".chat-context")) {
            ctx.style.display = "none";
          }

          // Replace date tabs with a branded header
          const header = el.querySelector(".news-digest-header");
          if (header) {
            const activeTab = dateTabs?.find((t) => t.active);
            const dateLabel = activeTab?.label || label;
            header.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-family:var(--font-display);font-size:20px;color:var(--gold);letter-spacing:0.04em">4V4.GG</span><span style="font-family:var(--font-mono);font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:var(--grey-light)">${dateLabel}</span></div>`;
          }

          // Tighten stat sections
          for (const s of el.querySelectorAll(".digest-section--winner,.digest-section--loser,.digest-section--grinder,.digest-section--hotstreak,.digest-section--coldstreak")) {
            s.style.padding = "6px 16px";
          }

          // Replace avatar srcs with pre-fetched data URLs
          for (const img of el.querySelectorAll(".digest-avatar")) {
            const dataUrl = imgDataMap.get(img.src);
            if (dataUrl) img.src = dataUrl;
            else img.style.display = "none";
          }

          // Add footer
          const footer = _doc.createElement("div");
          footer.style.cssText = "text-align:right;padding-top:12px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;color:#555";
          footer.textContent = "4v4.gg/news";
          el.appendChild(footer);
        },
      });
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      if (blob && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopyState("copied");
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `4v4gg-digest-${digest.date || "today"}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setCopyState("saved");
      }
    } catch {
      setCopyState(null);
    }
    setTimeout(() => setCopyState(null), 2000);
  };

  if (!digest) return null;

  const text = digest.digest || "";
  // Reset expanded item when switching digests
  useEffect(() => { setExpandedItem(null); }, [text]);
  const allSections = useMemo(() => parseDigestSections(text), [text]);

  const mentionsMap = useMemo(() => parseMentions(allSections), [allSections]);
  const combinedNameToTag = useMemo(() => {
    const merged = new Map(mentionsMap);
    if (nameToTag) {
      for (const [name, tag] of nameToTag) {
        if (!merged.has(name)) merged.set(name, tag);
      }
    }
    return merged;
  }, [mentionsMap, nameToTag]);

  const sections = useMemo(() => {
    const visible = allSections.filter((s) => s.key !== "MENTIONS");
    // Dedup: collect names mentioned in BANS, remove DRAMA items about banned players
    const bansSection = visible.find((s) => s.key === "BANS");
    if (!bansSection) return visible;
    const bannedNames = new Set();
    for (const [name] of combinedNameToTag) {
      if (name.length < 3) continue;
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(bansSection.content)) {
        bannedNames.add(name);
      }
    }
    if (bannedNames.size === 0) return visible;
    return visible.map((s) => {
      if (s.key !== "DRAMA") return s;
      const items = s.content.split(/;\s*/).filter((item) => {
        return ![...bannedNames].some((n) => {
          const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          return new RegExp(`\\b${escaped}\\b`, "i").test(item);
        });
      });
      if (items.length === 0) return null;
      return { ...s, content: items.join("; ") };
    }).filter(Boolean);
  }, [allSections, combinedNameToTag]);

  const combinedNameSet = useMemo(() => {
    const names = new Set(nameSet);
    for (const name of combinedNameToTag.keys()) {
      names.add(name);
    }
    return names;
  }, [nameSet, combinedNameToTag]);

  const [profiles, setProfiles] = useState(new Map());
  const fetchedRef = useRef(new Set());

  useEffect(() => {
    const tagsToFetch = new Set();

    for (const { key, content } of sections) {
      const meta = DIGEST_SECTIONS.find((s) => s.key === key);
      if (meta?.stat) {
        const stat = parseStatLine(content);
        if (stat) tagsToFetch.add(stat.battleTag);
      } else if (!meta?.tags) {
        for (const tag of extractMentionedTags(content, combinedNameToTag)) {
          tagsToFetch.add(tag);
        }
      }
    }

    for (const tag of tagsToFetch) {
      if (fetchedRef.current.has(tag)) continue;
      fetchedRef.current.add(tag);
      getPlayerProfile(tag).then((profile) => {
        if (profile?.profilePicUrl || profile?.country) {
          setProfiles((prev) => {
            const next = new Map(prev);
            next.set(tag, { pic: profile.profilePicUrl, country: profile.country });
            return next;
          });
        }
      });
    }
  }, [sections, combinedNameToTag]);

  const screenshotBtn = (
    <button className="digest-screenshot-btn" onClick={handleScreenshot} title="Copy as image">
      {copyState === "copying" ? "..." : copyState === "copied" ? "Copied!" : copyState === "saved" ? "Saved!" : <FiCamera size={14} />}
    </button>
  );

  if (sections.length === 0) {
    return (
      <div className="news-digest" ref={digestRef}>
        <div className="news-digest-header">
        {dateTabs && dateTabs.length > 1 ? (
          <div className="digest-date-tabs">
            {dateTabs.map((tab, i) => (
              <button
                key={i}
                className={`digest-date-tab${tab.active ? " digest-date-tab--active" : ""}`}
                onClick={tab.onClick}
              >
                {tab.label}
              </button>
            ))}
            {screenshotBtn}
          </div>
        ) : (
          <div className="news-digest-label">{label}{screenshotBtn}</div>
        )}
      </div>
        <p className="digest-section-text">{highlightNames(text, combinedNameSet)}</p>
      </div>
    );
  }

  return (
    <div className="news-digest" ref={digestRef}>
      <div className="news-digest-header">
        {dateTabs && dateTabs.length > 1 ? (
          <div className="digest-date-tabs">
            {dateTabs.map((tab, i) => (
              <button
                key={i}
                className={`digest-date-tab${tab.active ? " digest-date-tab--active" : ""}`}
                onClick={tab.onClick}
              >
                {tab.label}
              </button>
            ))}
            {screenshotBtn}
          </div>
        ) : (
          <div className="news-digest-label">{label}{screenshotBtn}</div>
        )}
      </div>
      <div className="digest-sections">
        {sections.map(({ key, content }) => {
          const meta = DIGEST_SECTIONS.find((s) => s.key === key);
          if (!meta) return null;
          // SPIKES are editorial-only (used in editor to explore chat moments)
          if (key === "SPIKES") return null;
          // Skip sections with empty/placeholder content
          if (/^none$/i.test(content.trim())) return null;
          const { cls, label } = meta;

          if (meta.stat) {
            const stat = parseStatLine(content);
            if (stat) {
              const isExpanded = expandedItem?.key === key;
              return (
                <StatSection
                  key={key}
                  stat={stat}
                  cls={cls}
                  label={label}
                  profiles={profiles}
                  date={digest.date}
                  expanded={isExpanded}
                  onToggle={() => setExpandedItem(isExpanded ? null : { key, idx: 0 })}
                />
              );
            }
          }

          if (meta.tags) {
            return (
              <div key={key} className={`digest-section digest-section--${cls}`}>
                <span className="digest-section-label">{label}</span>
                <span className="digest-tags">
                  {content.split(/,\s*/).filter(Boolean).map((tag, i) => (
                    <span key={i} className="digest-tag">{tag.trim()}</span>
                  ))}
                </span>
              </div>
            );
          }

          const items = content.split(/;\s*/).map(s => s.trim()).filter(Boolean);
          const isSpike = key === "SPIKES";
          const isRecap = key === "RECAP";
          // All list sections are clickable except RECAP
          const isClickable = !isRecap;

          return (
            <div key={key} className={`digest-section digest-section--${cls}`}>
              <span className="digest-section-label">{label}</span>
              {items.length > 1 ? (
                <ul className="digest-bullets">
                  {items.map((item, i) => {
                    const itemTags = extractMentionedTags(item, combinedNameToTag);
                    const itemProfiles = itemTags
                      .map((tag) => profiles.get(tag))
                      .filter(Boolean);

                    const avatarElements = itemProfiles
                      .filter((p) => p.pic)
                      .map((p, j) => <DigestAvatar key={j} src={p.pic} country={p.country} />);

                    const { summary, quotes } = splitQuotes(item);
                    const isExpanded = expandedItem?.key === key && expandedItem?.idx === i;

                    // Parse time range from spike text like "02:28 (22 msgs, ...)"
                    let spikeFrom, spikeTo;
                    if (isSpike) {
                      const timeMatch = item.match(/^(\d{1,2}:\d{2})/);
                      if (timeMatch) {
                        spikeFrom = timeMatch[1].padStart(5, "0");
                        const [h, m] = spikeFrom.split(":").map(Number);
                        const endMin = m + 4;
                        spikeTo = `${String(h + Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
                      }
                    }

                    const handleClick = isClickable
                      ? () => setExpandedItem(isExpanded ? null : { key, idx: i })
                      : undefined;

                    return (
                      <li key={i} className={`digest-bullet-row${isClickable ? " digest-bullet-row--clickable" : ""}`}
                        onClick={handleClick}
                      >
                        <div className="digest-avatars">
                          {avatarElements}
                        </div>
                        <div className="digest-bullet-content">
                          <span className="digest-section-text">
                            {highlightNames(summary, combinedNameSet)}
                          </span>
                          {quotes.length > 0 && (
                            <div className="digest-quotes">
                              {quotes.map((q, qi) => (
                                <div key={qi} className="digest-quote">{q}</div>
                              ))}
                            </div>
                          )}
                          {isClickable && isSpike && spikeFrom && (
                            <ChatContext
                              date={digest.date}
                              fromTime={spikeFrom}
                              toTime={spikeTo}
                              expanded={isExpanded}
                            />
                          )}
                          {isClickable && !isSpike && (
                            <ChatContext
                              date={digest.date}
                              battleTags={itemTags}
                              quotes={quotes}
                              expanded={isExpanded}
                              selectable={isAdmin}
                              onSaveQuotes={(newQ) => handleSaveQuotes(key, i, newQ)}
                            />
                          )}
                          {matchContext && itemTags.length > 0 && (() => {
                            const ids = new Set();
                            for (const tag of itemTags) {
                              for (const id of matchContext[tag] || []) ids.add(id);
                            }
                            if (ids.size === 0) return null;
                            return (
                              <div className="digest-game-links">
                                {[...ids].slice(0, 3).map((id) => (
                                  <Link key={id} to={`/match/${id}`} className="digest-match-link" onClick={(e) => e.stopPropagation()}>
                                    game <FiExternalLink size={10} />
                                  </Link>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div
                  className={`digest-section-body${isClickable ? " digest-section-body--clickable" : ""}`}
                  onClick={isClickable ? () => {
                    const isExpanded = expandedItem?.key === key && expandedItem?.idx === 0;
                    setExpandedItem(isExpanded ? null : { key, idx: 0 });
                  } : undefined}
                >
                  {(() => {
                    const tags = extractMentionedTags(content, combinedNameToTag);
                    const ps = tags.map((t) => profiles.get(t)).filter(Boolean);
                    const { summary, quotes } = splitQuotes(content);
                    const isExpanded = expandedItem?.key === key && expandedItem?.idx === 0;
                    return (
                      <>
                        {ps.length > 0 && (
                          <div className="digest-avatars">
                            {ps.map((p, i) => p.pic && <DigestAvatar key={i} src={p.pic} country={p.country} />)}
                          </div>
                        )}
                        <div className="digest-bullet-content">
                          <span className="digest-section-text">
                            {highlightNames(summary, combinedNameSet)}
                          </span>
                          {quotes.length > 0 && (
                            <div className="digest-quotes">
                              {quotes.map((q, qi) => (
                                <div key={qi} className="digest-quote">{q}</div>
                              ))}
                            </div>
                          )}
                          {isClickable && (
                            <ChatContext
                              date={digest.date}
                              battleTags={tags}
                              quotes={quotes}
                              expanded={isExpanded}
                              selectable={isAdmin}
                              onSaveQuotes={(newQ) => handleSaveQuotes(key, 0, newQ)}
                            />
                          )}
                          {matchContext && tags.length > 0 && (() => {
                            const ids = new Set();
                            for (const tag of tags) {
                              for (const id of matchContext[tag] || []) ids.add(id);
                            }
                            if (ids.size === 0) return null;
                            return (
                              <div className="digest-game-links">
                                {[...ids].slice(0, 3).map((id) => (
                                  <Link key={id} to={`/match/${id}`} className="digest-match-link" onClick={(e) => e.stopPropagation()}>
                                    game <FiExternalLink size={10} />
                                  </Link>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Stat Picker (admin editorial mode) ───────────────── */

const STAT_CATEGORIES = [
  { key: "WINNER", label: "Winner", cls: "winner" },
  { key: "LOSER", label: "Loser", cls: "loser" },
  { key: "GRINDER", label: "Grinder", cls: "grinder" },
  { key: "HOTSTREAK", label: "Hot Streak", cls: "hotstreak" },
  { key: "COLDSTREAK", label: "Cold Streak", cls: "coldstreak" },
];

const StatPicker = ({ candidates, selectedStats, onToggle }) => {
  if (!candidates) return null;

  return (
    <div className="stat-picker">
      <div className="stat-picker-label">Player Stats</div>
      {STAT_CATEGORIES.map(({ key, label, cls }) => {
        const items = candidates[key] || [];
        if (items.length === 0) return null;
        const selectedIdx = selectedStats[key] ?? null;
        return (
          <div key={key} className={`stat-picker-category stat-picker-category--${cls}`}>
            <span className="stat-picker-category-label">{label}</span>
            <div className="stat-picker-candidates">
              {items.map((c, i) => {
                const isSelected = selectedIdx === i;
                return (
                  <button
                    key={c.battleTag}
                    className={`stat-picker-candidate${isSelected ? " stat-picker-candidate--selected" : ""}`}
                    onClick={() => onToggle(key, i)}
                  >
                    <span className="stat-picker-candidate-name">{c.name}</span>
                    <span className="stat-picker-candidate-record">{c.wins}W-{c.losses}L</span>
                    <FormDots form={c.form} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Digest Editor (admin editorial mode) ────────────── */

// Sections with semicolon-separated items that can be toggled
const EDITABLE_SECTIONS = [
  { key: "DRAMA", label: "Drama", cls: "drama" },
  { key: "BANS", label: "Bans", cls: "bans" },
  { key: "HIGHLIGHTS", label: "Highlights", cls: "highlights" },
];

const DigestEditor = ({ date, apiKey, nameSet, nameToTag, onPublished }) => {
  const [draft, setDraft] = useState(null);
  const [currentDigest, setCurrentDigest] = useState(null);
  // Per-section selections: { DRAMA: Set, BANS: Set, HIGHLIGHTS: Set }
  const [sectionSelections, setSectionSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [publishState, setPublishState] = useState("idle"); // idle | publishing | published
  const [statCandidates, setStatCandidates] = useState(null);
  const [selectedStats, setSelectedStats] = useState({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${RELAY_URL}/api/admin/digest/${date}/draft`, {
        headers: { "X-API-Key": apiKey },
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${RELAY_URL}/api/admin/digest/${date}/stat-candidates`, {
        headers: { "X-API-Key": apiKey },
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([draftData, candidatesData]) => {
      const pubDigest = draftData?.digest || "";
      const pubSections = parseDigestSections(pubDigest);

      if (draftData?.draft) {
        setDraft(draftData.draft);
        setCurrentDigest(draftData.digest);
        const draftSections = parseDigestSections(draftData.draft);

        // Pre-select items in each editable section by matching to published digest
        const selections = {};
        for (const { key } of EDITABLE_SECTIONS) {
          const draftSec = draftSections.find((s) => s.key === key);
          if (!draftSec) continue;
          const draftItems = draftSec.content.split(/;\s*/).map((i) => i.trim()).filter(Boolean);
          if (draftItems.length === 0) continue;

          const pubSec = pubSections.find((s) => s.key === key);
          const pubItems = pubSec
            ? pubSec.content.split(/;\s*/).map((i) => i.trim()).filter(Boolean)
            : [];

          const sel = new Set();
          for (let i = 0; i < draftItems.length; i++) {
            const prefix = draftItems[i].slice(0, 30).toLowerCase();
            if (pubItems.some((p) => p.slice(0, 30).toLowerCase() === prefix)) {
              sel.add(i);
            }
          }
          selections[key] = sel;
        }
        setSectionSelections(selections);
      }

      // Pre-select stat candidates that match current published stat lines
      const candidates = candidatesData?.candidates;
      if (candidates) {
        setStatCandidates(candidates);
        const initStats = {};
        for (const cat of STAT_CATEGORIES) {
          const pubStat = pubSections.find((s) => s.key === cat.key);
          if (!pubStat) continue;
          const pubParsed = parseStatLine(pubStat.content);
          if (!pubParsed) continue;
          const items = candidates[cat.key] || [];
          const matchIdx = items.findIndex((c) => c.battleTag === pubParsed.battleTag);
          if (matchIdx >= 0) initStats[cat.key] = matchIdx;
        }
        setSelectedStats(initStats);
      }

      setLoading(false);
    }).catch(() => setLoading(false));
  }, [date, apiKey]);

  // Parse all editable sections from draft
  const editableSections = useMemo(() => {
    if (!draft) return [];
    const draftSections = parseDigestSections(draft);
    const result = [];
    for (const { key, label, cls } of EDITABLE_SECTIONS) {
      const sec = draftSections.find((s) => s.key === key);
      if (!sec) continue;
      const items = sec.content.split(/;\s*/).map((i) => i.trim()).filter(Boolean);
      if (items.length === 0) continue;
      result.push({ key, label, cls, items });
    }
    return result;
  }, [draft]);

  // Parse SPIKES from draft for exploration
  const spikes = useMemo(() => {
    if (!draft) return [];
    const draftSections = parseDigestSections(draft);
    const sec = draftSections.find((s) => s.key === "SPIKES");
    if (!sec) return [];
    return sec.content.split(/;\s*/).map((s) => s.trim()).filter(Boolean).map((text) => {
      const timeMatch = text.match(/^(\d{1,2}:\d{2})/);
      if (!timeMatch) return null;
      const from = timeMatch[1].padStart(5, "0");
      const [h, m] = from.split(":").map(Number);
      const endMin = m + 4;
      const to = `${String(h + Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
      return { text, from, to };
    }).filter(Boolean);
  }, [draft]);

  const [expandedSpike, setExpandedSpike] = useState(null);
  // Per-spike analysis results: Map<index, { DRAMA: [], HIGHLIGHTS: [], BANS: [] } | "loading">
  const [spikeAnalysis, setSpikeAnalysis] = useState({});

  const handleAnalyzeSpike = useCallback(async (idx) => {
    const spike = spikes[idx];
    if (!spike || spikeAnalysis[idx]) return;
    setSpikeAnalysis((prev) => ({ ...prev, [idx]: "loading" }));
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/digest/${date}/analyze-spike`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ from: spike.from, to: spike.to }),
      });
      if (res.ok) {
        const data = await res.json();
        setSpikeAnalysis((prev) => ({ ...prev, [idx]: data.suggestions || {} }));
      } else {
        setSpikeAnalysis((prev) => ({ ...prev, [idx]: {} }));
      }
    } catch {
      setSpikeAnalysis((prev) => ({ ...prev, [idx]: {} }));
    }
  }, [spikes, date, apiKey, spikeAnalysis]);

  // Add a suggested item from spike analysis into an editable section's draft items
  const handleAddSuggestion = useCallback((sectionKey, text) => {
    // Append item to the section in editableSections and auto-select it
    // We do this by mutating the draft to inject the item, then re-parsing
    setDraft((prev) => {
      if (!prev) return prev;
      const sections = parseDigestSections(prev);
      const sec = sections.find((s) => s.key === sectionKey);
      if (sec) {
        sec.content = sec.content + "; " + text;
      } else {
        sections.push({ key: sectionKey, content: text });
      }
      return sections.map((s) => `${s.key}: ${s.content}`).join("\n");
    });
    // Auto-select the newly added item (it'll be the last one)
    setTimeout(() => {
      setSectionSelections((prev) => {
        const draftSections = parseDigestSections(draft || "");
        const sec = draftSections.find((s) => s.key === sectionKey);
        const items = sec ? sec.content.split(/;\s*/).map((i) => i.trim()).filter(Boolean) : [];
        const sel = new Set(prev[sectionKey] || []);
        sel.add(items.length); // The new item will be at the end
        return { ...prev, [sectionKey]: sel };
      });
    }, 0);
    setPublishState("idle");
  }, [draft]);

  const toggleItem = useCallback((sectionKey, idx) => {
    setSectionSelections((prev) => {
      const sel = new Set(prev[sectionKey] || []);
      if (sel.has(idx)) sel.delete(idx);
      else sel.add(idx);
      return { ...prev, [sectionKey]: sel };
    });
    setPublishState("idle");
  }, []);

  const toggleStat = useCallback((key, idx) => {
    setSelectedStats((prev) => {
      const next = { ...prev };
      if (next[key] === idx) delete next[key];
      else next[key] = idx;
      return next;
    });
    setPublishState("idle");
  }, []);

  const handlePublish = async () => {
    setPublishState("publishing");
    try {
      // Build per-section selectedItems payload
      const selectedItems = {};
      for (const { key } of editableSections) {
        const sel = sectionSelections[key];
        if (sel) selectedItems[key] = [...sel].sort((a, b) => a - b);
      }

      // Build selectedStats payload from candidate indices
      const statsPayload = {};
      if (statCandidates) {
        for (const cat of STAT_CATEGORIES) {
          const idx = selectedStats[cat.key];
          if (idx !== undefined && idx !== null) {
            const candidate = statCandidates[cat.key]?.[idx];
            if (candidate) statsPayload[cat.key] = candidate.formatted;
          } else {
            statsPayload[cat.key] = null;
          }
        }
      }

      const body = { selectedItems };
      if (statCandidates) body.selectedStats = statsPayload;

      const res = await fetch(`${RELAY_URL}/api/admin/digest/${date}/curate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentDigest(data.digest);
        if (onPublished) onPublished(data.digest);
        setPublishState("published");
        setTimeout(() => setPublishState((s) => s === "published" ? "idle" : s), 2500);
      } else {
        setPublishState("idle");
      }
    } catch {
      setPublishState("idle");
    }
  };

  const combinedNameSet = useMemo(() => {
    const names = new Set(nameSet);
    if (nameToTag) {
      for (const name of nameToTag.keys()) names.add(name);
    }
    return names;
  }, [nameSet, nameToTag]);

  if (loading) return <div className="digest-editor"><div className="digest-editor-loading">Loading draft...</div></div>;
  if (!draft && !statCandidates) return <div className="digest-editor"><div className="digest-editor-loading">No draft or stats available</div></div>;

  const totalSelected = editableSections.reduce((sum, { key }) => sum + (sectionSelections[key]?.size || 0), 0);
  const canPublish = totalSelected > 0 || !!statCandidates;

  return (
    <div className="digest-editor">
      <div className="digest-editor-header">
        <span className="digest-editor-title">Editorial — {date}</span>
      </div>
      {editableSections.map(({ key, label, cls, items }) => {
        const sel = sectionSelections[key] || new Set();
        return (
          <div key={key} className="digest-editor-section">
            <div className="digest-editor-section-header">
              <span className={`digest-editor-section-label digest-editor-section-label--${cls}`}>{label}</span>
              <span className="digest-editor-count">{sel.size}/{items.length}</span>
            </div>
            <div className="digest-editor-items">
              {items.map((item, i) => {
                const isSelected = sel.has(i);
                const { summary, quotes } = splitQuotes(item);
                return (
                  <button
                    key={i}
                    className={`digest-editor-item ${isSelected ? "digest-editor-item--selected" : "digest-editor-item--deselected"}`}
                    onClick={() => toggleItem(key, i)}
                  >
                    <span className="digest-editor-item-check">{isSelected ? "\u2713" : ""}</span>
                    <div className="digest-editor-item-content">
                      <span className="digest-editor-item-summary">
                        {highlightNames(summary, combinedNameSet)}
                      </span>
                      {quotes.length > 0 && (
                        <div className="digest-quotes">
                          {quotes.map((q, qi) => (
                            <div key={qi} className="digest-quote">{q}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {spikes.length > 0 && (
        <div className="digest-editor-section">
          <div className="digest-editor-section-header">
            <span className="digest-editor-section-label digest-editor-section-label--spikes">Spikes</span>
            <span className="digest-editor-count">{spikes.length} hot moments</span>
          </div>
          <div className="digest-editor-spikes">
            {spikes.map((spike, i) => {
              const isExpanded = expandedSpike === i;
              const analysis = spikeAnalysis[i];
              const isLoading = analysis === "loading";
              const suggestions = analysis && analysis !== "loading" ? analysis : null;
              return (
                <div key={i} className="digest-editor-spike">
                  <div className="digest-editor-spike-row">
                    <button
                      className={`digest-editor-spike-btn${isExpanded ? " digest-editor-spike-btn--active" : ""}`}
                      onClick={() => {
                        setExpandedSpike(isExpanded ? null : i);
                        if (!isExpanded && !analysis) handleAnalyzeSpike(i);
                      }}
                    >
                      <span className="digest-editor-spike-time">{spike.from}</span>
                      <span className="digest-editor-spike-text">{spike.text}</span>
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="digest-editor-spike-detail">
                      {isLoading && <div className="digest-editor-spike-loading">Analyzing...</div>}
                      {suggestions && Object.entries(suggestions).map(([secKey, items]) => {
                        if (!items || items.length === 0) return null;
                        const meta = EDITABLE_SECTIONS.find((s) => s.key === secKey);
                        if (!meta) return null;
                        return (
                          <div key={secKey} className="digest-editor-spike-suggestions">
                            <span className={`digest-editor-section-label digest-editor-section-label--${meta.cls}`}>{meta.label}</span>
                            {items.map((item, j) => {
                              const { summary, quotes } = splitQuotes(item);
                              return (
                                <div key={j} className="digest-editor-spike-suggestion">
                                  <div className="digest-editor-spike-suggestion-text">
                                    <span>{highlightNames(summary, combinedNameSet)}</span>
                                    {quotes.length > 0 && (
                                      <div className="digest-quotes">
                                        {quotes.map((q, qi) => (
                                          <div key={qi} className="digest-quote">{q}</div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    className="digest-editor-spike-add"
                                    onClick={() => handleAddSuggestion(secKey, item)}
                                    title={`Add to ${meta.label}`}
                                  >+</button>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                      {suggestions && Object.values(suggestions).every((v) => !v || v.length === 0) && (
                        <div className="digest-editor-spike-loading">Nothing notable found</div>
                      )}
                      <ChatContext
                        date={date}
                        fromTime={spike.from}
                        toTime={spike.to}
                        expanded={true}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <StatPicker
        candidates={statCandidates}
        selectedStats={selectedStats}
        onToggle={toggleStat}
      />
      <button
        className={`digest-editor-publish${publishState === "published" ? " digest-editor-publish--success" : ""}`}
        onClick={handlePublish}
        disabled={publishState === "publishing" || !canPublish}
      >
        {publishState === "publishing" ? "Publishing..." : publishState === "published" ? "\u2713 Published" : `Publish ${totalSelected} item${totalSelected !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
};

/* ── News Page ───────────────────────────────────────── */

const News = () => {
  const { onlineUsers, messages } = useChatStream();
  const [allDigests, setAllDigests] = useState([]);
  const [digestIdx, setDigestIdx] = useState(0);
  const [weeklyDigests, setWeeklyDigests] = useState([]);
  const [weeklyIdx, setWeeklyIdx] = useState(0);
  const [viewMode, setViewMode] = useState("daily");

  // Editorial mode detection
  const location = useLocation();
  const history = useHistory();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const editMode = searchParams.get("edit") === "1";
  const urlDate = searchParams.get("date");

  const [adminKey, setAdminKey] = useState(() => {
    try { return localStorage.getItem("chat_admin_key"); } catch { return null; }
  });
  const [keyInput, setKeyInput] = useState("");
  const isAdmin = editMode && !!adminKey;

  const handleKeySubmit = useCallback(() => {
    const key = keyInput.trim();
    if (!key) return;
    try { localStorage.setItem("chat_admin_key", key); } catch { /* ignore */ }
    setAdminKey(key);
    setKeyInput("");
  }, [keyInput]);

  // Fetch all digests (today + past) and weekly digests
  useEffect(() => {
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
      // Sync with URL date param
      if (urlDate && combined.length > 0) {
        const idx = combined.findIndex((d) => d.date === urlDate);
        if (idx >= 0) setDigestIdx(idx);
      }
    });
  }, []);

  // Build name set + name→battleTag map for digest highlighting
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
    if (editMode && allDigests[idx]) {
      const params = new URLSearchParams(location.search);
      params.set("date", allDigests[idx].date);
      history.replace({ search: params.toString() });
    }
  }, [editMode, allDigests, history, location.search]);

  const currentDigest = allDigests[digestIdx] || null;
  const digestLabel = currentDigest ? formatDigestLabel(currentDigest.date) : null;

  const currentWeekly = weeklyDigests[weeklyIdx] || null;
  const weeklyLabel = currentWeekly ? formatWeeklyLabel(currentWeekly.week_start, currentWeekly.week_end) : null;

  const hasWeekly = weeklyDigests.length > 0;

  // When editor publishes, update the matching digest in local state
  const handleEditorPublished = useCallback((newDigestText) => {
    if (!currentDigest) return;
    setAllDigests((prev) =>
      prev.map((d) =>
        d.date === currentDigest.date ? { ...d, digest: newDigestText } : d
      )
    );
  }, [currentDigest]);

  // Editorial date — use current daily digest date (skip "today so far" which has no draft)
  const editorialDate = useMemo(() => {
    if (!isAdmin || !currentDigest) return null;
    const today = new Date().toISOString().slice(0, 10);
    // "Today so far" has no stored draft — skip it
    if (currentDigest.date === today) return null;
    return currentDigest.date;
  }, [isAdmin, currentDigest]);

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
    } catch { /* ignore */ }
    setRefreshing(false);
  }, [adminKey, refreshing]);

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
              onDigestUpdated={handleEditorPublished}
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
        {editMode && viewMode === "daily" && !adminKey && (
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
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleKeySubmit()}
              />
              <button className="digest-editor-key-btn" onClick={handleKeySubmit} disabled={!keyInput.trim()}>
                Save
              </button>
            </div>
          </div>
        )}
        {editorialDate && viewMode === "daily" && (
          <DigestEditor
            date={editorialDate}
            apiKey={adminKey}
            nameSet={nameSet}
            nameToTag={nameToTag}
            onPublished={handleEditorPublished}
          />
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
