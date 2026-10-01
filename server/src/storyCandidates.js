import { segmentTopics, groupSegments } from './topicSegments.js';
import { makeVectoriser } from './textEmbed.js';

/**
 * Story candidates for a weekly issue.
 *
 * Two detectors, because they find different things and a week usually has
 * both. Neither uses a model: the same week gives the same candidates every
 * time, and a model only ever writes from a candidate a human picked.
 *
 *   threads  bursts. An argument, found by Kleinberg burst level and by how
 *            often the speaker changes, not by messages per minute.
 *   themes   the slow ones. A topic that ran all week at a rate well above
 *            what the four weeks before it looked like.
 *   echoes   one line from several different mouths, which is the room
 *            reacting rather than a person ranting.
 *   topics   conversations cut where their subject changed, then regrouped
 *            by subject, so the same argument on four days reads as one.
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

// The room is not all English. These carry no topic either, and because a
// language comes and goes with who is online, their share swings week to
// week and fakes a spike. German first, it is the biggest by some way.
const FOREIGN_STOP = new Set(`
der die das den dem des ein eine einen einem eines und oder aber wenn weil dass doch noch auch schon mal nur
ich du er sie es wir ihr mich dich sich uns euch mir dir ihm ihnen mein dein sein unser
ist sind war waren bin bist hat habe haben hatte hatten wird werden wurde kann kannst konnte muss musst
nicht kein keine nichts alle alles man wie was wer wo warum immer mehr sehr gut hier dort jetzt dann
le la les un une des du de et ou mais si que qui quoi pas ne je tu il elle nous vous ils elles
est sont etait sera avoir etre fait plus tout tous bien pour avec sur dans sans chez
el los las una por para con como pero muy todo todos eso ese esta este nao voce mais nada
sim entao porque quando onde tambem ainda agora depois sempre
eto kak chto nu da net ty vse tak tebe menya moi tvoi etot ochen tolko uzhe eshe
fais fait faire veux veut peux peut sais sait dis dit vais vient prend donne joue
hab habe hast hatte kannst muss musst will willst geht macht machst kommt spielt
`.split(/\s+/).filter(Boolean));

/**
 * Words the room uses constantly about each other. They spike with mood
 * rather than with a subject, so they crowd out the one thing the week was
 * actually about: for the week of 2026-09-21 they put "sucking", "chill",
 * "losers" and "rape" above "pause", which was the only real story.
 */
const CHAT_STOP = new Set(`
noob noobs trash garbage idiot idiots stupid dumb bad worst terrible awful
sucking sucks suck chill chilling losers loser winner winners rape raped raping
lol lmao haha gg wp ez rekt owned nice great cool damn shit fuck fucking
`.split(/\s+/).filter(Boolean));

// Deliberately NOT stopped: report, ban, leave, grief, troll, carry, feed,
// pause. They are how this ladder argues about its own rules, and when one
// spikes that is the story. "report" was the whole lead for 2026-09-14.

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
    if (w.length <= 20 && !STOP.has(w) && !FOREIGN_STOP.has(w) && !CHAT_STOP.has(w)) out.add(w);
  }
  return out;
}

/**
 * Bursts. Messages are cut into threads wherever the room goes quiet for
 * gapSeconds, then each thread is scored on how hot, how two-handed, how
 * funny and how consequential it was.
 */
/**
 * One person's consecutive lines, within a short window, are one turn.
 *
 * The W3C chat stores every Enter as its own row, so a typed word can arrive
 * split: ToastBrot sent "lo" at 08:04:31 and "l" at 08:04:32, and the burst
 * scorer read that as two messages in zero minutes and ranked the pair the
 * top story of the week. Counting turns instead of keystrokes fixes the unit
 * every other measure here is built on.
 *
 * Parts are joined with a space, so a split word reads "lo l" rather than
 * "lol". That is deliberate: guessing where a word break belongs would mangle
 * the common case, two real sentences a second apart.
 */
