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

  it('keeps one lead at a time and clears a slot when it is picked twice', () => {
    let picks = assign({}, 'm:patch', 'lead');
    expect(picks).toEqual({ 'm:patch': 'lead' });
    picks = assign(picks, 't:99', 'lead');
    // Taking the lead releases whoever had it
    expect(picks).toEqual({ 't:99': 'lead' });
    picks = assign(picks, 't:99', 'brief');
    expect(picks).toEqual({ 't:99': 'brief' });
    picks = assign(picks, 't:99', 'brief');
    expect(picks).toEqual({});
    expect(SLOTS.map((s) => s.key)).toEqual(['lead', 'brief', 'highlight']);
    // Labels name the section a reader sees, so promoting says where it lands
    expect(SLOTS.map((s) => s.label)).toEqual(['Top story', 'Also this week', 'Highlight']);
    // Only the top story is capped
    expect(SLOTS.filter((s) => s.max === 1).map((s) => s.key)).toEqual(['lead']);
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
