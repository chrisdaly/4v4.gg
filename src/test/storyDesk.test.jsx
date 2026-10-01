import { describe, it, expect, beforeEach } from 'vitest';
import {
  SLOTS, loadPicks, savePicks, assign, inSlot, pickQuotes, pickedTags,
  startDraft, composeItem, toggleQuote, hasQuote, isReady, applyToDigest, composedSections,
} from '../lib/news/storyDesk';
import { mondayOf, lastCompleteWeek } from '../pages/StoryDesk';
import { findThreads, findThemes } from '../../server/src/storyCandidates.js';

const msg = (id, at, name, text, tag = `${name}#1`) => ({
  id, received_at: at, user_name: name, battle_tag: tag, message: text,
});

describe('story desk picks', () => {
  beforeEach(() => localStorage.clear());

  it('holds one lead and three briefs, dropping the oldest when a slot is full', () => {
    let picks = assign({}, 'm:patch', 'lead');
    expect(picks).toEqual({ 'm:patch': 'lead' });
    picks = assign(picks, 't:99', 'lead');
    // Taking the lead releases whoever had it
    expect(picks).toEqual({ 't:99': 'lead' });
    picks = assign(picks, 't:99', 'brief');
    expect(picks).toEqual({ 't:99': 'brief' });
    picks = assign(picks, 't:99', 'brief');
    expect(picks).toEqual({});

    // Three briefs fit; the fourth pushes the first out
    picks = ['a', 'b', 'c'].reduce((p, id) => assign(p, id, 'brief'), {});
    expect(Object.keys(picks)).toEqual(['a', 'b', 'c']);
    picks = assign(picks, 'd', 'brief');
    expect(Object.keys(picks)).toEqual(['b', 'c', 'd']);

    expect(SLOTS.map((s) => s.key)).toEqual(['lead', 'brief']);
    // Labels name the section a reader sees, so promoting says where it lands
    expect(SLOTS.map((s) => s.label)).toEqual(['Top story', 'Also this week']);
    expect(SLOTS.map((s) => s.max)).toEqual([1, 3]);
  });

  it('keeps the quote of the week apart from the stories, and remembers it', async () => {
    const { loadQuote, saveQuote, quoteSection } = await import('../lib/news/storyDesk');
    localStorage.clear();

    // It belongs to no story, so it is picked and stored on its own
    const q = { id: 'q:1', at: '2026-09-21 11:12', name: 'TommyHsu', text: 'go hunt down some animals with your hyenas friends' };
    expect(loadQuote('2026-09-21')).toBeNull();
    saveQuote('2026-09-21', q);
    expect(loadQuote('2026-09-21')).toEqual(q);
    expect(loadQuote('2026-09-14')).toBeNull();

    expect(quoteSection(q)).toBe('"TommyHsu: go hunt down some animals with your hyenas friends"');
    expect(quoteSection(null)).toBeNull();
    expect(quoteSection({ text: 'no speaker' })).toBeNull();

    saveQuote('2026-09-21', null);
    expect(loadQuote('2026-09-21')).toBeNull();
  });

  it('round-trips drafts through storage, per week', async () => {
    const { loadDrafts, saveDrafts } = await import('../lib/news/storyDesk');
    saveDrafts('2026-09-14', { 'm:patch': { headline: 'H', body: 'B', quoteKeys: [] } });
    expect(loadDrafts('2026-09-14')).toEqual({ 'm:patch': { headline: 'H', body: 'B', quoteKeys: [] } });
    expect(loadDrafts('2026-09-07')).toEqual({});
    localStorage.setItem('desk_drafts_2026-09-14', '{{{');
    expect(loadDrafts('2026-09-14')).toEqual({});
  });

  it('round-trips picks through storage, per week, and survives bad json', () => {
    savePicks('2026-09-14', { 'm:patch': 'lead' });
    expect(loadPicks('2026-09-14')).toEqual({ 'm:patch': 'lead' });
    expect(loadPicks('2026-09-07')).toEqual({});
    localStorage.setItem('desk_picks_2026-09-14', 'not json');
    expect(loadPicks('2026-09-14')).toEqual({});
  });

  it('prefers lines the room reacted to, and never a wall of text or a link', () => {
    const wall = 'If you are just playing 4v4 for fun, just go Orc or Undead. Sure, Human is broken as hell, so it is easy to just expand and pump up your MMR with sheer economy, which is why the ladder looks like it does.';
    const c = {
      lines: [
        { name: 'OP3N', text: 'If replays are unavailable, how is the mods watching them?' },
        { name: 'UFO', text: 'lol' },
        { name: 'x', text: 'k' },
        { name: 'zairongliu', text: wall },
        { name: 'BsK', text: 'New patch Stream: https://www.twitch.tv/aaabsk' },
        { name: 'y', text: 'this one is long enough to count but nobody laughed at it' },
      ],
    };
    const quotes = pickQuotes(c);
    expect(quotes[0].name).toBe('OP3N');
    const texts = quotes.map((q) => q.text);
    expect(texts).not.toContain('k');
    // A paste that happened to get a laugh is still not a pull-quote
    expect(texts).not.toContain(wall);
    expect(texts.some((t) => t.includes('twitch.tv'))).toBe(false);
  });

  it('composes a picked story into its digest item, quotes and all', () => {
    const c = {
      id: 'm:replays', kind: 'theme', term: 'replays', why: '9 messages',
      lines: [
        { at: '2026-09-15 20:09', name: 'OP3N', tag: 'OP3N#11598', text: 'why is replays not working? It freezes every time' },
        { at: '2026-09-15 21:52', name: 'FrostMan', tag: 'FrostMan#11411', text: 'how do u report if u cant dl replay?' },
        { at: '2026-09-15 20:21', name: 'UFO', tag: 'UFO#11214', text: 'ok' },
      ],
    };
    let draft = startDraft(c);
    // The good lines start selected, the two-letter one does not
    expect(draft.quotes).toHaveLength(2);
    expect(hasQuote(draft, c.lines[0])).toBe(true);
    expect(hasQuote(draft, c.lines[2])).toBe(false);

    expect(isReady(draft)).toBe(false);
    draft = { ...draft, headline: 'The Patch Broke Replays', body: 'Replays stopped downloading.' };
    expect(isReady(draft)).toBe(true);

    const item = composeItem(c, draft);
    expect(item).toContain('The Patch Broke Replays | Replays stopped downloading.');
    expect(item).toContain('"OP3N: why is replays not working? It freezes every time"');
    expect(item).not.toContain('UFO');

    draft = toggleQuote(draft, c.lines[0]);
    expect(composeItem(c, draft)).not.toContain('OP3N');

    const sections = composedSections([c], { 'm:replays': 'lead' }, { 'm:replays': draft });
    expect(sections.DRAMA).toContain('The Patch Broke Replays');
    // Highlights are no longer a slot: an issue is one lead and three briefs
    expect(sections.HIGHLIGHTS).toBeUndefined();
    // Nothing is written until a story has both a headline and a body
    expect(composedSections([c], { 'm:replays': 'lead' }, {})).toEqual({});
    expect(pickedTags([c], { 'm:replays': 'lead' })).toEqual(['FrostMan#11411', 'OP3N#11598', 'UFO#11214']);

    // A quote found by searching the archive carries its own text and tag
    const outside = { at: '2026-09-18 02:21', name: 'NotEra', tag: 'NotEra#1199', text: 'what other choice to i have but to go bnet' };
    const widened = toggleQuote(draft, outside);
    expect(composeItem(c, widened)).toContain('"NotEra: what other choice to i have but to go bnet"');
    expect(pickedTags([c], { 'm:replays': 'lead' }, { 'm:replays': widened })).toContain('NotEra#1199');
    expect(inSlot([c], { 'm:replays': 'lead' }, 'lead')).toHaveLength(1);
  });

  it('splices sections into a digest without disturbing the others', () => {
    const digest = [
      'TOPICS: patch 3.0, replays',
      'DRAMA: Old Lead | the old story',
      'RECAP: a quiet week',
      'MENTIONS: OP3N#11598',
    ].join('\n');

    const out = applyToDigest(digest, { DRAMA: 'New Lead | the new story', HIGHLIGHTS: 'A Brief | something lighter' });
    const lines = out.split('\n');
    expect(lines[0]).toBe('TOPICS: patch 3.0, replays');
    expect(lines).toContain('DRAMA: New Lead | the new story');
    expect(lines).not.toContain('DRAMA: Old Lead | the old story');
    expect(lines).toContain('RECAP: a quiet week');
    expect(lines).toContain('MENTIONS: OP3N#11598');
    // A section that was not there lands right after TOPICS
    expect(lines[1]).toBe('HIGHLIGHTS: A Brief | something lighter');

    // An empty value deletes the section rather than leaving a stub
    const dropped = applyToDigest(digest, { DRAMA: '' });
    expect(dropped.split('\n').some((l) => l.startsWith('DRAMA:'))).toBe(false);
    expect(dropped).toContain('RECAP: a quiet week');
  });

  it('defaults the desk to the last complete Monday week', () => {
    expect(mondayOf('2026-09-20')).toBe('2026-09-14');  // a Sunday
    expect(mondayOf('2026-09-14')).toBe('2026-09-14');  // a Monday
    // Friday 2026-09-25 sits in the week of the 21st, so the last full one is the 14th
    expect(lastCompleteWeek(new Date('2026-09-25T12:00:00Z'))).toBe('2026-09-14');
  });
});

