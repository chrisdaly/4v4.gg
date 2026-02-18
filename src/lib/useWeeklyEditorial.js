import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { parseDigestSections } from "./digestUtils";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const AUTOSAVE_DELAY = 800;

/** Sections where items are semicolon-separated and individually toggleable */
export const ITEM_SECTIONS = [
  { key: "DRAMA", label: "Drama" },
  { key: "BANS", label: "Bans" },
  { key: "HIGHLIGHTS", label: "Highlights" },
  { key: "NEW_BLOOD", label: "New Blood" },
  { key: "UPSET", label: "Upsets" },
  { key: "AT_SPOTLIGHT", label: "AT Stacks" },
];

/** Sections that can be toggled on/off as a whole (non-semicolon) */
export const TOGGLEABLE_SECTIONS = [
  { key: "POWER_RANKINGS", label: "Power Rankings" },
  { key: "MATCH_STATS", label: "Match Stats" },
  { key: "HEROES", label: "Heroes" },
];

/** Stat lines that can be shown/hidden */
export const STAT_LINES = [
  { key: "WINNER", label: "Winner" },
  { key: "LOSER", label: "Loser" },
  { key: "GRINDER", label: "Grinder" },
  { key: "HEROSLAYER", label: "Hero Slayer" },
  { key: "HOTSTREAK", label: "Hot Streak" },
  { key: "COLDSTREAK", label: "Cold Streak" },
];

const ITEM_KEYS = new Set(ITEM_SECTIONS.map((s) => s.key));

/**
 * Weekly editorial hook — manages draft state, item selections,
 * section visibility, inline edits, and autosave for weekly digests.
 */
