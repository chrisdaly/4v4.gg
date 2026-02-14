import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useLocation, useHistory } from "react-router-dom";
import useChatStream from "../lib/useChatStream";
import { getPlayerProfile } from "../lib/api";
import { CountryFlag } from "../components/ui";
import { FiExternalLink, FiCamera, FiRefreshCw, FiEdit2 } from "react-icons/fi";
import html2canvas from "html2canvas";
import ChatContext from "../components/news/ChatContext";
import {
  DIGEST_SECTIONS,
  parseDigestSections,
  parseMentions,
  parseStatLine,
  extractMentionedTags,
  splitQuotes,
  groupQuotesBySpeaker,
} from "../lib/digestUtils";
import TopicTrends from "../components/news/TopicTrends";
import BeefTracker from "../components/news/BeefTracker";
import useAdmin from "../lib/useAdmin";
import "../styles/pages/News.css";


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
  const d = new Date(dateStr + "T12:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dateFormatted = `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return `Today so far · ${dateFormatted}`;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === yesterday) {
    const todayMD = new Date().toISOString().slice(5, 10);
    if (todayMD === "02-14") return `Valentine's Eve · ${dateFormatted}`;
    return `Yesterday · ${dateFormatted}`;
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

const DigestQuotes = ({ quotes }) => {
  if (!quotes || quotes.length === 0) return null;
  const groups = groupQuotesBySpeaker(quotes);
  const hasAttribution = groups.some((g) => g.name);
  if (!hasAttribution) {
    return (
      <div className="digest-quotes">
        {quotes.map((q, qi) => (
          <div key={qi} className="digest-quote">{q}</div>
        ))}
      </div>
    );
  }
  return (
    <div className="digest-quotes digest-quotes--chat">
      {groups.map((g, gi) => (
        <div key={gi} className="digest-quote-group">
          {g.name && <span className="digest-quote-name">{g.name}</span>}
          {g.messages.map((text, ti) => (
            <div key={ti} className="digest-quote digest-quote--attributed">{text}</div>
          ))}
        </div>
      ))}
    </div>
  );
};

const StatSection = ({ stat, cls, label, profiles, date, expanded, onToggle }) => {
  const profile = profiles.get(stat.battleTag);
  return (
    <div className={`digest-section digest-section--${cls} digest-section--clickable`} onClick={onToggle}>
      <span className="digest-section-label">{label}</span>
      <div className="digest-stat">
        {profile?.pic && <DigestAvatar src={profile.pic} country={profile.country} />}
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
                    <span className="stat-picker-candidate-record">
                      {c.wins}W-{c.losses}L
                      {c.winStreak > 0 && <span className="stat-picker-streak stat-picker-streak--hot"> ({c.winStreak}W streak)</span>}
                      {c.lossStreak > 0 && <span className="stat-picker-streak stat-picker-streak--cold"> ({c.lossStreak}L streak)</span>}
                    </span>
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

/* ── Editable section keys ──────────────────────────── */

const EDITABLE_SECTIONS = [
  { key: "DRAMA", label: "Drama", cls: "drama" },
  { key: "BANS", label: "Bans", cls: "bans" },
  { key: "HIGHLIGHTS", label: "Highlights", cls: "highlights" },
];

/* ── DigestBanner ────────────────────────────────────── */

const DigestBanner = ({ digest, nameSet, nameToTag, label = "Yesterday in 4v4", dateTabs, isAdmin, apiKey, onDigestUpdated, filterPlayer }) => {
  const digestRef = useRef(null);
  const [copyState, setCopyState] = useState(null); // null | "copying" | "copied" | "saved"
  const [expandedItem, setExpandedItem] = useState(null); // { key, idx } or null

  // ── Editorial state (only active when isEditorial) ──
  const today = new Date().toISOString().slice(0, 10);
  const isEditorial = isAdmin && !!apiKey && digest?.date && digest.date !== today;

  const [draft, setDraft] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [sectionSelections, setSectionSelections] = useState({});
  const [statCandidates, setStatCandidates] = useState(null);
  const [selectedStats, setSelectedStats] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [hiddenAvatars, setHiddenAvatars] = useState(new Set()); // battle tags to hide

  // Initialize hiddenAvatars from published digest data (non-editorial mode)
  useEffect(() => {
    if (isEditorial) return; // editorial mode handles this in draft fetch
    if (digest?.hidden_avatars) {
      try { setHiddenAvatars(new Set(JSON.parse(digest.hidden_avatars))); }
      catch { setHiddenAvatars(new Set()); }
    } else {
      setHiddenAvatars(new Set());
    }
  }, [isEditorial, digest?.date]);

  const [itemEdits, setItemEdits] = useState({});
  const [fetchingMore, setFetchingMore] = useState(null);
  const [publishState, setPublishState] = useState("idle");

  // Fetch draft + stat candidates when editorial
  useEffect(() => {
    if (!isEditorial) {
      setDraft(null);
      setStatCandidates(null);
      setSectionSelections({});
      setSelectedStats({});
      setItemEdits({});
      setPublishState("idle");
      return;
    }
    setDraftLoading(true);
    Promise.all([
      fetch(`${RELAY_URL}/api/admin/digest/${digest.date}/draft`, {
        headers: { "X-API-Key": apiKey },
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${RELAY_URL}/api/admin/digest/${digest.date}/stat-candidates`, {
        headers: { "X-API-Key": apiKey },
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([draftData, candidatesData]) => {
      const pubDigest = draftData?.digest || "";
      const pubSections = parseDigestSections(pubDigest);

      if (draftData?.draft) {
        setDraft(draftData.draft);
        const draftSections = parseDigestSections(draftData.draft);

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
      } else {
        setDraft(null);
        setSectionSelections({});
      }

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
      } else {
        setStatCandidates(null);
        setSelectedStats({});
      }

      // Initialize hidden avatars from server
      if (draftData?.hidden_avatars) {
        try { setHiddenAvatars(new Set(JSON.parse(draftData.hidden_avatars))); }
        catch { setHiddenAvatars(new Set()); }
      } else {
        setHiddenAvatars(new Set());
      }

      setItemEdits({});
      setPublishState("idle");
      setDraftLoading(false);
      // Mark initialized after a tick so the auto-save effect skips the initial load
      setTimeout(() => { initializedRef.current = true; }, 0);
    }).catch(() => setDraftLoading(false));
  }, [isEditorial, digest?.date, apiKey]);

  // ── Editorial helpers ──

  const toggleItem = useCallback((sectionKey, idx) => {
    setSectionSelections((prev) => {
      const sel = new Set(prev[sectionKey] || []);
      if (sel.has(idx)) sel.delete(idx);
      else sel.add(idx);
      return { ...prev, [sectionKey]: sel };
    });
  }, []);

  const toggleStat = useCallback((key, idx) => {
    setSelectedStats((prev) => {
      const next = { ...prev };
      if (next[key] === idx) delete next[key];
      else next[key] = idx;
      return next;
    });
  }, []);

  const handleEditorQuotes = useCallback((sectionKey, itemIdx, newQuotes) => {
    setDraft(prev => {
      if (!prev) return prev;
      const sections = parseDigestSections(prev);
      const sec = sections.find(s => s.key === sectionKey);
      if (!sec) return prev;
      const items = sec.content.split(/;\s*/).map(s => s.trim()).filter(Boolean);
      if (itemIdx >= items.length) return prev;
      const summary = items[itemIdx].replace(/"[^"]+"/g, '').replace(/\s{2,}/g, ' ').trim()
        .replace(/\s*[—:,]\s*$/, '').trim();
      const quoteParts = newQuotes.map(q => `"${q}"`).join(' ');
      const newItem = quoteParts ? `${summary} ${quoteParts}` : summary;
      items[itemIdx] = newItem;
      setItemEdits(prev => ({
        ...prev,
        [sectionKey]: { ...prev[sectionKey], [itemIdx]: newItem },
      }));
      sec.content = items.join('; ');
      return sections.map(s => `${s.key}: ${s.content}`).join('\n');
    });
  }, []);

  const handleEditSummary = useCallback((sectionKey, itemIdx, newSummary) => {
    setEditingItem(null);
    const trimmed = newSummary.trim();
    if (!trimmed) return;
    setDraft(prev => {
      if (!prev) return prev;
      const sections = parseDigestSections(prev);
      const sec = sections.find(s => s.key === sectionKey);
      if (!sec) return prev;
      const items = sec.content.split(/;\s*/).map(s => s.trim()).filter(Boolean);
      if (itemIdx >= items.length) return prev;
      const { quotes } = splitQuotes(items[itemIdx]);
      const quoteParts = quotes.map(q => `"${q}"`).join(' ');
      const newItem = quoteParts ? `${trimmed} ${quoteParts}` : trimmed;
      items[itemIdx] = newItem;
      setItemEdits(prev => ({
        ...prev,
        [sectionKey]: { ...prev[sectionKey], [itemIdx]: newItem },
      }));
      sec.content = items.join('; ');
      return sections.map(s => `${s.key}: ${s.content}`).join('\n');
    });
  }, []);

  // Drag-and-drop reorder state
  const dragRef = useRef(null); // { key, idx }
  const [dragOverIdx, setDragOverIdx] = useState(null); // { key, idx } or null

  const handleReorderItem = useCallback((sectionKey, fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    setDraft(prev => {
      if (!prev) return prev;
      const sections = parseDigestSections(prev);
      const sec = sections.find(s => s.key === sectionKey);
      if (!sec) return prev;
      const items = sec.content.split(/;\s*/).map(s => s.trim()).filter(Boolean);
      if (fromIdx >= items.length || toIdx >= items.length) return prev;
      // Remove from old position, insert at new
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      sec.content = items.join('; ');
      // Remap selection indices
      setSectionSelections(prev => {
        const oldSel = prev[sectionKey] || new Set();
        const newSel = new Set();
        for (const i of oldSel) {
          if (i === fromIdx) { newSel.add(toIdx); }
          else if (fromIdx < toIdx && i > fromIdx && i <= toIdx) { newSel.add(i - 1); }
          else if (fromIdx > toIdx && i >= toIdx && i < fromIdx) { newSel.add(i + 1); }
          else { newSel.add(i); }
        }
        return { ...prev, [sectionKey]: newSel };
      });
      // Remap item edits indices
      setItemEdits(prev => {
        const oldEdits = prev[sectionKey];
        if (!oldEdits || Object.keys(oldEdits).length === 0) return prev;
        const newEdits = {};
        for (const [k, v] of Object.entries(oldEdits)) {
          const i = Number(k);
          if (i === fromIdx) { newEdits[toIdx] = v; }
          else if (fromIdx < toIdx && i > fromIdx && i <= toIdx) { newEdits[i - 1] = v; }
          else if (fromIdx > toIdx && i >= toIdx && i < fromIdx) { newEdits[i + 1] = v; }
          else { newEdits[i] = v; }
        }
        return { ...prev, [sectionKey]: newEdits };
      });
      return sections.map(s => `${s.key}: ${s.content}`).join('\n');
    });
  }, []);

  const handleFetchMore = useCallback(async (sectionKey) => {
    if (fetchingMore) return;
    setFetchingMore(sectionKey);
    try {
      const draftSections = parseDigestSections(draft || "");
      const sec = draftSections.find(s => s.key === sectionKey);
      const existingItems = sec
        ? sec.content.split(/;\s*/).map(s => s.trim()).filter(Boolean)
        : [];

      const res = await fetch(`${RELAY_URL}/api/admin/digest/${digest.date}/more-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ section: sectionKey, existingItems }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setDraft(prev => {
            if (!prev) return prev;
            const sections = parseDigestSections(prev);
            const sec = sections.find(s => s.key === sectionKey);
            if (sec) {
              sec.content = sec.content + '; ' + data.items.join('; ');
            } else {
              sections.push({ key: sectionKey, content: data.items.join('; ') });
            }
            return sections.map(s => `${s.key}: ${s.content}`).join('\n');
          });
        }
      }
    } catch { /* ignore */ }
    setFetchingMore(null);
  }, [fetchingMore, draft, digest?.date, apiKey]);

  // Parse editable sections from draft (for publish count + section headers)
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

  // Auto-save: debounced publish whenever selections/stats/edits change
  const initializedRef = useRef(false);
  const saveTimerRef = useRef(null);
  const onDigestUpdatedRef = useRef(onDigestUpdated);
  onDigestUpdatedRef.current = onDigestUpdated;

  // Reset initialized flag when switching dates
  useEffect(() => {
    initializedRef.current = false;
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [digest?.date]);

  useEffect(() => {
    if (!isEditorial || !initializedRef.current || !draft) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setPublishState("dirty");

    saveTimerRef.current = setTimeout(async () => {
      setPublishState("saving");
      try {
        const selectedItems = {};
        for (const { key } of editableSections) {
          const sel = sectionSelections[key];
          if (sel) selectedItems[key] = [...sel].sort((a, b) => a - b);
        }

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
        if (Object.keys(itemEdits).length > 0) body.itemOverrides = itemEdits;
        if (hiddenAvatars.size > 0) body.hiddenAvatars = [...hiddenAvatars];

        // Save curate + updated draft in parallel
        const [curateRes] = await Promise.all([
          fetch(`${RELAY_URL}/api/admin/digest/${digest.date}/curate`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
            body: JSON.stringify(body),
          }),
          // Persist draft changes (text edits, reorders, quote changes)
          fetch(`${RELAY_URL}/api/admin/digest/${digest.date}/draft`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
            body: JSON.stringify({ draft }),
          }).catch(() => {}),
        ]);
        if (curateRes.ok) {
          const data = await curateRes.json();
          if (onDigestUpdatedRef.current) onDigestUpdatedRef.current(data.digest);
          setPublishState("saved");
          setTimeout(() => setPublishState((s) => s === "saved" ? "idle" : s), 2000);
        } else {
          setPublishState("idle");
        }
      } catch {
        setPublishState("idle");
      }
    }, 800);
  }, [sectionSelections, selectedStats, itemEdits, hiddenAvatars, isEditorial, draft, editableSections, statCandidates, digest?.date, apiKey]);

  // ── Non-admin quote saving (old behavior, kept for published view) ──
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

  // ── Screenshot ──
  const handleScreenshot = async () => {
    if (!digestRef.current || copyState === "copying") return;
    setCopyState("copying");
    try {
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

          // Hide screenshot button, chat transcripts, and admin controls
          const btn = el.querySelector(".digest-screenshot-btn");
          if (btn) btn.style.display = "none";
          for (const ctx of el.querySelectorAll(".chat-context")) {
            ctx.style.display = "none";
          }
          for (const ctrl of el.querySelectorAll(".digest-admin-controls")) {
            ctrl.style.display = "none";
          }
          for (const ctrl of el.querySelectorAll(".digest-admin-footer")) {
            ctrl.style.display = "none";
          }
          // Hide deselected items in screenshots
          for (const dim of el.querySelectorAll(".digest-bullet-row--dimmed")) {
            dim.style.display = "none";
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

  // ── Text source: use draft in editorial mode, otherwise published text ──
  const sourceText = isEditorial && draft ? draft : (digest.digest || "");

  // Reset expanded item when switching digests (not on draft edits)
  useEffect(() => { setExpandedItem(null); }, [digest?.date]);
  const allSections = useMemo(() => parseDigestSections(sourceText), [sourceText]);

  // Build nameToTag from draft's MENTIONS section in editorial mode
  const draftNameToTag = useMemo(() => {
    if (!isEditorial || !draft) return null;
    const draftSections = parseDigestSections(draft);
    return parseMentions(draftSections);
  }, [isEditorial, draft]);

  const mentionsMap = useMemo(() => parseMentions(allSections), [allSections]);
  const combinedNameToTag = useMemo(() => {
    const merged = new Map(mentionsMap);
    if (nameToTag) {
      for (const [name, tag] of nameToTag) {
        if (!merged.has(name)) merged.set(name, tag);
      }
    }
    if (draftNameToTag) {
      for (const [name, tag] of draftNameToTag) {
        if (!merged.has(name)) merged.set(name, tag);
      }
    }
    return merged;
  }, [mentionsMap, nameToTag, draftNameToTag]);

  const sections = useMemo(() => {
    const visible = allSections.filter((s) => s.key !== "MENTIONS");
    // Skip BANS dedup filter in editorial mode — admin sees all items
    if (isEditorial) return visible;
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
  }, [allSections, combinedNameToTag, isEditorial]);

  const combinedNameSet = useMemo(() => {
    const names = new Set(nameSet);
    for (const name of combinedNameToTag.keys()) {
      names.add(name);
    }
    return names;
  }, [nameSet, combinedNameToTag]);

  // When filtering by player, only show sections that mention them
  const displaySections = useMemo(() => {
    if (!filterPlayer) return sections;
    const pName = filterPlayer.split("#")[0];
    const escaped = pName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    return sections.filter((s) => re.test(s.content));
  }, [sections, filterPlayer]);

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

  const todayMD = new Date().toISOString().slice(5, 10);
  const isValentines = todayMD === "02-14" || digest.date?.slice(5) === "02-14";
  const digestCls = `news-digest${isValentines ? " news-digest--valentines" : ""}`;
  const vLabels = isValentines ? {
    TOPICS: "Pillow Talk",
    DRAMA: "Lovers' Quarrels",
    BANS: "Restraining Orders",
    HIGHLIGHTS: "Love Letters",
    WINNER: "Heartbreaker",
    LOSER: "Heartbroken",
    GRINDER: "Hopeless Romantic",
    HOTSTREAK: "Hot Date",
    COLDSTREAK: "Left on Read",
  } : null;

  // Check if a section is editable in editorial mode
  const isEditableSection = (key) => EDITABLE_SECTIONS.some((s) => s.key === key);

  if (displaySections.length === 0) {
    return (
      <div className={digestCls} ref={digestRef}>
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
        {draftLoading && isEditorial && (
          <div className="digest-admin-loading">Loading draft...</div>
        )}
        <p className="digest-section-text">{highlightNames(sourceText, combinedNameSet)}</p>
      </div>
    );
  }

  return (
    <div className={digestCls} ref={digestRef}>
      {isValentines && (
        <div className="valentines-hearts">
          {[...Array(10)].map((_, i) => <span key={i} className="valentines-heart">{i % 3 === 0 ? "💘" : i % 3 === 1 ? "❤️" : "💕"}</span>)}
        </div>
      )}
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
      {draftLoading && isEditorial && (
        <div className="digest-admin-loading">Loading draft...</div>
      )}
      {filterPlayer && (
        <div className="digest-player-filter">
          <span>Showing mentions of <strong>{filterPlayer.split("#")[0]}</strong></span>
          <Link to="/news" className="digest-player-filter-clear">&times;</Link>
        </div>
      )}
      <div className="digest-sections">
        {displaySections.map(({ key, content }) => {
          const meta = DIGEST_SECTIONS.find((s) => s.key === key);
          if (!meta) return null;
          if (key === "SPIKES") return null;
          if (/^none$/i.test(content.trim())) return null;
          const cls = meta.cls;
          const sectionLabel = vLabels?.[key] || meta.label;
          const editable = isEditorial && isEditableSection(key);

          if (meta.stat) {
            const stat = parseStatLine(content);
            if (stat) {
              const isExpanded = expandedItem?.key === key;
              return (
                <StatSection
                  key={key}
                  stat={stat}
                  cls={cls}
                  label={sectionLabel}
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
                <span className="digest-section-label">{sectionLabel}</span>
                <span className="digest-tags">
                  {content.split(/,\s*/).filter(Boolean).map((tag, i) => (
                    <span key={i} className="digest-tag">{tag.trim()}</span>
                  ))}
                </span>
              </div>
            );
          }

          const items = content.split(/;\s*/).map(s => s.trim()).filter(Boolean);
          const isRecap = key === "RECAP";
          const isClickable = !isRecap;

          // Section header with editorial controls
          const sectionSel = sectionSelections[key];
          const sectionHeader = editable ? (
            <div className="digest-section-admin-label">
              <span className="digest-section-label">{sectionLabel}</span>
              <span className="digest-admin-count">{sectionSel?.size || 0}/{items.length}</span>
              <button
                className="digest-admin-more-btn"
                onClick={(e) => { e.stopPropagation(); handleFetchMore(key); }}
                disabled={fetchingMore === key}
              >
                {fetchingMore === key ? "..." : "More"}
              </button>
            </div>
          ) : (
            <span className="digest-section-label">{sectionLabel}</span>
          );

          return (
            <div key={key} className={`digest-section digest-section--${cls}`}>
              {sectionHeader}
              {items.length > 1 ? (
                <ul className="digest-bullets">
                  {items.map((item, i) => {
                    const itemTags = extractMentionedTags(item, combinedNameToTag);
                    const avatarTags = itemTags.filter((tag) => !hiddenAvatars.has(tag));
                    const avatarProfiles = avatarTags.map((tag) => profiles.get(tag)).filter((p) => p?.pic);
                    const { summary, quotes } = splitQuotes(item);
                    const isExpanded = expandedItem?.key === key && expandedItem?.idx === i;
                    const isSelected = editable ? (sectionSel?.has(i) ?? false) : true;
                    const isEditing = editingItem?.key === key && editingItem?.idx === i;

                    const handleClick = editable
                      ? (e) => { if (e.target.closest(".chat-context")) return; toggleItem(key, i); }
                      : isClickable
                        ? (e) => { if (e.target.closest(".chat-context")) return; setExpandedItem(isExpanded ? null : { key, idx: i }); }
                        : undefined;

                    const isDragOver = editable && dragOverIdx?.key === key && dragOverIdx?.idx === i;

                    return (
                      <li
                        key={i}
                        className={`digest-bullet-row${isClickable || editable ? " digest-bullet-row--clickable" : ""}${editable && !isSelected ? " digest-bullet-row--dimmed" : ""}${editable ? " digest-bullet-row--editorial" : ""}${isDragOver ? " digest-bullet-row--dragover" : ""}`}
                        onClick={handleClick}
                        draggable={editable && !isEditing && !isExpanded}
                        onDragStart={editable ? (e) => {
                          dragRef.current = { key, idx: i };
                          e.dataTransfer.effectAllowed = "move";
                          e.currentTarget.classList.add("digest-bullet-row--dragging");
                        } : undefined}
                        onDragEnd={editable ? (e) => {
                          dragRef.current = null;
                          setDragOverIdx(null);
                          e.currentTarget.classList.remove("digest-bullet-row--dragging");
                        } : undefined}
                        onDragOver={editable ? (e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragRef.current?.key === key && dragRef.current?.idx !== i) {
                            setDragOverIdx({ key, idx: i });
                          }
                        } : undefined}
                        onDragLeave={editable ? () => {
                          setDragOverIdx((prev) => prev?.key === key && prev?.idx === i ? null : prev);
                        } : undefined}
                        onDrop={editable ? (e) => {
                          e.preventDefault();
                          setDragOverIdx(null);
                          if (dragRef.current?.key === key && dragRef.current.idx !== i) {
                            handleReorderItem(key, dragRef.current.idx, i);
                          }
                          dragRef.current = null;
                        } : undefined}
                      >
                        {editable && (
                          <div className="digest-admin-controls" onClick={(e) => e.stopPropagation()}>
                            <span
                              className={`digest-admin-check${isSelected ? " digest-admin-check--on" : ""}`}
                              onClick={() => toggleItem(key, i)}
                            >
                              {isSelected ? "\u2713" : ""}
                            </span>
                            <span
                              className="digest-admin-edit"
                              title="Edit text"
                              onClick={() => setEditingItem(isEditing ? null : { key, idx: i })}
                            >
                              <FiEdit2 size={12} />
                            </span>
                            <span
                              className={`digest-admin-chat${isExpanded ? " digest-admin-chat--active" : ""}`}
                              title="Browse chat context"
                              onClick={() => setExpandedItem(isExpanded ? null : { key, idx: i })}
                            >
                              💬
                            </span>
                          </div>
                        )}
                        <div className="digest-bullet-summary">
                          {avatarProfiles.length > 0 && (
                            <span className="digest-avatars">
                              {avatarProfiles.map((p, ai) => (
                                <span key={ai} className="digest-avatar-wrap">
                                  <img src={p.pic} alt="" className="digest-avatar" onError={(e) => { e.target.style.display = "none"; }} />
                                  {p.country && <CountryFlag name={p.country.toLowerCase()} className="digest-avatar-flag" />}
                                  {editable && (
                                    <span
                                      className="digest-avatar-remove"
                                      onClick={(e) => { e.stopPropagation(); setHiddenAvatars((prev) => new Set(prev).add(avatarTags[ai])); }}
                                    >&times;</span>
                                  )}
                                </span>
                              ))}
                            </span>
                          )}
                          {isEditing ? (
                            <input
                              className="digest-admin-input"
                              defaultValue={summary}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditSummary(key, i, e.target.value);
                                if (e.key === "Escape") setEditingItem(null);
                              }}
                              onBlur={(e) => handleEditSummary(key, i, e.target.value)}
                            />
                          ) : (
                            <span className="digest-section-text">
                              {highlightNames(summary, combinedNameSet)}
                            </span>
                          )}
                        </div>
                        <div className="digest-bullet-content">
                          <DigestQuotes quotes={quotes} />
                          {isClickable && (
                            <ChatContext
                              date={digest.date}
                              battleTags={itemTags}
                              quotes={quotes}
                              expanded={isExpanded}
                              selectable={isEditorial || isAdmin}
                              existingQuotes={quotes}
                              onSaveQuotes={isEditorial
                                ? (newQ) => handleEditorQuotes(key, i, newQ)
                                : (newQ) => handleSaveQuotes(key, i, newQ)
                              }
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div
                  className={`digest-section-body${isClickable ? " digest-section-body--clickable" : ""}`}
                  onClick={isClickable && !editable ? () => {
                    const isExpanded = expandedItem?.key === key && expandedItem?.idx === 0;
                    setExpandedItem(isExpanded ? null : { key, idx: 0 });
                  } : editable ? () => toggleItem(key, 0) : undefined}
                >
                  {(() => {
                    const tags = extractMentionedTags(content, combinedNameToTag).filter((t) => !hiddenAvatars.has(t));
                    const singleProfiles = tags.map((tag) => profiles.get(tag)).filter((p) => p?.pic);
                    const { summary, quotes } = splitQuotes(content);
                    const isExpanded = expandedItem?.key === key && expandedItem?.idx === 0;
                    const isSelected = editable ? (sectionSel?.has(0) ?? false) : true;
                    const isEditing = editingItem?.key === key && editingItem?.idx === 0;
                    return (
                      <div className={`digest-bullet-content${editable && !isSelected ? " digest-bullet-row--dimmed" : ""}`}>
                        {editable && (
                          <div className="digest-admin-controls" onClick={(e) => e.stopPropagation()}>
                            <span
                              className={`digest-admin-check${isSelected ? " digest-admin-check--on" : ""}`}
                              onClick={() => toggleItem(key, 0)}
                            >
                              {isSelected ? "\u2713" : ""}
                            </span>
                            <span
                              className="digest-admin-edit"
                              title="Edit text"
                              onClick={() => setEditingItem(isEditing ? null : { key, idx: 0 })}
                            >
                              <FiEdit2 size={12} />
                            </span>
                            <span
                              className={`digest-admin-chat${isExpanded ? " digest-admin-chat--active" : ""}`}
                              title="Browse chat context"
                              onClick={() => setExpandedItem(isExpanded ? null : { key, idx: 0 })}
                            >
                              💬
                            </span>
                          </div>
                        )}
                        {singleProfiles.length > 0 && (
                          <span className="digest-avatars">
                            {singleProfiles.map((p, ai) => (
                              <DigestAvatar key={ai} src={p.pic} country={p.country} />
                            ))}
                          </span>
                        )}
                        {isEditing ? (
                          <input
                            className="digest-admin-input"
                            defaultValue={summary}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSummary(key, 0, e.target.value);
                              if (e.key === "Escape") setEditingItem(null);
                            }}
                            onBlur={(e) => handleEditSummary(key, 0, e.target.value)}
                          />
                        ) : (
                          <span className="digest-section-text">
                            {highlightNames(summary, combinedNameSet)}
                          </span>
                        )}
                        <DigestQuotes quotes={quotes} />
                        {isClickable && (
                          <ChatContext
                            date={digest.date}
                            battleTags={tags}
                            quotes={quotes}
                            expanded={isExpanded}
                            selectable={isEditorial || isAdmin}
                            existingQuotes={quotes}
                            onSaveQuotes={isEditorial
                              ? (newQ) => handleEditorQuotes(key, 0, newQ)
                              : (newQ) => handleSaveQuotes(key, 0, newQ)
                            }
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* ── Editorial footer: stat picker + save status ── */}
      {isEditorial && (
        <div className="digest-admin-footer">
          <StatPicker
            candidates={statCandidates}
            selectedStats={selectedStats}
            onToggle={toggleStat}
          />
          {publishState !== "idle" && (
            <div className={`digest-admin-status${publishState === "saved" ? " digest-admin-status--saved" : ""}`}>
              {publishState === "saving" ? "Saving..." : publishState === "saved" ? "\u2713 Saved" : publishState === "dirty" ? "Unsaved changes" : ""}
            </div>
          )}
        </div>
      )}
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

  const location = useLocation();
  const history = useHistory();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlDate = searchParams.get("date");
  const urlPlayer = searchParams.get("player");

  const { adminKey, isAdmin, showAdmin, setAdminKey: setAdminKeyHook } = useAdmin();
  const [keyInput, setKeyInput] = useState("");

  const handleKeySubmit = useCallback(() => {
    const key = keyInput.trim();
    if (!key) return;
    setAdminKeyHook(key);
    setKeyInput("");
  }, [keyInput, setAdminKeyHook]);

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

  // When publish updates digest text, update local state
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
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleKeySubmit()}
              />
              <button className="digest-editor-key-btn" onClick={handleKeySubmit} disabled={!keyInput.trim()}>
                Save
              </button>
            </div>
          </div>
        )}
        {isAdmin && viewMode === "daily" && isViewingToday && (
          <div className="digest-today-notice">
            Live digest — editing available after the day ends
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