describe('story detectors', () => {
  it('scores a two-hander the room laughed at above quiet chatter', () => {
    const rows = [];
    for (let i = 0; i < 20; i++) {
      rows.push(msg(`a${i}`, `2026-09-14 10:0${Math.floor(i / 4)}:0${i % 4}`, i % 2 ? 'Ivan' : 'Tepixx', 'you are shit at this game'));
    }
    rows.push(msg('a99', '2026-09-14 10:04:50', 'Watcher', 'lol'));
    // A separate, slow, unremarkable run an hour later
    for (let i = 0; i < 10; i++) {
      rows.push(msg(`b${i}`, `2026-09-14 12:0${i}:00`, `P${i}`, 'gg'));
    }
    const threads = findThreads(rows, { minMessages: 5 });
    expect(threads).toHaveLength(2);
    expect(threads[0].cast).toBe(3);
    expect(threads[0].twoHanderPct).toBeGreaterThan(80);
    expect(threads[0].laughs).toBe(1);
    expect(threads[0].score).toBeGreaterThan(threads[1].score);
    expect(threads[0].why).toContain('people');
  });

  it('finds a term that ran above baseline and ignores one person repeating himself', () => {
    const week = [];
    // Eight different people mention replays
    for (let i = 0; i < 8; i++) week.push(msg(`w${i}`, `2026-09-1${4 + (i % 6)} 10:00:0${i}`, `P${i}`, 'replays broken again'));
    // One person says "banana" just as often
    for (let i = 0; i < 8; i++) week.push(msg(`s${i}`, `2026-09-15 11:00:0${i}`, 'Solo', 'banana banana'));
    const baseline = [];
    for (let i = 0; i < 400; i++) baseline.push(msg(`b${i}`, '2026-08-20 10:00:00', `Q${i % 30}`, 'gg wp nice game'));

    const themes = findThemes(week, baseline, { minMessages: 4, minSpeakers: 6 });
    const terms = themes.map((t) => t.term);
    expect(terms).toContain('replays');
    expect(terms).not.toContain('banana');
    const replays = themes.find((t) => t.term === 'replays');
    expect(replays.people).toBe(8);
    expect(replays.score).toBeGreaterThan(1.5);
    expect(replays.why).toContain('the last 4 weeks');
  });

  it('ignores non-English filler, which swings with who is online and fakes a spike', () => {
    const week = [];
    // A real topic: eight people talking about the same thing
    for (let i = 0; i < 8; i++) week.push(msg(`w${i}`, `2026-09-1${4 + (i % 6)} 10:00:0${i}`, `P${i}`, 'forsaken paladin again'));
    // German chat from seven people the same week: filler, not a story
    for (let i = 0; i < 8; i++) week.push(msg(`g${i}`, `2026-09-1${4 + (i % 3)} 11:00:0${i}`, `G${i % 7}`, 'ich habe das noch nicht auch'));
    const baseline = [];
    for (let i = 0; i < 400; i++) baseline.push(msg(`b${i}`, '2026-08-20 10:00:00', `Q${i % 30}`, 'gg wp nice game'));

    const terms = findThemes(week, baseline, { minMessages: 4, minSpeakers: 6 }).map((t) => t.term);
    expect(terms).toContain('forsaken');
    for (const filler of ['noch', 'nicht', 'auch', 'habe', 'das', 'ich']) {
      expect(terms).not.toContain(filler);
    }
  });

  it('returns nothing rather than throwing on an empty week', () => {
    expect(findThreads([])).toEqual([]);
    expect(findThemes([], [])).toEqual([]);
  });
});

