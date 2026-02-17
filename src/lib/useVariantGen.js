import { useState, useEffect, useRef, useCallback } from "react";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const POLL_INTERVAL = 3000;

const NARRATIVE_KEYS = ["TOPICS", "DRAMA", "BANS", "HIGHLIGHTS", "RECAP"];

/**
 * Hook for variant generation workflow:
 * - Start generation (POST)
 * - Poll for progress (GET gen-status every 3s)
 * - Fetch parsed variants when done
 * - Track per-section picks
 * - Apply picks (PUT)
 */
export default function useVariantGen({ weekStart, apiKey, isAdmin }) {
  const [job, setJob] = useState(null);
  const [variants, setVariants] = useState([]);
  const [picks, setPicks] = useState({});
  const [showPicker, setShowPicker] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const pollRef = useRef(null);

  const headers = { "X-API-Key": apiKey };

  // Check for existing job on mount
  useEffect(() => {
    if (!isAdmin || !apiKey || !weekStart) return;
    fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekStart}/gen-status`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.status) {
          setJob({ id: data.jobId, status: data.status, total: data.total, completed: data.completed, error: data.error });
          if (data.status === "done") {
            fetchVariants(data.jobId);
          }
        }
      })
      .catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [weekStart, isAdmin, apiKey]);

  // Poll while pending/running
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!job || (job.status !== "pending" && job.status !== "running")) return;

    pollRef.current = setInterval(() => {
      fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekStart}/gen-status`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data?.status) return;
          setJob({ id: data.jobId, status: data.status, total: data.total, completed: data.completed, error: data.error });
          if (data.status === "done") {
            clearInterval(pollRef.current);
            pollRef.current = null;
            fetchVariants(data.jobId);
          } else if (data.status === "error") {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        })
        .catch(() => {});
    }, POLL_INTERVAL);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [job?.status, weekStart, apiKey]);

  const fetchVariants = useCallback((jobId) => {
    fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekStart}/variants`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.variants?.length > 0) {
          setVariants(data.variants);
          // Default: all sections pick variant 0
          const defaultPicks = {};
          for (const key of NARRATIVE_KEYS) {
            defaultPicks[key] = 0;
          }
          setPicks(defaultPicks);
        }
      })
      .catch(() => {});
  }, [weekStart, apiKey]);

  const startGeneration = useCallback(async () => {
    if (!weekStart || !apiKey) return;
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekStart}/generate-variants`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setJob({ id: data.jobId, status: "pending", total: 3, completed: 0, error: null });
        setVariants([]);
        setPicks({});
      }
    } catch (err) {
      console.warn("[VariantGen] Start failed:", err.message);
    }
  }, [weekStart, apiKey]);

  const pickSection = useCallback((key, idx) => {
    setPicks((prev) => ({ ...prev, [key]: idx }));
  }, []);

  const applyPicks = useCallback(async () => {
    if (!job?.id || !weekStart || !apiKey) return null;
    setApplyError(null);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekStart}/apply-variants`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ picks, jobId: job.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowPicker(false);
        return data.draft;
      } else {
        const err = await res.json().catch(() => ({ error: "Apply failed" }));
        setApplyError(err.error);
        return null;
      }
    } catch (err) {
      setApplyError(err.message);
      return null;
    }
  }, [job, picks, weekStart, apiKey]);

  const dismiss = useCallback(() => {
    setShowPicker(false);
    setJob(null);
    setVariants([]);
    setPicks({});
    setApplyError(null);
  }, []);

  return {
    job,
    variants,
    picks,
    showPicker,
    applyError,
    startGeneration,
    pickSection,
    applyPicks,
    setShowPicker,
    dismiss,
    isGenerating: job?.status === "pending" || job?.status === "running",
    isDone: job?.status === "done" && variants.length > 0,
    NARRATIVE_KEYS,
  };
}
