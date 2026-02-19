import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw, FiX, FiPlus, FiMenu, FiShare2, FiCamera } from "react-icons/fi";
import html2canvas from "html2canvas";
import ChatContext from "../ChatContext";
import { fetchAndCacheProfile } from "../../lib/profileCache";
import { CountryFlag, ConfirmModal, PageNav, Button } from "../ui";
import FormDots from "../FormDots";
import PeonLoader from "../PeonLoader";
import useWeeklyEditorial, {
  TOGGLEABLE_SECTIONS,
  STAT_LINES,
} from "../../lib/useWeeklyEditorial";
import useVariantGen from "../../lib/useVariantGen";
import VariantPicker from "./VariantPicker";
import {
  COVER_BACKGROUNDS,
  hashDate,
  formatWeekRange,
  parseDigestSections,
  parseMentions,
  parseStatLine,
  extractMentionedTags,
  splitQuotes,
  groupQuotesBySpeaker,
  getSpotlightExtras,
  buildStatBlurb,
  parsePowerRankings,
  parseUpsets,
  parseATSpotlight,
  parseMatchStats,
  parseNewBlood,
  parseStreakDaily,
  parseStreakSpectrum,
} from "../../lib/digestUtils";
import "../../styles/pages/Magazine.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RACE_ICONS = {
  HU: "/icons/human.png",
  ORC: "/icons/orc.png",
  NE: "/icons/elf.png",
  UD: "/icons/undead.png",
};

/** Map hero display names (as they appear in digest text) → icon filenames */
const HERO_ICON_MAP = {
  "Shadow Hunter": "shadowhunter", "Death Knight": "deathknight", "Archmage": "archmage",
  "Tauren Chieftain": "taurenchieftain", "Lich": "lich", "Blademaster": "blademaster",
  "Mountain King": "mountainking", "Paladin": "paladin", "Far Seer": "farseer",
  "Keeper": "keeperofthegrove", "Crypt Lord": "cryptlord", "Priestess": "priestessofthemoon",
  "Dreadlord": "dreadlord", "Naga": "sorceror", "Sea Witch": "seawitch", "Pit Lord": "pitlord",
  "Panda": "pandarenbrewmaster", "Dark Ranger": "bansheeranger", "Demon Hunter": "demonhunter",
  "Tinker": "tinker", "Beastmaster": "beastmaster", "Alchemist": "alchemist",
  "Firelord": "avatarofflame", "Warden": "warden",
};

/** Extract hero icon filenames from award detail text */
const extractHeroIcons = (detail) => {
  const icons = [];
  for (const [name, file] of Object.entries(HERO_ICON_MAP)) {
    if (detail.includes(name)) icons.push(file);
  }
  return icons;
};

/** Clean up summary text after quote extraction — removes empty paren blocks, stray punctuation */
const cleanSummary = (text) =>
  text
    .replace(/\([;,\s]*\)/g, "")       // "(; ; ; )" or "()" left after quote extraction
    .replace(/\n+/g, " ")              // collapse newlines
    .replace(/\s{2,}/g, " ")           // collapse spaces
    .replace(/\s+([.,;])/g, "$1")      // remove space before punctuation
    .replace(/[.,;]+\s*$/, "")         // trim trailing punctuation
    .trim();

/** Highlight known player names in narrative text as gold links/spans */
const highlightNames = (text, nameToTag) => {
  if (!nameToTag || nameToTag.size === 0) return text;
  const names = [...nameToTag.keys()]
    .filter((n) => n.length >= 3)
    .sort((a, b) => b.length - a.length);
  if (names.length === 0) return text;
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "g");
  const parts = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tag = nameToTag.get(m[0]);
    if (tag && tag.includes("#")) {
      parts.push(
        <Link key={k++} to={`/player/${encodeURIComponent(tag)}`} className="mg-inline-name">{m[0]}</Link>
      );
    } else {
      parts.push(<span key={k++} className="mg-inline-name">{m[0]}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
};

/* ═══════════════════════════════════════════════════════
   EDITORIAL HELPERS
   ═══════════════════════════════════════════════════════ */

/** Inline editable text — click to edit, blur to save */
const EditableText = ({ value, onSave, tag: Tag = "span", className = "" }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const ref = useRef(null);

  useEffect(() => setText(value), [value]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [editing, text]);

  if (!editing) {
    return (
      <Tag
        className={`${className} mg-editable`}
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {value}
      </Tag>
    );
  }

  return (
    <textarea
      ref={ref}
      className={`${className} mg-editable mg-editable--active`}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { setEditing(false); if (text.trim() !== value) onSave(text.trim()); }}
      onKeyDown={(e) => { if (e.key === "Escape") { setEditing(false); setText(value); } }}
      autoFocus
      rows={4}
    />
  );
};

/** Section visibility toggle for admins */
const SectionToggle = ({ label, sectionKey, hidden, onToggle, children }) => {
  return (
    <div className={`mg-editorial-section-wrap ${hidden ? "mg-editorial-section--hidden" : ""}`}>
      <div className="mg-editorial-section-toggle">
        <label className="mg-editorial-toggle-label">
          <input
            type="checkbox"
            checked={!hidden}
            onChange={() => onToggle(sectionKey)}
          />
          {label}
        </label>
      </div>
      {!hidden && children}
    </div>
  );
};

/** Stat line toggle */
const StatToggle = ({ label, statKey, hidden, onToggle }) => (
  <label className="mg-editorial-stat-toggle">
    <input type="checkbox" checked={!hidden} onChange={() => onToggle(statKey)} />
    {label}
  </label>
);

/** Item drag handle + delete controls for semicolon lists */
const ItemControls = ({ onDelete, dragProps }) => (
  <div className="mg-editorial-item-controls">
    {dragProps && <span className="mg-editorial-drag" {...dragProps} title="Drag to reorder"><FiMenu size={12} /></span>}
    {onDelete && <button className="mg-editorial-delete" onClick={onDelete} title="Delete item"><FiX size={12} /></button>}
  </div>
);

/** Save status bar */
const SaveStatus = ({ state }) => {
  if (state === "idle" || state === "dirty") return null;
  const label = state === "saving" ? "Saving..." : "Saved";
  return (
    <div className={`mg-editorial-status mg-editorial-status--${state}`}>
      {label}
    </div>
  );
};

/** Per-section regen button — only visible in editorial mode */
const SectionRegenButton = ({ sectionKey, regenLoading, onRegen }) => {
  if (!onRegen) return null;
  const loading = regenLoading === sectionKey;
  return (
    <Button
      $ghost
      className={loading ? "mg-section-regen-btn--loading" : ""}
      onClick={() => onRegen(sectionKey)}
      disabled={!!regenLoading}
      title={`Regenerate ${sectionKey}`}
      style={{ padding: "4px 6px" }}
    >
      <FiRefreshCw size={14} />
    </Button>
  );
};

/* ═══════════════════════════════════════════════════════
   ACT 1 — THE STORIES (editorial / narrative)
   ═══════════════════════════════════════════════════════ */

const CoverHero = ({ weekly, coverBg, headline, editorial }) => {
  const stats = weekly.stats;
  const [copied, setCopied] = useState(false);
  const [shotState, setShotState] = useState(null); // null | "copying" | "copied" | "saved"
  const headerRef = useRef(null);

  const handleShare = () => {
    const shareUrl = `https://4v4gg-chat-relay.fly.dev/og/news?week=${weekly.week_start}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleScreenshot = useCallback(async () => {
    if (!headerRef.current || shotState === "copying") return;
    setShotState("copying");
    try {
      // Pre-fetch cover image as data URL to avoid cross-origin dimming
      const img = headerRef.current.querySelector(".mg-header-img");
      let imgDataUrl = null;
      if (img?.src && !img.src.startsWith("data:")) {
        try {
          const proxyUrl = `${RELAY_URL}/api/admin/image-proxy?url=${encodeURIComponent(img.src)}`;
          const resp = await fetch(proxyUrl);
          if (resp.ok) {
            const blob = await resp.blob();
            imgDataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          }
        } catch { /* fall back to useCORS */ }
      }

      const canvas = await html2canvas(headerRef.current, {
        backgroundColor: "#0f0d0b",
        scale: 2,
        useCORS: true,
        onclone: (_doc, el) => {
          // Art collection style: just the image, title, date, faint link
          el.style.cssText = "position:relative;padding:0;background:none;overflow:hidden;margin:0";

          // Hide original text elements and buttons
          for (const hide of el.querySelectorAll(".mg-header-actions, .mg-header-meta, .mg-header-title")) {
            hide.style.display = "none";
          }

          // Full-bleed image
          const imgWrap = el.querySelector(".mg-header-image");
          const clonedImg = el.querySelector(".mg-header-img");
          if (clonedImg && imgDataUrl) clonedImg.src = imgDataUrl;
          if (imgWrap) {
            imgWrap.style.cssText = "position:relative;border:none;border-radius:0;overflow:hidden;outline:none;box-shadow:none;margin:0;padding:0";
          }
          if (clonedImg) {
            clonedImg.style.cssText = "display:block;width:110%;max-width:none;margin:-6% -5%;border:none;outline:none";
          }

          // ── Bottom overlay: title, date, faint link ──
          const overlay = _doc.createElement("div");
          overlay.style.cssText = "position:absolute;bottom:0;left:0;right:0;padding:48px 20px 14px;background:linear-gradient(0deg,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.2) 50%,transparent 100%);z-index:2";

          if (headline) {
            const titleEl = _doc.createElement("div");
            titleEl.style.cssText = "font-family:'Friz_Quadrata_Bold',Georgia,serif;font-size:26px;color:#fcdb33;line-height:1.15;text-shadow:0 2px 8px rgba(0,0,0,0.7);margin-bottom:6px";
            titleEl.textContent = headline;
            overlay.appendChild(titleEl);
          }

          const footRow = _doc.createElement("div");
          footRow.style.cssText = "display:flex;align-items:baseline;justify-content:space-between";

          const dateEl = _doc.createElement("span");
          dateEl.style.cssText = "font-family:'Inconsolata',monospace;font-size:11px;color:rgba(255,255,255,0.55);letter-spacing:0.12em;text-transform:uppercase;text-shadow:0 1px 6px rgba(0,0,0,0.9)";
          dateEl.textContent = formatWeekRange(weekly.week_start, weekly.week_end);
          footRow.appendChild(dateEl);

          const link = _doc.createElement("span");
          link.style.cssText = "font-family:'Inconsolata',monospace;font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:0.06em;text-shadow:0 1px 4px rgba(0,0,0,0.8)";
          link.textContent = "4v4.gg";
          footRow.appendChild(link);

          overlay.appendChild(footRow);
          if (imgWrap) imgWrap.appendChild(overlay);
        },
      });
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      if (blob && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setShotState("copied");
      } else if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `4v4gg-weekly-${weekly.week_start}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setShotState("saved");
      }
    } catch {
      setShotState(null);
    }
    setTimeout(() => setShotState(null), 2000);
  }, [weekly.week_start, shotState]);

  return (
    <header className="mg-header reveal" ref={headerRef} style={{ "--delay": "0.05s" }}>
      <div className="mg-header-meta">
        <span className="mg-header-date">{formatWeekRange(weekly.week_start, weekly.week_end)}</span>
        <span className="mg-header-actions">
          <button className="digest-screenshot-btn" onClick={handleScreenshot} title="Copy as image">
            {shotState === "copying" ? "..." : shotState === "copied" ? "Copied!" : shotState === "saved" ? "Saved!" : <FiCamera size={14} />}
          </button>
          <button className="digest-screenshot-btn" onClick={handleShare} title="Copy share link for Discord">
            {copied ? "Copied!" : <FiShare2 size={14} />}
          </button>
        </span>
      </div>
      {headline && (
        editorial ? (
          <EditableText value={headline} onSave={editorial.onEditHeadline} tag="h1" className="mg-header-title" />
        ) : (
          <h1 className="mg-header-title">{headline}</h1>
        )
      )}
      <div className="mg-header-image">
        <img src={coverBg} alt="" className="mg-header-img" />
      </div>
    </header>
  );
};

