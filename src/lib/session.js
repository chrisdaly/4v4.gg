/**
 * Shared session-detection helpers for player match history.
 * Matches arrive newest-first from the API.
 */

// A session is one sitting: games run together until someone stops for more
// than two hours, and that gap is the break between sessions.
export const SESSION_GAP_MINUTES = 120;

// Idle time between two consecutive games (newer game's start minus older game's end)
export const matchIdleGapMs = (newerMatch, olderMatch) =>
  new Date(newerMatch.startTime) - new Date(olderMatch.endTime);

const findPlayerInMatch = (match, battleTagLower) => {
  for (const team of match.teams) {
    const player = team.players.find((p) => p.battleTag.toLowerCase() === battleTagLower);
    if (player) return player;
  }
  return null;
};

// Keep only matches where the player played the given race
export const filterMatchesByRace = (matches, battleTag, race) => {
  if (race == null || !matches) return matches;
  const battleTagLower = battleTag.toLowerCase();
  return matches.filter((match) => {
    const player = findPlayerInMatch(match, battleTagLower);
    return player != null && player.race === race;
  });
};

// Detect session boundary - if gapMinutes+ idle time between consecutive games, session ends
export const detectSessionGames = (matches, battleTag, gapMinutes = SESSION_GAP_MINUTES) => {
  if (!matches || matches.length === 0) return [];

  const battleTagLower = battleTag.toLowerCase();
  const sessionGapMs = gapMinutes * 60 * 1000;
  const sessionMatches = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];

    const playerData = findPlayerInMatch(match, battleTagLower);
    if (!playerData) continue;

    if (i > 0) {
      const gapMs = matchIdleGapMs(matches[i - 1], match);
      if (gapMs > sessionGapMs) {
        break; // Found session boundary
      }
    }

    sessionMatches.push({
      won: playerData.won,
      oldMmr: playerData.oldMmr,
      currentMmr: playerData.currentMmr,
      mmrGain: playerData.currentMmr - playerData.oldMmr,
      endTime: match.endTime,
    });
  }

  return sessionMatches;
};

/**
 * Group a newest-first page of matches into sittings for the history table.
 * Each group is { matches, start, end, wins, losses, mmrChange }, newest
 * first. The table pages its history, so the first group on a later page
 * and the last group on any page but the final one may be the tail or head
 * of a sitting that continues off the page; the caller decides what to show.
 */
export const groupIntoSessions = (matches, battleTag, gapMinutes = SESSION_GAP_MINUTES) => {
  const battleTagLower = battleTag.toLowerCase();
  const sessionGapMs = gapMinutes * 60 * 1000;
  const groups = [];
  let current = null;

  for (const match of matches || []) {
    const player = findPlayerInMatch(match, battleTagLower);
    if (!player) continue;
    const newBreak = !current || matchIdleGapMs(current.matches[current.matches.length - 1], match) > sessionGapMs;
    if (newBreak) {
      current = { matches: [], start: null, end: match.endTime, wins: 0, losses: 0, mmrChange: 0 };
      groups.push(current);
    }
    current.matches.push(match);
    current.start = match.startTime;
    if (player.won) current.wins++;
    else current.losses++;
    current.mmrChange += (player.currentMmr || 0) - (player.oldMmr || 0);
  }
  return groups;
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const clock = (d) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;

/** "Today", "Yesterday", "Sat 27 Sep" - and the time the sitting ran, "18:39-21:09". */
export const describeSession = (start, end, now = new Date()) => {
  const s = new Date(start);
  const e = new Date(end);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  let day;
  if (sameDay(s, now)) day = "Today";
  else if (sameDay(s, yesterday)) day = "Yesterday";
  else {
    day = s.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    if (s.getFullYear() !== now.getFullYear()) day += ` ${s.getFullYear()}`;
  }
  return { day, time: `${clock(s)}-${clock(e)}` };
};