describe('subjects and people', () => {
  const msg = (id, at, name, text, tag = `${name}#1`) => ({
    id, received_at: at, user_name: name, battle_tag: tag, message: text,
  });

  it('marks a term that is a player name, including a nickname and a non-talker', () => {
    const week = [];
    // A real subject: eight people arguing about the pause button
    for (let i = 0; i < 8; i++) week.push(msg(`p${i}`, `2026-09-2${1 + (i % 6)} 10:00:0${i}`, `P${i}`, 'pause abuse again'));
    // A player's nickname: Mikauzora plays, people call him mika
    for (let i = 0; i < 8; i++) week.push(msg(`m${i}`, `2026-09-2${1 + (i % 6)} 11:00:0${i}`, `Q${i}`, 'mika tower maxing'));
    // Someone discussed who never typed a word all week
    for (let i = 0; i < 8; i++) week.push(msg(`d${i}`, `2026-09-2${1 + (i % 6)} 12:00:0${i}`, `R${i}`, 'dharma asked to wait'));

    const baseline = [];
    for (let i = 0; i < 400; i++) baseline.push(msg(`b${i}`, '2026-08-25 10:00:00', `Z${i % 30}`, 'gg wp nice game'));

    const themes = findThemes(week, baseline, {
      minMessages: 4,
      minSpeakers: 6,
      // Mikauzora spoke; Dharma only ever played
      playerTags: ['Mikauzora#2821', 'Dharma#11729'],
    });
    const by = Object.fromEntries(themes.map((t) => [t.term, t.subject]));
    expect(by.pause).toBe('topic');
    expect(by.mika).toBe('player');
    expect(by.dharma).toBe('player');
  });
});

