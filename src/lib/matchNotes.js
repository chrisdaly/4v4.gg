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

const HERO_NAMES = {
  alchemist: "Alchemist",
  archmage: "Archmage",
  avatarofflame: "Firelord",
  bansheeranger: "Dark Ranger",
  beastmaster: "Beastmaster",
  blademaster: "Blademaster",
  cryptlord: "Crypt Lord",
  deathknight: "Death Knight",
  demonhunter: "Demon Hunter",
  dreadlord: "Dreadlord",
  farseer: "Far Seer",
  keeperofthegrove: "Keeper of the Grove",
  lich: "Lich",
  mountainking: "Mountain King",
  paladin: "Paladin",
  pandarenbrewmaster: "Pandaren Brewmaster",
  pitlord: "Pit Lord",
  priestessofthemoon: "Priestess of the Moon",
  seawitch: "Naga Sea Witch",
  shadowhunter: "Shadow Hunter",
  sorceror: "Blood Mage",
  taurenchieftain: "Tauren Chieftain",
  tinker: "Tinker",
  warden: "Warden",
};

const PICK_ORDINALS = ["first", "second", "third", "fourth"];
const RARE_PICK_THRESHOLD = 0.01; // < 1% of picks at that position

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

// heroStats: the gameMode-4 orderedPicks array from /api/w3c-stats/heroes-played
function heroPickRate(heroStats, pickIndex, icon) {
  const position = heroStats?.find((p) => p.pick === pickIndex);
  if (!position?.stats?.length) return null;
  const total = position.stats.reduce((s, h) => s + h.count, 0);
  if (!total) return null;
  const entry = position.stats.find((h) => h.icon === icon);
  return (entry?.count ?? 0) / total;
}

/**
 * One-liner for finishes worth remarking on; null for ordinary games.
 * ctx: { winners, losers, winnersMmr, losersMmr, durationInSeconds }
 * extras unlock analytics checks: playerScores (match detail), matchPlayers
 * (flat players with heroes), heroStats (4v4 orderedPicks for rarity).
 *
 * Returns { text, tag, name, mmr, race, heroes } — tag/name/mmr/race/heroes
 * are null for notes without a subject player. When tag is set, `text` is
 * the predicate only ("took down 12 heroes"); renderers prepend the
 * player's identity however they like, or fall back to `${name} ${text}`.
 */
export function computeNote(ctx, { playerScores = null, matchPlayers = null, heroStats = null } = {}) {
  if (!ctx) return null;
  const dur = ctx.durationInSeconds;
  const { winnersMmr: w, losersMmr: l } = ctx;
  const all = [...(ctx.winners || []), ...(ctx.losers || [])];

  const plain = (text) => ({ text, tag: null, name: null, mmr: null, race: null, heroes: null });
  const subject = (tag, text, highlightHero = null) => {
    const p = all.find((x) => x.battleTag === tag);
    const mp = (matchPlayers || []).find((x) => x.battleTag === tag);
    const heroes = highlightHero
      ? [{ icon: highlightHero }]
      : mp?.heroes?.map((h) => ({ icon: h.icon, level: h.level })) || null;
    return {
      text,
      tag,
      name: p?.name || tag?.split("#")[0] || "someone",
      mmr: p?.mmr ?? null,
      race: p?.race ?? null,
      heroes,
    };
  };

  // Race-stack victories (effective race, random rolls resolved)
  const raceCounts = {};
  for (const p of ctx.winners || []) {
    if (RACE_NAMES[p.race]) raceCounts[p.race] = (raceCounts[p.race] || 0) + 1;
  }
  for (const [race, n] of Object.entries(raceCounts)) {
    if (n === 4) return plain(`all-${RACE_NAMES[race]} victory`);
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
    if (n === 3) return plain(`triple ${RACE_NAMES[race]} win`);
  }

  // Rare hero pick (< 1% at its position; rarest wins)
  if (Array.isArray(matchPlayers) && heroStats) {
    let rarest = null;
    for (const p of matchPlayers) {
      (p.heroes || []).forEach((h, i) => {
        const rate = heroPickRate(heroStats, i, h.icon);
        if (rate == null || rate >= RARE_PICK_THRESHOLD) return;
        if (!rarest || rate < rarest.rate) {
          rarest = { tag: p.battleTag, icon: h.icon, pick: i, rate };
        }
      });
    }
    if (rarest) {
      const pct = rarest.rate < 0.001 ? (rarest.rate * 100).toFixed(2) : (rarest.rate * 100).toFixed(1);
      const heroName = HERO_NAMES[rarest.icon] || rarest.icon;
      return subject(
        rarest.tag,
        `went ${heroName} ${PICK_ORDINALS[rarest.pick] || ""} — a ${pct}% pick`,
        rarest.icon
      );
    }
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

  // Stunted heroes: in a long game, someone's heroes barely leveled
  if (Array.isArray(matchPlayers) && dur != null && dur >= 18 * 60) {
    const levels = matchPlayers
      .filter((p) => Array.isArray(p.heroes) && p.heroes.length > 0)
      .map((p) => ({
        tag: p.battleTag,
        total: p.heroes.reduce((s, h) => s + (h.level || 0), 0),
      }));
    if (levels.length >= 6) {
      const sorted = [...levels].sort((a, b) => a.total - b.total);
      const lowest = sorted[0];
      const avgOthers =
        sorted.slice(1).reduce((s, p) => s + p.total, 0) / (sorted.length - 1);
      if (lowest.total <= avgOthers * 0.5) {
        return subject(lowest.tag, `finished with only ${lowest.total} hero levels`);
      }
    }
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
