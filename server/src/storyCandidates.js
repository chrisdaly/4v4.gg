/**
 * Story candidates for a weekly issue.
 *
 * Two detectors, because they find different things and a week usually has
 * both. Neither uses a model: the same week gives the same candidates every
 * time, and a model only ever writes from a candidate a human picked.
 *
 *   threads  bursts. An argument: many messages, few minutes, two people
 *            doing most of the talking, other people laughing at it.
 *   themes   the slow ones. A topic that ran all week at a rate well above
 *            what the four weeks before it looked like.
 *
 * The second matters more than it sounds. For the week of 2026-09-14 the
 * burst detector ranked the week's real lead 37th, because the lead was a
 * patch discussion spread thin over seven days and never spiked once.
 */

const LAUGH = /(lol|lmao|haha|hehe|xd+|\)\)\)|kekw|😂|🤣|rofl)/i;
const STAKES = /\b(report|ban(ned)?|leave|leaver|left|grief|troll|smurf|afk|queue|que|bnet|patch|bug)\b/i;
const WORD = /[a-z][a-z'-]{2,}/g;

// Chat words that carry no topic. Names are deliberately NOT in here: a
// player becoming the week's subject is a story, and the desk shows it.
const STOP = new Set(`the a an and or but if then than that this these those i you he she it we they me him her them my your his its our their
is are was were be been being am do does did done have has had having will would can could should may might must
to of in on at for with from by as so no not yes u ur im its dont cant thats gg wp lol xd ok okay ye yeah yea nah
what when where who why how all any some one two get got go going went come came like just now here there very really
game games play played player players team teams map good bad nice well much more most less least too also even still
back down up out off over about into only other same because after before while gl hf ez noob man bro guys dude
think know see look watch say said tell need want make made take took give gave thing things time times`.split(/\s+/));

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (day, n) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

/** Distinct topic words in one message, minus the chat filler. */
function topicWords(text) {
  const out = new Set();
  for (const w of String(text).toLowerCase().match(WORD) || []) {
    if (w.length <= 20 && !STOP.has(w)) out.add(w);
  }
  return out;
}

/**
 * Bursts. Messages are cut into threads wherever the room goes quiet for
 * gapSeconds, then each thread is scored on how hot, how two-handed, how
 * funny and how consequential it was.
 */
export function findThreads(messages, { gapSeconds = 180, minMessages = 8, limit = 20 } = {}) {
  if (messages.length === 0) return [];
  const at = (m) => new Date(m.received_at.replace(' ', 'T') + 'Z').getTime();

  const threads = [];
  let cur = [messages[0]];
  for (let i = 1; i < messages.length; i++) {
    if (at(messages[i]) - at(messages[i - 1]) <= gapSeconds * 1000) cur.push(messages[i]);
    else { threads.push(cur); cur = [messages[i]]; }
  }
  threads.push(cur);

  const scored = [];
  for (const th of threads) {
    if (th.length < minMessages) continue;
    const counts = new Map();
    for (const m of th) counts.set(m.user_name, (counts.get(m.user_name) || 0) + 1);
    const cast = counts.size;
    if (cast < 2) continue;

    const spanMin = Math.max((at(th[th.length - 1]) - at(th[0])) / 60000, 1 / 60);
    const rate = th.length / spanMin;
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const topTwo = (ranked[0][1] + (ranked[1]?.[1] || 0)) / th.length;
    const laughs = th.filter((m) => LAUGH.test(m.message)).length;
    const stakes = th.filter((m) => STAKES.test(m.message)).length;

    scored.push({
      kind: 'thread',
      id: `t:${th[0].id}`,
      score: Math.round((rate * 2 + topTwo * 8 + laughs * 0.6 + stakes * 0.5 + Math.min(cast, 6) * 0.4) * 10) / 10,
      startedAt: th[0].received_at,
      messages: th.length,
      minutes: Math.round(spanMin * 10) / 10,
      cast,
      twoHanderPct: Math.round(topTwo * 100),
      laughs,
      stakes,
      // Why it scored, in the order a person would want to read it
      why: `${th.length} messages in ${Math.round(spanMin)} min · ${cast} people · ${Math.round(topTwo * 100)}% two of them · ${laughs} laughing`,
      who: ranked.slice(0, 4).map(([name, n]) => ({ name, messages: n })),
      lines: th.map((m) => ({ at: m.received_at, name: m.user_name, tag: m.battle_tag, text: m.message })),
    });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * The slow ones. A term's share of this week's messages against its share
 * of the four weeks before, keeping only terms several different people
 * used so one person repeating himself cannot invent a theme.
 */
export function findThemes(weekMessages, baselineMessages, { minMessages = 8, minSpeakers = 6, minLift = 1.5, limit = 20 } = {}) {
  const tally = (msgs) => {
    const docs = new Map();
    const speakers = new Map();
    const days = new Map();
    for (const m of msgs) {
      for (const w of topicWords(m.message)) {
        docs.set(w, (docs.get(w) || 0) + 1);
        if (!speakers.has(w)) speakers.set(w, new Set());
        speakers.get(w).add(m.user_name);
        if (!days.has(w)) days.set(w, new Set());
        days.get(w).add(m.received_at.slice(0, 10));
      }
    }
    return { docs, speakers, days, total: msgs.length };
  };

  const wk = tally(weekMessages);
  const base = tally(baselineMessages);
  if (wk.total === 0) return [];

  const out = [];
  for (const [term, n] of wk.docs) {
    const people = wk.speakers.get(term).size;
    if (n < minMessages || people < minSpeakers) continue;
    const priorN = base.docs.get(term) || 0;
    // Smoothed, so a term absent from the baseline does not divide by zero
    const lift = (n / wk.total) / ((priorN + 0.5) / (base.total + 0.5));
    if (lift < minLift) continue;
    const days = wk.days.get(term).size;
    out.push({
      kind: 'theme',
      id: `m:${term}`,
      term,
      score: Math.round(lift * 10) / 10,
      messages: n,
      people,
      days,
      priorMessages: priorN,
      why: `${n} messages · ${people} people · ${days}/7 days · ${(Math.round(lift * 10) / 10)}x the last 4 weeks`,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Both detectors for one Monday week, plus the lines behind each theme so
 * the desk can show what a term actually meant without a second request.
 * Takes its reader as an argument so the detectors stay pure and testable.
 */
export function storyCandidates(weekStart, getMessagesInRange, { baselineWeeks = 4 } = {}) {
  const weekEnd = addDays(weekStart, 6);
  const baseStart = addDays(weekStart, -7 * baselineWeeks);

  const week = getMessagesInRange(weekStart, weekEnd);
  const baseline = getMessagesInRange(baseStart, addDays(weekStart, -1));

  const themes = findThemes(week, baseline);
  // Attach each theme's own messages, newest scoring terms first
  for (const t of themes) {
    const rx = new RegExp(`(?<![a-z0-9])${t.term.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}(?![a-z0-9])`, 'i');
    t.lines = week
      .filter((m) => rx.test(m.message))
      .slice(0, 60)
      .map((m) => ({ at: m.received_at, name: m.user_name, tag: m.battle_tag, text: m.message }));
  }

  return {
    weekStart,
    weekEnd,
    weekMessages: week.length,
    baselineMessages: baseline.length,
    threads: findThreads(week),
    themes,
  };
}
