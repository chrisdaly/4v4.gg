import React, {
  useState,
  useCallback,
  useReducer,
  useRef,
  useMemo,
  useEffect,
} from "react";
import styled from "styled-components";
import { FiUpload, FiX, FiDownload, FiChevronDown, FiChevronRight } from "react-icons/fi";
import useAdmin from "../lib/useAdmin";
import { season } from "../lib/params";
import { Button } from "../components/ui";
import { searchLadder } from "../lib/api";
import { raceMapping } from "../lib/constants";
import SimilarityMatrix from "../components/replay-lab/SimilarityMatrix";
import ComparisonPanel from "../components/replay-lab/ComparisonPanel";
import {
  EarlyGameSequence,
} from "../components/replay/PlayerFingerprint";
import OverlaySparkline from "../components/replay-lab/OverlaySparkline";
import OverlayRadar from "../components/replay-lab/OverlayRadar";
import {
  buildFingerprint,
  computeBigramBasis,
  computeSimilarityMatrix,
  findSuggestedMatches,
  computeBreakdown,
  playerSimilarity,
} from "../lib/fingerprint";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";
const LAB_STORAGE_KEY = "replay_lab_ids";

// ── Styled Components ───────────────────────────────

const Page = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  min-height: 100vh;
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-2);
`;

const Subtitle = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-bottom: var(--space-4);
`;

const Section = styled.div`
  margin-bottom: var(--space-8);
`;

const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--white);
  margin-bottom: var(--space-4);
`;

const HeroSearchWrap = styled.div`
  max-width: 520px;
  margin: 0 auto var(--space-6);
`;

const DropZone = styled.div`
  border: 2px dashed
    ${(p) => (p.$active ? "var(--gold)" : "rgba(160, 130, 80, 0.3)")};
  border-radius: var(--radius-md);
  padding: var(--space-6) var(--space-4);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(p) =>
    p.$active
      ? "rgba(252, 219, 51, 0.08)"
      : "rgba(255, 255, 255, 0.02)"};

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.06);
  }
`;

const DropLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};
  margin-top: var(--space-2);
`;

const DropIcon = styled(FiUpload)`
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
`;

const ReplayStrip = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: var(--space-4);
`;

const ReplayChip = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-sm);
`;

const ChipText = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const ChipName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
`;

const ChipRemove = styled.button`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: var(--grey-mid);
  cursor: pointer;
  padding: 0;
  &:hover {
    color: var(--red);
  }
`;

const StatusText = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: ${(p) => p.$color || "var(--grey-light)"};
  margin-top: var(--space-2);
`;

const ThresholdRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
`;

const ThresholdLabel = styled.label`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const ThresholdValue = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--gold);
  min-width: 36px;
`;

const CandidateTable = styled.div`
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  overflow: hidden;
`;

const CandidateHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 50px 1fr 70px 80px;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const CandidateRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 50px 1fr 70px 80px;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  align-items: center;
  border-bottom: 1px solid rgba(160, 130, 80, 0.06);
  cursor: pointer;
  transition: background 0.1s;

  &:last-child { border-bottom: none; }
  &:hover { background: rgba(252, 219, 51, 0.04); }
`;

const CandidateName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: ${(p) => p.$color || "#fff"};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CandidateTag = styled.span`
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-light);
`;

const CandidateScore = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: ${(p) =>
    p.$val >= 0.75 ? "var(--gold)" :
    p.$val >= 0.60 ? "#fff" :
    "var(--grey-light)"};
  font-weight: ${(p) => p.$val >= 0.70 ? "bold" : "normal"};
`;

const CandidateScoreBar = styled.div`
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
  width: 100%;
`;

const CandidateScoreFill = styled.div`
  height: 100%;
  border-radius: 2px;
  background: ${(p) =>
    p.$val >= 0.75 ? "var(--gold)" :
    p.$val >= 0.60 ? "rgba(252,219,51,0.5)" :
    "rgba(255,255,255,0.2)"};
`;

const LinkBtn = styled.button`
  padding: 3px 10px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  background: rgba(252, 219, 51, 0.12);
  color: var(--gold);
  border: 1px solid rgba(252, 219, 51, 0.3);
  &:hover { background: rgba(252, 219, 51, 0.2); }
`;

const MergedGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

const EmptyState = styled.div`
  padding: var(--space-6);
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
`;


const MatchTable = styled.div`
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-top: var(--space-4);
`;

const MatchTableHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 100px 60px 100px;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const MatchRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 100px 60px 100px;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  align-items: center;
  border-bottom: 1px solid rgba(160, 130, 80, 0.06);
  &:last-child { border-bottom: none; }
`;

const MatchCell = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: ${(p) => p.$color || "var(--grey-light)"};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ImportBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  border-radius: var(--radius-sm);
  text-align: center;
  ${(p) => {
    switch (p.$status) {
      case "done": return "color: var(--green); border: 1px solid rgba(76,175,80,0.3); background: rgba(76,175,80,0.08);";
      case "skipped": return "color: var(--grey-light); border: 1px solid rgba(160,130,80,0.2); background: rgba(255,255,255,0.03);";
      case "importing": return "color: var(--gold); border: 1px solid rgba(252,219,51,0.3); background: rgba(252,219,51,0.08);";
      case "pending": return "color: var(--grey-mid); border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02);";
      case "error": return "color: var(--red); border: 1px solid rgba(244,67,54,0.3); background: rgba(244,67,54,0.08);";
      default: return "";
    }
  }}
`;


const ProgressBarTrack = styled.div`
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
  margin-top: var(--space-2);
  margin-bottom: var(--space-2);
`;

const ProgressBarFill = styled.div`
  height: 100%;
  border-radius: 3px;
  background: var(--gold);
  transition: width 0.3s ease;
`;

const ImportAllRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-4);
`;

const ProgressLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-1);
`;

const DetailPanel = styled.div`
  margin-top: var(--space-4);
  padding: var(--space-6);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.35);
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
`;

const DetailName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
`;