describe('reading the computed numbers back', () => {
  it('turns a stat line, a spectrum and a rankings line into something drawable', async () => {
    const { readStatLine, readSpectrum, readRankings } = await import('../lib/news/storyDesk');

    expect(readStatLine('CNYerou#3494[HU] +239 MMR (17W-6L) WLWWL')).toEqual({
      battleTag: 'CNYerou#3494', name: 'CNYerou', race: 'HU',
      headline: '+239 MMR', wins: 17, losses: 6, form: 'WLWWL',
    });
    // Hero slayer carries no race tag and no form string
    expect(readStatLine('Solana#21903 280 hero kills (90W-72L)')).toMatchObject({
      name: 'Solana', race: null, headline: '280 hero kills', form: '',
    });
    expect(readStatLine('not a stat line')).toBeNull();

    expect(readSpectrum('W:3=105,4=88|L:3=95')).toEqual({
      win: [{ len: 3, count: 105 }, { len: 4, count: 88 }],
      loss: [{ len: 3, count: 95 }],
    });
    expect(readSpectrum('')).toBeNull();

    const ranks = readRankings('1. CNYerou#3494 +239 MMR (17W-6L); 2. Sal#12254 -109 MMR (10W-20L)');
    expect(ranks).toHaveLength(2);
    expect(ranks[0]).toMatchObject({ name: 'CNYerou', mmrChange: 239 });
    expect(ranks[1]).toMatchObject({ name: 'Sal', mmrChange: -109 });
    expect(readRankings('')).toEqual([]);
  });
});

