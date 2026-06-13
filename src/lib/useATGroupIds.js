import { useEffect, useMemo, useState } from "react";
import { detectArrangedTeams, buildATGroupIdMap } from "./utils";

// Detect arranged teams for a 4v4 lobby and return the AT group-ID arrays
// MmrComparison expects ({ teamOneAT, teamTwoAT }, 0 = solo, 1+ = group).
//
// Detection only fires when both teams have exactly 4 players (the MMR-pair
// heuristic in detectArrangedTeams assumes a 4/4 index split) and is cached
// per lobby, so chat scrollback with repeated cards doesn't re-detect.
// The underlying stats API call is TTL-cached in api.js as well.

const lobbyCache = new Map();
const MAX_CACHE = 200;

const EMPTY = { teamOneAT: [], teamTwoAT: [] };

export default function useATGroupIds(teamAPlayers, teamBPlayers) {
  const teamA = teamAPlayers || [];
  const teamB = teamBPlayers || [];

  const eligible =
    teamA.length === 4 &&
    teamB.length === 4 &&
    [...teamA, ...teamB].every((p) => p.battleTag);

  const lobbyKey = eligible
    ? [...teamA, ...teamB].map((p) => p.battleTag.toLowerCase()).join(",")
    : null;

  const [idMap, setIdMap] = useState(() => (lobbyKey && lobbyCache.get(lobbyKey)) || null);

  useEffect(() => {
    if (!lobbyKey) return;
    const cached = lobbyCache.get(lobbyKey);
    if (cached) {
      setIdMap(cached);
      return;
    }

    let cancelled = false;
    const detect = async () => {
      // detectArrangedTeams reads oldMmr; chat events only carry mmr
      const flat = [...teamA, ...teamB].map((p) => ({
        battleTag: p.battleTag,
        oldMmr: p.oldMmr || p.currentMmr || p.mmr || 0,
      }));
      const groups = await detectArrangedTeams(flat);
      const map = buildATGroupIdMap(groups);
      if (lobbyCache.size >= MAX_CACHE) {
        lobbyCache.delete(lobbyCache.keys().next().value);
      }
      lobbyCache.set(lobbyKey, map);
      if (!cancelled) setIdMap(map);
    };
    detect();
    return () => {
      cancelled = true;
    };
  }, [lobbyKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => {
    if (!lobbyKey || !idMap) return EMPTY;
    return {
      teamOneAT: teamA.map((p) => idMap[p.battleTag.toLowerCase()] || 0),
      teamTwoAT: teamB.map((p) => idMap[p.battleTag.toLowerCase()] || 0),
    };
  }, [lobbyKey, idMap]); // eslint-disable-line react-hooks/exhaustive-deps
}
