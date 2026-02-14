import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { parseDigestSections, parseStatLine } from "./digestUtils";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const AUTOSAVE_DELAY = 800;

export const EDITABLE_SECTIONS = [
  { key: "DRAMA", label: "Drama", cls: "drama" },
  { key: "BANS", label: "Bans", cls: "bans" },
  { key: "HIGHLIGHTS", label: "Highlights", cls: "highlights" },
];

export const STAT_CATEGORIES = [
  { key: "WINNER", label: "Winner", cls: "winner" },
  { key: "LOSER", label: "Loser", cls: "loser" },
  { key: "GRINDER", label: "Grinder", cls: "grinder" },
  { key: "HOTSTREAK", label: "Hot Streak", cls: "hotstreak" },
  { key: "COLDSTREAK", label: "Cold Streak", cls: "coldstreak" },
];

/**
 * Custom hook encapsulating ALL editorial state + auto-save.
 *
 * Input: { digest, isAdmin, apiKey, onDigestUpdated }
 * Output: all state + callbacks needed by DigestBanner in editorial mode.
 */
export default function useEditorial({ digest, isAdmin, apiKey, onDigestUpdated }) {
  const today = new Date().toISOString().slice(0, 10);
  const isEditorial = isAdmin && !!apiKey && digest?.date && digest.date !== today;

  const [draft, setDraft] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [sectionSelections, setSectionSelections] = useState({});
  const [statCandidates, setStatCandidates] = useState(null);
  const [selectedStats, setSelectedStats] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [hiddenAvatars, setHiddenAvatars] = useState(new Set());
  const [itemEdits, setItemEdits] = useState({});
  const [fetchingMore, setFetchingMore] = useState(null);
  const [publishState, setPublishState] = useState("idle");

  // Initialize hiddenAvatars from published digest data (non-editorial mode)
  useEffect(() => {
    if (isEditorial) return;
    if (digest?.hidden_avatars) {
      try { setHiddenAvatars(new Set(JSON.parse(digest.hidden_avatars))); }
      catch { setHiddenAvatars(new Set()); }
    } else {
      setHiddenAvatars(new Set());
    }
  }, [isEditorial, digest?.date]);

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
      const { quotes } = (() => {
        const quoteRe = /"([^"]+)"/g;
        const qs = [];
        for (const m of items[itemIdx].matchAll(quoteRe)) qs.push(m[1]);
        return { quotes: qs };
      })();
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

  const handleReorderItem = useCallback((sectionKey, fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    setDraft(prev => {
      if (!prev) return prev;
      const sections = parseDigestSections(prev);
      const sec = sections.find(s => s.key === sectionKey);
      if (!sec) return prev;
      const items = sec.content.split(/;\s*/).map(s => s.trim()).filter(Boolean);
      if (fromIdx >= items.length || toIdx >= items.length) return prev;
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
    } catch (err) {
      console.warn('[Editorial] Failed to fetch more items:', err.message);
    }
    setFetchingMore(null);
  }, [fetchingMore, draft, digest?.date, apiKey]);

  // Parse editable sections from draft
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

  // Track dirty state
  const isDirty = publishState === "dirty" || publishState === "saving";

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

        const [curateRes] = await Promise.all([
          fetch(`${RELAY_URL}/api/admin/digest/${digest.date}/curate`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
            body: JSON.stringify(body),
          }),
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
    }, AUTOSAVE_DELAY);
  }, [sectionSelections, selectedStats, itemEdits, hiddenAvatars, isEditorial, draft, editableSections, statCandidates, digest?.date, apiKey]);

  // Reset to draft: re-fetch original draft, reset all selections
  const resetToDraft = useCallback(async () => {
    if (!digest?.date || !apiKey) return;
    setDraftLoading(true);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/digest/${digest.date}/draft`, {
        headers: { "X-API-Key": apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.draft) {
          setDraft(data.draft);
          // Select all items by default on reset
          const draftSections = parseDigestSections(data.draft);
          const selections = {};
          for (const { key } of EDITABLE_SECTIONS) {
            const sec = draftSections.find((s) => s.key === key);
            if (!sec) continue;
            const items = sec.content.split(/;\s*/).map((i) => i.trim()).filter(Boolean);
            selections[key] = new Set(items.map((_, i) => i));
          }
          setSectionSelections(selections);
        }
      }
    } catch (err) {
      console.warn('[Editorial] Reset to draft failed:', err.message);
    }
    setItemEdits({});
    setPublishState("idle");
    setDraftLoading(false);
  }, [digest?.date, apiKey]);

  // Navigation guard — warn on unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return {
    isEditorial,
    draft,
    setDraft,
    draftLoading,
    sectionSelections,
    statCandidates,
    selectedStats,
    editingItem,
    setEditingItem,
    hiddenAvatars,
    setHiddenAvatars,
    itemEdits,
    fetchingMore,
    publishState,
    editableSections,
    isDirty,
    toggleItem,
    toggleStat,
    handleEditorQuotes,
    handleEditSummary,
    handleReorderItem,
    handleFetchMore,
    resetToDraft,
  };
}