describe('a card week', () => {
  it('splits form by day, carries MMR, and finds the run that earned the card', async () => {
    const { readDaily, readMmr, findRun } = await import('../lib/news/storyDesk');

    expect(readDaily('WINNER=Mon:WLW|Tue:LL;HOTSTREAK=Wed:WWWW')).toEqual({
      WINNER: [{ day: 'Mon', form: 'WLW' }, { day: 'Tue', form: 'LL' }],
      HOTSTREAK: [{ day: 'Wed', form: 'WWWW' }],
    });
    expect(readDaily('')).toEqual({});

    expect(readMmr('WINNER=1842,LOSER=1520')).toEqual({ WINNER: 1842, LOSER: 1520 });
    expect(readMmr('WINNER=0')).toEqual({});

    // A 10-win run inside a long week, which a flat dot strip hides
    const form = 'WLLWLWWLWWWWWWWWWWLW';
    expect(findRun(form, 'W', 10)).toEqual({ start: 8, end: 18 });
    expect(findRun(form, 'W', 12)).toBeNull();
    expect(findRun('', 'W', 3)).toBeNull();
  });
});

describe('what counts as a subject', () => {
  const msg = (id, at, name, text) => ({ id, received_at: at, user_name: name, battle_tag: `${name}#1`, message: text });
  const spread = (word, prefix) => {
    const out = [];
    for (let i = 0; i < 8; i++) out.push(msg(`${prefix}${i}`, `2026-09-2${1 + (i % 6)} 1${i % 9}:00:00`, `P${prefix}${i}`, `${word} again today`));
    return out;
  };

  it('keeps the words this ladder argues with, and drops the ones it argues in', () => {
    const week = [
      ...spread('pause', 'a'),
      ...spread('report', 'b'),   // the whole lead for the week of Sep 14
      ...spread('noob', 'c'),     // mood, not a subject
      ...spread('sucking', 'd'),
      ...spread('fais', 'e'),     // French filler
    ];
    const baseline = [];
    for (let i = 0; i < 400; i++) baseline.push(msg(`z${i}`, '2026-08-25 10:00:00', `Z${i % 30}`, 'anyone searching'));

    const terms = findThemes(week, baseline, { minMessages: 4, minSpeakers: 6 }).map((t) => t.term);
    // How the room argues about its own rules
    expect(terms).toContain('pause');
    expect(terms).toContain('report');
    // How it insults each other, which spikes with mood rather than subject
    expect(terms).not.toContain('noob');
    expect(terms).not.toContain('sucking');
    expect(terms).not.toContain('fais');
  });
});

