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

// ── Shared upload hook ────────────────────────────

export function useReplayUpload() {
  const { apiKey, setReplays, refreshDbStats, RELAY_URL } = useReplayLabStore();
  const fileRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const uploadFile = useCallback(
    async (file) => {
      if (!file || !apiKey) return;
      if (!file.name.toLowerCase().endsWith(".w3g")) return;

      const filename = file.name;
      setUploadProgress((prev) => ({
        ...prev,
        [filename]: { status: "uploading" },
      }));

      const form = new FormData();
      form.append("replay", file);

      try {
        const res = await fetch(`${RELAY_URL}/api/replays/upload`, {
          method: "POST",
          headers: { "X-API-Key": apiKey },
          body: form,
        });
        const data = await res.json();
        if (!data.ok) {
          setUploadProgress((prev) => ({
            ...prev,
            [filename]: {
              status: "error",
              error: data.error || "Upload failed",
            },
          }));
          return;
        }

        const detailRes = await fetch(
          `${RELAY_URL}/api/replays/${data.replay.id}`,
          { headers: { "X-API-Key": apiKey } }
        );
        const detail = await detailRes.json();

        setUploadProgress((prev) => ({
          ...prev,
          [filename]: { status: "done", replayId: data.replay.id },
        }));

        setReplays((prev) => [
          ...prev,
          {
            id: data.replay.id,
            filename: data.replay.filename,
            mapName: data.replay.mapName,
            duration: data.replay.gameDuration,
            playerCount: data.replay.playerCount,
            players: detail.players || [],
            actions: detail.actions || [],
          },
        ]);
      } catch (err) {
        setUploadProgress((prev) => ({
          ...prev,
          [filename]: { status: "error", error: err.message },
        }));
      }
    },
    [apiKey, setReplays, RELAY_URL]
  );

  const uploadMultipleFiles = useCallback(
    async (files) => {
      for (const f of Array.from(files)) {
        if (f.name.toLowerCase().endsWith(".w3g")) {
          await uploadFile(f);
        }
      }
      refreshDbStats();
    },
    [uploadFile, refreshDbStats]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragActive(false);
      const files = e.dataTransfer?.files;
      if (files?.length > 0) uploadMultipleFiles(files);
    },
    [uploadMultipleFiles]
  );

  const handleFileSelect = useCallback(
    (e) => {
      const files = e.target?.files;
      if (files?.length > 0) uploadMultipleFiles(files);
      if (fileRef.current) fileRef.current.value = "";
    },
    [uploadMultipleFiles]
  );

  const uploading = Object.values(uploadProgress).some(
    (p) => p.status === "uploading"
  );

  return {
    fileRef,
    dragActive,
    setDragActive,
    uploadProgress,
    setUploadProgress,
    uploading,
    handleDrop,
    handleFileSelect,
  };
}