export default function useWeeklyEditorial({ weekly, isAdmin, apiKey, onDigestUpdated }) {
  const isEditorial = isAdmin && !!apiKey && !!weekly?.week_start;

  const [draft, setDraft] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  // Per-item selections for semicolon sections: { DRAMA: Set([0,1,3]), ... }
  const [sectionSelections, setSectionSelections] = useState({});
  // Hidden sections (toggled off entirely): Set of keys
  const [hiddenSections, setHiddenSections] = useState(new Set());
  // Hidden stat lines: Set of keys
  const [hiddenStats, setHiddenStats] = useState(new Set());
  // Inline text edits: { DRAMA: { 0: "edited text", ... }, ... }
  const [itemEdits, setItemEdits] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [publishState, setPublishState] = useState("idle");
  // Per-section regeneration: section key while loading, null when idle
  const [regenLoading, setRegenLoading] = useState(null);

  // Fetch draft when entering editorial mode
  useEffect(() => {
    if (!isEditorial) {
      setDraft(null);
      setSectionSelections({});
      setHiddenSections(new Set());
      setHiddenStats(new Set());
      setItemEdits({});
      setPublishState("idle");
      return;
    }
    setDraftLoading(true);
    fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/draft`, {
      headers: { "X-API-Key": apiKey },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const pubDigest = data?.digest || "";
        const pubSections = parseDigestSections(pubDigest);
        const pubKeys = new Set(pubSections.map((s) => s.key));

        if (data?.draft) {
          setDraft(data.draft);
          const draftSections = parseDigestSections(data.draft);

          // Initialize item selections — match published items against draft items
          const selections = {};
          for (const { key } of ITEM_SECTIONS) {
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

          // Initialize hidden sections — sections in draft but not in published
          const hidden = new Set();
          for (const { key } of TOGGLEABLE_SECTIONS) {
            const inDraft = draftSections.some((s) => s.key === key);
            if (inDraft && !pubKeys.has(key)) hidden.add(key);
          }
          setHiddenSections(hidden);

          // Initialize hidden stats
          const hidStats = new Set();
          for (const { key } of STAT_LINES) {
            const inDraft = draftSections.some((s) => s.key === key);
            if (inDraft && !pubKeys.has(key)) hidStats.add(key);
          }
          setHiddenStats(hidStats);
        } else {
          // No draft — use published digest as draft, all items selected
          setDraft(pubDigest || null);
          if (pubDigest) {
            const selections = {};
            for (const { key } of ITEM_SECTIONS) {
              const sec = pubSections.find((s) => s.key === key);
              if (!sec) continue;
              const items = sec.content.split(/;\s*/).map((i) => i.trim()).filter(Boolean);
              selections[key] = new Set(items.map((_, i) => i));
            }
            setSectionSelections(selections);
          }
          setHiddenSections(new Set());
          setHiddenStats(new Set());
        }

        setItemEdits({});
        setPublishState("idle");
        setDraftLoading(false);
        setTimeout(() => { initializedRef.current = true; }, 0);
      })
      .catch(() => setDraftLoading(false));
  }, [isEditorial, weekly?.week_start, apiKey]);

  // ── Item toggle (semicolon sections) ──

  const toggleItem = useCallback((sectionKey, idx) => {
    setSectionSelections((prev) => {
      const sel = new Set(prev[sectionKey] || []);
      if (sel.has(idx)) sel.delete(idx);
      else sel.add(idx);
      return { ...prev, [sectionKey]: sel };
    });
  }, []);

  // ── Section toggle (show/hide entire section) ──

  const toggleSection = useCallback((sectionKey) => {
    setHiddenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  }, []);

  // ── Stat line toggle ──

  const toggleStat = useCallback((key) => {
    setHiddenStats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Inline text editing ──

  const handleEditSummary = useCallback((sectionKey, itemIdx, newSummary) => {
    setEditingItem(null);
    const trimmed = newSummary.trim();
    if (!trimmed) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const sections = parseDigestSections(prev);
      const sec = sections.find((s) => s.key === sectionKey);
      if (!sec) return prev;
      const items = sec.content.split(/;\s*/).map((s) => s.trim()).filter(Boolean);
      if (itemIdx >= items.length) return prev;
      // Preserve quotes
      const quoteRe = /"([^"]+)"/g;
      const quotes = [];
      for (const m of items[itemIdx].matchAll(quoteRe)) quotes.push(m[1]);
      const quoteParts = quotes.map((q) => `"${q}"`).join(" ");
      const newItem = quoteParts ? `${trimmed} ${quoteParts}` : trimmed;
      items[itemIdx] = newItem;
      setItemEdits((prev) => ({
        ...prev,
        [sectionKey]: { ...prev[sectionKey], [itemIdx]: newItem },
      }));
      sec.content = items.join("; ");
      return sections.map((s) => `${s.key}: ${s.content}`).join("\n");
    });
  }, []);

  // ── Edit recap/narrative text (whole section) ──

  const handleEditSection = useCallback((sectionKey, newText) => {
    const trimmed = newText.trim();
    setDraft((prev) => {
      if (!prev) return prev;
      const sections = parseDigestSections(prev);
      const sec = sections.find((s) => s.key === sectionKey);
      if (!sec) return prev;
      if (!trimmed) {
        // Empty text — remove the section entirely
        return sections.filter((s) => s.key !== sectionKey).map((s) => `${s.key}: ${s.content}`).join("\n");
      }
      sec.content = trimmed;
      return sections.map((s) => `${s.key}: ${s.content}`).join("\n");
    });
  }, []);

  // ── Delete item from a section ──

  const handleDeleteItem = useCallback((sectionKey, itemIdx) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const sections = parseDigestSections(prev);
      const sec = sections.find((s) => s.key === sectionKey);
      if (!sec) return prev;
      const items = sec.content.split(/;\s*/).map((s) => s.trim()).filter(Boolean);
      if (itemIdx >= items.length) return prev;
      items.splice(itemIdx, 1);
      if (items.length === 0) {
        // Remove the section entirely
        return sections.filter((s) => s.key !== sectionKey).map((s) => `${s.key}: ${s.content}`).join("\n");
      }
      sec.content = items.join("; ");
      // Remap selections: remove deleted index, shift higher indices down
      setSectionSelections((prev) => {
        const oldSel = prev[sectionKey] || new Set();
        const newSel = new Set();
        for (const i of oldSel) {
          if (i < itemIdx) newSel.add(i);
          else if (i > itemIdx) newSel.add(i - 1);
          // skip i === itemIdx (deleted)
        }
        return { ...prev, [sectionKey]: newSel };
      });
      // Remap item edits
      setItemEdits((prev) => {
        const oldEdits = prev[sectionKey];
        if (!oldEdits || Object.keys(oldEdits).length === 0) return prev;
        const newEdits = {};
        for (const [k, v] of Object.entries(oldEdits)) {
          const i = Number(k);
          if (i < itemIdx) newEdits[i] = v;
          else if (i > itemIdx) newEdits[i - 1] = v;
        }
        return { ...prev, [sectionKey]: newEdits };
      });
      return sections.map((s) => `${s.key}: ${s.content}`).join("\n");
    });
  }, []);

  // ── Reorder items within a section ──

  const handleReorderItem = useCallback((sectionKey, fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const sections = parseDigestSections(prev);
      const sec = sections.find((s) => s.key === sectionKey);
      if (!sec) return prev;
      const items = sec.content.split(/;\s*/).map((s) => s.trim()).filter(Boolean);
      if (fromIdx >= items.length || toIdx >= items.length) return prev;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      sec.content = items.join("; ");
      // Remap selections
      setSectionSelections((prev) => {
        const oldSel = prev[sectionKey] || new Set();
        const newSel = new Set();
        for (const i of oldSel) {
          if (i === fromIdx) newSel.add(toIdx);
          else if (fromIdx < toIdx && i > fromIdx && i <= toIdx) newSel.add(i - 1);
          else if (fromIdx > toIdx && i >= toIdx && i < fromIdx) newSel.add(i + 1);
          else newSel.add(i);
        }
        return { ...prev, [sectionKey]: newSel };
      });
      // Remap item edits
      setItemEdits((prev) => {
        const oldEdits = prev[sectionKey];
        if (!oldEdits || Object.keys(oldEdits).length === 0) return prev;
        const newEdits = {};
        for (const [k, v] of Object.entries(oldEdits)) {
          const i = Number(k);
          if (i === fromIdx) newEdits[toIdx] = v;
          else if (fromIdx < toIdx && i > fromIdx && i <= toIdx) newEdits[i - 1] = v;
          else if (fromIdx > toIdx && i >= toIdx && i < fromIdx) newEdits[i + 1] = v;
          else newEdits[i] = v;
        }
        return { ...prev, [sectionKey]: newEdits };
      });
      return sections.map((s) => `${s.key}: ${s.content}`).join("\n");
    });
  }, []);

  // ── Regenerate a single AI-generated section ──

  const regenSection = useCallback(async (sectionKey) => {
    if (!isEditorial || regenLoading) return;
    setRegenLoading(sectionKey);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/regen-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ section: sectionKey }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      const data = await res.json();
      handleEditSection(sectionKey, data.content);
    } catch (err) {
      console.warn(`[Regen] ${sectionKey} failed:`, err.message);
    } finally {
      setRegenLoading(null);
    }
  }, [isEditorial, regenLoading, weekly?.week_start, apiKey, handleEditSection]);

  // ── Regenerate spotlight blurbs + quotes for all stat-card players ──

  const regenSpotlights = useCallback(async () => {
    if (!isEditorial || regenLoading) return;
    setRegenLoading("SPOTLIGHTS");
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/regen-spotlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      const data = await res.json();
      // Inject each blurb/quotes line into the draft
      setDraft((prev) => {
        if (!prev) return prev;
        const sections = parseDigestSections(prev);
        for (const [key, content] of Object.entries(data.blurbs)) {
          const existing = sections.find((s) => s.key === key);
          if (existing) {
            existing.content = content;
          } else {
            sections.push({ key, content });
          }
        }
        return sections.map((s) => `${s.key}: ${s.content}`).join("\n");
      });
    } catch (err) {
      console.warn("[Regen] Spotlights failed:", err.message);
    } finally {
      setRegenLoading(null);
    }
  }, [isEditorial, regenLoading, weekly?.week_start, apiKey]);

  // ── Regenerate match stat blurbs + quotes (Hero Slayer, Unit Killer, etc.) ──

  const regenMatchStats = useCallback(async () => {
    if (!isEditorial || regenLoading) return;
    setRegenLoading("MATCH_STATS");
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/regen-match-stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      const data = await res.json();
      // Inject each blurb/quotes line into the draft
      setDraft((prev) => {
        if (!prev) return prev;
        const sections = parseDigestSections(prev);
        for (const [key, content] of Object.entries(data.blurbs)) {
          const existing = sections.find((s) => s.key === key);
          if (existing) {
            existing.content = content;
          } else {
            sections.push({ key, content });
          }
        }
        return sections.map((s) => `${s.key}: ${s.content}`).join("\n");
      });
    } catch (err) {
      console.warn("[Regen] Match stats failed:", err.message);
    } finally {
      setRegenLoading(null);
    }
  }, [isEditorial, regenLoading, weekly?.week_start, apiKey]);

  // ── Regenerate quotes for a single spotlight player ──

  const regenQuotes = useCallback(async (statKey, battleTag) => {
    if (!isEditorial || regenLoading) return;
    setRegenLoading(`QUOTES_${statKey}`);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/regen-quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ statKey, battleTag }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      const data = await res.json();
      setDraft((prev) => {
        if (!prev) return prev;
        const sections = parseDigestSections(prev);
        for (const [key, content] of Object.entries(data.quotes)) {
          const existing = sections.find((s) => s.key === key);
          if (existing) {
            existing.content = content;
          } else {
            sections.push({ key, content });
          }
        }
        return sections.map((s) => `${s.key}: ${s.content}`).join("\n");
      });
    } catch (err) {
      console.warn(`[Regen] Quotes for ${statKey} failed:`, err.message);
    } finally {
      setRegenLoading(null);
    }
  }, [isEditorial, regenLoading, weekly?.week_start, apiKey]);

  // ── Browse all scored messages for a spotlight player ──

  const browseMessages = useCallback(async (statKey, battleTag) => {
    if (!isEditorial) return [];
    try {
      const params = new URLSearchParams({ statKey, battleTag });
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/player-messages?${params}`, {
        headers: { "X-API-Key": apiKey },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      const data = await res.json();
      return data.messages || [];
    } catch (err) {
      console.warn(`[Browse] Messages for ${statKey}/${battleTag} failed:`, err.message);
      return [];
    }
  }, [isEditorial, weekly?.week_start, apiKey]);

  // ── Manually set quotes for a spotlight player ──

  const setQuotes = useCallback((statKey, quotes, { append = false } = {}) => {
    if (!isEditorial) return;
    const quoteKey = `${statKey}_QUOTES`;
    const formatted = quotes.map(q => `"${q}"`).join('; ');
    setDraft((prev) => {
      if (!prev) return prev;
      const sections = parseDigestSections(prev);
      const existing = sections.find((s) => s.key === quoteKey);
      if (existing) {
        existing.content = append ? `${existing.content}; ${formatted}` : formatted;
      } else {
        sections.push({ key: quoteKey, content: formatted });
      }
      return sections.map((s) => `${s.key}: ${s.content}`).join("\n");
    });
  }, [isEditorial]);

  // ── Parse editable item sections from draft ──

  const editableItemSections = useMemo(() => {
    if (!draft) return [];
    const draftSections = parseDigestSections(draft);
    const result = [];
    for (const { key, label } of ITEM_SECTIONS) {
      const sec = draftSections.find((s) => s.key === key);
      if (!sec) continue;
      const items = sec.content.split(/;\s*/).map((i) => i.trim()).filter(Boolean);
      if (items.length === 0) continue;
      result.push({ key, label, items });
    }
    return result;
  }, [draft]);

  // ── Autosave ──

  const initializedRef = useRef(false);
  const saveTimerRef = useRef(null);
  const onDigestUpdatedRef = useRef(onDigestUpdated);
  onDigestUpdatedRef.current = onDigestUpdated;

  useEffect(() => {
    initializedRef.current = false;
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [weekly?.week_start]);

  const isDirty = publishState === "dirty" || publishState === "saving";

  useEffect(() => {
    if (!isEditorial || !initializedRef.current || !draft) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setPublishState("dirty");

    saveTimerRef.current = setTimeout(async () => {
      setPublishState("saving");
      try {
        // Build selectedItems for semicolon sections
        const selectedItems = {};
        for (const { key } of editableItemSections) {
          const sel = sectionSelections[key];
          if (sel) selectedItems[key] = [...sel].sort((a, b) => a - b);
        }

        // Build selectedStats — hide stat lines by setting to null
        const selectedStats = {};
        for (const { key } of STAT_LINES) {
          if (hiddenStats.has(key)) {
            selectedStats[key] = null;
          }
        }

        const body = {
          selectedItems,
          hiddenSections: [...hiddenSections],
        };
        if (Object.keys(selectedStats).length > 0) body.selectedStats = selectedStats;
        if (Object.keys(itemEdits).length > 0) body.itemOverrides = itemEdits;

        // Save draft first, show "saved" immediately after
        await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/draft`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
          body: JSON.stringify({ draft }),
        }).catch(() => {});

        setPublishState("saved");
        setTimeout(() => setPublishState((s) => (s === "saved" ? "idle" : s)), 2000);

        // Curate in background — updates published digest without blocking UI
        fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/curate`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
          body: JSON.stringify(body),
        }).then((r) => r.ok ? r.json() : null).then((data) => {
          if (data && onDigestUpdatedRef.current) onDigestUpdatedRef.current(data.digest);
        }).catch(() => {});
      } catch {
        setPublishState("idle");
      }
    }, AUTOSAVE_DELAY);
  }, [sectionSelections, hiddenSections, hiddenStats, itemEdits, isEditorial, draft, editableItemSections, weekly?.week_start, apiKey]);

  // Navigation guard
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return {
    isEditorial,
    draft,
    setDraft,
    draftLoading,
    sectionSelections,
    hiddenSections,
    hiddenStats,
    editingItem,
    setEditingItem,
    itemEdits,
    publishState,
    isDirty,
    editableItemSections,
    toggleItem,
    toggleSection,
    toggleStat,
    handleEditSummary,
    handleEditSection,
    handleReorderItem,
    handleDeleteItem,
    regenSection,
    regenSpotlights,
    regenMatchStats,
    regenQuotes,
    browseMessages,
    setQuotes,
    regenLoading,
  };
}