describe('finding the lines worth printing', () => {
  const msg = (id, at, name, text) => ({ id, received_at: at, user_name: name, battle_tag: `${name}#1`, message: text });

  it('takes lines the room laughed at, and refuses pastes, links and reactions', async () => {
    const { findQuotes } = await import('../../server/src/storyCandidates.js');
    const wall = 'x'.repeat(200);
    const rows = [
      msg('1', '2026-09-21 11:12:00', 'TommyHsu', 'go hunt down some animals with your hyenas friends'),
      msg('2', '2026-09-21 11:12:30', 'Compre', 'lol'),
      msg('3', '2026-09-21 11:12:40', 'Blue', 'hahaha'),
      msg('4', '2026-09-21 12:00:00', 'BsK', 'New patch stream: https://www.twitch.tv/aaabsk'),
      msg('5', '2026-09-21 12:00:20', 'Anica', 'lol'),
      msg('6', '2026-09-21 13:00:00', 'zairongliu', wall),
      msg('7', '2026-09-21 13:00:20', 'Sal', 'lmao'),
      msg('8', '2026-09-21 14:00:00', 'Quiet', 'a perfectly good line nobody reacted to'),
      // Laughing at yourself does not count
      msg('9', '2026-09-21 15:00:00', 'Solo', 'this line is long enough to be quotable'),
      msg('10', '2026-09-21 15:00:10', 'Solo', 'lol'),
    ];
    const quotes = findQuotes(rows);
    expect(quotes).toHaveLength(1);
    expect(quotes[0]).toMatchObject({ name: 'TommyHsu', laughs: 2 });
    expect(quotes[0].who.sort()).toEqual(['Blue', 'Compre']);

    const texts = quotes.map((q) => q.text);
    expect(texts.some((t) => t.includes('twitch.tv'))).toBe(false);
    expect(texts).not.toContain(wall);
    expect(texts).not.toContain('a perfectly good line nobody reacted to');
  });
});

describe('pairs, upsets and feats', () => {
  const match = (id, date, map, t1, t2, won, a1 = 1500, a2 = 1500) => ({
    match_id: id, date, map_name: `(4)${map}`,
    team1_tags: t1.join(','), team2_tags: t2.join(','),
    team1_won: won ? 1 : 0, team1_avg_mmr: a1, team2_avg_mmr: a2,
  });

  it('finds who queues together and what their record is', async () => {
    const { stacksFrom } = await import('../../server/src/weeklyStats.js');
    const ms = [];
    // A pair losing together six times is a better line than a pair winning once
    for (let i = 0; i < 6; i++) ms.push(match(`m${i}`, '2026-09-21', 'Ferocity', ['A#1', 'B#2', 'C#3', 'D#4'], ['E#5', 'F#6', 'G#7', 'H#8'], i < 2));
    const players = new Map([['A#1', { name: 'Ana', currentMmr: 1600 }], ['B#2', { name: 'Bo', currentMmr: 1400 }]]);
    const out = stacksFrom(ms, players, { minGames: 6, limit: 1 });
    expect(out[0]).toContain('Ana + Bo');
    expect(out[0]).toContain('(2-stack, avg 1500 MMR)');
    expect(out[0]).toContain('2W-4L 33%');
    // Nobody played enough together
    expect(stacksFrom(ms, players, { minGames: 20 })).toEqual([]);
  });

  it('takes the widest gap a losing side overturned, and nothing under the floor', async () => {
    const { upsetFrom } = await import('../../server/src/weeklyStats.js');
    const ms = [
      // Favourites won: not an upset however big the gap
      match('a', '2026-09-21', 'Ferocity', ['A#1'], ['B#2'], true, 1900, 1500),
      // Underdogs won by 250
      match('b', '2026-09-22', 'Snowblind', ['C#3'], ['D#4'], true, 1600, 1850),
      // Underdogs won by more
      match('c', '2026-09-23', 'GoldRush', ['E#5'], ['F#6'], false, 1900, 1550),
    ];
    const out = upsetFrom(ms, { minGap: 100 });
    expect(out).toContain('on GoldRush');
    expect(out).toContain('350 MMR gap');
    expect(out).toContain('beat favorites (avg 1900 MMR)');
    expect(upsetFrom(ms, { minGap: 500 })).toBeNull();
  });

  it('reads a feats line back, pulling out the match id to link', async () => {
    const { readFeats } = await import('../lib/news/storyDesk');
    const out = readFeats('Longest game: 71 minutes on Ferocity 6ab472481c8e357435620307; Biggest day: Ana +120 MMR on the Saturday');
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ text: 'Longest game: 71 minutes on Ferocity', matchId: '6ab472481c8e357435620307' });
    // Not everything has a match behind it
    expect(out[1]).toEqual({ text: 'Biggest day: Ana +120 MMR on the Saturday', matchId: null });
    expect(readFeats('')).toEqual([]);
  });
});

