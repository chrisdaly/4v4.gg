import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import useAdmin from "./useAdmin";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";
const LAB_STORAGE_KEY = "replay_lab_ids";

const ReplayLabContext = createContext(null);

export function ReplayLabProvider({ children }) {
  const { adminKey: apiKey } = useAdmin();

  // ── DB stats ────────────────────────────────────
  const [dbStats, setDbStats] = useState(null);

  const refreshDbStats = useCallback(async () => {
    if (!apiKey) return;
    try {
      const res = await fetch(`${RELAY_URL}/api/fingerprints/players`, {
        headers: { "X-API-Key": apiKey },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDbStats({
        totalPlayers: data.totalPlayers,
        totalFingerprints: data.totalFingerprints,
      });
    } catch {
      /* ignore */
    }
  }, [apiKey]);

  useEffect(() => {
    if (apiKey) refreshDbStats();
  }, [apiKey, refreshDbStats]);

  // ── Shared replays (for Compare tab) ───────────
  const [replays, setReplays] = useState([]);

  const replayLabels = useMemo(() => {
    const labels = {};
    replays.forEach((r, i) => {
      labels[r.id] = `R${i + 1}`;
    });
    return labels;
  }, [replays]);

  // Persist replay IDs to localStorage
  useEffect(() => {
    if (replays.length === 0) {
      try {
        localStorage.removeItem(LAB_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      localStorage.setItem(
        LAB_STORAGE_KEY,
        JSON.stringify(replays.map((r) => r.id))
      );
    } catch {
      /* ignore */
    }
  }, [replays]);

  // Auto-load saved replays on mount
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current || !apiKey) return;
    loadedRef.current = true;
    let ids;
    try {
      ids = JSON.parse(localStorage.getItem(LAB_STORAGE_KEY) || "[]");
    } catch {
      return;
    }
    if (!ids.length) return;

    (async () => {
      for (const id of ids) {
        try {
          const res = await fetch(`${RELAY_URL}/api/replays/${id}`, {
            headers: { "X-API-Key": apiKey },
          });
          if (!res.ok) continue;
          const detail = await res.json();
          setReplays((prev) => {
            if (prev.some((r) => r.id === id)) return prev;
            return [
              ...prev,
              {
                id,
                filename: detail.filename || `replay-${id}`,
                mapName: detail.map_name || "",
                duration: detail.game_duration,
                playerCount: (detail.players || []).length,
                players: detail.players || [],
                actions: detail.actions || [],
              },
            ];
          });
        } catch {
          /* skip failed loads */
        }
      }
    })();
  }, [apiKey]);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(LAB_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setReplays([]);
  }, []);

  const value = useMemo(
    () => ({
      apiKey,
      dbStats,
      refreshDbStats,
      replays,
      setReplays,
      replayLabels,
      clearSession,
      RELAY_URL,
    }),
    [
      apiKey,
      dbStats,
      refreshDbStats,
      replays,
      replayLabels,
      clearSession,
    ]
  );

  return (
    <ReplayLabContext.Provider value={value}>
      {children}
    </ReplayLabContext.Provider>
  );
}

export function useReplayLabStore() {
  const ctx = useContext(ReplayLabContext);
  if (!ctx) throw new Error("useReplayLabStore must be used within ReplayLabProvider");
  return ctx;
}
