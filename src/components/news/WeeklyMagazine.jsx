import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw, FiX, FiPlus, FiMenu, FiShare2, FiCamera, FiMessageSquare, FiImage, FiMove } from "react-icons/fi";
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
  extractMentionedTags,
  groupQuotesBySpeaker,
  buildStatBlurb,
} from "../../lib/digestUtils";
import useDigestData from "../../lib/useDigestData";
import useDragReorder from "../../lib/useDragReorder";
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
      rows={1}
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
const ItemControls = ({ onDelete, onContext, dragProps }) => (
  <div className="mg-editorial-item-controls">
    {dragProps && <span className="mg-editorial-drag" {...dragProps} title="Drag to reorder"><FiMenu size={12} /></span>}
    {onDelete && <button className="mg-editorial-delete" onClick={onDelete} title="Delete item"><FiX size={12} /></button>}
    {onContext && <button className="mg-editorial-context" onClick={onContext} title="View chat context"><FiMessageSquare size={12} /></button>}
  </div>
);

/** Per-item chat context panel — searches for messages mentioning player names */
const ItemContextPanel = ({ text, nameToTag, dateRange }) => {
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Extract player names mentioned in this item
      const names = nameToTag ? Object.keys(nameToTag).filter((n) => text.includes(n)) : [];
      if (names.length === 0) {
        // Fallback: search by first significant word (>4 chars)
        const words = text.split(/\s+/).filter((w) => w.length > 4 && /^[A-Za-z]/.test(w));
        if (words[0]) names.push(words[0]);
      }
      if (names.length === 0) { setMessages([]); setLoading(false); return; }

      try {
        // Search for messages by the first mentioned player
        const tag = nameToTag?.[names[0]];
        const params = new URLSearchParams({ limit: "80" });
        if (tag) params.set("player", tag.split("#")[0]);
        else params.set("q", names[0]);
        const res = await fetch(`${RELAY_URL}/api/admin/messages/search?${params}`);
        if (!cancelled) {
          const data = await res.json();
          const results = (data.results || []).map((m) => ({
            name: m.user_name || m.battle_tag?.split("#")[0] || "",
            text: m.message || "",
            battle_tag: m.battle_tag || "",
            received_at: m.received_at || "",
          }));
          setMessages(results);
        }
      } catch {
        if (!cancelled) setMessages([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [text, nameToTag]);

  return (
    <div className="mg-item-context-panel">
      <ChatContext
        messages={messages}
        loading={loading}
        expandable
        showDates
        placeholder="Filter context..."
        dateRange={dateRange}
      />
    </div>
  );
};

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

const CoverHero = ({ weekly, coverBg, headline, editorial, onPickCover, coverPosition, onSaveCoverPosition }) => {
  const stats = weekly.stats;
  const [copied, setCopied] = useState(false);
  const [shotState, setShotState] = useState(null); // null | "copying" | "copied" | "saved"
  const headerRef = useRef(null);

  // Cover reposition drag state
  const [repositioning, setRepositioning] = useState(false);
  const [posY, setPosY] = useState(() => {
    const match = coverPosition?.match(/(\d+)%\s+(\d+)%/);
    return match ? parseInt(match[2]) : 50;
  });
  const dragRef = useRef(null);

  useEffect(() => {
    const match = coverPosition?.match(/(\d+)%\s+(\d+)%/);
    if (match) setPosY(parseInt(match[2]));
    else setPosY(50);
  }, [coverPosition]);

  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const img = e.currentTarget.closest(".mg-header-image")?.querySelector(".mg-header-img");
    if (!img) return;
    const rect = img.getBoundingClientRect();
    dragRef.current = { startY: clientY, startPosY: posY, imgHeight: rect.height };
  }, [posY]);

  useEffect(() => {
    if (!repositioning) return;
    const handleMove = (e) => {
      if (!dragRef.current) return;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const delta = clientY - dragRef.current.startY;
      // Map pixel drag to percentage — full image height = 100% range
      const pctDelta = (delta / dragRef.current.imgHeight) * 100;
      const newY = Math.max(0, Math.min(100, dragRef.current.startPosY - pctDelta));
      setPosY(Math.round(newY));
    };
    const handleUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [repositioning]);

  const handleSavePosition = () => {
    onSaveCoverPosition?.(`50% ${posY}%`);
    setRepositioning(false);
  };

  const handleCancelReposition = () => {
    const match = coverPosition?.match(/(\d+)%\s+(\d+)%/);
    setPosY(match ? parseInt(match[2]) : 50);
    setRepositioning(false);
  };

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
      <div className={`mg-header-image${repositioning ? " mg-header-image--repositioning" : ""}`}>
        <img
          src={coverBg}
          alt=""
          className="mg-header-img"
          style={{ objectPosition: `50% ${posY}%` }}
          onMouseDown={repositioning ? handleDragStart : undefined}
          onTouchStart={repositioning ? handleDragStart : undefined}
        />
        {repositioning && (
          <div className="mg-header-reposition-bar">
            <Button $ghost className="mg-header-reposition-btn" onClick={handleCancelReposition}><FiX size={14} /> Cancel</Button>
            <span className="mg-header-reposition-hint">Drag to reposition</span>
            <Button $ghost className="mg-header-reposition-btn mg-header-reposition-btn--save" onClick={handleSavePosition}>Save</Button>
          </div>
        )}
        {!repositioning && onPickCover && (
          <>
            <Button
              $ghost
              className="mg-header-pick-cover"
              onClick={onPickCover}
              title="Pick cover art"
            >
              <FiImage size={14} />
              Pick Cover
            </Button>
            {onSaveCoverPosition && (
              <Button
                $ghost
                className="mg-header-pick-cover mg-header-reposition-toggle"
                onClick={() => setRepositioning(true)}
                title="Reposition cover image"
              >
                <FiMove size={14} />
                Reposition
              </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
};

/** Topic pills — read-only or editable */
const TopicPills = ({ topics, editorial }) => {
  const [addingTopic, setAddingTopic] = useState(false);
  const addRef = useRef(null);

  if (!topics || topics.length === 0) {
    if (!editorial) return null;
    // Editorial: show add button when no topics
    return (
      <div className="mg-topics">
        <button className="mg-section-add" onClick={() => setAddingTopic(true)} title="Add topic"><FiPlus size={12} /> Add topic</button>
        {addingTopic && (
          <input
            ref={addRef}
            className="mg-topic-input"
            placeholder="Topic"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") { const v = addRef.current?.value?.trim(); if (v) editorial.handleEditTopics([v]); setAddingTopic(false); }
              if (e.key === "Escape") setAddingTopic(false);
            }}
            onBlur={() => { const v = addRef.current?.value?.trim(); if (v) editorial.handleEditTopics([v]); setAddingTopic(false); }}
          />
        )}
      </div>
    );
  }

  if (!editorial) {
    return (
      <div className="mg-topics">
        {topics.map((t, i) => (
          <span key={i} className="mg-topic-pill">{t}</span>
        ))}
      </div>
    );
  }

  const handleDelete = (idx) => {
    editorial.handleEditTopics(topics.filter((_, i) => i !== idx));
  };

  const handleEdit = (idx, newText) => {
    const next = [...topics];
    next[idx] = newText.trim();
    editorial.handleEditTopics(next.filter(Boolean));
  };

  const handleAdd = () => {
    const v = addRef.current?.value?.trim();
    if (v) editorial.handleEditTopics([...topics, v]);
    setAddingTopic(false);
  };

  return (
    <div className="mg-topics">
      {topics.map((t, i) => (
        <span key={i} className="mg-topic-pill mg-topic-pill--editable">
          <EditableText value={t} onSave={(v) => handleEdit(i, v)} className="mg-topic-pill-text" />
          <button className="mg-topic-pill-delete" onClick={() => handleDelete(i)} title="Remove topic"><FiX size={10} /></button>
        </span>
      ))}
      {addingTopic ? (
        <input
          ref={addRef}
          className="mg-topic-input"
          placeholder="Topic"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAddingTopic(false); }}
          onBlur={handleAdd}
        />
      ) : (
        <button className="mg-topic-pill mg-topic-pill--add" onClick={() => setAddingTopic(true)} title="Add topic"><FiPlus size={10} /></button>
      )}
    </div>
  );
};

/** Read-only quote block — renders grouped speaker quotes. Used by FeatureStory, SpotlightCard, StreakCard. */
const QuoteBlock = ({ quotes, compact, className = "" }) => {
  if (!quotes || quotes.length === 0) return null;
  const groups = groupQuotesBySpeaker(quotes);
  return (
    <div className={`mg-quotes${compact ? " mg-quotes--compact" : ""} ${className}`.trim()}>
      {groups.map((group, i) => (
        <div key={i} className="mg-quote-group">
          {group.name && <span className="mg-quote-name">{group.name}</span>}
          {group.messages.map((msg, j) => (
            <blockquote key={j} className="mg-quote">{msg}</blockquote>
          ))}
        </div>
      ))}
    </div>
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
        ) : (
          <QuoteBlock quotes={attributed} />
        )}
      </div>
    </section>
  );
};