describe('what may be printed big', () => {
  const at = (n) => `2026-09-21 11:${String(n).padStart(2, '0')}:00`;
  const say = (i, name, text) => ({ id: `q${i}`, received_at: at(i), user_name: name, battle_tag: `${name}#1`, message: text });
  // Two other people laughing, so the line itself is what decides
  const withLaughs = (i, name, text) => [say(i, name, text), say(i + 1, 'Bystander', 'lol'), say(i + 2, 'Another', 'haha')];

  it('refuses abuse at any score, because this goes on the front page', async () => {
    const { findQuotes } = await import('../../server/src/storyCandidates.js');
    const rows = [
      ...withLaughs(10, 'Fine', 'pretty much like a bunch of dogs attacking a deer'),
      ...withLaughs(20, 'Slur', 'u sound like a completely desperate fag mate'),
      ...withLaughs(30, 'Abl', 'he is pinging like a retard again'),
    ];
    const texts = (await Promise.resolve(findQuotes(rows))).map((q) => q.text);
    expect(texts).toContain('pretty much like a bunch of dogs attacking a deer');
    expect(texts.some((t) => /fag|retard/i.test(t))).toBe(false);
  });

  it('applies the rest of the criteria: no self-regard, no bare insult, no monologue', async () => {
    const { findQuotes } = await import('../../server/src/storyCandidates.js');
    const rows = [
      ...withLaughs(10, 'Ego', 'levels : 500mmr - 1000mmr - 1500mmr - pros - me'),
      ...withLaughs(20, 'Rude', 'you are a noob'),
      // Four lines from one speaker with no reply: a fragment, not a quote
      say(30, 'Solo', 'first thing he said here'),
      say(31, 'Solo', 'second thing he said here'),
      say(32, 'Solo', 'third thing he said here'),
      ...withLaughs(33, 'Solo', 'the fourth thing he said here'),
      ...withLaughs(40, 'Good', 'he tp d out of his own base and left us to it'),
    ];
    const texts = findQuotes(rows).map((q) => q.text);
    expect(texts).toContain('he tp d out of his own base and left us to it');
    expect(texts.some((t) => t.includes('500mmr'))).toBe(false);
    expect(texts).not.toContain('you are a noob');
    expect(texts).not.toContain('the fourth thing he said here');
  });

  it('lifts a turn of phrase above a plainer line with the same laughs', async () => {
    const { findQuotes } = await import('../../server/src/storyCandidates.js');
    const rows = [
      ...withLaughs(10, 'Plain', 'he went and lost his hero to the militia'),
      ...withLaughs(20, 'Vivid', 'it was like a bunch of dogs attacking a deer out there'),
    ];
    const quotes = findQuotes(rows);
    expect(quotes[0].name).toBe('Vivid');
    expect(quotes[0].imagery).toBe(true);
    expect(quotes[0].score).toBeGreaterThan(quotes[1].score);
  });
});

describe('digging into a quote', () => {
  it('carries the conversation either side, with the line itself marked', async () => {
    const { findQuotes } = await import('../../server/src/storyCandidates.js');
    const at = (n) => `2026-09-21 11:${String(n).padStart(2, '0')}:00`;
    const say = (i, name, text) => ({ id: `q${i}`, received_at: at(i), user_name: name, battle_tag: `${name}#1`, message: text });
    const rows = [
      say(1, 'PEEN1E', 'show me on the doll which part was serious'),
      say(2, 'lumos', 'took you a while to think of that one'),
      say(3, 'lumos', 'what took you so long? had to google it?'),
      say(4, 'Watcher', 'lol'),
      say(5, 'Other', 'hahaha'),
      say(6, 'PEEN1E', 'very funny'),
    ];
    const [q] = findQuotes(rows);
    expect(q.text).toBe('what took you so long? had to google it?');

    // You cannot judge that line without seeing who it was aimed at
    const texts = q.context.map((l) => l.text);
    expect(texts).toContain('show me on the doll which part was serious');
    expect(texts).toContain('very funny');
    const marked = q.context.filter((l) => l.isQuote);
    expect(marked).toHaveLength(1);
    expect(marked[0].name).toBe('lumos');
  });
});