const DetailScore = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: #fff;
  background: rgba(252, 219, 51, 0.15);
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(252, 219, 51, 0.25);
`;

const DetailBars = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
`;

const DetailBar = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const DetailBarLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const DetailBarTrack = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
`;

const DetailBarFill = styled.div`
  height: 100%;
  background: var(--gold);
  border-radius: 4px;
`;

const DetailSectionLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: var(--space-2);
  margin-top: var(--space-4);
`;

const OverlayRow = styled.div`
  display: flex;
  gap: var(--space-6);
  align-items: flex-start;
  flex-wrap: wrap;
`;

const HotkeyTable = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr 1fr;
  gap: 1px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-sm);
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
`;

const HkCell = styled.div`
  padding: 5px 8px;
  background: rgba(0, 0, 0, 0.3);
  color: ${(p) => p.$color || "#fff"};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const HkHeader = styled.div`
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.5);
  color: var(--gold);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const HkBar = styled.div`
  height: 4px;
  border-radius: 2px;
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  position: relative;
  overflow: hidden;
`;

const HkBarFill = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 2px;
  background: ${(p) => p.$color || "var(--gold)"};
`;

const HkRole = styled.span`
  font-size: 8px;
  color: ${(p) => p.$color || "rgba(255,255,255,0.3)"};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
`;

const CompareGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-top: var(--space-2);
`;

const CompareColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const CompareLabel = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
`;

const PlaystyleSummary = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
`;

const DbBadge = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const StatsBanner = styled.div`
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
  margin-top: var(--space-3);
`;

const CollapsibleTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--white);
  margin-bottom: var(--space-4);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  user-select: none;

  &:hover { color: var(--gold); }
`;

const CloseBtn = styled.button`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  background: none;
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  cursor: pointer;
  margin-left: auto;
  &:hover { color: var(--red); border-color: rgba(244, 67, 54, 0.3); }
`;

const BreakdownBars = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const MiniBar = styled.div`
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
`;

const MiniBarFill = styled.div`
  height: 100%;
  border-radius: 2px;
  background: ${(p) =>
    p.$val >= 0.75 ? "var(--gold)" :
    p.$val >= 0.60 ? "rgba(252,219,51,0.5)" :
    "rgba(255,255,255,0.2)"};
`;

const MiniBarLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  width: 28px;
`;

// ── Reducer for merge/unmerge ───────────────────────

function getGroupData(groupHotkeys) {
  const groups = [];
  if (!groupHotkeys) return groups;
  for (let i = 0; i <= 9; i++) {
    const g = groupHotkeys[String(i)] || {};
    const assigned = g.assigned || 0;
    const used = g.used || 0;
    groups.push({ id: i, assigned, used });
  }
  return groups;
}

function identityReducer(state, action) {
  switch (action.type) {
    case "LINK": {
      const { uidA, uidB } = action;
      const groupA = state.find((g) => g.includes(uidA));
      const groupB = state.find((g) => g.includes(uidB));
      if (groupA && groupB) {
        if (groupA === groupB) return state;
        // Merge two groups
        const merged = [...new Set([...groupA, ...groupB])];
        return [
          ...state.filter((g) => g !== groupA && g !== groupB),
          merged,
        ];
      }
      if (groupA) return state.map((g) => (g === groupA ? [...g, uidB] : g));
      if (groupB) return state.map((g) => (g === groupB ? [...g, uidA] : g));
      return [...state, [uidA, uidB]];
    }
    case "UNLINK_GROUP": {
      return state.filter((g) => !g.includes(action.uid));
    }
    case "RESET":
      return [];
    default:
      return state;
  }
}

// ── Main Component ──────────────────────────────────

export default function ReplayLab() {
  const { adminKey: apiKey } = useAdmin();
  const fileRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [replays, setReplays] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [threshold, setThreshold] = useState(0.60);
  const [selectedCell, setSelectedCell] = useState(null);
  const [dismissedPairs, setDismissedPairs] = useState(new Set());
  const [mergedIdentities, dispatchMerge] = useReducer(identityReducer, []);

  // W3C import state
  const [w3cQuery, setW3cQuery] = useState("");
  const [w3cSearchResults, setW3cSearchResults] = useState([]);
  const [w3cShowDropdown, setW3cShowDropdown] = useState(false);
  const [w3cIsSearching, setW3cIsSearching] = useState(false);
  const w3cSearchRef = useRef(null);
  const [w3cSelectedTag, setW3cSelectedTag] = useState(null);
  const [w3cMatches, setW3cMatches] = useState([]);
  const [w3cMatchesLoading, setW3cMatchesLoading] = useState(false);
  const [w3cImportProgress, setW3cImportProgress] = useState({});
  const [w3cBatchImporting, setW3cBatchImporting] = useState(false);
  const [w3cPage, setW3cPage] = useState(0);
  const W3C_PAGE_SIZE = 20;

  // Playstyle analysis state
  const [playstyleData, setPlaystyleData] = useState(null);
  const [playstyleLoading, setPlaystyleLoading] = useState(false);

  // DB stats
  const [dbStats, setDbStats] = useState(null);
  const [analysisTag, setAnalysisTag] = useState(null);
  const [compareExpanded, setCompareExpanded] = useState(false);

  // ── Refresh DB stats ─────────────────────────────────

  const refreshDbStats = useCallback(async () => {
    if (!apiKey) return;
    try {
      const res = await fetch(`${RELAY_URL}/api/fingerprints/players`, {
        headers: { "X-API-Key": apiKey },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDbStats({ totalPlayers: data.totalPlayers, totalFingerprints: data.totalFingerprints });
    } catch { /* ignore */ }
  }, [apiKey]);

  // Fetch DB stats on mount
  useEffect(() => {
    if (apiKey) refreshDbStats();
  }, [apiKey, refreshDbStats]);

  // ── Persist replay IDs to localStorage ─────────────

  useEffect(() => {
    if (replays.length === 0) {
      try { localStorage.removeItem(LAB_STORAGE_KEY); } catch { /* ignore */ }
      return;
    }
    try {
      localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(replays.map((r) => r.id)));
    } catch { /* ignore */ }
  }, [replays]);

  // ── Auto-load saved replays on mount (auto-resume) ──

  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current || !apiKey) return;
    loadedRef.current = true;
    let ids;
    try {
      ids = JSON.parse(localStorage.getItem(LAB_STORAGE_KEY) || "[]");
    } catch { return; }
    if (!ids.length) return;

    // Auto-expand compare section when resuming
    setCompareExpanded(true);

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
        } catch { /* skip failed loads */ }
      }
    })();
  }, [apiKey]);

  // ── Clear session ────────────────────────────────────

  const clearSession = useCallback(() => {
    try { localStorage.removeItem(LAB_STORAGE_KEY); } catch { /* ignore */ }
    setReplays([]);
    setSelectedCell(null);
    dispatchMerge({ type: "RESET" });
    setDismissedPairs(new Set());
    setUploadProgress({});
  }, []);

  // ── Upload logic ──────────────────────────────────

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
            [filename]: { status: "error", error: data.error || "Upload failed" },
          }));
          return;
        }

        // Fetch full replay details
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

        // Auto-expand compare section
        setCompareExpanded(true);
      } catch (err) {
        setUploadProgress((prev) => ({
          ...prev,
          [filename]: { status: "error", error: err.message },
        }));
      }
    },
    [apiKey]
  );

  const uploadMultipleFiles = useCallback(
    async (files) => {
      // Upload sequentially to avoid SQLite concurrent-write errors
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

  const removeReplay = useCallback((replayId) => {
    setReplays((prev) => {
      const next = prev.filter((r) => r.id !== replayId);
      try {
        if (next.length === 0) localStorage.removeItem(LAB_STORAGE_KEY);
      } catch { /* ignore */ }
      return next;
    });
    setSelectedCell(null);
  }, []);

  // ── W3C Search (copies Navbar debounced pattern) ──

  // Close dropdown on outside click
  useEffect(() => {
    if (!w3cShowDropdown) return;
    const handler = (e) => {
      if (w3cSearchRef.current && !w3cSearchRef.current.contains(e.target)) {
        setW3cShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [w3cShowDropdown]);

  // Debounced ladder search — same as Navbar
  useEffect(() => {
    if (w3cQuery.length < 2) {
      setW3cSearchResults([]);
      setW3cShowDropdown(false);
      return;
    }
    setW3cIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchLadder(w3cQuery);
      const deduped = [];
      const seen = new Set();
      for (const r of (Array.isArray(results) ? results : [])) {
        const tag = r.player?.playerIds?.[0]?.battleTag || r.player1Id;
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        deduped.push(r);
      }
      setW3cSearchResults(deduped.slice(0, 8));
      setW3cShowDropdown(true);
      setW3cIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [w3cQuery]);

  const selectW3cPlayer = useCallback(async (battleTag) => {
    setW3cQuery("");
    setW3cSearchResults([]);
    setW3cShowDropdown(false);
    setW3cSelectedTag(battleTag);
    setW3cMatches([]);
    setW3cImportProgress({});
    setW3cPage(0);
    setW3cMatchesLoading(true);

    // Auto-trigger analysis
    setAnalysisTag(battleTag);

    try {
      const encoded = encodeURIComponent(battleTag);
      const url = `https://website-backend.w3champions.com/api/matches/search?playerId=${encoded}&gateway=20&pageSize=100&gameMode=4&season=${season}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`W3C API error ${res.status}`);
      const data = await res.json();
      const matches = data.matches || [];
      setW3cMatches(matches);

      // Check which matches already exist in our DB
      if (apiKey && matches.length > 0) {
        try {
          const checkRes = await fetch(`${RELAY_URL}/api/replays/check-existing`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
            body: JSON.stringify({ matchIds: matches.map(m => m.id) }),
          });
          if (checkRes.ok) {
            const { existing } = await checkRes.json();
            if (existing.length > 0) {
              const existingSet = new Set(existing);
              setW3cImportProgress(prev => {
                const next = { ...prev };
                for (const id of existingSet) next[id] = "skipped";
                return next;
              });
            }
          }
        } catch { /* non-critical */ }
      }
    } catch (err) {
      console.error("W3C match fetch failed:", err);
      setW3cMatches([]);
    } finally {
      setW3cMatchesLoading(false);
    }
  }, [apiKey]);

  // Auto-trigger playstyle fetch when analysisTag changes
  const fetchPlaystyle = useCallback(async (battleTag) => {
    if (!apiKey || !battleTag) return;
    setPlaystyleLoading(true);
    try {
      const encoded = encodeURIComponent(battleTag);
      const res = await fetch(`${RELAY_URL}/api/fingerprints/similar/${encoded}`, {
        headers: { "X-API-Key": apiKey },
      });
      if (!res.ok) {
        setPlaystyleData(null);
        return;
      }
      const data = await res.json();
      setPlaystyleData(data);
    } catch (err) {
      console.error("Playstyle fetch failed:", err);
      setPlaystyleData(null);
    } finally {
      setPlaystyleLoading(false);
    }
  }, [apiKey]);

  // Fetch playstyle when analysisTag changes
  useEffect(() => {
    if (analysisTag && apiKey) fetchPlaystyle(analysisTag);
  }, [analysisTag, apiKey, fetchPlaystyle]);

  const importW3cMatch = useCallback(
    async (match) => {
      if (!apiKey) return null;
      const matchId = match.id;
      setW3cImportProgress((prev) => ({ ...prev, [matchId]: "importing" }));

      // Collect player names + battletags from the match data
      const players = [];
      for (const team of match.teams || []) {
        for (const p of team.players || []) {
          players.push({
            name: p.name || p.battleTag?.split("#")[0] || "",
            battleTag: p.battleTag || "",
          });
        }
      }

      try {
        const res = await fetch(`${RELAY_URL}/api/replays/import-w3c`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({ matchId, players }),
        });
        const data = await res.json();

        if (data.skipped) {
          setW3cImportProgress((prev) => ({ ...prev, [matchId]: "skipped" }));
          return null;
        }

        if (!data.ok) {
          setW3cImportProgress((prev) => ({ ...prev, [matchId]: "error" }));
          return null;
        }

        // Fetch full detail for fingerprint analysis
        const detailRes = await fetch(
          `${RELAY_URL}/api/replays/${data.replay.id}`,
          { headers: { "X-API-Key": apiKey } }
        );
        const detail = await detailRes.json();

        setW3cImportProgress((prev) => ({ ...prev, [matchId]: "done" }));

        const newReplay = {
          id: data.replay.id,
          filename: data.replay.filename,
          mapName: data.replay.mapName,
          duration: data.replay.gameDuration,
          playerCount: data.replay.playerCount,
          players: detail.players || [],
          actions: detail.actions || [],
        };

        setReplays((prev) => {
          if (prev.some((r) => r.id === data.replay.id)) return prev;
          return [...prev, newReplay];
        });

        return newReplay;
      } catch (err) {
        console.error(`Import failed for ${matchId}:`, err);
        setW3cImportProgress((prev) => ({ ...prev, [matchId]: "error" }));
        return null;
      }
    },
    [apiKey]
  );

  const importAllW3c = useCallback(async () => {
    if (w3cBatchImporting || w3cMatches.length === 0) return;
    setW3cBatchImporting(true);
    // Pre-mark all unprocessed matches as pending for immediate visual feedback
    setW3cImportProgress((prev) => {
      const next = { ...prev };
      for (const m of w3cMatches) {
        if (!next[m.id] || next[m.id] === "error") {
          next[m.id] = "pending";
        }
      }
      return next;
    });
    for (const match of w3cMatches) {
      if (w3cImportProgress[match.id] === "done" || w3cImportProgress[match.id] === "skipped") {
        continue;
      }
      await importW3cMatch(match);
      // Small delay between imports to be respectful to W3C API
      await new Promise((r) => setTimeout(r, 500));
    }
    setW3cBatchImporting(false);
  }, [w3cBatchImporting, w3cMatches, w3cImportProgress, importW3cMatch]);

  // Auto-trigger playstyle analysis + refresh DB stats when batch import finishes
  const prevBatchRef = useRef(false);
  useEffect(() => {
    if (prevBatchRef.current && !w3cBatchImporting) {
      refreshDbStats();
      if (w3cSelectedTag) fetchPlaystyle(w3cSelectedTag);
    }
    prevBatchRef.current = w3cBatchImporting;
  }, [w3cBatchImporting, w3cSelectedTag, fetchPlaystyle, refreshDbStats]);

  // ── Replay labels ─────────────────────────────────

  const replayLabels = useMemo(() => {
    const labels = {};
    replays.forEach((r, i) => {
      labels[r.id] = `R${i + 1}`;
    });
    return labels;
  }, [replays]);

  // ── Build all players with fingerprints ───────────

  const allPlayers = useMemo(() => {
    if (replays.length === 0) return [];

    // Gather all early-game sequences for bigram basis
    const allSequences = [];
    for (const r of replays) {
      for (const a of r.actions) {
        if (a.early_game_sequence) allSequences.push(a.early_game_sequence);
      }
    }
    const bigramKeys = computeBigramBasis(allSequences);

    const players = [];
    for (const r of replays) {
      // Build a lookup from player_id to actions
      const actionsByPlayer = {};
      for (const a of r.actions) {
        actionsByPlayer[a.player_id] = a;
      }
      for (const p of r.players) {
        const actions = actionsByPlayer[p.player_id];
        if (!actions) continue;
        const fingerprint = buildFingerprint(actions, bigramKeys);
        players.push({
          uid: `${r.id}-${p.player_id}`,
          replayId: r.id,
          playerId: p.player_id,
          playerName: p.player_name,
          race: p.race,
          fingerprint,
          actions,
        });
      }
    }
    return players;
  }, [replays]);

  // ── Similarity matrix ─────────────────────────────

  const matrix = useMemo(() => {
    if (allPlayers.length < 2) return null;
    return computeSimilarityMatrix(allPlayers);
  }, [allPlayers]);

  // ── Suggested matches ─────────────────────────────

  const suggestedMatches = useMemo(() => {
    if (allPlayers.length < 2) return [];
    return findSuggestedMatches(allPlayers, threshold);
  }, [allPlayers, threshold]);

  // ── Top candidates: all pairs above threshold, capped ─

  const topCandidates = useMemo(() => {
    // suggestedMatches is already sorted by score and filtered by threshold
    return suggestedMatches.slice(0, 20).map((m) => ({
      player: m.playerA,
      bestMatch: m.playerB,
      similarity: m.similarity,
      breakdown: m.breakdown,
      uidA: m.uidA,
      uidB: m.uidB,
      nameMatch:
        m.playerA.playerName.split("#")[0].toLowerCase() ===
        m.playerB.playerName.split("#")[0].toLowerCase(),
    }));
  }, [suggestedMatches]);

  // ── Cell click detail ─────────────────────────────

  const cellDetail = useMemo(() => {
    if (!selectedCell) return null;
    const pA = allPlayers.find((p) => p.uid === selectedCell.uidA);
    const pB = allPlayers.find((p) => p.uid === selectedCell.uidB);
    if (!pA || !pB) return null;
    const sim = playerSimilarity(pA, pB);
    const breakdown = computeBreakdown(pA.fingerprint, pB.fingerprint);
    return { pA, pB, sim, breakdown };
  }, [selectedCell, allPlayers]);

  // ── Handlers ──────────────────────────────────────

  const handleCellClick = useCallback((uidA, uidB) => {
    setSelectedCell((prev) =>
      prev && prev.uidA === uidA && prev.uidB === uidB
        ? null
        : { uidA, uidB }
    );
  }, []);

  const handleLink = useCallback((match) => {
    dispatchMerge({ type: "LINK", uidA: match.uidA, uidB: match.uidB });
  }, []);

  const handleDismiss = useCallback((match) => {
    const key = [match.uidA, match.uidB].sort().join("-");
    setDismissedPairs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleUnlinkGroup = useCallback((uid) => {
    dispatchMerge({ type: "UNLINK_GROUP", uid });
  }, []);

  // ── Merged identity member lists ──────────────────

  const mergedGroups = useMemo(() => {
    return mergedIdentities.map((group) =>
      group
        .map((uid) => allPlayers.find((p) => p.uid === uid))
        .filter(Boolean)
    );
  }, [mergedIdentities, allPlayers]);

  // ── Render ────────────────────────────────────────

  const uploading = Object.values(uploadProgress).some(
    (p) => p.status === "uploading"
  );

  // Auto-expand compare section when replays exist
  const showCompareContent = compareExpanded || replays.length > 0;

  return (
    <Page>
      <Title>Replay Lab</Title>
      <Subtitle>
        Search a player to analyze their playstyle, import matches, or compare replays.
      </Subtitle>

      {/* ══════════════════════════════════════════════════
          HERO SEARCH — prominent search at top
         ══════════════════════════════════════════════════ */}
      <HeroSearchWrap>
        <div className="navbar-search" ref={w3cSearchRef} style={{ marginLeft: 0, width: '100%' }}>
          <input
            className="navbar-search-input"
            type="text"
            placeholder="Search a player by name..."
            value={w3cQuery}
            onChange={(e) => setW3cQuery(e.target.value)}
            onFocus={() => w3cSearchResults.length > 0 && setW3cShowDropdown(true)}
            style={{ width: '100%', fontSize: '16px', padding: '12px 16px' }}
          />
          {w3cQuery && (
            <button className="navbar-search-clear" onClick={() => { setW3cQuery(""); setW3cSearchResults([]); setW3cShowDropdown(false); }}>&times;</button>
          )}
          {w3cShowDropdown && w3cSearchResults.length > 0 && (
            <div className="navbar-search-dropdown">
              {w3cSearchResults.map((r) => {
                const p = r.player || {};
                const tag = p.playerIds?.[0]?.battleTag || r.player1Id || "";
                const race = p.race;
                const mmr = p.mmr;
                const wins = p.wins || 0;
                const losses = p.losses || 0;
                const [name, hashNum] = (tag || "").split("#");
                return (
                  <button
                    key={tag}
                    className="navbar-search-result"
                    onClick={() => selectW3cPlayer(tag)}
                  >
                    <span className="navbar-search-avatar-wrap">
                      {raceMapping[race] ? (
                        <img src={raceMapping[race]} alt="" className="navbar-search-avatar race-fallback" />
                      ) : (
                        <span className="navbar-search-avatar placeholder" />
                      )}
                    </span>
                    <span className="navbar-search-info">
                      <span className="navbar-search-name-row">
                        <span className="navbar-search-name">{name}</span>
                        {hashNum && <span className="navbar-search-tag">#{hashNum}</span>}
                      </span>
                      <span className="navbar-search-meta">
                        <span className="navbar-search-w">{wins}W</span>
                        <span className="navbar-search-l">{losses}L</span>
                      </span>
                    </span>
                    <span className="navbar-search-mmr">{mmr != null ? `${Math.round(mmr)} MMR` : "—"}</span>
                  </button>
                );
              })}
            </div>
          )}
          {w3cIsSearching && w3cQuery.length >= 2 && !w3cShowDropdown && (
            <div className="navbar-search-dropdown">
              <div className="navbar-search-loading" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxs)', color: 'var(--grey-light)' }}>
                Searching...
              </div>
            </div>
          )}
        </div>

        {dbStats && (
          <StatsBanner>
            <DbBadge>{dbStats.totalPlayers} player{dbStats.totalPlayers !== 1 ? "s" : ""} indexed</DbBadge>
            <DbBadge>{dbStats.totalFingerprints} fingerprint{dbStats.totalFingerprints !== 1 ? "s" : ""}</DbBadge>
          </StatsBanner>
        )}
      </HeroSearchWrap>

      {/* ══════════════════════════════════════════════════
          ANALYSIS — inline below search when player selected
         ══════════════════════════════════════════════════ */}
      {analysisTag && (playstyleData || playstyleLoading) && (
        <Section>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <SectionTitle style={{ marginBottom: 0 }}>
              Analysis: {analysisTag.split("#")[0]}
            </SectionTitle>
            <CloseBtn onClick={() => { setAnalysisTag(null); setPlaystyleData(null); setW3cSelectedTag(null); setW3cMatches([]); setW3cImportProgress({}); }}>
              Dismiss
            </CloseBtn>
          </div>
          {playstyleLoading ? (
            <StatusText>Analyzing playstyle...</StatusText>
          ) : playstyleData && (
            <>
              <PlaystyleSummary>
                <DbBadge>{playstyleData.query.replayCount} replay{playstyleData.query.replayCount !== 1 ? "s" : ""} indexed</DbBadge>
                <DbBadge>{playstyleData.dbStats.totalPlayers} players in DB</DbBadge>
                <Button $secondary onClick={() => fetchPlaystyle(analysisTag)} style={{ fontSize: '10px', padding: '3px 10px' }}>
                  Refresh
                </Button>
              </PlaystyleSummary>

              {playstyleData.similar.length > 0 ? (
                <CandidateTable>
                  <CandidateHeader style={{ gridTemplateColumns: '1fr 60px 70px 160px' }}>
                    <span>Player</span>
                    <span>Games</span>
                    <span>Score</span>
                    <span>Breakdown</span>
                  </CandidateHeader>
                  {playstyleData.similar.slice(0, 15).map((s) => (
                    <CandidateRow
                      key={s.battleTag}
                      style={{ gridTemplateColumns: '1fr 60px 70px 160px', cursor: 'default' }}
                    >
                      <div>
                        <CandidateName $color={s.similarity >= 0.70 ? "var(--gold)" : "#fff"}>
                          {s.playerName || s.battleTag.split("#")[0]}
                        </CandidateName>
                        {s.race && <CandidateTag> {s.race}</CandidateTag>}
                      </div>
                      <CandidateTag>{s.replayCount}</CandidateTag>
                      <div>
                        <CandidateScore $val={s.similarity}>
                          {Math.round(s.similarity * 100)}%
                        </CandidateScore>
                        <CandidateScoreBar>
                          <CandidateScoreFill $val={s.similarity} style={{ width: `${Math.round(s.similarity * 100)}%` }} />
                        </CandidateScoreBar>
                      </div>
                      <BreakdownBars>
                        <MiniBarLabel>hk</MiniBarLabel>
                        <MiniBar><MiniBarFill $val={s.breakdown.hotkey} style={{ width: `${Math.round(s.breakdown.hotkey * 100)}%` }} /></MiniBar>
                        <MiniBarLabel>apm</MiniBarLabel>
                        <MiniBar><MiniBarFill $val={s.breakdown.apm} style={{ width: `${Math.round(s.breakdown.apm * 100)}%` }} /></MiniBar>
                        <MiniBarLabel>act</MiniBarLabel>
                        <MiniBar><MiniBarFill $val={s.breakdown.action} style={{ width: `${Math.round(s.breakdown.action * 100)}%` }} /></MiniBar>
                      </BreakdownBars>
                    </CandidateRow>
                  ))}
                </CandidateTable>
              ) : (
                <EmptyState>
                  No similar players found yet. Import more replays to grow the database.
                </EmptyState>
              )}
            </>
          )}
        </Section>
      )}

      {/* ══════════════════════════════════════════════════
          IMPORT MATCHES — shown when player selected
         ══════════════════════════════════════════════════ */}
      {w3cSelectedTag && (
        <Section>
          {w3cMatchesLoading && <StatusText>Loading matches...</StatusText>}

          {w3cMatches.length > 0 && (() => {
            const existingCount = Object.values(w3cImportProgress).filter(s => s === "skipped" || s === "done").length;
            const newCount = w3cMatches.length - existingCount;
            const totalPages = Math.ceil(w3cMatches.length / W3C_PAGE_SIZE);
            const pageMatches = w3cMatches.slice(w3cPage * W3C_PAGE_SIZE, (w3cPage + 1) * W3C_PAGE_SIZE);

            return (
              <>
                <ImportAllRow>
                  <StatusText>
                    <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>{w3cSelectedTag.split("#")[0]}</span> — {w3cMatches.length} match{w3cMatches.length !== 1 ? "es" : ""}
                    {existingCount > 0 && <> ({existingCount} already imported, {newCount} new)</>}
                  </StatusText>
                  {newCount > 0 && (
                    <Button
                      $secondary
                      onClick={importAllW3c}
                      disabled={w3cBatchImporting}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FiDownload size={12} />
                      {w3cBatchImporting ? "Importing..." : `Import ${newCount} New`}
                    </Button>
                  )}
                </ImportAllRow>

                {w3cBatchImporting && (() => {
                  const total = w3cMatches.length;
                  const finished = Object.values(w3cImportProgress).filter(
                    (s) => s === "done" || s === "skipped" || s === "error"
                  ).length;
                  const pct = Math.round((finished / total) * 100);
                  return (
                    <>
                      <ProgressLabel>
                        <span>{finished} / {total} processed</span>
                        <span>{pct}%</span>
                      </ProgressLabel>
                      <ProgressBarTrack>
                        <ProgressBarFill style={{ width: `${pct}%` }} />
                      </ProgressBarTrack>
                    </>
                  );
                })()}

                <MatchTable>
                  <MatchTableHeader>
                    <span>Map</span>
                    <span>Duration</span>
                    <span>Date</span>
                    <span>Players</span>
                    <span>Status</span>
                  </MatchTableHeader>
                  {pageMatches.map((m) => {
                    const status = w3cImportProgress[m.id];
                    const dur = m.durationInSeconds
                      ? `${Math.floor(m.durationInSeconds / 60)}:${String(m.durationInSeconds % 60).padStart(2, "0")}`
                      : "—";
                    const date = m.endTime
                      ? new Date(m.endTime).toLocaleDateString()
                      : m.startTime
                        ? new Date(m.startTime).toLocaleDateString()
                        : "—";
                    const playerCount = (m.teams || []).reduce(
                      (sum, t) => sum + (t.players?.length || 0), 0
                    );
                    return (
                      <MatchRow key={m.id}>
                        <MatchCell $color="#fff">{m.mapName || m.map || "Unknown"}</MatchCell>
                        <MatchCell>{dur}</MatchCell>
                        <MatchCell>{date}</MatchCell>
                        <MatchCell>{playerCount}</MatchCell>
                        <div>
                          {status === "done" && <ImportBadge $status="done">Imported</ImportBadge>}
                          {status === "skipped" && <ImportBadge $status="skipped">Exists</ImportBadge>}
                          {status === "importing" && <ImportBadge $status="importing">Importing...</ImportBadge>}
                          {status === "pending" && <ImportBadge $status="pending">Queued</ImportBadge>}
                          {status === "error" && <ImportBadge $status="error">Error</ImportBadge>}
                          {!status && (
                            <Button
                              $secondary
                              onClick={() => importW3cMatch(m)}
                              disabled={w3cBatchImporting}
                              style={{ fontSize: '10px', padding: '3px 10px' }}
                            >
                              Import
                            </Button>
                          )}
                        </div>
                      </MatchRow>
                    );
                  })}
                </MatchTable>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                    <Button $secondary onClick={() => setW3cPage(p => Math.max(0, p - 1))} disabled={w3cPage === 0} style={{ fontSize: '10px', padding: '3px 10px' }}>
                      Prev
                    </Button>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxs)', color: 'var(--grey-light)' }}>
                      {w3cPage + 1} / {totalPages}
                    </span>
                    <Button $secondary onClick={() => setW3cPage(p => Math.min(totalPages - 1, p + 1))} disabled={w3cPage >= totalPages - 1} style={{ fontSize: '10px', padding: '3px 10px' }}>
                      Next
                    </Button>
                  </div>
                )}
              </>
            );
          })()}

          {!w3cMatchesLoading && w3cMatches.length === 0 && (
            <EmptyState>No 4v4 matches found for {w3cSelectedTag.split("#")[0]} this season.</EmptyState>
          )}
        </Section>
      )}

      {/* ══════════════════════════════════════════════════
          COMPARE REPLAYS — merged drop zone + local analysis
         ══════════════════════════════════════════════════ */}
      <Section>
        <CollapsibleTitle onClick={() => setCompareExpanded(!showCompareContent)}>
          {showCompareContent ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
          Compare Replays {replays.length > 0 && `(${replays.length})`}
          {replays.length > 0 && (
            <CloseBtn onClick={(e) => { e.stopPropagation(); clearSession(); }}>
              Clear
            </CloseBtn>
          )}
        </CollapsibleTitle>

        {showCompareContent && (
          <>
            {/* Drop zone */}
            <DropZone
              $active={dragActive}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onClick={() => fileRef.current?.click()}
            >
              <DropIcon size={24} $active={dragActive} />
              <DropLabel $active={dragActive}>
                {uploading
                  ? "Uploading..."
                  : dragActive
                    ? "Drop .w3g files here"
                    : "Drop .w3g files or click to browse"}
              </DropLabel>
              <input
                ref={fileRef}
                type="file"
                accept=".w3g"
                multiple
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />
            </DropZone>

            {Object.entries(uploadProgress).map(([name, p]) =>
              p.status === "error" ? (
                <StatusText key={name} $color="var(--red)">
                  {name}: {p.error}
                </StatusText>
              ) : null
            )}

            {/* Loaded replays strip */}
            {replays.length > 0 && (
              <ReplayStrip>
                {replays.map((r) => (
                  <ReplayChip key={r.id}>
                    <ChipName>{replayLabels[r.id]}</ChipName>
                    <ChipText>{r.filename}</ChipText>
                    <ChipText>{r.mapName || "?"}</ChipText>
                    <ChipText>{r.playerCount}p</ChipText>
                    <ChipRemove onClick={() => removeReplay(r.id)}>
                      <FiX size={12} />
                    </ChipRemove>
                  </ReplayChip>
                ))}
              </ReplayStrip>
            )}

            {/* Similarity matrix */}
            {allPlayers.length >= 2 && matrix && (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <SectionTitle>Similarity Matrix</SectionTitle>
                <SimilarityMatrix
                  players={allPlayers}
                  matrix={matrix}
                  replayLabels={replayLabels}
                  onCellClick={handleCellClick}
                  selectedCell={selectedCell}
                />

                {cellDetail && (
                  <DetailPanel>
                    <DetailHeader>
                      <DetailName>
                        {cellDetail.pA.playerName} ({replayLabels[cellDetail.pA.replayId]})
                      </DetailName>
                      <DetailScore>
                        {Math.round(cellDetail.sim * 100)}%
                      </DetailScore>
                      <DetailName>
                        {cellDetail.pB.playerName} ({replayLabels[cellDetail.pB.replayId]})
                      </DetailName>
                    </DetailHeader>
                    <DetailBars>
                      {Object.entries(cellDetail.breakdown).map(([key, val]) => (
                        <DetailBar key={key}>
                          <DetailBarLabel>{key} {Math.round(val * 100)}%</DetailBarLabel>
                          <DetailBarTrack>
                            <DetailBarFill
                              style={{ width: `${Math.round(val * 100)}%` }}
                            />
                          </DetailBarTrack>
                        </DetailBar>
                      ))}
                    </DetailBars>

                    {/* Overlaid visualizations */}
                    <DetailSectionLabel>APM Over Time (overlaid)</DetailSectionLabel>
                    <OverlaySparkline series={[
                      { label: `${cellDetail.pA.playerName} (${replayLabels[cellDetail.pA.replayId]})`, timedSegments: cellDetail.pA.actions?.timed_segments || [] },
                      { label: `${cellDetail.pB.playerName} (${replayLabels[cellDetail.pB.replayId]})`, timedSegments: cellDetail.pB.actions?.timed_segments || [] },
                    ]} />

                    <OverlayRow>
                      <div>
                        <DetailSectionLabel>Actions (overlaid)</DetailSectionLabel>
                        <OverlayRadar series={[
                          { label: `${cellDetail.pA.playerName}`, actions: cellDetail.pA.actions || {} },
                          { label: `${cellDetail.pB.playerName}`, actions: cellDetail.pB.actions || {} },
                        ]} />
                      </div>

                      <div style={{ flex: 1 }}>
                        <DetailSectionLabel>Control Groups</DetailSectionLabel>
                        <HotkeyTable>
                          <HkHeader>Grp</HkHeader>
                          <HkHeader>{cellDetail.pA.playerName.split("#")[0]} ({replayLabels[cellDetail.pA.replayId]})</HkHeader>
                          <HkHeader>{cellDetail.pB.playerName.split("#")[0]} ({replayLabels[cellDetail.pB.replayId]})</HkHeader>
                          {Array.from({ length: 10 }, (_, i) => {
                            const gA = getGroupData(cellDetail.pA.actions?.group_hotkeys)[i] || {};
                            const gB = getGroupData(cellDetail.pB.actions?.group_hotkeys)[i] || {};
                            const maxVal = Math.max(gA.used || 0, gB.used || 0, gA.assigned || 0, gB.assigned || 0, 1);
                            const inactive = (gA.assigned || 0) === 0 && (gA.used || 0) === 0 && (gB.assigned || 0) === 0 && (gB.used || 0) === 0;
                            if (inactive) return null;
                            return (
                              <React.Fragment key={i}>
                                <HkCell $color="rgba(255,255,255,0.5)">{i}</HkCell>
                                <HkCell>
                                  <HkBar>
                                    <HkBarFill $color="#00bcd4" style={{ width: `${((gA.assigned || 0) / maxVal) * 100}%` }} />
                                  </HkBar>
                                  <HkBar>
                                    <HkBarFill $color="var(--gold)" style={{ width: `${((gA.used || 0) / maxVal) * 100}%` }} />
                                  </HkBar>
                                  <HkRole $color="#00bcd4">{gA.assigned || ""}</HkRole>
                                  <HkRole $color="var(--gold)">{gA.used || ""}</HkRole>
                                </HkCell>
                                <HkCell>
                                  <HkBar>
                                    <HkBarFill $color="#00bcd4" style={{ width: `${((gB.assigned || 0) / maxVal) * 100}%` }} />
                                  </HkBar>
                                  <HkBar>
                                    <HkBarFill $color="var(--gold)" style={{ width: `${((gB.used || 0) / maxVal) * 100}%` }} />
                                  </HkBar>
                                  <HkRole $color="#00bcd4">{gB.assigned || ""}</HkRole>
                                  <HkRole $color="var(--gold)">{gB.used || ""}</HkRole>
                                </HkCell>
                              </React.Fragment>
                            );
                          })}
                        </HotkeyTable>
                      </div>
                    </OverlayRow>

                    {/* Side-by-side early game sequences */}
                    <DetailSectionLabel>Early Game Sequences</DetailSectionLabel>
                    <CompareGrid>
                      <CompareColumn>
                        <CompareLabel>{cellDetail.pA.playerName} ({replayLabels[cellDetail.pA.replayId]})</CompareLabel>
                        <EarlyGameSequence sequence={cellDetail.pA.actions?.early_game_sequence} />
                      </CompareColumn>
                      <CompareColumn>
                        <CompareLabel>{cellDetail.pB.playerName} ({replayLabels[cellDetail.pB.replayId]})</CompareLabel>
                        <EarlyGameSequence sequence={cellDetail.pB.actions?.early_game_sequence} />
                      </CompareColumn>
                    </CompareGrid>
                  </DetailPanel>
                )}
              </div>
            )}

            {/* Top candidates */}
            {allPlayers.length >= 2 && (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <SectionTitle>Top Candidates</SectionTitle>
                <ThresholdRow>
                  <ThresholdLabel>Min similarity</ThresholdLabel>
                  <input
                    type="range"
                    min="0.30"
                    max="0.90"
                    step="0.01"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    style={{ flex: 1, maxWidth: 200 }}
                  />
                  <ThresholdValue>{Math.round(threshold * 100)}%</ThresholdValue>
                </ThresholdRow>

                {topCandidates.length > 0 ? (
                  <CandidateTable>
                    <CandidateHeader>
                      <span>Player</span>
                      <span></span>
                      <span>Best Match</span>
                      <span>Score</span>
                      <span></span>
                    </CandidateHeader>
                    {topCandidates.map((c) => {
                      const pairKey = [c.uidA, c.uidB].sort().join("-");
                      return (
                        <CandidateRow
                          key={pairKey}
                          onClick={() => handleCellClick(c.player.uid, c.bestMatch.uid)}
                          style={c.nameMatch ? { background: "rgba(76, 175, 80, 0.06)" } : undefined}
                        >
                          <div>
                            <CandidateName $color="var(--gold)">
                              {c.player.playerName.split("#")[0]}
                            </CandidateName>
                            <CandidateTag> {replayLabels[c.player.replayId]}</CandidateTag>
                          </div>
                          <CandidateTag style={{ textAlign: "center" }}>
                            {c.nameMatch ? "=" : "→"}
                          </CandidateTag>
                          <div>
                            <CandidateName $color={c.nameMatch ? "var(--green)" : "#fff"}>
                              {c.bestMatch.playerName.split("#")[0]}
                            </CandidateName>
                            <CandidateTag> {replayLabels[c.bestMatch.replayId]}</CandidateTag>
                          </div>
                          <div>
                            <CandidateScore $val={c.similarity}>
                              {Math.round(c.similarity * 100)}%
                            </CandidateScore>
                            <CandidateScoreBar>
                              <CandidateScoreFill
                                $val={c.similarity}
                                style={{ width: `${Math.round(c.similarity * 100)}%` }}
                              />
                            </CandidateScoreBar>
                          </div>
                          <LinkBtn onClick={(e) => { e.stopPropagation(); handleLink({ uidA: c.uidA, uidB: c.uidB }); }}>
                            Link
                          </LinkBtn>
                        </CandidateRow>
                      );
                    })}
                  </CandidateTable>
                ) : (
                  <EmptyState>
                    {replays.length < 2
                      ? "Upload at least 2 replays to see matches"
                      : "No matches above threshold — try lowering it"}
                  </EmptyState>
                )}
              </div>
            )}

            {/* Merged identities */}
            {mergedGroups.length > 0 && (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <SectionTitle>Merged Identities</SectionTitle>
                <MergedGrid>
                  {mergedGroups.map((members, i) => (
                    <ComparisonPanel
                      key={mergedIdentities[i].join("-")}
                      members={members}
                      replayLabels={replayLabels}
                      onUnlink={() => handleUnlinkGroup(members[0].uid)}
                    />
                  ))}
                </MergedGrid>
              </div>
            )}

            {replays.length === 0 && (
              <EmptyState>
                Upload .w3g files or import matches above to compare player fingerprints.
              </EmptyState>
            )}
          </>
        )}
      </Section>
    </Page>
  );
}