/** Secondary stories grid — sub-drama + highlights + bans */
const StoriesGrid = ({ stories, highlights, bans, nameToTag, editorial }) => {
  // highlights & bans are now pre-parsed arrays (from useDigestData)
  const highlightItems = highlights || [];
  const banRows = bans || [];
  const drag = useDragReorder();
  // Track which item has context panel open: "SECTION:index" or null
  const [contextOpen, setContextOpen] = useState(null);

  const dateRange = editorial?.weekStart && editorial?.weekEnd
    ? formatWeekRange(editorial.weekStart, editorial.weekEnd)
    : undefined;

  if (stories.length === 0 && highlightItems.length === 0 && banRows.length === 0) return null;

  /** Render an editorial item list — same [grip][x] pattern as editorial panel */
  const renderList = (items, sectionKey, { offset = 0, onEdit } = {}) => (
    <ul className="mg-sidebar-list">
      {items.map((text, i) => {
        const draftIdx = i + offset;
        const contextKey = `${sectionKey}:${i}`;
        const isContextOpen = contextOpen === contextKey;
        return (
          <li
            key={i}
            className={`mg-sidebar-item${drag.isDragOver(sectionKey, i) ? " mg-sidebar-item--dragover" : ""}`}
            onDragOver={(e) => { if (drag.dragState.section === sectionKey) { e.preventDefault(); drag.onDragOver(sectionKey, i); } }}
            onDragLeave={() => drag.onDragLeave(i)}
            onDrop={(e) => { if (drag.dragState.section === sectionKey) { e.preventDefault(); drag.onDrop(sectionKey, i, (sec, from, to) => editorial?.reorderItem?.(sec, from + offset, to + offset)); } }}
          >
            {editorial && (
              <ItemControls
                onDelete={() => editorial.deleteItem(sectionKey, draftIdx)}
                onContext={() => setContextOpen(isContextOpen ? null : contextKey)}
                dragProps={{
                  draggable: true,
                  onDragStart: () => drag.onDragStart(sectionKey, i),
                  onDragEnd: drag.onDragEnd,
                }}
              />
            )}
            {onEdit ? (
              <EditableText value={text.trim()} onSave={(t) => onEdit(i, t)} className="mg-sidebar-item-text" />
            ) : (
              highlightNames(text.trim(), nameToTag)
            )}
            {isContextOpen && (
              <ItemContextPanel text={text} nameToTag={nameToTag} dateRange={dateRange} />
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
              {editorial?.addItem && <button className="mg-section-add" onClick={() => editorial.addItem("DRAMA")} title="Add item"><FiPlus size={12} /></button>}
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
                {editorial?.addItem && <button className="mg-section-add" onClick={() => editorial.addItem("HIGHLIGHTS")} title="Add item"><FiPlus size={12} /></button>}
                {editorial && <SectionRegenButton sectionKey="HIGHLIGHTS" regenLoading={editorial.regenLoading} onRegen={editorial.regenSection} />}
                <div className="mg-section-rule" />
              </div>
              {renderList(highlightItems.map((h) => typeof h === "string" ? h : h.summary), "HIGHLIGHTS", { onEdit: editorial?.onEditHighlight })}
            </div>
          )}
          {banRows.length > 0 && editorial && (
            <div className="mg-stories-sidebar">
              <div className="mg-section-header">
                <span className="mg-section-label mg-section-label--red">Bans</span>
                {editorial?.addItem && <button className="mg-section-add" onClick={() => editorial.addItem("BANS")} title="Add item"><FiPlus size={12} /></button>}
                {editorial && <SectionRegenButton sectionKey="BANS" regenLoading={editorial.regenLoading} onRegen={editorial.regenSection} />}
                <div className="mg-section-rule" />
              </div>
              <div className="mg-bans-table">
                {banRows.map((b, i) => (
                  <div
                    key={i}
                    className={`mg-ban-row${drag.isDragOver("BANS", i) ? " mg-ban-row--dragover" : ""}`}
                    onDragOver={(e) => { if (drag.dragState.section === "BANS") { e.preventDefault(); drag.onDragOver("BANS", i); } }}
                    onDragLeave={() => drag.onDragLeave(i)}
                    onDrop={(e) => { if (drag.dragState.section === "BANS") { e.preventDefault(); drag.onDrop("BANS", i, (sec, from, to) => editorial?.reorderItem?.(sec, from, to)); } }}
                  >
                    {editorial && (
                      <ItemControls
                        onDelete={() => editorial.deleteItem("BANS", i)}
                        dragProps={{
                          draggable: true,
                          onDragStart: () => drag.onDragStart("BANS", i),
                          onDragEnd: drag.onDragEnd,
                        }}
                      />
                    )}
                    <div className="mg-ban-content">
                      <div className="mg-ban-header">
                        <span className="mg-ban-name">{b.name}</span>
                        <span className="mg-ban-duration">{b.duration}</span>
                      </div>
                      {editorial?.onEditBan ? (
                        <EditableText value={b.reason || ""} onSave={(t) => editorial.onEditBan(i, t, b)} className="mg-ban-reason" />
                      ) : (
                        <span className="mg-ban-reason">
                          {b.reason}
                          {b.matchId && (
                            <>
                              {" "}
                              <Link to={`/match/${b.matchId}`} className="mg-ban-match-link">Match</Link>
                            </>
                          )}
                        </span>
                      )}
                    </div>
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
        <div className="mg-quote-browser-panel">
          <div className="mg-quote-browser-close">
            <span className="mg-quote-browser-label">{label || "Messages"}</span>
            <button onClick={() => setOpen(false)} title="Close"><FiX size={14} /></button>
          </div>
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
            dateRange={editorial.weekStart && editorial.weekEnd ? formatWeekRange(editorial.weekStart, editorial.weekEnd) : undefined}
          />
        </div>
      )}
    </div>
  );
};

const SpotlightCard = ({ stat, profile, accent, role, blurb, quotes, statKey, heroIcons, victimIcons, killboard, maxHeroKills, editorial }) => {
  if (!stat) return null;
  const canDismiss = editorial?.toggleStat;
  // For streak types, show only the streak portion (e.g. 16 red dots) not the full week form
  const isStreak = stat.streakLen && stat.streakType;
  const formArr = isStreak
    ? Array(stat.streakLen).fill(stat.streakType === "W")
    : stat.form ? stat.form.split("").map((c) => c === "W") : [];
  const sign = stat.mmrChange > 0 ? "+" : "";
  const hasPic = profile?.pic;

  return (
    <div className={`mg-spotlight-card mg-spotlight-card--${accent}`}>
      {canDismiss && (
        <button className="mg-spotlight-dismiss" onClick={() => editorial.toggleStat(statKey)} title="Hide this spotlight">
          <FiX size={14} />
        </button>
      )}
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
          <div className="mg-spotlight-heroes mg-spotlight-heroes--victims">
            {killboard.map(({ name }) => (
              <img key={name} src={`/heroes/${name}.jpeg`} alt={name} className="mg-spotlight-hero-icon mg-spotlight-hero-victim" />
            ))}
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
        ) : (
          <QuoteBlock quotes={quotes} className="mg-spotlight-quotes" compact />
        )}
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

/* ── Hero Kills Distribution: bar chart of hero kills/game across all players ── */
const HeroKillsChart = ({ killsDistribution, playerName }) => {
  if (!killsDistribution) return null;
  const { all, player } = killsDistribution;
  if (!all || Object.keys(all).length === 0) return null;

  // Build contiguous bucket list from 0 to max kill count (no gaps)
  const allNums = [...Object.keys(all), ...Object.keys(player || {})].map(Number);
  const maxBucket = Math.max(...allNums, 0);
  const buckets = Array.from({ length: maxBucket + 1 }, (_, i) => i);
  const maxCount = Math.max(...buckets.map((k) => all[k] || 0), 1);

  return (
    <div className="mg-kills-dist">
      <div className="mg-kills-dist-title">Hero Kills Per Game {playerName && <span className="mg-text-gold">{"\u2014"} {playerName}</span>}</div>
      <div className="mg-kills-dist-header">
        <span className="mg-kills-dist-label">{"\u2190"} Fewer</span>
        <span className="mg-kills-dist-label">More {"\u2192"}</span>
      </div>
      <div className="mg-kills-dist-chart">
        {buckets.map((k) => {
          const allCount = all[k] || 0;
          const playerCount = (player && player[k]) || 0;
          const pct = Math.round((allCount / maxCount) * 100);
          const playerPct = allCount > 0 ? Math.round((playerCount / allCount) * 100) : 0;
          return (
            <div key={k} className="mg-kills-dist-col">
              <span className="mg-kills-dist-count">{allCount}</span>
              <div className="mg-kills-dist-bar-wrapper" style={{ height: `${pct}%` }}>
                <div className="mg-kills-dist-bar mg-kills-dist-bar--all" />
                {playerCount > 0 && (
                  <div className="mg-kills-dist-bar mg-kills-dist-bar--player" style={{ height: `${playerPct}%` }} />
                )}
              </div>
              <span className="mg-kills-dist-tick">{k}</span>
            </div>
          );
        })}
      </div>
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
  const canDismiss = editorial?.toggleStat;
  const sign = stat.mmrChange > 0 ? "+" : "";
  const hasPic = profile?.pic;
  const streakLabel = stat.streakLen
    ? `${stat.streakLen}${stat.streakType} streak`
    : stat.headline;

  return (
    <div className={`mg-spotlight-card mg-spotlight-card--${accent}`}>
      {canDismiss && (
        <button className="mg-spotlight-dismiss" onClick={() => editorial.toggleStat(type)} title="Hide this spotlight">
          <FiX size={14} />
        </button>
      )}
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
          <span className={`mg-spotlight-mmr mg-text-${accent}`}>{streakLabel}</span>
          {stat.mmrChange != null && (
            <span className={`mg-spotlight-mmr ${stat.mmrChange >= 0 ? "mg-text-green" : "mg-text-red"}`}>
              {sign}{stat.mmrChange} MMR
            </span>
          )}
          <span className="mg-spotlight-record">{stat.wins}W-{stat.losses}L</span>
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
        {editorial?.handleEditSection ? (
          <EditableQuotes quotes={quotes} statKey={type} editorial={editorial} />
        ) : (
          <QuoteBlock quotes={quotes} className="mg-spotlight-quotes" compact />
        )}
        {editorial?.browseMessages && (
          <QuoteBrowser statKey={type} battleTag={stat.battleTag} editorial={editorial} currentQuotes={quotes} />
        )}
      </div>
    </div>
  );
};

const SpotlightsSection = ({ spotlights, profiles, editorial }) => {
  const STREAK_KEYS = new Set(["HOTSTREAK", "COLDSTREAK"]);
  const cards = [
    { key: "WINNER", jsonKey: "winner", role: "Winner", accent: "green" },
    { key: "LOSER", jsonKey: "loser", role: "Loser", accent: "red" },
    { key: "GRINDER", jsonKey: "grinder", role: "Grinder", accent: "white" },
    { key: "HOTSTREAK", jsonKey: "hotStreak", role: "Hot Streak", accent: "green" },
    { key: "COLDSTREAK", jsonKey: "coldStreak", role: "Cold Streak", accent: "red" },
    { key: "HEROSLAYER", jsonKey: "heroSlayer", role: "Hero Slayer", accent: "white" },
  ];

  // Build spectrum data from hotStreak spotlight's streakSpectrum
  const hotCard = spotlights.hotStreak;
  const spectrumData = hotCard?.streakSpectrum ? {
    win: Object.entries(hotCard.streakSpectrum.wins || {}).map(([len, count]) => ({ len: parseInt(len), count })).filter((e) => !isNaN(e.len)),
    loss: Object.entries(hotCard.streakSpectrum.losses || {}).map(([len, count]) => ({ len: parseInt(len), count })).filter((e) => !isNaN(e.len)),
  } : null;

  const parsed = cards.map(({ key, jsonKey, role, accent }) => {
    const card = spotlights[jsonKey];
    if (!card) return null;
    // Normalize stat shape for SpotlightCard/StreakCard compatibility
    const stat = {
      battleTag: card.battleTag,
      name: card.battleTag.split("#")[0],
      race: card.race,
      headline: card.headline,
      mmrChange: card.mmrChange,
      streakLen: card.streakLength || card.streakLen || null,
      streakType: (card.streakLength || card.streakLen) ? (key === "HOTSTREAK" ? "W" : key === "COLDSTREAK" ? "L" : null) : null,
      wins: card.wins,
      losses: card.losses,
      form: card.form,
    };
    // Blurb: prefer server blurb, fall back to client-generated
    const serverBlurb = card.blurb || null;
    const clientBlurb = !serverBlurb ? buildStatBlurb(stat, accent) : null;
    const blurb = serverBlurb || (clientBlurb?.length > 0 ? clientBlurb.join(" ") : null);
    // Quotes: normalize from { speaker, text } to raw strings for groupQuotesBySpeaker
    const quotes = (card.quotes || []).map((q) => q.speaker ? `${q.speaker}: ${q.text}` : q.text);
    // Streak daily data
    const dailyData = STREAK_KEYS.has(key) && card.dailyBreakdown ? {
      days: card.dailyBreakdown,
      streakIdx: card.streakIdx || 0,
      streakLen: card.streakLen || card.streakLength || 0,
    } : null;
    // Hero icons for HEROSLAYER
    const heroIcons = card.playerHeroes || null;
    const victimIcons = card.victimHeroes || null;
    // Killboard: object → [{name, count}] sorted by count desc
    const killboard = card.killboard ? Object.entries(card.killboard).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count) : null;
    const maxHeroKills = card.maxKillsInGame || null;
    const killsDistribution = card.killsDistribution || null;
    return { key, stat, role, accent, blurb, quotes, dailyData, heroIcons, victimIcons, killboard, maxHeroKills, killsDistribution };
  }).filter(Boolean);

  if (parsed.length === 0) return null;

  // Get player names for spectrum labels
  const hotStat = parsed.find((c) => c.key === "HOTSTREAK");
  const coldStat = parsed.find((c) => c.key === "COLDSTREAK");
  const heroSlayerParsed = parsed.find((c) => c.key === "HEROSLAYER");
  const killsDistData = heroSlayerParsed?.killsDistribution || null;

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
      {parsed.length > 0 && (
        <div className="mg-spotlight-grid">
          {parsed.map(({ key, stat, role, accent, blurb, quotes, heroIcons, victimIcons, killboard, maxHeroKills, dailyData }) => (
            <React.Fragment key={stat.battleTag}>
              {STREAK_KEYS.has(key) && dailyData
                ? <StreakCard stat={stat} profile={profiles.get(stat.battleTag)} accent={accent} role={role} blurb={blurb} quotes={quotes} dailyData={dailyData} type={key} editorial={editorial} />
                : <SpotlightCard stat={stat} profile={profiles.get(stat.battleTag)} accent={accent} role={role} blurb={blurb} quotes={quotes} heroIcons={heroIcons} victimIcons={victimIcons} killboard={killboard} maxHeroKills={maxHeroKills} statKey={key} editorial={editorial} />
              }
              {key === "COLDSTREAK" && spectrumData && (
                <StreakSpectrum spectrumData={spectrumData} hotName={hotStat?.stat?.name} coldName={coldStat?.stat?.name} />
              )}
              {key === "HEROSLAYER" && killsDistData && (
                <HeroKillsChart killsDistribution={killsDistData} playerName={heroSlayerParsed?.stat?.name} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </section>
  );
};

const UpsetsSection = ({ upsets: rawUpsets, profiles }) => {
  // upsets are now pre-parsed with { underdogs: [{battleTag, mmr}], favorites: [{battleTag, mmr}] }
  const upsets = (rawUpsets || []).filter((u) =>
    u.underdogs.every((p) => p.mmr > 0) && u.favorites.every((p) => p.mmr > 0)
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
              <span className="mg-upset-team-avg">{Math.round(u.underdogs.reduce((s, p) => s + p.mmr, 0) / u.underdogs.length)} avg</span>
              {u.underdogs.map((p) => {
                const profile = profiles.get(p.battleTag);
                const name = p.battleTag.split("#")[0];
                return (
                  <div key={p.battleTag} className="mg-upset-player">
                    {profile?.pic && <img src={profile.pic} alt="" className="mg-upset-avatar" />}
                    <Link to={`/player/${encodeURIComponent(p.battleTag)}`} className="mg-upset-name">{name}</Link>
                    {profile?.country && <CountryFlag name={profile.country.toLowerCase()} style={{ width: 12, height: 9 }} />}
                    <span className="mg-upset-mmr">{p.mmr || ""}</span>
                  </div>
                );
              })}
            </div>
            <div className="mg-upset-vs">VS</div>
            <div className="mg-upset-team mg-upset-team--favorites">
              <span className="mg-upset-team-label mg-text-red">Favorites</span>
              <span className="mg-upset-team-avg">{Math.round(u.favorites.reduce((s, p) => s + p.mmr, 0) / u.favorites.length)} avg</span>
              {u.favorites.map((p) => {
                const profile = profiles.get(p.battleTag);
                const name = p.battleTag.split("#")[0];
                return (
                  <div key={p.battleTag} className="mg-upset-player">
                    {profile?.pic && <img src={profile.pic} alt="" className="mg-upset-avatar" />}
                    <Link to={`/player/${encodeURIComponent(p.battleTag)}`} className="mg-upset-name">{name}</Link>
                    {profile?.country && <CountryFlag name={profile.country.toLowerCase()} style={{ width: 12, height: 9 }} />}
                    <span className="mg-upset-mmr">{p.mmr || ""}</span>
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

const RankingsSection = ({ rankings, profiles }) => {
  const all = rankings || [];
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

/** Segmented AT circle — matches MmrComparison's "combined" style */
const ATCircle = ({ n, size = 20 }) => {
  const r = size / 2;
  const cx = r + 1;
  const cy = r + 1;
  const svgSize = size + 2;
  const sliceAngle = (2 * Math.PI) / n;
  const baseRot = -Math.PI / 2 + Math.PI / 4;
  const gapW = Math.max(3, size * 0.15);
  const maskId = `at-seg-${n}-${size}`;

  return (
    <svg width={svgSize} height={svgSize} style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <mask id={maskId}>
          <circle cx={cx} cy={cy} r={r} fill="white" />
          {Array.from({ length: n }, (_, i) => {
            const angle = i * sliceAngle + baseRot;
            return (
              <line key={i} x1={cx} y1={cy}
                x2={cx + Math.cos(angle) * (r + 1)} y2={cy + Math.sin(angle) * (r + 1)}
                stroke="black" strokeWidth={gapW} />
            );
          })}
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="var(--gold)" mask={`url(#${maskId})`} />
    </svg>
  );
};

/** Vertical mini MMR chart for a stack — dots with value labels, shared scale */
const StackMmrChart = ({ players, scaleMin, scaleMax, stackIdx }) => {
  const mmrs = players.filter((p) => p.mmr).map((p) => ({ name: p.name, mmr: p.mmr }));
  if (mmrs.length === 0) return null;

  const w = 70;
  const rowH = 24;
  const h = mmrs.length * rowH;
  const dotR = 4;
  const pad = dotR + 2;
  const dotX = w - 8;

  // Sort by MMR descending for vertical layout
  const sorted = [...mmrs].sort((a, b) => b.mmr - a.mmr);

  return (
    <svg width={w} height={h} className="mg-stack-chart">
      {sorted.map((p, i) => {
        const cy = pad + i * rowH + (rowH - 2 * pad) / 2;
        return (
          <g key={i}>
            <circle cx={dotX} cy={cy} r={dotR} fill="var(--gold)" opacity={0.85} />
            <text x={dotX - 10} y={cy} textAnchor="end" dominantBaseline="central"
              fontFamily="var(--font-mono)" fontSize="13" fill="#ccc">
              {p.mmr}
            </text>
          </g>
        );
      })}
      {/* Spread line */}
      {sorted.length >= 2 && (
        <line x1={dotX} y1={pad + (rowH - 2 * pad) / 2} x2={dotX}
          y2={pad + (sorted.length - 1) * rowH + (rowH - 2 * pad) / 2}
          stroke="var(--gold)" strokeWidth={1.5} opacity={0.2} />
      )}
    </svg>
  );
};

const PROMOTED_STATS = new Set(["Hero Slayer"]); // already full spotlight cards

const CompactStats = ({ newBlood, atSpotlight, heroMeta, matchStats: rawMatchStats, profiles, weekStart, weekEnd }) => {
  // All props are now pre-parsed arrays from useDigestData
  const players = (newBlood || []).map((p) => ({
    ...p,
    name: p.battleTag.split("#")[0],
    winPct: p.winRate,
    returning: p.isReturning,
    lastActive: p.lastSeen,
    firstDate: p.firstSeen,
  }));
  const stacks = (atSpotlight || []).map((s) => ({
    ...s,
    winPct: s.winRate,
    playerNames: s.players.map((p) => typeof p === "string" ? p : p.name),
  }));
  const matchStats = (rawMatchStats || []).filter((s) => !PROMOTED_STATS.has(s.category)).map((s) => ({
    ...s,
    name: s.battleTag.split("#")[0],
    detail: s.stat || s.detail,
  }));
  const heroStats = (heroMeta || []).map((s) => ({
    ...s,
    name: s.battleTag.split("#")[0],
    detail: s.stat || s.detail,
  }));
  const allAwards = [...matchStats, ...heroStats];

  if (players.length === 0 && stacks.length === 0 && allAwards.length === 0) return null;

  return (
    <section className="mg-section reveal" style={{ "--delay": "0.36s" }}>
      <div className="mg-compact-grid">
        {players.length > 0 && (() => {
          const newPlayers = players.filter((p) => !p.returning);
          const returningPlayers = players.filter((p) => p.returning);

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
            <div className="mg-compact-block">
              {newPlayers.length > 0 && (() => {
                const fmtDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

                return (
                  <>
                    <div className="mg-section-header">
                      <span className="mg-section-label mg-section-label--gold">New Blood</span>
                      <div className="mg-section-rule" />
                    </div>
                    <div className="mg-returning-list">
                      {newPlayers.map((p) => {
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
                            {p.firstDate && <span className="mg-returning-gap">{fmtDate(p.firstDate)}</span>}
                            <span className="mg-returning-stats">{p.games} games · {p.mmr} MMR</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
              {returningWithGap.length > 0 && (
                <>
                  <div className="mg-section-header" style={newPlayers.length > 0 ? { marginTop: "var(--space-4)" } : undefined}>
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
                          <span className="mg-returning-stats">{p.games} games · {p.mmr} MMR</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}
        {stacks.length > 0 && (() => {
          // Group stacks by size, largest first
          const bySize = new Map();
          for (const s of stacks) {
            const key = s.stackSize;
            if (!bySize.has(key)) bySize.set(key, []);
            bySize.get(key).push(s);
          }
          const groups = [...bySize.entries()].sort((a, b) => b[0] - a[0]);

          // Shared scale for MMR charts
          const allMmrs = stacks.flatMap((s) => s.players.filter((p) => p.mmr).map((p) => p.mmr));
          const mmrPad = 30;
          const scaleMin = allMmrs.length > 0 ? Math.min(...allMmrs) - mmrPad : 0;
          const scaleMax = allMmrs.length > 0 ? Math.max(...allMmrs) + mmrPad : 1;

          return (
            <div className="mg-compact-block">
              <div className="mg-section-header">
                <span className="mg-section-label">Team Stacks</span>
                <div className="mg-section-rule" />
              </div>
              {groups.map(([size, groupStacks]) => (
                <div key={size} className="mg-stack-group">
                  <div className="mg-stack-group-label">
                    <ATCircle n={size} size={14} />
                    <span>{size}-Stack</span>
                  </div>
                  <div className="mg-stacks-list">
                    {groupStacks.map((s, i) => (
                      <div key={i} className="mg-stack-card">
                        <div className="mg-stack-left">
                          {s.players.map((p, j) => {
                            const name = typeof p === "string" ? p : p.name;
                            const tag = typeof p === "string" ? null : p.battleTag;
                            const profile = tag ? profiles.get(tag) : null;
                            return (
                              <div key={j} className="mg-stack-player">
                                {profile?.country && <CountryFlag name={profile.country.toLowerCase()} />}
                                {tag ? (
                                  <Link to={`/player/${encodeURIComponent(tag)}`} className="mg-stack-player-name">{name}</Link>
                                ) : (
                                  <span className="mg-stack-player-name">{name}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <StackMmrChart players={s.players} scaleMin={scaleMin} scaleMax={scaleMax} stackIdx={i} />
                        <div className="mg-stack-right">
                          <span className="mg-stack-mmr">{s.avgMmr} <span className="mg-stack-mmr-label">AVG MMR</span></span>
                          <span className="mg-stack-record">{s.wins}W-{s.losses}L</span>
                          <span className={`mg-stack-wr ${s.winPct >= 60 ? "mg-text-green" : s.winPct < 50 ? "mg-text-red" : ""}`}>
                            {s.winPct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
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

const ClipsSection = ({ clips, editorial, onClipsChanged }) => {
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  if (!clips || clips.length === 0) {
    if (!editorial) return null;
    return (
      <section className="mg-section mg-clips reveal" style={{ "--delay": "0.38s" }}>
        <div className="mg-section-header">
          <span className="mg-section-label">Clips</span>
          <div className="mg-section-rule" />
        </div>
        <p style={{ color: "var(--grey-light)", fontStyle: "italic", textAlign: "center" }}>No clips yet</p>
      </section>
    );
  }

  const handleDelete = (idx) => {
    const next = clips.filter((_, i) => i !== idx);
    onClipsChanged(next);
  };

  const handleDrop = (toIdx) => {
    if (dragIdx == null || dragIdx === toIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const next = [...clips];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(toIdx, 0, moved);
    onClipsChanged(next);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const featured = clips[0];
  const rest = clips.slice(1);

  const renderClipOverlay = (idx) => editorial && (
    <div className="mg-clip-editorial-overlay">
      <button className="mg-clip-delete" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(idx); }} title="Remove clip"><FiX size={14} /></button>
      <span className="mg-clip-drag-hint"><FiMenu size={12} /> drag to reorder</span>
    </div>
  );

  return (
    <section className="mg-section mg-clips reveal" style={{ "--delay": "0.38s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label">Clips</span>
        <div className="mg-section-rule" />
      </div>
      <a
        href={featured.url} target="_blank" rel="noopener noreferrer"
        className={`mg-clip-featured${dragOverIdx === 0 ? " mg-clip--dragover" : ""}`}
        draggable={!!editorial}
        onDragStart={editorial ? () => setDragIdx(0) : undefined}
        onDragOver={editorial ? (e) => { e.preventDefault(); setDragOverIdx(0); } : undefined}
        onDragLeave={editorial ? () => setDragOverIdx((p) => p === 0 ? null : p) : undefined}
        onDrop={editorial ? (e) => { e.preventDefault(); handleDrop(0); } : undefined}
        onDragEnd={editorial ? () => { setDragIdx(null); setDragOverIdx(null); } : undefined}
      >
        {renderClipOverlay(0)}
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
          {rest.map((clip, i) => {
            const idx = i + 1;
            return (
              <a
                key={clip.clip_id} href={clip.url} target="_blank" rel="noopener noreferrer"
                className={`mg-clip-card${dragOverIdx === idx ? " mg-clip--dragover" : ""}`}
                draggable={!!editorial}
                onDragStart={editorial ? () => setDragIdx(idx) : undefined}
                onDragOver={editorial ? (e) => { e.preventDefault(); setDragOverIdx(idx); } : undefined}
                onDragLeave={editorial ? () => setDragOverIdx((p) => p === idx ? null : p) : undefined}
                onDrop={editorial ? (e) => { e.preventDefault(); handleDrop(idx); } : undefined}
                onDragEnd={editorial ? () => { setDragIdx(null); setDragOverIdx(null); } : undefined}
              >
                {renderClipOverlay(idx)}
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
            );
          })}
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
    const headers = apiKey ? { "X-API-Key": apiKey } : {};
    fetch(`${RELAY_URL}/api/admin/weekly-digests`, { cache: "no-store", headers })
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
  }, [weekParam, apiKey]);

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
  const panelDrag = useDragReorder();

  // Headline picker state
  const [headlineOptions, setHeadlineOptions] = useState([]);
  const [headlineLoading, setHeadlineLoading] = useState(false);
  const [showHeadlinePicker, setShowHeadlinePicker] = useState(false);

  // Preview mode — hides edit controls but keeps editorial panel visible
  const [previewMode, setPreviewMode] = useState(false);
  const showEditControls = ed.isEditorial && !previewMode;

  // Cover gallery picker state
  const [coverGenerations, setCoverGenerations] = useState([]);
  const [coverGalleryLoading, setCoverGalleryLoading] = useState(false);
  const [showCoverGallery, setShowCoverGallery] = useState(false);

  const handlePanelDrop = (section, from, toIdx) => {
    ed.handleReorderItem(section, from, toIdx);
  };
  const handleTogglePublish = useCallback(async () => {
    if (!weekly?.week_start || !apiKey) return;
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/publish`, {
        method: "PUT",
        headers: { "X-API-Key": apiKey },
      });
      if (res.ok) {
        const { published } = await res.json();
        setWeeklyDigests((prev) =>
          prev.map((w, i) => (i === weeklyIdx ? { ...w, published: published ? 1 : 0 } : w))
        );
      }
    } catch (err) {
      console.warn("[Magazine] Publish toggle failed:", err.message);
    }
  }, [weekly, apiKey, weeklyIdx]);

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

  // Headline picker — fetch 5 options from LLM
  const fetchHeadlines = useCallback(async () => {
    if (!weekly?.week_start || !apiKey) return;
    setHeadlineLoading(true);
    setShowHeadlinePicker(true);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/headline`, {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setHeadlineOptions(data.headlines || []);
      }
    } catch (err) {
      console.warn("[Magazine] Headline fetch failed:", err.message);
    }
    setHeadlineLoading(false);
  }, [weekly, apiKey]);

  // Cover gallery — fetch all saved generations across all weeks
  const fetchCoverGallery = useCallback(async () => {
    if (!apiKey) return;
    setCoverGalleryLoading(true);
    setShowCoverGallery(true);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/cover-generations`, {
        headers: { "X-API-Key": apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        setCoverGenerations(data || []);
      }
    } catch (err) {
      console.warn("[Magazine] Cover gallery fetch failed:", err.message);
    }
    setCoverGalleryLoading(false);
  }, [weekly, apiKey]);

  // Pick a cover generation as the official cover
  const [coverSaveState, setCoverSaveState] = useState(null); // null | "saving" | "saved" | "error"
  const pickCover = useCallback(async (generationId) => {
    if (!weekly?.week_start || !apiKey) return;
    setCoverSaveState("saving");
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/cover-from-generation`, {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ generationId }),
      });
      if (res.ok) {
        setCoverBg(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/cover.jpg?t=${Date.now()}`);
        setCoverSaveState("saved");
        setTimeout(() => { setCoverSaveState(null); setShowCoverGallery(false); }, 1200);
      } else {
        setCoverSaveState("error");
        setTimeout(() => setCoverSaveState(null), 2000);
      }
    } catch (err) {
      console.warn("[Magazine] Pick cover failed:", err.message);
      setCoverSaveState("error");
      setTimeout(() => setCoverSaveState(null), 2000);
    }
  }, [weekly, apiKey]);

  // Save cover focal point
  const saveCoverPosition = useCallback(async (position) => {
    if (!weekly?.week_start || !apiKey) return;
    try {
      await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/cover-position`, {
        method: "PUT",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ position }),
      });
      setWeeklyDigests((prev) =>
        prev.map((w, i) => (i === weeklyIdx ? { ...w, cover_position: position } : w))
      );
    } catch (err) {
      console.warn("[Magazine] Save cover position failed:", err.message);
    }
  }, [weekly, apiKey, weeklyIdx]);

  // Dual-path digest data hook — JSON when available, text fallback otherwise
  const { digestData, knownNames, sections } = useDigestData({
    weekly,
    isEditorial: ed.isEditorial,
    draft: ed.draft,
  });

  // Fetch profiles for all known battleTags
  useEffect(() => {
    if (!weekly?.digest && !weekly?.digestJson) return;
    const tags = new Set();

    // Collect all battleTags from knownNames (already aggregates all sources)
    for (const tag of knownNames.values()) {
      if (tag.includes("#")) tags.add(tag);
    }

    // Also collect from AT spotlight (stack players need flags)
    if (digestData.atSpotlight) {
      for (const stack of digestData.atSpotlight) {
        for (const p of stack.players) {
          if (p.battleTag) tags.add(p.battleTag);
        }
      }
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
  }, [weekly, knownNames, digestData.atSpotlight]);

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

  // Extract drama structure from digestData
  const dramaItems = digestData.narrative.drama;
  const leadDrama = dramaItems[0] || null;
  const dramaTitle = leadDrama?.headline || "";
  const dramaLead = leadDrama?.summary || "";
  const dramaQuotes = (leadDrama?.quotes || []).map((q) => q.speaker ? `${q.speaker}: ${q.text}` : q.text);
  const dramaSubStories = dramaItems.slice(1).map((d) => d.summary);

  // Editorial callbacks for CoverHero — editing headline edits first drama item title
  const editorialProps = showEditControls ? {
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
    weekStart: ed.weekStart,
    weekEnd: ed.weekEnd,
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
            {weekly.dataCoverage && (
              <span className="mg-data-coverage" title="Daily stats coverage for this week">
                {Object.entries(weekly.dataCoverage).map(([date, has]) => (
                  <span key={date} className={`mg-data-dot${has ? " mg-data-dot--ok" : ""}`} title={`${date}: ${has ? "data" : "missing"}`} />
                ))}
              </span>
            )}
            <div className="mg-section-rule" />
          </div>
          <div className="mg-editorial-actions">
            {weekly.week_start && (
              <Button $secondary as="a" href={`/cover-art?week=${weekly.week_start}`} title="Edit cover image">Edit Cover</Button>
            )}
            {weekly.week_start && (
              <Button $secondary onClick={fetchCoverGallery} disabled={coverGalleryLoading} title="Browse generated covers and pick one">
                {coverGalleryLoading ? "Loading..." : "Pick Cover"}
              </Button>
            )}
            <Button $secondary onClick={fetchHeadlines} disabled={headlineLoading} title="Generate 5 headline options to choose from">
              {headlineLoading ? "Generating..." : "Headlines"}
            </Button>
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
            <Button $secondary onClick={() => setPreviewMode((p) => !p)} title={previewMode ? "Return to editing mode" : "Preview as a reader would see it"}>
              {previewMode ? "Editing" : "Preview"}
            </Button>
            <Button
              $secondary={!!weekly.published}
              $primary={!weekly.published}
              onClick={handleTogglePublish}
              title={weekly.published ? "Unpublish this weekly" : "Publish this weekly to all visitors"}
            >
              {weekly.published ? "Unpublish" : "Publish"}
            </Button>
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
                  const isSelected = ed.sectionSelections[key]?.has(i);
                  return (
                    <div
                      key={i}
                      className={`mg-editorial-item${panelDrag.isDragOver(key, i) ? " mg-editorial-item--dragover" : ""}${!isSelected ? " mg-editorial-item--unpublished" : ""}`}
                      onDragOver={(e) => { if (panelDrag.dragState.section === key) { e.preventDefault(); panelDrag.onDragOver(key, i); } }}
                      onDragLeave={() => panelDrag.onDragLeave(i)}
                      onDrop={(e) => { if (panelDrag.dragState.section === key) { e.preventDefault(); panelDrag.onDrop(key, i, handlePanelDrop); } }}
                    >
                      <ItemControls
                        onDelete={() => ed.handleDeleteItem(key, i)}
                        dragProps={{
                          draggable: true,
                          onDragStart: () => panelDrag.onDragStart(key, i),
                          onDragEnd: panelDrag.onDragEnd,
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
      <CoverHero weekly={weekly} coverBg={coverBg} headline={dramaTitle || dramaLead} editorial={editorialProps} onPickCover={showEditControls ? fetchCoverGallery : null} coverPosition={weekly.cover_position} onSaveCoverPosition={showEditControls ? saveCoverPosition : null} />

      {showEditControls && (
        <TopicPills
          topics={digestData.narrative.topics}
          editorial={{ handleEditTopics: ed.handleEditTopics }}
        />
      )}

      {dramaLead && (
        <FeatureStory
          lead={dramaLead}
          quotes={dramaQuotes}
          curated={leadDrama?.quotes?.length > 0}
          nameToTag={knownNames}
          editorial={editorialProps}
        />
      )}

      <StoriesGrid
        stories={dramaSubStories}
        highlights={digestData.narrative.highlights}
        bans={digestData.narrative.bans}
        nameToTag={knownNames}
        editorial={showEditControls ? {
          deleteItem: ed.handleDeleteItem,
          reorderItem: ed.handleReorderItem,
          addItem: ed.handleAddItem,
          onEditDrama: (subIdx, text) => ed.handleEditSummary("DRAMA", subIdx + 1, text),
          onEditHighlight: (idx, text) => ed.handleEditSummary("HIGHLIGHTS", idx, text),
          onEditBan: (idx, reason, ban) => {
            const parts = [ban.name, ban.duration, reason].filter(Boolean);
            if (ban.matchId) parts.push(ban.matchId);
            ed.handleEditSummary("BANS", idx, parts.join(" "));
          },
          regenSection: ed.regenSection,
          regenLoading: ed.regenLoading,
          weekStart: ed.weekStart,
          weekEnd: ed.weekEnd,
        } : null}
      />

      <ClipsSection
        clips={weekly.clips}
        editorial={showEditControls ? {} : null}
        onClipsChanged={showEditControls ? (newClips) => {
          setWeeklyDigests((prev) => prev.map((w, i) => i === weeklyIdx ? { ...w, clips: newClips } : w));
          ed.handleEditClips(newClips);
        } : undefined}
      />

      {/* Player features */}
      {(!showEditControls || !["WINNER", "LOSER", "GRINDER", "HOTSTREAK", "COLDSTREAK", "HEROSLAYER"].every((k) => ed.hiddenStats.has(k))) && (
        <SpotlightsSection
          spotlights={digestData.spotlights}
          profiles={profiles}
          editorial={showEditControls ? { regenSpotlights: ed.regenSpotlights, regenMatchStats: ed.regenMatchStats, regenLoading: ed.regenLoading, browseMessages: ed.browseMessages, setQuotes: ed.setQuotes, handleEditSection: ed.handleEditSection, toggleStat: ed.toggleStat, weekStart: ed.weekStart, weekEnd: ed.weekEnd } : null}
        />
      )}
      {digestData.upsets.length > 0 && (!showEditControls || !ed.hiddenSections.has("UPSET")) && (
        <UpsetsSection upsets={digestData.upsets} profiles={profiles} />
      )}
      {/* Stats & data */}
      {digestData.powerRankings.length > 0 && (!showEditControls || !ed.hiddenSections.has("POWER_RANKINGS")) && (
        <RankingsSection rankings={digestData.powerRankings} profiles={profiles} />
      )}
      <CompactStats
        newBlood={(!showEditControls || !ed.hiddenSections.has("NEW_BLOOD")) ? digestData.newBlood : null}
        atSpotlight={(!showEditControls || !ed.hiddenSections.has("AT_SPOTLIGHT")) ? digestData.atSpotlight : null}
        heroMeta={(!showEditControls || !ed.hiddenSections.has("HEROES")) ? digestData.heroMeta : null}
        matchStats={(!showEditControls || !ed.hiddenSections.has("MATCH_STATS")) ? digestData.matchStats : null}
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

      {/* Headline picker overlay */}
      {showHeadlinePicker && (
        <div className="mg-picker-overlay" onClick={() => setShowHeadlinePicker(false)}>
          <div className="mg-picker-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mg-picker-header">
              <span className="mg-section-label mg-section-label--gold">Pick a Headline</span>
              <button className="mg-picker-close" onClick={() => setShowHeadlinePicker(false)}><FiX size={16} /></button>
            </div>
            {headlineLoading ? (
              <div className="mg-picker-loading"><PeonLoader size="sm" /></div>
            ) : headlineOptions.length === 0 ? (
              <p className="mg-picker-empty">No headlines generated yet.</p>
            ) : (
              <div className="mg-headline-options">
                {headlineOptions.map((opt, i) => (
                  <button
                    key={i}
                    className="mg-headline-option"
                    onClick={() => {
                      editorialProps?.onEditHeadline(opt.headline);
                      setShowHeadlinePicker(false);
                    }}
                  >
                    <span className="mg-headline-score">{opt.score}</span>
                    <div className="mg-headline-content">
                      <span className="mg-headline-text">{opt.headline}</span>
                      {opt.players?.length > 0 && (
                        <span className="mg-headline-players">
                          {opt.players.map((p) => p.name).join(", ")}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cover gallery picker overlay */}
      {showCoverGallery && (
        <div className="mg-picker-overlay" onClick={() => setShowCoverGallery(false)}>
          <div className="mg-picker-panel mg-picker-panel--gallery" onClick={(e) => e.stopPropagation()}>
            <div className="mg-picker-header">
              <span className="mg-section-label mg-section-label--gold">Pick a Cover{coverGenerations.length > 0 ? ` (${coverGenerations.length})` : ""}</span>
              {coverSaveState && (
                <span className={`mg-cover-save-state mg-cover-save-state--${coverSaveState}`}>
                  {coverSaveState === "saving" ? "Saving..." : coverSaveState === "saved" ? "Saved!" : "Failed"}
                </span>
              )}
              <button className="mg-picker-close" onClick={() => setShowCoverGallery(false)}><FiX size={16} /></button>
            </div>
            {coverGalleryLoading ? (
              <div className="mg-picker-loading"><PeonLoader size="sm" /></div>
            ) : coverGenerations.length === 0 ? (
              <p className="mg-picker-empty">No generated covers found.</p>
            ) : (
              <div className="mg-cover-grid">
                {coverGenerations.map((gen) => (
                  <div
                    key={gen.id}
                    className="mg-cover-card"
                    onClick={() => pickCover(gen.id)}
                  >
                    <div className="mg-cover-card-thumb">
                      <img
                        src={`${RELAY_URL}/api/admin/cover-generation/${gen.id}/image`}
                        alt={gen.headline || "Cover option"}
                        loading="lazy"
                      />
                    </div>
                    <div className="mg-cover-card-info">
                      {gen.headline && <span className="mg-cover-card-title">{gen.headline}</span>}
                      <span className="mg-cover-card-date">
                        {gen.week_start && <span className="mg-cover-card-week">{gen.week_start}</span>}
                        {new Date(gen.created_at + "Z").toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
