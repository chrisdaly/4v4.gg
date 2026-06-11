/**
 * Match analytics: MVP computation and "interesting game" one-liners.
 * Shared by the chat game-event cards and the finished-match page.
 */

import { geometricMean } from "./formatters";

// The five headline stats behind the MVP badge (same as the big match card)
export const MVP_KEYS = [
  ["heroScore", "heroesKilled"],
  ["heroScore", "expGained"],
  ["resourceScore", "goldCollected"],
  ["unitScore", "unitsKilled"],
  ["unitScore", "largestArmy"],
];

export function mvpRankSum(ps, playerScores) {
  let sum = 0;
  for (const [group, key] of MVP_KEYS) {
    const v = ps[group]?.[key] ?? 0;
    sum += playerScores.filter((o) => (o[group]?.[key] ?? 0) <= v).length;
  }
  return sum;
}

export function computeMvp(playerScores) {
  if (!Array.isArray(playerScores) || playerScores.length === 0) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const ps of playerScores) {
    const sum = mvpRankSum(ps, playerScores);
    if (sum > bestScore) {
      bestScore = sum;
      best = ps.battleTag;
    }
  }
  return best;
}

export const RACE_NAMES = { 1: "Human", 2: "Orc", 4: "Night Elf", 8: "Undead" };

// WC3 war cries for race-stack victories
const RACE_QUOTES = {
  1: "For the Alliance!",
  2: "For the Horde!",
  4: "By the light of Elune!",
  8: "My life for Ner'zhul!",
};

const effectiveRace = (p) => p.rndRace ?? p.race ?? null;

const teamMmrOf = (players) => {
  const mmrs = (players || []).map((p) => p.oldMmr).filter((m) => m > 0);
  return mmrs.length > 0 ? Math.round(geometricMean(mmrs)) : null;
};

/**
 * Build the context computeNote needs from a finished-match payload.
 * Returns null when no winner can be determined.
 */
export function noteContextFromMatch(match) {
  const winnerIdx = match?.teams?.findIndex(
    (t) => t.players?.some((p) => p.won === true || p.won === 1)
  );
  if (winnerIdx == null || winnerIdx < 0) return null;
  const toPlayers = (team) =>
    (team?.players || []).map((p) => ({
      battleTag: p.battleTag,
      name: p.name || p.battleTag?.split("#")[0],
      race: effectiveRace(p),
      mmr: p.oldMmr ?? null,
      mmrGain: p.mmrGain ?? null,
    }));
  return {
    winners: toPlayers(match.teams[winnerIdx]),
    losers: toPlayers(match.teams[1 - winnerIdx]),
    winnersMmr: teamMmrOf(match.teams[winnerIdx]?.players),
    losersMmr: teamMmrOf(match.teams[1 - winnerIdx]?.players),
    durationInSeconds: match.durationInSeconds ?? null,
  };
}

/**
 * One-liner for finishes worth remarking on; null for ordinary games.
 * ctx: { winners, losers, winnersMmr, losersMmr, durationInSeconds }
 * extras unlock analytics checks: playerScores (match detail), matchPlayers
 * (flat players with heroes).
 *
 * Returns { text, tag, name, mmr, race, heroes, raceId, quote } —
 * subject fields are null for notes without a subject player; raceId/quote
 * decorate race-stack notes. When tag is set, `text` is the predicate only
 * ("took down 12 heroes"); renderers prepend the player's identity.
 */
export function computeNote(ctx, { playerScores = null, matchPlayers = null } = {}) {
  if (!ctx) return null;
  const dur = ctx.durationInSeconds;
  const { winnersMmr: w, losersMmr: l } = ctx;
  const all = [...(ctx.winners || []), ...(ctx.losers || [])];

  const plain = (text) => ({
    text, tag: null, name: null, mmr: null, race: null, heroes: null, raceId: null, quote: null,
  });
  const raceNote = (race, text) => ({
    ...plain(text),
    raceId: Number(race),
    quote: RACE_QUOTES[race] || null,
  });
  const subject = (tag, text) => {
    const p = all.find((x) => x.battleTag === tag);
    const mp = (matchPlayers || []).find((x) => x.battleTag === tag);
    return {
      ...plain(text),
      text,
      tag,
      name: p?.name || tag?.split("#")[0] || "someone",
      mmr: p?.mmr ?? null,
      race: p?.race ?? null,
      heroes: mp?.heroes?.map((h) => ({ icon: h.icon, level: h.level })) || null,
    };
  };

  // Race-stack victories (effective race, random rolls resolved)
  const raceCounts = {};
  for (const p of ctx.winners || []) {
    if (RACE_NAMES[p.race]) raceCounts[p.race] = (raceCounts[p.race] || 0) + 1;
  }
  for (const [race, n] of Object.entries(raceCounts)) {
    if (n === 4) return raceNote(race, `all-${RACE_NAMES[race]} victory`);
  }

  if (w != null && l != null && w <= l - 15) {
    return plain(`upset — the ${l} MMR favorites fell`);
  }

  const hasScores = Array.isArray(playerScores) && playerScores.length >= 4;

  if (hasScores) {
    // Scoreboard dominance: clear gap between best and second-best
    const sums = playerScores
      .map((ps) => ({ tag: ps.battleTag, sum: mvpRankSum(ps, playerScores) }))
      .sort((a, b) => b.sum - a.sum);
    if (sums[0].sum - sums[1].sum >= 8) {
      return subject(sums[0].tag, "dominated the scoreboard");
    }
  }

  for (const [race, n] of Object.entries(raceCounts)) {
    if (n === 3) return raceNote(race, `triple ${RACE_NAMES[race]} win`);
  }

  if (hasScores) {
    const top = (group, key) =>
      playerScores.reduce(
        (acc, ps) => {
          const v = ps[group]?.[key] ?? 0;
          return v > acc.v ? { tag: ps.battleTag, v } : acc;
        },
        { tag: null, v: 0 }
      );

    const army = top("unitScore", "largestArmy");
    if (army.v >= 90) return subject(army.tag, `fielded a ${army.v}-supply army`);

    const hunter = top("heroScore", "heroesKilled");
    if (hunter.v >= 6) return subject(hunter.tag, `took down ${hunter.v} heroes`);
  }

  if (dur != null && dur > 0 && dur < 12 * 60) {
    return plain(`over in ${Math.max(1, Math.round(dur / 60))} minutes`);
  }
  if (dur != null && dur > 35 * 60) {
    return plain(`${Math.round(dur / 60)}-minute marathon`);
  }
  const leaver = all.find((p) => p.mmrGain != null && p.mmrGain <= -30);
  if (leaver) return subject(leaver.battleTag, `dropped early (${leaver.mmrGain})`);
  if (w != null && l != null && Math.abs(w - l) <= 5) return plain("dead-even lobby");
  if (w != null && l != null && (w + l) / 2 >= 1800) return plain("high-level lobby");
  return null;
}