/** Big lead story — headline + attributed pull quotes */
const FeatureStory = ({ lead, quotes, curated, nameToTag, editorial }) => {
  if (!lead) return null;

  // Show all quotes from the lead story (already scoped to first item)
  const attributed = quotes;

  // For QuoteBrowser in editorial mode — extract mentioned battle tags
  const mentionedTags = editorial?.browseMessages && nameToTag
    ? extractMentionedTags(lead, nameToTag)
    : [];

  return (
    <section className="mg-feature reveal" style={{ "--delay": "0.10s" }}>
      <div className="mg-feature-body">
        <div className="mg-section-header">
          <span className="mg-section-label mg-section-label--red">Top Story</span>
          {editorial && <SectionRegenButton sectionKey="DRAMA" regenLoading={editorial.regenLoading} onRegen={editorial.regenSection} />}
          <div className="mg-section-rule" />
        </div>
        {editorial ? (
          <EditableText value={lead} onSave={(t) => editorial.onEditLead(t)} tag="p" className="mg-feature-lead" />
        ) : (
          <p className="mg-feature-lead">{highlightNames(lead, nameToTag)}</p>
        )}
        {editorial?.handleEditSection ? (
          <>
            <EditableQuotes quotes={quotes} statKey="DRAMA" editorial={editorial} />
            {mentionedTags.map((tag) => {
              const name = tag.split("#")[0];
              return (
                <QuoteBrowser key={tag} statKey="DRAMA" battleTag={tag} editorial={editorial} label={name} />
              );
            })}
          </>
        ) : attributed.length > 0 ? (
          <div className="mg-quotes">
            {groupQuotesBySpeaker(attributed).map((group, i) => (
              <div key={i} className="mg-quote-group">
                {group.name && <span className="mg-quote-name">{group.name}</span>}
                {group.messages.map((msg, j) => (
                  <blockquote key={j} className="mg-quote">{msg}</blockquote>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

/** Parse ban text into structured { name, duration, reason, matchId } */
const parseBanItem = (text) => {
  const m = text.trim().match(/^(\S+)\s+banned\s+(?:(\d+)\s+days?\s+)?for\s+(.+)$/i);
  if (!m) return null;
  let reason = m[3];
  let matchId = null;
  // Extract match ID patterns like "match 12345" or "(match 12345)" or "match ID 12345"
  const matchIdRe = /\(?match(?:\s+ID)?\s+(\d+)\)?/i;
  const mm = reason.match(matchIdRe);
  if (mm) {
    matchId = mm[1];
    reason = reason.replace(matchIdRe, "").replace(/\s{2,}/g, " ").trim();
    if (reason.endsWith(",") || reason.endsWith(";")) reason = reason.slice(0, -1).trim();
  }
  return { name: m[1], duration: m[2] ? `${m[2]}d` : "perm", reason, matchId };
};

/** Secondary stories grid — sub-drama + highlights + bans */
const StoriesGrid = ({ stories, highlights, bans, nameToTag, editorial }) => {
  const highlightItems = highlights ? highlights.split(/;\s*/).filter(Boolean) : [];
  const banRows = bans ? bans.split(/;\s*/).map(parseBanItem).filter(Boolean) : [];
  const [dragState, setDragState] = useState({ section: null, from: null, over: null });

  if (stories.length === 0 && highlightItems.length === 0 && banRows.length === 0) return null;

  const handleDrop = (section, toIdx, offset = 0) => {
    const { from } = dragState;
    setDragState({ section: null, from: null, over: null });
    if (from == null || from === toIdx) return;
    editorial?.reorderItem?.(section, from + offset, toIdx + offset);
  };

  /** Render an editorial item list — same [grip][x] pattern as editorial panel */
  const renderList = (items, sectionKey, { offset = 0, onEdit } = {}) => (
    <ul className="mg-sidebar-list">
      {items.map((text, i) => {
        const draftIdx = i + offset;
        const isDragOver = dragState.section === sectionKey && dragState.over === i;
        return (
          <li
            key={i}
            className={`mg-sidebar-item${isDragOver ? " mg-sidebar-item--dragover" : ""}`}
            onDragOver={(e) => { if (dragState.section === sectionKey) { e.preventDefault(); setDragState((s) => ({ ...s, over: i })); } }}
            onDragLeave={() => setDragState((s) => s.over === i ? { ...s, over: null } : s)}
            onDrop={(e) => { if (dragState.section === sectionKey) { e.preventDefault(); handleDrop(sectionKey, i, offset); } }}
          >
            {editorial && (
              <ItemControls
                onDelete={() => editorial.deleteItem(sectionKey, draftIdx)}
                dragProps={{
                  draggable: true,
                  onDragStart: () => setDragState({ section: sectionKey, from: i, over: null }),
                  onDragEnd: () => setDragState({ section: null, from: null, over: null }),
                }}
              />
            )}
            {onEdit ? (
              <EditableText value={text.trim()} onSave={(t) => onEdit(i, t)} className="mg-sidebar-item-text" />
            ) : (
              highlightNames(text.trim(), nameToTag)
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className="mg-section mg-stories reveal" style={{ "--delay": "0.14s" }}>
      <div className="mg-stories-grid">
        {/* Left column: drama sub-stories */}
        {stories.length > 0 && (
          <div className="mg-stories-col">
            <div className="mg-section-header">
              <span className="mg-section-label">Also This Week</span>
              {editorial && <SectionRegenButton sectionKey="DRAMA" regenLoading={editorial.regenLoading} onRegen={editorial.regenSection} />}
              <div className="mg-section-rule" />
            </div>
            {renderList(stories, "DRAMA", { offset: 1, onEdit: editorial?.onEditDrama })}
          </div>
        )}

        {/* Right column: highlights + bans */}
        <div className="mg-stories-col">
          {highlightItems.length > 0 && (
            <div className="mg-stories-sidebar">
              <div className="mg-section-header">
                <span className="mg-section-label mg-section-label--green">Highlights</span>
                {editorial && <SectionRegenButton sectionKey="HIGHLIGHTS" regenLoading={editorial.regenLoading} onRegen={editorial.regenSection} />}
                <div className="mg-section-rule" />
              </div>
              {renderList(highlightItems, "HIGHLIGHTS", { onEdit: editorial?.onEditHighlight })}
            </div>
          )}
          {banRows.length > 0 && (
            <div className="mg-stories-sidebar">
              <div className="mg-section-header">
                <span className="mg-section-label mg-section-label--red">Bans</span>
                {editorial && <SectionRegenButton sectionKey="BANS" regenLoading={editorial.regenLoading} onRegen={editorial.regenSection} />}
                <div className="mg-section-rule" />
              </div>
              <div className="mg-bans-table">
                {banRows.map((b, i) => (
                  <div key={i} className="mg-ban-row">
                    <div className="mg-ban-header">
                      <span className="mg-ban-name">{b.name}</span>
                      <span className="mg-ban-duration">{b.duration}</span>
                    </div>
                    <span className="mg-ban-reason">
                      {b.reason}
                      {b.matchId && (
                        <>
                          {" "}
                          <Link to={`/match/${b.matchId}`} className="mg-ban-match-link">Match</Link>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/** Week in Review — standalone wrap-up section */
const RecapSection = ({ content, editorial }) => {
  if (!content) return null;
  return (
    <section className="mg-section mg-recap-wrap reveal" style={{ "--delay": "0.40s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label">Week in Review</span>
        {editorial && <SectionRegenButton sectionKey="RECAP" regenLoading={editorial.regenLoading} onRegen={editorial.regenSection} />}
        <div className="mg-section-rule" />
      </div>
      {editorial ? (
        <EditableText value={content} onSave={(t) => editorial.onEditRecap(t)} tag="p" className="mg-recap-text" />
      ) : (
        <p className="mg-recap-text">{content}</p>
      )}
    </section>
  );
};

/* ═══════════════════════════════════════════════════════
   ACT 2 — THE PLAYERS (features / spotlights)
   ═══════════════════════════════════════════════════════ */

/* ── EditableQuotes: drag-to-reorder groups & quotes, remove, add, inline edit ── */
const EditableQuotes = ({ quotes = [], statKey, editorial }) => {
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [dragGroupFrom, setDragGroupFrom] = useState(null);
  const [dragGroupOver, setDragGroupOver] = useState(null);
  const [adding, setAdding] = useState(false);
  const addRef = useRef(null);

  const updateQuotes = (newQuotes) => {
    const formatted = newQuotes.map((q) => `"${q}"`).join("; ");
    editorial.handleEditSection(`${statKey}_QUOTES`, formatted);
  };

  const removeQuote = (idx) => {
    const next = quotes.filter((_, i) => i !== idx);
    if (next.length === 0) {
      editorial.handleEditSection(`${statKey}_QUOTES`, "");
    } else {
      updateQuotes(next);
    }
  };

  const editQuote = (idx, newText) => {
    const next = [...quotes];
    next[idx] = newText;
    updateQuotes(next);
  };

  const handleDrop = (toIdx) => {
    if (dragFrom == null || dragFrom === toIdx) { setDragFrom(null); setDragOver(null); return; }
    const next = [...quotes];
    const [moved] = next.splice(dragFrom, 1);
    next.splice(toIdx, 0, moved);
    setDragFrom(null);
    setDragOver(null);
    updateQuotes(next);
  };

  const addQuote = () => {
    const text = addRef.current?.value?.trim();
    if (!text) return;
    updateQuotes([...quotes, text]);
    addRef.current.value = "";
    setAdding(false);
  };

  const groups = groupQuotesBySpeaker(quotes);

  const handleGroupDrop = (toGi) => {
    if (dragGroupFrom == null || dragGroupFrom === toGi) { setDragGroupFrom(null); setDragGroupOver(null); return; }
    const reordered = [...groups];
    const [moved] = reordered.splice(dragGroupFrom, 1);
    reordered.splice(toGi, 0, moved);
    setDragGroupFrom(null);
    setDragGroupOver(null);
    updateQuotes(reordered.flatMap((g) =>
      g.messages.map((msg) => (g.name ? `${g.name}: ${msg}` : msg))
    ));
  };

  let quoteIdx = 0;

  return (
    <div className="mg-spotlight-quotes">
      {groups.map((group, gi) => {
        const startIdx = quoteIdx;
        return (
          <div
            key={gi}
            className={`mg-quote-group${dragGroupOver === gi ? " mg-quote-group--dragover" : ""}`}
            onDragOver={(e) => { if (dragGroupFrom != null) { e.preventDefault(); setDragGroupOver(gi); } }}
            onDragLeave={() => setDragGroupOver((v) => v === gi ? null : v)}
            onDrop={(e) => { if (dragGroupFrom != null) { e.preventDefault(); handleGroupDrop(gi); } }}
          >
            <div className="mg-quote-group-header">
              {groups.length > 1 && (
                <span
                  className="mg-quote-drag mg-quote-drag--group"
                  draggable
                  onDragStart={(e) => { e.stopPropagation(); setDragGroupFrom(gi); }}
                  onDragEnd={() => { setDragGroupFrom(null); setDragGroupOver(null); }}
                  title="Drag to reorder group"
                ><FiMenu size={14} /></span>
              )}
              {group.name && <span className="mg-quote-name">{group.name}</span>}
            </div>
            {group.messages.map((msg, mi) => {
              const idx = startIdx + mi;
              quoteIdx++;
              return (
                <div
                  key={mi}
                  className={`mg-quote-editable-row${dragOver === idx ? " mg-quote-editable-row--dragover" : ""}`}
                  onDragOver={(e) => { if (dragFrom != null) { e.preventDefault(); setDragOver(idx); } }}
                  onDragLeave={() => setDragOver((v) => v === idx ? null : v)}
                  onDrop={(e) => { if (dragFrom != null) { e.preventDefault(); handleDrop(idx); } }}
                  onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
                >
                  <span className="mg-quote-drag" draggable onDragStart={(e) => { e.stopPropagation(); setDragFrom(idx); }} title="Drag to reorder"><FiMenu size={12} /></span>
                  <button className="mg-quote-remove" onClick={() => removeQuote(idx)} title="Remove quote"><FiX size={12} /></button>
                  <EditableText
                    value={msg}
                    onSave={(t) => editQuote(idx, group.name ? `${group.name}: ${t}` : t)}
                    tag="blockquote"
                    className="mg-quote"
                  />
                </div>
              );
            })}
          </div>
        );
      })}
      {adding ? (
        <div className="mg-quote-add-row">
          <input ref={addRef} className="mg-quote-add-input" placeholder="Speaker: message text" autoFocus onKeyDown={(e) => { if (e.key === "Enter") addQuote(); if (e.key === "Escape") setAdding(false); }} />
          <button className="mg-quote-add-confirm" onClick={addQuote}>Add</button>
        </div>
      ) : (
        <button className="mg-quote-add-btn" onClick={() => setAdding(true)}><FiPlus size={12} /> Add quote</button>
      )}
    </div>
  );
};

/* ── QuoteBrowser: loads player messages and uses shared ChatContext ── */
const QuoteBrowser = ({ statKey, battleTag, editorial, label }) => {
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleToggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (messages) return;
    setLoading(true);
    const result = await editorial.browseMessages(statKey, battleTag);
    setMessages(result);
    setLoading(false);
  };

  const handleApply = (items) => {
    const quotes = items.map((m) => `${m.name}: ${m.text}`);
    editorial.setQuotes(statKey, quotes, { append: true });
    setOpen(false);
  };

  return (
    <div className="mg-quote-browser">
      <Button $secondary onClick={handleToggle}>
        {open ? "Close" : label ? `Browse ${label}` : "Browse Messages"}
      </Button>
      {open && (
        <ChatContext
          messages={messages}
          loading={loading}
          onApply={handleApply}
          selectable
          expandable
          splitView
          showScores
          placeholder="Filter by keyword..."
          applyLabel={(n) => `Use ${n} quote${n !== 1 ? "s" : ""}`}
        />
      )}
    </div>
  );
};

const SpotlightCard = ({ stat, profile, accent, role, blurb, quotes, statKey, heroIcons, victimIcons, killboard, maxHeroKills, editorial }) => {
  if (!stat) return null;
  // For streak types, show only the streak portion (e.g. 16 red dots) not the full week form
  const isStreak = stat.streakLen && stat.streakType;
  const formArr = isStreak
    ? Array(stat.streakLen).fill(stat.streakType === "W")
    : stat.form ? stat.form.split("").map((c) => c === "W") : [];
  const sign = stat.mmrChange > 0 ? "+" : "";
  const hasPic = profile?.pic;

  return (
    <div className={`mg-spotlight-card mg-spotlight-card--${accent}`}>
      {hasPic && (
        <div className="mg-spotlight-avatar">
          <img src={profile.pic} alt="" className="mg-spotlight-avatar-img" />
        </div>
      )}
      <div className="mg-spotlight-content">
        <span className={`mg-spotlight-role mg-spotlight-role--${accent}`}>{role}</span>
        <div className="mg-spotlight-player">
          <Link to={`/player/${encodeURIComponent(stat.battleTag)}`} className="mg-spotlight-name">
            {stat.name}
          </Link>
          {profile?.country && <CountryFlag name={profile.country.toLowerCase()} />}
        </div>
        <div className="mg-spotlight-stats">
          {stat.mmrChange != null ? (
            <span className={`mg-spotlight-mmr ${stat.mmrChange >= 0 ? "mg-text-green" : "mg-text-red"}`}>
              {sign}{stat.mmrChange} MMR
            </span>
          ) : stat.headline && (
            <span className={`mg-spotlight-mmr mg-text-${accent}`}>{stat.headline}</span>
          )}
        </div>
        {heroIcons?.length > 0 && (
          <div className="mg-spotlight-heroes">
            {heroIcons.map((icon) => (
              <img key={icon} src={`/heroes/${icon}.jpeg`} alt={icon} className="mg-spotlight-hero-icon" />
            ))}
          </div>
        )}
        {killboard?.length > 0 ? (
          <div className="mg-killboard mg-killboard--weighted">
            {killboard.map(({ name, count }) => {
              const maxCount = killboard[0].count;
              const size = Math.round(20 + (count / maxCount) * 30);
              return (
                <img key={name} src={`/heroes/${name}.jpeg`} alt={name} className="mg-killboard-icon-weighted" style={{ width: size, height: size }} />
              );
            })}
          </div>
        ) : !heroIcons?.length && formArr.length > 0 ? (
          <FormDots form={formArr} size="small" maxDots={20} showSummary={false} />
        ) : null}
        {editorial?.handleEditSection ? (
          blurb ? (
            <EditableText
              value={typeof blurb === "string" ? blurb : blurb.join(" ")}
              onSave={(t) => editorial.handleEditSection(`${statKey}_BLURB`, t)}
              tag="p"
              className="mg-spotlight-blurb"
            />
          ) : null
        ) : blurb ? (
          <p className="mg-spotlight-blurb">{typeof blurb === "string" ? blurb : blurb.join(" ")}</p>
        ) : null}
        {editorial?.handleEditSection ? (
          <EditableQuotes quotes={quotes} statKey={statKey} editorial={editorial} />
        ) : quotes && quotes.length > 0 ? (
          <div className="mg-spotlight-quotes">
            {groupQuotesBySpeaker(quotes).map((group, i) => (
              <div key={i} className="mg-quote-group">
                {group.name && <span className="mg-quote-name">{group.name}</span>}
                {group.messages.map((msg, j) => (
                  <blockquote key={j} className="mg-quote">{msg}</blockquote>
                ))}
              </div>
            ))}
          </div>
        ) : null}
        {editorial?.browseMessages && (
          <QuoteBrowser statKey={statKey} battleTag={stat.battleTag} editorial={editorial} currentQuotes={quotes} />
        )}
      </div>
    </div>
  );
};

/* ── Streak Timeline: day-grouped dots with streak highlighting ── */
const StreakTimeline = ({ dailyData, type }) => {
  if (!dailyData) return null;
  const { days, streakIdx, streakLen } = dailyData;
  const isHot = type === "HOTSTREAK";

  // Flatten to get global form index per dot
  let globalIdx = 0;
  return (
    <div className="mg-streak-timeline">
      {days.map((day, di) => {
        const dots = day.form.split("").map((ch, fi) => {
          const idx = globalIdx++;
          const inStreak = idx >= streakIdx && idx < streakIdx + streakLen;
          const isWin = ch === "W";
          const dotClass = [
            "mg-streak-dot",
            inStreak ? "mg-streak-dot--highlighted" : "mg-streak-dot--muted",
            isWin ? "mg-streak-dot--win" : "mg-streak-dot--loss",
          ].join(" ");
          return <span key={idx} className={dotClass} />;
        });
        return (
          <div key={di} className="mg-streak-day-group">
            <span className="mg-streak-day-label">{day.day}</span>
            <div className="mg-streak-dots">{dots}</div>
            {day.mmrChange !== 0 && (
              <span className={`mg-streak-day-mmr ${day.mmrChange >= 0 ? "mg-text-green" : "mg-text-red"}`}>
                {day.mmrChange >= 0 ? "+" : ""}{day.mmrChange}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ── Streak Spectrum: horizontal distribution of all players' max streaks ── */
const StreakSpectrum = ({ spectrumData, hotName, coldName }) => {
  if (!spectrumData) return null;
  const { win, loss } = spectrumData;
  if (win.length === 0 && loss.length === 0) return null;

  const maxCount = Math.max(
    ...win.map((e) => e.count),
    ...loss.map((e) => e.count),
    1
  );

  return (
    <div className="mg-streak-spectrum">
      <div className="mg-streak-spectrum-header">
        <span className="mg-streak-spectrum-label mg-text-red">{coldName ? `${coldName} \u2190 Cold` : "\u2190 Cold"}</span>
        <span className="mg-streak-spectrum-center">All Players</span>
        <span className="mg-streak-spectrum-label mg-text-green">{hotName ? `Hot \u2192 ${hotName}` : "Hot \u2192"}</span>
      </div>
      <div className="mg-streak-spectrum-chart">
        <div className="mg-streak-spectrum-side mg-streak-spectrum-side--loss">
          {[...loss].reverse().map((e) => (
            <div key={e.len} className="mg-streak-spectrum-col">
              <div
                className={`mg-streak-spectrum-bar mg-streak-spectrum-bar--loss ${e.len === Math.max(...loss.map((l) => l.len)) ? "mg-streak-spectrum-bar--featured" : ""}`}
                style={{ height: `${(e.count / maxCount) * 100}%` }}
              >
                <span className="mg-streak-spectrum-count">{e.count}</span>
              </div>
              <span className="mg-streak-spectrum-tick">{e.len}L</span>
            </div>
          ))}
        </div>
        <div className="mg-streak-spectrum-axis" />
        <div className="mg-streak-spectrum-side mg-streak-spectrum-side--win">
          {win.map((e) => (
            <div key={e.len} className="mg-streak-spectrum-col">
              <div
                className={`mg-streak-spectrum-bar mg-streak-spectrum-bar--win ${e.len === Math.max(...win.map((w) => w.len)) ? "mg-streak-spectrum-bar--featured" : ""}`}
                style={{ height: `${(e.count / maxCount) * 100}%` }}
              >
                <span className="mg-streak-spectrum-count">{e.count}</span>
              </div>
              <span className="mg-streak-spectrum-tick">{e.len}W</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Streak Card: full-width panel for HOTSTREAK/COLDSTREAK ── */
const StreakCard = ({ stat, profile, accent, role, blurb, quotes, dailyData, type, editorial }) => {
  if (!stat || !dailyData) return null;
  const sign = stat.mmrChange > 0 ? "+" : "";
  const hasPic = profile?.pic;
  const streakLabel = stat.streakLen
    ? `${stat.streakLen}${stat.streakType} streak`
    : stat.headline;

  return (
    <div className={`mg-streak-card mg-streak-card--${accent}`}>
      {hasPic && (
        <div className="mg-streak-card-bg" style={{ backgroundImage: `url(${profile.pic})` }} />
      )}
      <div className="mg-streak-card-overlay" />
      <div className="mg-streak-card-content">
        <div className="mg-streak-card-header">
          <span className={`mg-spotlight-role mg-spotlight-role--${accent}`}>{role}</span>
          <div className="mg-streak-card-player-row">
            <div className="mg-spotlight-player">
              <Link to={`/player/${encodeURIComponent(stat.battleTag)}`} className="mg-spotlight-name">
                {stat.name}
              </Link>
              {profile?.country && <CountryFlag name={profile.country.toLowerCase()} />}
            </div>
            <div className="mg-spotlight-stats">
              <span className={`mg-streak-headline mg-text-${accent}`}>{streakLabel}</span>
              {stat.mmrChange != null && (
                <span className={`mg-spotlight-mmr ${stat.mmrChange >= 0 ? "mg-text-green" : "mg-text-red"}`}>
                  {sign}{stat.mmrChange} MMR
                </span>
              )}
              <span className="mg-spotlight-record">{stat.wins}W-{stat.losses}L</span>
            </div>
          </div>
        </div>
        <StreakTimeline dailyData={dailyData} type={type} />
        {editorial?.handleEditSection ? (
          blurb ? (
            <EditableText
              value={typeof blurb === "string" ? blurb : blurb.join(" ")}
              onSave={(t) => editorial.handleEditSection(`${type}_BLURB`, t)}
              tag="p"
              className="mg-spotlight-blurb"
            />
          ) : null
        ) : blurb ? (
          <p className="mg-spotlight-blurb">{typeof blurb === "string" ? blurb : blurb.join(" ")}</p>
        ) : null}
        <div className="mg-streak-card-quotes-row">
          {editorial?.handleEditSection ? (
            <EditableQuotes quotes={quotes} statKey={type} editorial={editorial} />
          ) : quotes && quotes.length > 0 ? (
            <div className="mg-spotlight-quotes">
              {groupQuotesBySpeaker(quotes).map((group, i) => (
                <div key={i} className="mg-quote-group">
                  {group.name && <span className="mg-quote-name">{group.name}</span>}
                  {group.messages.map((msg, j) => (
                    <blockquote key={j} className="mg-quote">{msg}</blockquote>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
          {editorial?.browseMessages && (
            <QuoteBrowser statKey={type} battleTag={stat.battleTag} editorial={editorial} currentQuotes={quotes} />
          )}
        </div>
      </div>
    </div>
  );
};

const SpotlightsSection = ({ sections, profiles, editorial }) => {
  const STREAK_KEYS = new Set(["HOTSTREAK", "COLDSTREAK"]);
  const cards = [
    { key: "WINNER", role: "Winner", accent: "green" },
    { key: "LOSER", role: "Loser", accent: "red" },
    { key: "GRINDER", role: "Grinder", accent: "white" },
    { key: "HOTSTREAK", role: "Hot Streak", accent: "green" },
    { key: "COLDSTREAK", role: "Cold Streak", accent: "red" },
    { key: "HEROSLAYER", role: "Hero Slayer", accent: "white" },
  ];

  // Parse streak daily data
  const hotDailySec = sections.find((s) => s.key === "HOTSTREAK_DAILY");
  const coldDailySec = sections.find((s) => s.key === "COLDSTREAK_DAILY");
  const hotDailyData = hotDailySec ? parseStreakDaily(hotDailySec.content) : null;
  const coldDailyData = coldDailySec ? parseStreakDaily(coldDailySec.content) : null;
  const dailyMap = { HOTSTREAK: hotDailyData, COLDSTREAK: coldDailyData };

  // Parse spectrum
  const spectrumSec = sections.find((s) => s.key === "STREAK_SPECTRUM");
  const spectrumData = spectrumSec ? parseStreakSpectrum(spectrumSec.content) : null;

  const parsed = cards.map(({ key, role, accent }) => {
    const sec = sections.find((s) => s.key === key);
    const stat = sec ? parseStatLine(sec.content) : null;
    if (!stat) return null;
    const extras = getSpotlightExtras(key, sections);
    const serverBlurb = extras.blurb || null;
    const clientBlurb = !serverBlurb ? buildStatBlurb(stat, accent) : null;
    const blurb = serverBlurb || (clientBlurb?.length > 0 ? clientBlurb.join(" ") : null);
    const quotes = extras.quotes.length > 0 ? extras.quotes : [];
    const dailyData = STREAK_KEYS.has(key) ? dailyMap[key] : null;
    // Hero icons for HEROSLAYER
    const heroesSec = key === "HEROSLAYER" ? sections.find((s) => s.key === "HEROSLAYER_HEROES") : null;
    const heroIcons = heroesSec ? heroesSec.content.split(",").map((h) => h.trim()).filter(Boolean) : null;
    const victimsSec = key === "HEROSLAYER" ? sections.find((s) => s.key === "HEROSLAYER_VICTIMS") : null;
    const victimIcons = victimsSec ? victimsSec.content.split(",").map((h) => h.trim()).filter(Boolean) : null;
    // Killboard: "deathknight:15,lich:12,..." → grouped [{name, count}] sorted by count desc
    const killboardSec = key === "HEROSLAYER" ? sections.find((s) => s.key === "HEROSLAYER_KILLBOARD") : null;
    const killboard = killboardSec ? killboardSec.content.split(",").map((entry) => {
      const [name, countStr] = entry.trim().split(":");
      return name && countStr ? { name, count: parseInt(countStr, 10) } : null;
    }).filter(Boolean) : null;
    // Max hero kills in a single game
    const maxSec = key === "HEROSLAYER" ? sections.find((s) => s.key === "HEROSLAYER_MAX") : null;
    const maxHeroKills = maxSec ? parseInt(maxSec.content.trim(), 10) || null : null;
    return { key, stat, role, accent, blurb, quotes, dailyData, heroIcons, victimIcons, killboard, maxHeroKills };
  }).filter(Boolean);

  if (parsed.length === 0) return null;

  // Separate standard cards from streak cards
  const standardCards = parsed.filter((c) => !STREAK_KEYS.has(c.key) || !c.dailyData);
  const streakCards = parsed.filter((c) => STREAK_KEYS.has(c.key) && c.dailyData);

  // Get player names for spectrum labels
  const hotStat = parsed.find((c) => c.key === "HOTSTREAK");
  const coldStat = parsed.find((c) => c.key === "COLDSTREAK");

  return (
    <section className="mg-section mg-spotlights reveal" style={{ "--delay": "0.20s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label">Player Spotlights</span>
        {editorial && (
          <SectionRegenButton
            sectionKey="SPOTLIGHTS"
            regenLoading={editorial.regenLoading}
            onRegen={() => editorial.regenSpotlights()}
          />
        )}
        <div className="mg-section-rule" />
      </div>
      {standardCards.length > 0 && (
        <div className="mg-spotlight-grid">
          {standardCards.map(({ key, stat, role, accent, blurb, quotes, heroIcons, victimIcons, killboard, maxHeroKills }) => (
            <SpotlightCard key={stat.battleTag} stat={stat} profile={profiles.get(stat.battleTag)} accent={accent} role={role} blurb={blurb} quotes={quotes} heroIcons={heroIcons} victimIcons={victimIcons} killboard={killboard} maxHeroKills={maxHeroKills} statKey={key} editorial={editorial} />
          ))}
        </div>
      )}
      {streakCards.map(({ key, stat, role, accent, blurb, quotes, dailyData }) => (
        <StreakCard key={stat.battleTag} stat={stat} profile={profiles.get(stat.battleTag)} accent={accent} role={role} blurb={blurb} quotes={quotes} dailyData={dailyData} type={key} editorial={editorial} />
      ))}
      {spectrumData && (
        <StreakSpectrum spectrumData={spectrumData} hotName={hotStat?.stat?.name} coldName={coldStat?.stat?.name} />
      )}
    </section>
  );
};

const UpsetsSection = ({ content, profiles }) => {
  const upsets = parseUpsets(content).filter((u) =>
    u.underdogMmrs.every((m) => m > 0) && u.favoriteMmrs.every((m) => m > 0)
  );
  if (upsets.length === 0) return null;

  const biggest = upsets.reduce((a, b) => (b.mmrGap > a.mmrGap ? b : a), upsets[0]);
  const u = biggest;
  const mapClean = u.map.replace(/ /g, "").replace(/'/g, "");

  return (
    <section className="mg-section reveal" style={{ "--delay": "0.24s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label mg-section-label--green">Upset of the Week</span>
        <div className="mg-section-rule" />
      </div>
      <div className="mg-upset-card">
        <div className="mg-upset-map-bg" style={{ backgroundImage: `url(/maps/${mapClean}.png)` }} />
        <div className="mg-upset-overlay" />
        <div className="mg-upset-content">
          <div className="mg-upset-badge">
            <span className="mg-upset-gap">{u.mmrGap}</span>
            <span className="mg-upset-gap-label">MMR gap</span>
          </div>
          <div className="mg-upset-teams">
            <div className="mg-upset-team mg-upset-team--underdogs">
              <span className="mg-upset-team-label mg-text-green">Underdogs</span>
              <span className="mg-upset-team-avg">{u.underdogAvg} avg</span>
              {u.underdogTags.map((tag, j) => {
                const profile = profiles.get(tag);
                const name = tag.split("#")[0];
                return (
                  <div key={tag} className="mg-upset-player">
                    {profile?.pic && <img src={profile.pic} alt="" className="mg-upset-avatar" />}
                    <Link to={`/player/${encodeURIComponent(tag)}`} className="mg-upset-name">{name}</Link>
                    {profile?.country && <CountryFlag name={profile.country.toLowerCase()} style={{ width: 12, height: 9 }} />}
                    <span className="mg-upset-mmr">{u.underdogMmrs[j] || ""}</span>
                  </div>
                );
              })}
            </div>
            <div className="mg-upset-vs">VS</div>
            <div className="mg-upset-team mg-upset-team--favorites">
              <span className="mg-upset-team-label mg-text-red">Favorites</span>
              <span className="mg-upset-team-avg">{u.favoriteAvg} avg</span>
              {u.favoriteTags.map((tag, j) => {
                const profile = profiles.get(tag);
                const name = tag.split("#")[0];
                return (
                  <div key={tag} className="mg-upset-player">
                    {profile?.pic && <img src={profile.pic} alt="" className="mg-upset-avatar" />}
                    <Link to={`/player/${encodeURIComponent(tag)}`} className="mg-upset-name">{name}</Link>
                    {profile?.country && <CountryFlag name={profile.country.toLowerCase()} style={{ width: 12, height: 9 }} />}
                    <span className="mg-upset-mmr">{u.favoriteMmrs[j] || ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mg-upset-footer">
            <span className="mg-upset-map-name">{u.map}</span>
            <Link to={`/match/${u.matchId}`} className="mg-upset-match-link">View Match</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════
   ACT 3 — THE NUMBERS (stats / data)
   ═══════════════════════════════════════════════════════ */

const RankingsSection = ({ content, profiles }) => {
  const all = parsePowerRankings(content);
  if (all.length === 0) return null;

  const sorted = [...all].sort((a, b) => b.mmrChange - a.mmrChange);
  const top5 = sorted.slice(0, 5);
  const bot5 = sorted.slice(-5).reverse();
  const seen = new Set(top5.map((r) => r.battleTag));
  const combined = [...top5, ...bot5.filter((r) => !seen.has(r.battleTag))];
  const maxAbs = Math.max(...combined.map((r) => Math.abs(r.mmrChange)), 1);

  const renderRow = (r) => {
    const profile = profiles.get(r.battleTag);
    const sign = r.mmrChange > 0 ? "+" : "";
    const pct = Math.abs(r.mmrChange) / maxAbs * 100;
    const isPositive = r.mmrChange >= 0;
    const colorClass = isPositive ? "mg-text-green" : "mg-text-red";
    const barClass = isPositive ? "mg-rank-bar--green" : "mg-rank-bar--red";

    const avatar = profile?.pic ? (
      <img src={profile.pic} alt="" className="mg-rank-avatar" />
    ) : (
      <div className="mg-rank-avatar-ph">
        {r.race && RACE_ICONS[r.race] ? (
          <img src={RACE_ICONS[r.race]} alt="" className="mg-rank-race-icon" />
        ) : (
          <span>{r.name.charAt(0)}</span>
        )}
      </div>
    );

    return (
      <div key={r.battleTag} className="mg-rank-row">
        <div className="mg-rank-player">
          {avatar}
          <Link to={`/player/${encodeURIComponent(r.battleTag)}`} className="mg-rank-name">
            {r.name}
          </Link>
          {profile?.country && <CountryFlag name={profile.country.toLowerCase()} />}
        </div>
        <div className="mg-rank-bar-wrap">
          <div className={`mg-rank-bar ${barClass}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`mg-rank-mmr ${colorClass}`}>{sign}{r.mmrChange}</span>
      </div>
    );
  };

  const gainers = top5.filter((r) => r.mmrChange > 0);
  const losers = bot5.filter((r) => r.mmrChange < 0);

  return (
    <section className="mg-section mg-rankings reveal" style={{ "--delay": "0.30s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label">Power Rankings</span>
        <div className="mg-section-rule" />
      </div>
      <div className="mg-rank-split">
        {gainers.length > 0 && (
          <div className="mg-rank-group">
            <span className="mg-rank-group-label mg-text-green">Rising</span>
            <div className="mg-rank-diverge">
              {gainers.map(renderRow)}
            </div>
          </div>
        )}
        {losers.length > 0 && (
          <div className="mg-rank-group">
            <span className="mg-rank-group-label mg-text-red">Falling</span>
            <div className="mg-rank-diverge">
              {losers.map(renderRow)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const PROMOTED_STATS = new Set(["Hero Slayer"]); // already full spotlight cards

const NewBloodTimeline = ({ players, weekStart, weekEnd }) => {
  const [seasonStart, setSeasonStart] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Try seasons API first
        const res = await fetch("https://website-backend.w3champions.com/api/ladder/seasons");
        const seasons = await res.json();
        if (!cancelled && seasons?.[0]?.startDate) {
          setSeasonStart(seasons[0].startDate.split("T")[0]);
          return;
        }
        // Fallback: find the earliest match in current season
        const currentSeason = seasons?.[0]?.id;
        if (!currentSeason) return;
        const countRes = await fetch(
          `https://website-backend.w3champions.com/api/matches?offset=0&pageSize=1&gameMode=4&gateway=20&season=${currentSeason}`
        );
        const countData = await countRes.json();
        const total = countData?.count;
        if (!total || cancelled) return;
        const lastPage = Math.max(0, total - 1);
        const tailRes = await fetch(
          `https://website-backend.w3champions.com/api/matches?offset=${lastPage}&pageSize=1&gameMode=4&gateway=20&season=${currentSeason}`
        );
        const tailData = await tailRes.json();
        const oldest = tailData?.matches?.[0]?.startTime;
        if (!cancelled && oldest) {
          setSeasonStart(oldest.split("T")[0]);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  if (!seasonStart || !weekStart || !weekEnd) return null;

  const sStart = new Date(seasonStart + "T00:00:00");
  const wStart = new Date(weekStart + "T00:00:00");
  const wEnd = new Date(weekEnd + "T23:59:59");
  const totalMs = wEnd - sStart;
  if (totalMs <= 0) return null;

  const weekStartPct = ((wStart - sStart) / totalMs) * 100;

  const positioned = players
    .filter((p) => p.firstDate)
    .map((p) => {
      const d = new Date(p.firstDate + "T12:00:00");
      const pct = Math.max(0, Math.min(100, ((d - sStart) / totalMs) * 100));
      return { ...p, pct };
    })
    .sort((a, b) => a.pct - b.pct);

  // Nudge dots that overlap (within 2% of each other)
  for (let i = 1; i < positioned.length; i++) {
    if (positioned[i].pct - positioned[i - 1].pct < 2) {
      positioned[i].pct = Math.min(100, positioned[i - 1].pct + 2);
    }
  }

  return (
    <div className="mg-newblood-timeline">
      <div className="mg-newblood-timeline-labels">
        <span className="mg-newblood-timeline-label">
          {new Date(seasonStart + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
        <span className="mg-newblood-timeline-label">This Week</span>
      </div>
      <div className="mg-newblood-timeline-track">
        <div
          className="mg-newblood-timeline-week"
          style={{ left: `${weekStartPct}%`, width: `${100 - weekStartPct}%` }}
        />
        {positioned.map((p) => (
          <div
            key={p.battleTag}
            className={`mg-newblood-timeline-dot${!p.returning && p.mmr >= 1800 ? " mg-newblood-timeline-dot--smurf" : ""}`}
            style={{ left: `${p.pct}%` }}
            title={`${p.name} — ${p.mmr} MMR — ${new Date(p.firstDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
          />
        ))}
      </div>
    </div>
  );
};

const CompactStats = ({ newBloodContent, atContent, heroesContent, matchStatsContent, sections, profiles, weekStart, weekEnd }) => {
  const players = newBloodContent ? parseNewBlood(newBloodContent) : [];
  const stacks = atContent ? parseATSpotlight(atContent) : [];
  const matchStats = matchStatsContent ? parseMatchStats(matchStatsContent).filter((s) => !PROMOTED_STATS.has(s.category)) : [];
  const heroStats = heroesContent ? parseMatchStats(heroesContent) : [];
  const allAwards = [...matchStats, ...heroStats];

  if (players.length === 0 && stacks.length === 0 && allAwards.length === 0) return null;

  return (
    <section className="mg-section reveal" style={{ "--delay": "0.36s" }}>
      <div className="mg-compact-grid">
        {players.length > 0 && (() => {
          const newPlayers = players.filter((p) => !p.returning);
          const returningPlayers = players.filter((p) => p.returning);

          const SEASON_STARTS = [
            { season: 24, date: '2026-01-26' },
            { season: 23, date: '2025-10-06' },
          ];

          const renderTimeline = (items, label, dateKey) => {
            const withDates = items.filter((p) => p[dateKey]);
            if (withDates.length === 0) return null;

            const dates = withDates.map((p) => new Date(p[dateKey] + "T12:00:00"));
            const thisWeek = new Date(weekEnd + "T23:59:59");
            const earliest = new Date(Math.min(...dates));
            const range = thisWeek - earliest;
            const padded = new Date(earliest.getTime() - range * 0.15);
            const totalMs = thisWeek - padded;
            if (totalMs <= 0) return null;

            const positioned = withDates
              .map((p) => {
                const d = new Date(p[dateKey] + "T12:00:00");
                const pct = Math.max(2, Math.min(92, ((d - padded) / totalMs) * 100));
                return { ...p, pct };
              })
              .sort((a, b) => a.pct - b.pct);

            // Nudge overlapping items (minimum 10% gap between adjacent)
            for (let i = 1; i < positioned.length; i++) {
              if (positioned[i].pct - positioned[i - 1].pct < 10) {
                positioned[i].pct = Math.min(92, positioned[i - 1].pct + 10);
              }
            }

            // Assign above/below side and stem height using a lane system.
            // Each side has 3 tiers — items get the lowest tier that doesn't
            // overlap a same-side neighbor (cards are ~12% of track width).
            const CARD_WIDTH_PCT = 12;
            const STEM_TIERS = [16, 48, 80];
            positioned.forEach((p, i) => {
              p.above = i % 2 === 0;
              let tier = 0;
              for (let t = 0; t < STEM_TIERS.length; t++) {
                const conflict = positioned.slice(0, i).some(
                  (q) => q.above === p.above && q.tier === t && Math.abs(p.pct - q.pct) < CARD_WIDTH_PCT
                );
                if (!conflict) { tier = t; break; }
                if (t === STEM_TIERS.length - 1) tier = t;
              }
              p.tier = tier;
              p.stemHeight = STEM_TIERS[tier];
            });

            // Season markers within range
            const seasonMarkers = SEASON_STARTS
              .map(({ season, date }) => {
                const d = new Date(date + "T12:00:00");
                if (d > padded && d < thisWeek) {
                  return { season, pct: ((d - padded) / totalMs) * 100 };
                }
                return null;
              })
              .filter(Boolean);

            const fmtDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

            return (
              <div className="mg-compact-block">
                <div className="mg-section-header">
                  <span className="mg-section-label mg-section-label--gold">{label}</span>
                  <div className="mg-section-rule" />
                </div>
                <div className="mg-newblood-timeline mg-newblood-timeline--rich">
                  <div className="mg-newblood-timeline-labels">
                    <span className="mg-newblood-timeline-label">{fmtDate(withDates.reduce((a, b) => a[dateKey] < b[dateKey] ? a : b)[dateKey])}</span>
                    <span className="mg-newblood-timeline-label">This Week</span>
                  </div>
                  <div className="mg-newblood-timeline-track mg-newblood-timeline-track--rich">
                    {seasonMarkers.map(({ season, pct }) => (
                      <div
                        key={`s${season}`}
                        className="mg-newblood-tl-season"
                        style={{ left: `${pct}%` }}
                      >
                        <div className="mg-newblood-tl-season-line" />
                        <span className="mg-newblood-tl-season-label">S{season}</span>
                      </div>
                    ))}
                    {positioned.map((p, i) => {
                      const profile = profiles.get(p.battleTag);
                      return (
                        <div
                          key={p.battleTag}
                          className={`mg-newblood-tl-item ${p.above ? "mg-newblood-tl-item--above" : "mg-newblood-tl-item--below"}`}
                          style={{ left: `${p.pct}%` }}
                        >
                          <div className="mg-newblood-tl-stem" style={p.stemHeight !== 16 ? { height: `${p.stemHeight}px` } : undefined} />
                          <Link to={`/player/${encodeURIComponent(p.battleTag)}`} className="mg-newblood-tl-card">
                            {profile?.pic ? (
                              <img src={profile.pic} alt="" className="mg-newblood-tl-avatar" />
                            ) : (
                              <div className="mg-newblood-tl-avatar-placeholder">
                                <span>{p.name.charAt(0)}</span>
                              </div>
                            )}
                            <span className="mg-newblood-tl-name">{p.name}</span>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          };

          // Compute gap duration for returning players, filter out trivial gaps (<2 weeks)
          const MIN_GAP_DAYS = 14;
          const weekStartMs = new Date(weekStart + "T00:00:00").getTime();
          const returningWithGap = returningPlayers
            .filter((p) => p.lastActive)
            .map((p) => {
              const lastMs = new Date(p.lastActive + "T00:00:00").getTime();
              const gapDays = Math.round((weekStartMs - lastMs) / 86400000);
              return { ...p, gapDays };
            })
            .filter((p) => p.gapDays >= MIN_GAP_DAYS)
            .sort((a, b) => b.gapDays - a.gapDays);

          const fmtGap = (days) => {
            if (days >= 60) return `${Math.round(days / 30)} months`;
            return `${Math.round(days / 7)} weeks`;
          };

          return (
            <>
              {newPlayers.length > 0 && renderTimeline(newPlayers, "New Blood", "firstDate")}
              {returningWithGap.length > 0 && (
                <div className="mg-compact-block">
                  <div className="mg-section-header">
                    <span className="mg-section-label mg-section-label--gold">Welcome Back</span>
                    <div className="mg-section-rule" />
                  </div>
                  <div className="mg-returning-list">
                    {returningWithGap.map((p) => {
                      const profile = profiles.get(p.battleTag);
                      return (
                        <div key={p.battleTag} className="mg-returning-row">
                          <div className="mg-returning-player">
                            {profile?.pic ? (
                              <img src={profile.pic} alt="" className="mg-returning-avatar" />
                            ) : (
                              <div className="mg-returning-avatar-placeholder">
                                <span>{p.name.charAt(0)}</span>
                              </div>
                            )}
                            <Link to={`/player/${encodeURIComponent(p.battleTag)}`} className="mg-returning-name">{p.name}</Link>
                            {profile?.country && <CountryFlag name={profile.country.toLowerCase()} />}
                          </div>
                          <span className="mg-returning-gap">{fmtGap(p.gapDays)} AFK</span>
                          <span className="mg-returning-stats">{p.games}G · {p.mmr} MMR</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          );
        })()}
        {stacks.length > 0 && (
          <div className="mg-compact-block">
            <div className="mg-section-header">
              <span className="mg-section-label">Team Stacks</span>
              <div className="mg-section-rule" />
            </div>
            <div className="mg-stacks-list">
              {stacks.map((s, i) => (
                <div key={i} className="mg-stack-row">
                  <div className="mg-stack-players">
                    {s.players.map((name, j) => (
                      <span key={j} className="mg-stack-player-name">
                        {name}{j < s.players.length - 1 ? " + " : ""}
                      </span>
                    ))}
                    <span className="mg-stack-size">{s.stackSize}-stack</span>
                  </div>
                  <span className="mg-stack-record">{s.wins}W-{s.losses}L</span>
                  <span className={`mg-stack-wr ${s.winPct >= 60 ? "mg-text-green" : s.winPct < 50 ? "mg-text-red" : ""}`}>
                    {s.winPct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {allAwards.length > 0 && (
          <div className="mg-compact-block">
            <div className="mg-section-header">
              <span className="mg-section-label">Awards</span>
              <div className="mg-section-rule" />
            </div>
            <div className="mg-ticker-list">
              {allAwards.map((s) => {
                const profile = profiles.get(s.battleTag);
                const heroIcons = extractHeroIcons(s.detail);
                // Trim detail for compact display — strip hero names when icons shown
                let shortDetail = s.detail
                  .replace(/\s+in\s+\d+%?\s+of\s+\d+\s+games?/gi, "")
                  .replace(/\s+in\s+\d+\s+games?/gi, "")
                  .replace(/\s+across\s+.*/i, "")
                  .replace(/\s*\([^)]*\)\s*/g, "")
                  .replace(/picked\s+(\d+)\s+times?/i, "$1 times")
                  .trim();
                if (heroIcons.length > 0) {
                  // Strip hero display names — icons replace them inline
                  for (const name of Object.keys(HERO_ICON_MAP)) {
                    shortDetail = shortDetail.replace(name, "");
                  }
                  shortDetail = shortDetail.replace(/[\s+]+/g, " ").trim();
                  // Rewrite to flow naturally into trailing icons
                  if (/^won\b/i.test(shortDetail)) {
                    // "won with 2 times" → "won 2x with"
                    const m = shortDetail.match(/(\d+)\s*times?/);
                    shortDetail = m ? `won ${m[1]}x with` : "won with";
                  } else {
                    // "3150 times" / "24 times" → "3150x" / "24x"
                    shortDetail = shortDetail.replace(/(\d+)\s*times?/, "$1x");
                  }
                }
                return (
                  <div key={s.category} className="mg-ticker-item">
                    <span className="mg-ticker-category">{s.category}</span>
                    <div className="mg-ticker-body">
                      <div className="mg-ticker-player">
                        {profile?.pic && <img src={profile.pic} alt="" className="mg-ticker-pic" />}
                        <Link to={`/player/${encodeURIComponent(s.battleTag)}`} className="mg-ticker-name">{s.name}</Link>
                      </div>
                      <span className="mg-ticker-detail">
                        {shortDetail}
                        {heroIcons.length > 0 && heroIcons.map((icon) => (
                          <img key={icon} src={`/heroes/${icon}.jpeg`} alt={icon} className="mg-ticker-hero-icon" />
                        ))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const ClipsSection = ({ clips }) => {
  if (!clips || clips.length === 0) return null;
  const featured = clips[0];
  const rest = clips.slice(1);

  return (
    <section className="mg-section mg-clips reveal" style={{ "--delay": "0.38s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label">Clips</span>
        <div className="mg-section-rule" />
      </div>
      <a href={featured.url} target="_blank" rel="noopener noreferrer" className="mg-clip-featured">
        <div className="mg-clip-thumb-wrap mg-clip-thumb-wrap--featured">
          <img src={featured.thumbnail_url} alt="" className="mg-clip-thumb" />
          <div className="mg-clip-play">&#9654;</div>
          <span className="mg-clip-duration">{Math.round(featured.duration)}s</span>
        </div>
        <div className="mg-clip-info">
          <span className="mg-clip-title">{featured.title}</span>
          <span className="mg-clip-meta">{featured.twitch_login} · {featured.view_count?.toLocaleString()} views</span>
        </div>
      </a>
      {rest.length > 0 && (
        <div className="mg-clips-grid">
          {rest.map((clip) => (
            <a key={clip.clip_id} href={clip.url} target="_blank" rel="noopener noreferrer" className="mg-clip-card">
              <div className="mg-clip-thumb-wrap">
                <img src={clip.thumbnail_url} alt="" className="mg-clip-thumb" />
                <div className="mg-clip-play mg-clip-play--small">&#9654;</div>
                <span className="mg-clip-duration">{Math.round(clip.duration)}s</span>
              </div>
              <div className="mg-clip-info">
                <span className="mg-clip-title">{clip.title}</span>
                <span className="mg-clip-meta">{clip.twitch_login} · {clip.view_count?.toLocaleString()} views</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
};

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */

const WeeklyMagazine = ({ weekParam, isAdmin = false, apiKey = "" }) => {
  const [weeklyDigests, setWeeklyDigests] = useState([]);
  const [weeklyIdx, setWeeklyIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState(new Map());

  useEffect(() => {
    fetch(`${RELAY_URL}/api/admin/weekly-digests`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setWeeklyDigests(data);
        // If weekParam provided, find and select that week
        if (weekParam && data.length > 0) {
          const idx = data.findIndex((w) => w.week_start === weekParam);
          if (idx >= 0) setWeeklyIdx(idx);
        }
        setLoading(false);
      })
      .catch((err) => { console.error("Magazine fetch failed:", err); setLoading(false); });
  }, [weekParam]);

  const weekly = weeklyDigests[weeklyIdx] || null;

  // Editorial hook
  const handleDigestUpdated = useCallback((newDigest) => {
    setWeeklyDigests((prev) =>
      prev.map((w, i) => (i === weeklyIdx ? { ...w, digest: newDigest } : w))
    );
  }, [weeklyIdx]);

  const ed = useWeeklyEditorial({
    weekly,
    isAdmin,
    apiKey,
    onDigestUpdated: handleDigestUpdated,
  });

  // Variant generation hook
  const variantGen = useVariantGen({
    weekStart: weekly?.week_start,
    apiKey,
    isAdmin,
  });

  // Apply variant picks → update digest + re-init editorial
  const handleApplyVariants = useCallback(async () => {
    const newDraft = await variantGen.applyPicks();
    if (newDraft) {
      // Re-fetch the weekly digest list to pick up the new draft
      try {
        const res = await fetch(`${RELAY_URL}/api/admin/weekly-digests`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setWeeklyDigests(data);
        }
      } catch {}
    }
  }, [variantGen.applyPicks, weeklyIdx]);

  // Regenerate digest (delete cache + re-fetch)
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [panelDrag, setPanelDrag] = useState({ section: null, from: null, over: null });

  const handlePanelDrop = (section, toIdx) => {
    const { from } = panelDrag;
    setPanelDrag({ section: null, from: null, over: null });
    if (from == null || from === toIdx) return;
    ed.handleReorderItem(section, from, toIdx);
  };
  const doRegenerate = useCallback(async () => {
    if (!weekly?.week_start || !apiKey) return;
    setShowRegenConfirm(false);
    setRegenerating(true);
    try {
      await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}`, {
        method: "DELETE",
        headers: { "X-API-Key": apiKey },
      });
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.digest) {
          setWeeklyDigests((prev) =>
            prev.map((w, i) => (i === weeklyIdx ? { ...w, digest: data.digest } : w))
          );
        }
      }
    } catch (err) {
      console.warn("[Magazine] Regenerate failed:", err.message);
    }
    setRegenerating(false);
  }, [weekly, apiKey, weeklyIdx]);

  const sections = useMemo(() => {
    const source = ed.isEditorial && ed.draft ? ed.draft : weekly?.digest;
    if (!source) return [];
    return parseDigestSections(source);
  }, [weekly, ed.isEditorial, ed.draft]);

  // Build name→battleTag map from all structured sections + quote speakers
  const knownNames = useMemo(() => {
    const names = new Map();
    for (const s of sections) {
      if (["WINNER", "LOSER", "GRINDER", "HOTSTREAK", "COLDSTREAK", "HEROSLAYER"].includes(s.key)) {
        const stat = parseStatLine(s.content);
        if (stat) names.set(stat.name, stat.battleTag);
      }
      if (s.key === "POWER_RANKINGS") {
        for (const r of parsePowerRankings(s.content)) names.set(r.name, r.battleTag);
      }
      if (s.key === "NEW_BLOOD") {
        for (const p of parseNewBlood(s.content)) names.set(p.name, p.battleTag);
      }
      if (s.key === "MATCH_STATS" || s.key === "HEROES") {
        for (const ms of parseMatchStats(s.content)) names.set(ms.name, ms.battleTag);
      }
      if (s.key === "UPSET") {
        for (const u of parseUpsets(s.content)) {
          u.underdogTags.forEach((t) => names.set(t.split("#")[0], t));
          u.favoriteTags.forEach((t) => names.set(t.split("#")[0], t));
        }
      }
      // Extract speaker names from drama quotes
      if (s.key === "DRAMA") {
        const { quotes } = splitQuotes(s.content);
        for (const q of quotes) {
          const m = q.match(/^(\w[\w\d!ǃ]*?):\s+/);
          if (m && m[1].length >= 2) names.set(m[1], m[1]);
        }
      }
    }
    const mentionMap = parseMentions(sections);
    for (const [name, tag] of mentionMap) names.set(name, tag);
    return names;
  }, [sections]);

  useEffect(() => {
    if (!weekly?.digest) return;
    const allSections = parseDigestSections(weekly.digest);
    const mentions = parseMentions(allSections);
    const tags = new Set();

    for (const s of allSections) {
      if (["WINNER", "LOSER", "GRINDER", "HOTSTREAK", "COLDSTREAK", "HEROSLAYER"].includes(s.key)) {
        const stat = parseStatLine(s.content);
        if (stat) tags.add(stat.battleTag);
      }
      if (s.key === "POWER_RANKINGS") {
        for (const r of parsePowerRankings(s.content)) tags.add(r.battleTag);
      }
      if (s.key === "UPSET") {
        for (const u of parseUpsets(s.content)) {
          u.underdogTags.forEach((t) => tags.add(t));
          u.favoriteTags.forEach((t) => tags.add(t));
        }
      }
      if (s.key === "NEW_BLOOD") {
        for (const p of parseNewBlood(s.content)) tags.add(p.battleTag);
      }
      if (s.key === "MATCH_STATS" || s.key === "HEROES") {
        for (const ms of parseMatchStats(s.content)) tags.add(ms.battleTag);
      }
    }

    for (const s of allSections) {
      for (const tag of extractMentionedTags(s.content, mentions)) tags.add(tag);
    }

    if (tags.size === 0) return;

    Promise.all([...tags].map((tag) => fetchAndCacheProfile(tag).then((p) => [tag, p]))).then(
      (results) => {
        const map = new Map();
        for (const [tag, p] of results) {
          if (p) map.set(tag, p);
        }
        setProfiles(map);
      }
    );
  }, [weekly]);

  const [coverBg, setCoverBg] = useState(COVER_BACKGROUNDS[0]);

  useEffect(() => {
    if (!weekly?.week_start) return;
    const fallback = COVER_BACKGROUNDS[hashDate(weekly.week_start) % COVER_BACKGROUNDS.length];
    const coverUrl = `${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/cover.jpg`;
    const img = new Image();
    img.onload = () => setCoverBg(coverUrl);
    img.onerror = () => setCoverBg(fallback);
    img.src = coverUrl;
  }, [weekly?.week_start]);

  const find = (key) => sections.find((s) => s.key === key);

  if (loading) {
    return (
      <div className="mg-page">
        <div className="page-loader fade-in"><PeonLoader /></div>
      </div>
    );
  }

  if (!weekly) {
    return (
      <div className="mg-page">
        <div className="mg-empty">
          <h2>No weekly digests available yet.</h2>
          <p>Check back after the first weekly roundup is published.</p>
        </div>
      </div>
    );
  }

  const dramaSection = find("DRAMA");
  const rankingsSection = find("POWER_RANKINGS");
  const highlightsSection = find("HIGHLIGHTS");
  const bansSection = find("BANS");
  const upsetSection = find("UPSET");
  const matchStatsSection = find("MATCH_STATS");
  const heroesSection = find("HEROES");
  const newBloodSection = find("NEW_BLOOD");
  const atSection = find("AT_SPOTLIGHT");
  // Parse drama into lead headline + sub-stories
  const dramaQuotesSection = find("DRAMA_QUOTES");
  const dramaQuotes = dramaQuotesSection
    ? [...dramaQuotesSection.content.matchAll(/"([^"]+)"/g)].map((m) => m[1])
    : (() => {
        if (!dramaSection) return [];
        const firstItem = dramaSection.content.split(/;\s*/)[0] || "";
        return splitQuotes(firstItem).quotes;
      })();
  const dramaCleaned = dramaSection ? cleanSummary(splitQuotes(dramaSection.content).summary) : "";
  const dramaItems = dramaCleaned ? dramaCleaned.split(/;\s*/).filter(Boolean).map((s) => s.trim()) : [];
  // Lead item may have "Title | narrative body" format
  const rawLead = dramaItems[0] || "";
  const pipeSplit = rawLead.split(/\s*\|\s*/);
  const dramaTitle = pipeSplit.length > 1 ? pipeSplit[0] : "";
  const dramaLead = pipeSplit.length > 1 ? pipeSplit.slice(1).join(" | ") : rawLead;
  const dramaSubStories = dramaItems.slice(1);

  // Editorial callbacks for CoverHero — editing headline edits first drama item title
  const editorialProps = ed.isEditorial ? {
    onEditHeadline: (text) => {
      if (dramaTitle) {
        ed.handleEditSummary("DRAMA", 0, `${text} | ${dramaLead}`);
      } else {
        ed.handleEditSummary("DRAMA", 0, text);
      }
    },
    onEditLead: (text) => {
      if (dramaTitle) {
        ed.handleEditSummary("DRAMA", 0, `${dramaTitle} | ${text}`);
      } else {
        ed.handleEditSummary("DRAMA", 0, text);
      }
    },
    regenSection: ed.regenSection,
    regenLoading: ed.regenLoading,
    handleEditSection: ed.handleEditSection,
    browseMessages: ed.browseMessages,
    setQuotes: ed.setQuotes,
  } : null;

  // No pre-built item controls — StoriesGrid builds its own internally for consistency

  return (
    <div className={`mg-page ${ed.isEditorial ? "mg-page--editorial" : ""}`}>
      {/* Back + week tabs */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 var(--space-6)" }}>
        <PageNav
          backTo="/news"
          backLabel="News"
          tabs={weeklyDigests.slice(0, 5).map((w, i) => ({
            key: String(i),
            label: formatWeekRange(w.week_start, w.week_end),
          }))}
          activeTab={String(weeklyIdx)}
          onTab={(key) => setWeeklyIdx(Number(key))}
        />
      </div>

      {/* Editorial controls panel */}
      {ed.isEditorial && ed.editableItemSections.length > 0 && (
        <div className="mg-editorial-panel reveal" style={{ "--delay": "0.08s" }}>
          <div className="mg-section-header" style={{ maxWidth: 900, margin: "0 auto", padding: "0 var(--space-6)" }}>
            <span className="mg-section-label mg-section-label--gold">Editorial Controls</span>
            <div className="mg-section-rule" />
          </div>
          <div className="mg-editorial-actions">
            {weekly.week_start && (
              <Button $secondary as="a" href={`/dev?week=${weekly.week_start}`} title="Edit cover image">Edit Cover</Button>
            )}
            <Button $secondary onClick={() => setShowRegenConfirm(true)} disabled={regenerating} title="Delete cached digest and regenerate from scratch">
              {regenerating ? "Regenerating..." : "Regenerate"}
            </Button>
            {variantGen && !variantGen.isGenerating && !variantGen.isDone && variantGen.job?.status !== "error" && (
              <Button $secondary onClick={variantGen.startGeneration} title="Generate 3 editorial variants for mix-and-match">
                Generate Variants
              </Button>
            )}
            {variantGen?.isGenerating && (
              <span className="mg-gen-status mg-gen-status--generating">
                <span className="mg-gen-dot" />
                Generating... <span className="mg-gen-progress">{variantGen.job.completed}/{variantGen.job.total}</span>
              </span>
            )}
            {variantGen?.isDone && (
              <Button $secondary onClick={() => variantGen.setShowPicker(true)} title="Review and pick from 3 generated variants">
                Review {variantGen.variants.length} Variants
              </Button>
            )}
            {variantGen?.job?.status === "error" && (
              <span className="mg-gen-status mg-gen-status--error">
                Failed: {variantGen.job.error || "Unknown error"}
                <Button $secondary onClick={variantGen.startGeneration} style={{ marginLeft: "var(--space-2)" }}>Retry</Button>
              </span>
            )}
          </div>
          <div className="mg-editorial-grid">
            {ed.editableItemSections.map(({ key, label, items }) => (
              <div key={key} className="mg-editorial-block">
                <span className="mg-editorial-block-label">
                  {label}
                  {["DRAMA", "BANS", "HIGHLIGHTS", "TOPICS"].includes(key) && (
                    <SectionRegenButton sectionKey={key} regenLoading={ed.regenLoading} onRegen={ed.regenSection} />
                  )}
                </span>
                {items.map((item, i) => {
                  const summaryText = item.replace(/"[^"]+"/g, "").replace(/\s{2,}/g, " ").trim();
                  const short = summaryText.length > 60 ? summaryText.slice(0, 57) + "..." : summaryText;
                  return (
                    <div
                      key={i}
                      className={`mg-editorial-item${panelDrag.section === key && panelDrag.over === i ? " mg-editorial-item--dragover" : ""}`}
                      onDragOver={(e) => { if (panelDrag.section === key) { e.preventDefault(); setPanelDrag((s) => ({ ...s, over: i })); } }}
                      onDragLeave={() => setPanelDrag((s) => s.over === i ? { ...s, over: null } : s)}
                      onDrop={(e) => { if (panelDrag.section === key) { e.preventDefault(); handlePanelDrop(key, i); } }}
                    >
                      <ItemControls
                        onDelete={() => ed.handleDeleteItem(key, i)}
                        dragProps={{
                          draggable: true,
                          onDragStart: () => setPanelDrag({ section: key, from: i, over: null }),
                          onDragEnd: () => setPanelDrag({ section: null, from: null, over: null }),
                        }}
                      />
                      {ed.editingItem === `${key}-${i}` ? (
                        <input
                          type="text"
                          className="mg-editorial-inline-input"
                          defaultValue={summaryText}
                          autoFocus
                          onBlur={(e) => ed.handleEditSummary(key, i, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") ed.handleEditSummary(key, i, e.target.value);
                            if (e.key === "Escape") ed.setEditingItem(null);
                          }}
                        />
                      ) : (
                        <span
                          className="mg-editorial-item-text"
                          onClick={() => ed.setEditingItem(`${key}-${i}`)}
                          title="Click to edit"
                        >
                          {short}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Section toggles */}
            <div className="mg-editorial-block">
              <span className="mg-editorial-block-label">Sections</span>
              {TOGGLEABLE_SECTIONS.map(({ key, label }) => (
                <label key={key} className="mg-editorial-toggle-label">
                  <input
                    type="checkbox"
                    checked={!ed.hiddenSections.has(key)}
                    onChange={() => ed.toggleSection(key)}
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Stat line toggles */}
            <div className="mg-editorial-block">
              <span className="mg-editorial-block-label">Stats</span>
              {STAT_LINES.map(({ key, label }) => (
                <StatToggle
                  key={key}
                  label={label}
                  statKey={key}
                  hidden={ed.hiddenStats.has(key)}
                  onToggle={ed.toggleStat}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ACT 1 — THE STORIES */}
      <CoverHero weekly={weekly} coverBg={coverBg} headline={dramaTitle || dramaLead} editorial={editorialProps} />

      {dramaLead && (
        <FeatureStory
          lead={dramaLead}
          quotes={dramaQuotes}
          curated={!!dramaQuotesSection}
          nameToTag={knownNames}
          editorial={editorialProps}
        />
      )}

      <StoriesGrid
        stories={dramaSubStories}
        highlights={highlightsSection?.content}
        bans={bansSection?.content}
        nameToTag={knownNames}
        editorial={ed.isEditorial ? {
          deleteItem: ed.handleDeleteItem,
          reorderItem: ed.handleReorderItem,
          onEditDrama: (subIdx, text) => ed.handleEditSummary("DRAMA", subIdx + 1, text),
          onEditHighlight: (idx, text) => ed.handleEditSummary("HIGHLIGHTS", idx, text),
          regenSection: ed.regenSection,
          regenLoading: ed.regenLoading,
        } : null}
      />

      <ClipsSection clips={weekly.clips} />

      {/* Player features */}
      {(!ed.isEditorial || !["WINNER", "LOSER", "GRINDER", "HOTSTREAK", "COLDSTREAK", "HEROSLAYER"].every((k) => ed.hiddenStats.has(k))) && (
        <SpotlightsSection
          sections={sections}
          profiles={profiles}
          editorial={ed.isEditorial ? { regenSpotlights: ed.regenSpotlights, regenMatchStats: ed.regenMatchStats, regenLoading: ed.regenLoading, browseMessages: ed.browseMessages, setQuotes: ed.setQuotes, handleEditSection: ed.handleEditSection } : null}
        />
      )}
      {upsetSection && (!ed.isEditorial || !ed.hiddenSections.has("UPSET")) && (
        <UpsetsSection content={upsetSection.content} profiles={profiles} />
      )}
      {/* Stats & data */}
      {rankingsSection && (!ed.isEditorial || !ed.hiddenSections.has("POWER_RANKINGS")) && (
        <RankingsSection content={rankingsSection.content} profiles={profiles} />
      )}
      <CompactStats
        newBloodContent={(!ed.isEditorial || !ed.hiddenSections.has("NEW_BLOOD")) ? newBloodSection?.content : null}
        atContent={(!ed.isEditorial || !ed.hiddenSections.has("AT_SPOTLIGHT")) ? atSection?.content : null}
        heroesContent={(!ed.isEditorial || !ed.hiddenSections.has("HEROES")) ? heroesSection?.content : null}
        matchStatsContent={(!ed.isEditorial || !ed.hiddenSections.has("MATCH_STATS")) ? matchStatsSection?.content : null}
        sections={sections}
        profiles={profiles}
        weekStart={weekly?.week_start}
        weekEnd={weekly?.week_end}
      />

      {/* Save status bar */}
      {ed.isEditorial && <SaveStatus state={ed.publishState} />}

      {/* Regenerate confirmation modal */}
      <ConfirmModal
        open={showRegenConfirm}
        title="Regenerate Digest"
        message={`This will delete the cached digest for ${weekly ? formatWeekRange(weekly.week_start, weekly.week_end) : ""} and regenerate it from scratch. All editorial edits will be lost.`}
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={doRegenerate}
        onCancel={() => setShowRegenConfirm(false)}
      />

      {/* Variant picker overlay */}
      {variantGen.showPicker && variantGen.variants.length > 0 && (
        <VariantPicker
          variants={variantGen.variants}
          picks={variantGen.picks}
          onPick={variantGen.pickSection}
          onApply={handleApplyVariants}
          onCancel={() => variantGen.setShowPicker(false)}
          applyError={variantGen.applyError}
        />
      )}
    </div>
  );
};

export default WeeklyMagazine;