describe('what the older issues had', () => {
  // Seconds apart, so a reaction lands inside the two-minute window
  const say = (i, name, text, tag) => ({
    id: `b${i}`, received_at: `2026-09-21 10:00:${String(i * 5).padStart(2, '0')}`,
    user_name: name, battle_tag: tag || `${name}#1`, message: text,
  });

  it('takes a moderation verdict and ignores an opinion about one', async () => {
    const { bansFrom } = await import('../../server/src/weeklyStats.js');
    const rows = [
      say(1, 'lumos', 'xlrenxuanwei#3229 early leave ✅ accepted, 7 days'),
      say(2, 'vitruviuss', 'vitruviuss#2898 pause abuse accepted, 1 days'),
      // Opinions, not verdicts
      say(3, 'Magnus', 'he should be banned for grief'),
      say(4, 'BogaSyn', 'please get him banned and report'),
      // The same verdict pasted twice is still one ban
      say(5, 'JayZ', 'xlrenxuanwei#3229 early leave ✅ accepted, 7 days'),
    ];
    const bans = bansFrom(rows);
    expect(bans).toEqual(['xlrenxuanwei#3229 7d early leave', 'vitruviuss#2898 1d pause abuse']);
  });

  it('gives a card the player\'s own line first, then one about them', async () => {
    const { quotesForPlayers } = await import('../../server/src/storyCandidates.js');
    const rows = [
      say(1, 'Other', 'lacoste went and lost his hero to the militia again'),
      say(2, 'Watcher', 'lol'),
      say(3, 'Someone', 'haha'),
      say(4, 'Lacoste', 'i had three bases and still nothing to show for it'),
      say(5, 'Watcher', 'lmao'),
      say(6, 'Someone', 'haha'),
    ];
    const out = quotesForPlayers(rows, ['Lacoste#22218']);
    const lines = out['Lacoste#22218'] || [];
    expect(lines).toHaveLength(2);
    // What he said himself leads; what was said about him follows
    expect(lines[0].name).toBe('Lacoste');
    expect(lines[1].text).toContain('lost his hero');
    expect(quotesForPlayers(rows, [])).toEqual({});
  });
});

describe('the hero slayer field', () => {
  it('collects the losing side\'s heroes, and only from the record game', async () => {
    // Shape of what heroSlayerFrom builds: the opposing roster for one match
    const rows = [
      { match_id: 'rec', battle_tag: 'TommyHsu#1', heroes: '[{"icon":"paladin"},{"icon":"sorceror"}]' },
      { match_id: 'rec', battle_tag: 'Dharma#2', heroes: '[{"icon":"blademaster"}]' },
      // His own heroes are not the field
      { match_id: 'rec', battle_tag: 'kiggatroon#3', heroes: '[{"icon":"lich"}]' },
      // A different game entirely
      { match_id: 'other', battle_tag: 'TommyHsu#1', heroes: '[{"icon":"archmage"}]' },
      // A row whose heroes will not parse must not take the rest down
      { match_id: 'rec', battle_tag: 'Magnus#4', heroes: 'not json' },
    ];
    const against = new Set(['TommyHsu#1', 'Dharma#2', 'Magnus#4']);
    const field = [];
    for (const r of rows) {
      if (r.match_id !== 'rec' || !against.has(r.battle_tag) || !r.heroes) continue;
      try {
        for (const h of JSON.parse(r.heroes) || []) if (h?.icon) field.push(h.icon);
      } catch { /* skipped */ }
    }
    expect(field).toEqual(['paladin', 'sorceror', 'blademaster']);
    expect(field).not.toContain('lich');
    expect(field).not.toContain('archmage');
  });
});