export function toUtterances(messages, { windowSeconds = 10 } = {}) {
  if (!messages || messages.length === 0) return [];
  const at = (m) => new Date(m.received_at.replace(' ', 'T') + 'Z').getTime();
  const out = [];
  let cur = null;
  let lastAt = 0;
  for (const m of messages) {
    const t = at(m);
    if (cur && cur.user_name === m.user_name && t - lastAt <= windowSeconds * 1000) {
      cur.message = `${cur.message} ${m.message}`.trim();
      cur.parts += 1;
    } else {
      if (cur) out.push(cur);
      cur = { ...m, parts: 1 };
    }
    lastAt = t;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Kleinberg burst detection: which messages sit in a stretch whose arrival
 * rate is high enough to be worth explaining.
 *
 * The old scorer used messages-per-minute, which is why nine messages in
 * thirty seconds beat a forty minute argument. Rate alone has no idea what
 * normal looks like. This fits a two-or-more state automaton over the gaps
 * between messages: state 0 emits gaps at the week's base rate, state i at
 * base * s^i, and moving up a state costs gamma * ln(n). Viterbi then picks
 * the cheapest path, so a brief spike does not pay for itself but a sustained
 * one does. Returns one level per message, 0 meaning ordinary traffic.
 *
 * Kleinberg, "Bursty and Hierarchical Structure in Streams" (2002).
 */
export function burstLevels(times, { s = 2, gamma = 1, levels = 3 } = {}) {
  const n = times.length;
  if (n < 3) return new Array(Math.max(n, 0)).fill(0);

  const gaps = [];
  for (let i = 1; i < n; i++) {
    // A zero gap would make the exponential density infinite
    gaps.push(Math.max((times[i] - times[i - 1]) / 1000, 1e-6));
  }
  const total = gaps.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return new Array(n).fill(0);

  const base = gaps.length / total;           // messages per second, this week
  const rate = [];
  for (let i = 0; i <= levels; i++) rate.push(base * Math.pow(s, i));
  const switchCost = (from, to) => (to > from ? (to - from) * gamma * Math.log(gaps.length) : 0);
  // -ln of the exponential density: cheap when the gap matches the state's rate
  const gapCost = (state, x) => -Math.log(rate[state]) + rate[state] * x;

  let prev = rate.map((_, i) => (i === 0 ? 0 : Infinity));
  const back = [];
  for (const gap of gaps) {
    const cur = new Array(levels + 1).fill(Infinity);
    const from = new Array(levels + 1).fill(0);
    for (let to = 0; to <= levels; to++) {
      for (let f = 0; f <= levels; f++) {
        if (prev[f] === Infinity) continue;
        const c = prev[f] + switchCost(f, to) + gapCost(to, gap);
        if (c < cur[to]) { cur[to] = c; from[to] = f; }
      }
    }
    back.push(from);
    prev = cur;
  }

  let end = 0;
  for (let j = 1; j <= levels; j++) if (prev[j] < prev[end]) end = j;
  const gapState = new Array(gaps.length);
  let st = end;
  for (let t = gaps.length - 1; t >= 0; t--) { gapState[t] = st; st = back[t][st]; }

  // A message is as bursty as the busier of the two gaps touching it
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const before = i > 0 ? gapState[i - 1] : 0;
    const after = i < gapState.length ? gapState[i] : 0;
    out[i] = Math.max(before, after);
  }
  return out;
}

export function findThreads(messages, { gapSeconds = 180, minMessages = 8, limit = 20, turnWindow = 10 } = {}) {
  if (messages.length === 0) return [];
  const at = (m) => new Date(m.received_at.replace(' ', 'T') + 'Z').getTime();
  const turns = toUtterances(messages, { windowSeconds: turnWindow });

  // How unusual each turn's arrival was, measured against the whole stretch
  // rather than against the thread it lands in
  const levels = burstLevels(turns.map(at));
  const levelOf = new Map(turns.map((m, i) => [m.id, levels[i]]));

  const threads = [];
  let cur = [turns[0]];
  for (let i = 1; i < turns.length; i++) {
    if (at(turns[i]) - at(turns[i - 1]) <= gapSeconds * 1000) cur.push(turns[i]);
    else { threads.push(cur); cur = [turns[i]]; }
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
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const topTwo = (ranked[0][1] + (ranked[1]?.[1] || 0)) / th.length;
    const laughs = th.filter((m) => LAUGH.test(m.message)).length;
    const stakes = th.filter((m) => STAKES.test(m.message)).length;
    const level = Math.max(...th.map((m) => levelOf.get(m.id) || 0));

    // How often the speaker changes. A monologue sits near 0, people actually
    // talking to each other near 1, and it does not reward raw speed.
    let switches = 0;
    for (let i = 1; i < th.length; i++) if (th[i].user_name !== th[i - 1].user_name) switches++;
    const alternation = th.length > 1 ? switches / (th.length - 1) : 0;

    scored.push({
      kind: 'thread',
      id: `t:${th[0].id}`,
      score: Math.round((
        level * 6
        + alternation * 10
        + Math.min(cast, 8) * 1.5
        + laughs * 0.6
        + stakes * 0.5
        + Math.min(spanMin, 20) * 0.3
      ) * 10) / 10,
      startedAt: th[0].received_at,
      messages: th.length,
      minutes: Math.round(spanMin * 10) / 10,
      cast,
      level,
      alternationPct: Math.round(alternation * 100),
      twoHanderPct: Math.round(topTwo * 100),
      laughs,
      stakes,
      // Why it scored, in the order a person would want to read it
      why: `${th.length} turns in ${Math.round(spanMin)} min · ${cast} people · burst level ${level} · ${Math.round(alternation * 100)}% back and forth · ${laughs} laughing`,
      who: ranked.slice(0, 4).map(([name, n]) => ({ name, messages: n })),
      lines: th.map((m) => ({ at: m.received_at, name: m.user_name, tag: m.battle_tag, text: m.message })),
    });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * The same thing, said by different people.
 *
 * Neither detector above finds the best story of the week of Sep 21. On the
 * Sunday five separate players pasted the same moderation verdict into the
 * lobby, xlrenxuanwei banned 100 days after two weeks of complaints. Thirteen
 * messages out of 10,450 is invisible to a theme, and spread over five days it
 * is no kind of burst. What makes it a story is who repeated it: a line coming
 * back from one mouth is a person ranting, and from five is the room reacting.
 *
 * Matching is token-set overlap rather than exact text, because the pastes are
 * never identical ("oh RIP: ..." against the bare bot line), and a minimum
 * length keeps "gg" and "lol" out, which every player types every day.
 */
export function findEchoes(messages, { minSpeakers = 3, minChars = 25, overlap = 0.5, limit = 10 } = {}) {
  if (!messages || messages.length === 0) return [];
  const at = (m) => new Date(m.received_at.replace(' ', 'T') + 'Z').getTime();
  const turns = toUtterances(messages);

  const tokens = (text) => new Set(
    String(text)
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, ' ')        // a shared link is the subject, not the wording
      .replace(/[^a-z0-9#]+/g, ' ')
      .split(' ')
      .filter((w) => w.length >= 2),
  );
  const jaccard = (a, b) => {
    let shared = 0;
    for (const w of a) if (b.has(w)) shared++;
    return shared / (a.size + b.size - shared);
  };

  const groups = [];
  for (const m of turns) {
    const text = String(m.message || '').trim();
    if (text.replace(/https?:\/\/\S+/g, '').trim().length < minChars) continue;
    const tok = tokens(text);
    if (tok.size < 4) continue;
    const hit = groups.find((g) => jaccard(g.tokens, tok) >= overlap);
    if (hit) {
      hit.members.push(m);
      // Keep the shared core, so a group cannot drift term by term
      hit.tokens = new Set([...hit.tokens].filter((w) => tok.has(w)));
    } else {
      groups.push({ tokens: tok, members: [m] });
    }
  }

  const scored = [];
  for (const g of groups) {
    const speakers = new Set(g.members.map((m) => m.user_name));
    if (speakers.size < minSpeakers) continue;
    const times = g.members.map(at).sort((a, b) => a - b);
    const hours = Math.round(((times[times.length - 1] - times[0]) / 3600000) * 10) / 10;
    scored.push({
      kind: 'echo',
      id: `e:${g.members[0].id}`,
      score: Math.round((speakers.size * 4 + g.members.length) * 10) / 10,
      speakers: speakers.size,
      repeats: g.members.length,
      hours,
      startedAt: g.members[0].received_at,
      why: `${speakers.size} different people said it, ${g.members.length} times over ${hours}h`,
      who: [...speakers].slice(0, 6),
      lines: g.members.slice(0, 8).map((m) => ({ at: m.received_at, name: m.user_name, tag: m.battle_tag, text: m.message })),
    });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * The slow ones. A term's share of this week's messages against its share
 * of the four weeks before, keeping only terms several different people
 * used so one person repeating himself cannot invent a theme.
 */
/**
 * The names people go by, lowercased, from who actually spoke. A term that
 * is somebody's name is not a subject: it means the room talked about that
 * player, which is a different kind of candidate and belongs in its own
 * list. Without this the whole board fills with names and the one real
 * subject of the week sits eighth.
 */
function playerNames(messages, extraTags = []) {
  const names = new Set();
  const add = (raw) => {
    const n = String(raw || '').toLowerCase().trim();
    if (n.length < 3) return;
    names.add(n);
    // Most nicknames are a prefix of the handle: Mikauzora is "mika"
    for (let i = 4; i < Math.min(n.length, 9); i++) names.add(n.slice(0, i));
  };
  for (const m of messages) {
    add(m.user_name);
    add(String(m.battle_tag || '').split('#')[0]);
    // <@Someone#1234> markup names players who never typed
    for (const mention of String(m.message || '').matchAll(/<@([^#>]+)#\d+>/g)) add(mention[1]);
  }
  // Everyone who played that week, whether they spoke or not
  for (const tag of extraTags) add(String(tag).split('#')[0]);
  return names;
}

export function findThemes(weekMessages, baselineMessages, { minMessages = 8, minSpeakers = 6, minLift = 1.5, limit = 20, playerTags = [] } = {}) {
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
  const names = playerNames([...weekMessages, ...baselineMessages], playerTags);

  const out = [];
  for (const [term, n] of wk.docs) {
    const people = wk.speakers.get(term).size;
    if (n < minMessages || people < minSpeakers) continue;
    const priorN = base.docs.get(term) || 0;
    // Smoothed, so a term absent from the baseline does not divide by zero
    const lift = (n / wk.total) / ((priorN + 0.5) / (base.total + 0.5));
    if (lift < minLift) continue;
    const days = wk.days.get(term).size;
    const isName = names.has(term);
    out.push({
      kind: 'theme',
      // A subject is a story. A name is who the week was about.
      subject: isName ? 'player' : 'topic',
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
/**
 * Cut the week into conversations and group the ones sharing a subject.
 *
 * Segmentation runs inside each continuous run of talk rather than across the
 * whole week, because a six hour overnight gap is not a change of subject and
 * TextTiling has no notion of time. Runs split on a fifteen minute silence,
 * longer than the thread detector's three minutes: a thread is one exchange,
 * whereas this wants a whole sitting to look for subject changes within.
 */
async function topicsFor(week) {
  const at = (m) => new Date(m.received_at.replace(' ', 'T') + 'Z').getTime();
  const turns = toUtterances(week);
  if (turns.length === 0) return [];

  // A sentence model if one is reachable, the lexical vectoriser otherwise
  const vectorise = (await makeVectoriser(turns.map((t) => t.message))) || undefined;

  const runs = [];
  let cur = [turns[0]];
  for (let i = 1; i < turns.length; i++) {
    if (at(turns[i]) - at(turns[i - 1]) <= 900 * 1000) cur.push(turns[i]);
    else { runs.push(cur); cur = [turns[i]]; }
  }
  runs.push(cur);

  const segments = [];
  for (const run of runs) {
    if (run.length < 8) continue;
    for (const seg of segmentTopics(run, { vectorise })) {
      if (seg.turns >= 4 && seg.speakers >= 2) segments.push(seg);
    }
  }
  return groupSegments(segments, { threshold: vectorise?.groupThreshold });
}

export async function storyCandidates(weekStart, getMessagesInRange, { baselineWeeks = 4, playerTags = [] } = {}) {
  const weekEnd = addDays(weekStart, 6);
  const baseStart = addDays(weekStart, -7 * baselineWeeks);

  const week = getMessagesInRange(weekStart, weekEnd);
  const baseline = getMessagesInRange(baseStart, addDays(weekStart, -1));

  const themes = findThemes(week, baseline, { playerTags });
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
    // The same line from several mouths, which neither of the other two finds
    echoes: findEchoes(week),
    // Conversations cut where their subject changed, then regrouped by subject
    topics: await topicsFor(week),
    quotes: findQuotes(week),
  };
}

/**
 * Draft one chosen story.
 *
 * The detectors decide what is worth writing about and a person decides
 * which of those to run, so by the time this is called the story is already
 * picked. All the model does is turn a pile of chat lines into a headline
 * and two or three sentences, which is the part that is genuinely tedious
 * and the part a model is actually good at.
 *
 * It never chooses the story and it never invents a quote: quotes are
 * picked from the lines by hand, in the desk.
 */
export async function draftStory({ candidate, slot, client, model = 'claude-haiku-4-5-20251001' }) {
  const lines = (candidate.lines || []).slice(0, 80);
  if (lines.length === 0) return null;

  const isLead = slot === 'lead';
  const subject = candidate.kind === 'theme'
    ? `the word "${candidate.term}", which ran ${candidate.score}x its usual rate`
    : `an argument between ${(candidate.who || []).map((w) => w.name).join(' and ')}`;

  const system = `You write a weekly news digest for a Warcraft III 4v4 ladder.
Voice: a reporter who plays. Plain, specific, dry. Never breathless, never a press release.

Hard rules:
- ASCII only. No em-dashes. Use a plain hyphen or a colon.
- Never open with a teaser ("here's the thing", "what's interesting is", "and here's why"). State the point, then the reasoning.
- Use the exact player names as they appear in the log. Never invent a name, a number or an event.
- Say only what the log shows. If the log does not say why something happened, do not guess.
- Do not include quotes in your output. They are attached separately.`;

  const prompt = `${lines.length} chat lines, picked because of ${subject}.
${candidate.why}

Write this as ${isLead ? "the issue's top story" : 'a short item'}.

Return JSON only:
{"headline": "...", "body": "..."}

headline: ${isLead ? '4 to 9 words' : '3 to 7 words'}, title case, no final full stop. It names what happened, not how it felt.
body: ${isLead ? '3 to 4 sentences' : '1 to 2 sentences'}. What happened, who, and what it led to.

Lines:
${lines.map((l) => `[${l.at.slice(5, 16)}] ${l.name}: ${l.text}`).join('\n')}`;

  const msg = await client.messages.create({
    model,
    max_tokens: 400,
    system,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0]?.text?.trim();
  if (!text) return null;
  const json = text.match(/\{[\s\S]*\}/);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json[0]);
    const clean = (v) => String(v || '').replace(/[—–]/g, '-').trim();
    const headline = clean(parsed.headline).replace(/\.$/, '');
    const body = clean(parsed.body);
    return headline || body ? { headline, body } : null;
  } catch {
    return null;
  }
}

/**
 * Lines worth printing big.
 *
 * A quote of the week is not a story, so it is not one of the candidates
 * above. Chris's criteria, in his words: about other people or the game and
 * not the speaker's own rank, it landed, readable cold, has an image or a
 * turn of phrase rather than an insult or a stat, and not a monologue
 * fragment.
 *
 * Landing is the only one with a signal in the data: somebody else laughing
 * within a couple of minutes. The rest are filters. Imagery is the one thing
 * that lifts a line above its laugh count, because a turn of phrase beats a
 * good joke told plainly.
 */
// Ranking against the rest of the criteria, not just the laugh.
// Placing yourself on the ladder, in either order. The line Chris rejected,
// "levels : 500mmr - 1000mmr - 1500mmr - pros - me", puts the ranks first and
// itself last, which an I-comes-first pattern misses entirely.
const SELF = "(?:i|i'm|im|me|my|myself|mine)";
const RANK = '(?:mmr|ranks?|pros?|levels?|best|skill|better|carried|carry|top)';
const SELF_REGARD = new RegExp(
  `\\b${SELF}\\b.{0,40}\\b${RANK}\\b|\\b${RANK}\\b.{0,40}\\b${SELF}\\b|[<>=-]\\s*me\\s*$`,
  'i'
);
const IMAGERY = /\b(like a|like the|as if|looks like|reminds me|basically a|might as well|it'?s like)\b/i;
/**
 * Never offered as a quote, at any score.
 *
 * These go on the front of the issue and on the home page, so a slur reaching
 * a candidate list is a publishing failure, not a ranking one. The imagery
 * bonus made this urgent: "like a" is how a simile is built and also how an
 * insult is built, and it promoted two slurs to the top of the board.
 *
 * Word-boundary matched so "scunthorpe" problems do not bite, and kept
 * deliberately blunt: a false positive costs one quote, a false negative
 * costs a slur on the site.
 */
const ABUSE = new RegExp(
  '\\b(' + [
    'fag', 'faggot', 'fags', 'tranny', 'trannies',
    'nigger', 'nigga', 'niggers', 'chink', 'chinks', 'gook', 'kike', 'spic', 'wetback', 'paki',
    'retard', 'retards', 'retarded', 'tard', 'spastic', 'spaz', 'mongoloid',
    'downie', 'down syndrome', 'autistic', 'autist',
    'kys', 'kill yourself', 'rape', 'raped', 'rapist',
    'cunt', 'whore', 'slut',
  ].join('|') + ')\\b',
  'i'
);

const PURE_INSULT = /^(\W*)(u|you|ur|your)?\s*(are|r)?\s*(a\s+)?(noob|trash|garbage|idiot|retard|clown|dogshit|shit|bad|terrible|cancer)\W*$/i;
const STAT_ONLY = /^[^a-z]*\d[\d\s%.,:+-]*[a-z]{0,6}[^a-z]*$/i;

export function findQuotes(messages, { limit = 40 } = {}) {
  const at = (m) => new Date(m.received_at.replace(' ', 'T') + 'Z').getTime();
  const LAUGHTER = /(lol|lmao|haha|hehe|xd+|\)\)\)|kekw|😂|🤣|rofl|mdr)/i;
  const out = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const text = String(m.message || '').trim();
    // Readable on its own, and not a paste, a link or a one-word reaction
    if (text.length < 18 || text.length > 160) continue;
    if (/https?:\/\//.test(text)) continue;
    if (LAUGHTER.test(text) && text.length < 40) continue;

    const reactors = new Set();
    for (let j = i + 1; j < messages.length && j < i + 12; j++) {
      const n = messages[j];
      if (at(n) - at(m) > 150000) break;
      if (n.user_name !== m.user_name && LAUGHTER.test(n.message || '')) reactors.add(n.user_name);
    }
    if (reactors.size === 0) continue;

    if (ABUSE.test(text)) continue;
    // Ranking his own ladder is not a quote of the week, however many laughed
    if (SELF_REGARD.test(text)) continue;
    if (PURE_INSULT.test(text)) continue;
    if (STAT_ONLY.test(text)) continue;

    // A monologue fragment reads as nonsense out of context, so a line only
    // counts when the speaker was talking to somebody rather than at them
    let ownRun = 0;
    for (let j = i - 1; j >= 0 && j > i - 5; j--) {
      if (messages[j].user_name !== m.user_name) break;
      ownRun++;
    }
    if (ownRun >= 3) continue;

    // A turn of phrase beats a good joke told plainly
    const score = reactors.size + (IMAGERY.test(text) ? 2 : 0);

    out.push({
      id: `q:${m.id}`,
      at: m.received_at,
      name: m.user_name,
      tag: m.battle_tag,
      text,
      laughs: reactors.size,
      score,
      imagery: IMAGERY.test(text),
      who: [...reactors],
      // The conversation either side, because a line on its own is a
      // fragment: you cannot tell who it was aimed at or what provoked it.
      context: messages
        .slice(Math.max(0, i - 4), i + 5)
        .map((x) => ({
          at: x.received_at,
          name: x.user_name,
          tag: x.battle_tag,
          text: x.message,
          isQuote: x.id === m.id,
        })),
    });
  }

  return out.sort((a, b) => b.score - a.score || b.laughs - a.laughs).slice(0, limit);
}

/**
 * A line for a spotlight card: something the player said, or something said
 * about them, that is worth printing beside their number.
 *
 * This is what makes a card feel like it is about a person. Six cards of
 * pure arithmetic is what "sterile" means.
 *
 * Ranked on the same signal as the quote of the week, and filtered by the
 * same rules, so nothing abusive or self-regarding reaches a card either.
 */
export function quotesForPlayers(messages, tags, { perPlayer = 2 } = {}) {
  const wanted = new Map();
  for (const tag of tags) {
    const name = String(tag).split('#')[0].toLowerCase();
    if (name.length >= 3) wanted.set(name, tag);
  }
  if (wanted.size === 0) return {};

  const scored = findQuotes(messages, { limit: 400 });
  const out = {};
  const take = (tag, line) => {
    if (!out[tag]) out[tag] = [];
    if (out[tag].length >= perPlayer) return;
    if (out[tag].some((q) => q.text === line.text)) return;
    out[tag].push(line);
  };

  // What they said themselves reads better than what was said about them
  for (const q of scored) {
    const tag = wanted.get(String(q.name || '').toLowerCase());
    if (tag) take(tag, q);
  }
  for (const q of scored) {
    for (const [name, tag] of wanted) {
      if (String(q.name || '').toLowerCase() === name) continue;
      const rx = new RegExp(`(?<![a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`, 'i');
      if (rx.test(q.text)) take(tag, q);
    }
  }
  return out;
}
