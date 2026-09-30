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
export function storyCandidates(weekStart, getMessagesInRange, { baselineWeeks = 4, playerTags = [] } = {}) {
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
