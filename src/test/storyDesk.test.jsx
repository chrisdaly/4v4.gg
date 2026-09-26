import { describe, it, expect, beforeEach } from 'vitest';
import { SLOTS, loadPicks, savePicks, assign, inSlot, toSections, pickQuotes, pickedTags } from '../lib/news/storyDesk';
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
  });

  it('round-trips picks through storage, per week, and survives bad json', () => {
    savePicks('2026-09-14', { 'm:patch': 'lead' });
    expect(loadPicks('2026-09-14')).toEqual({ 'm:patch': 'lead' });
    expect(loadPicks('2026-09-07')).toEqual({});
    localStorage.setItem('desk_picks_2026-09-14', 'not json');
    expect(loadPicks('2026-09-14')).toEqual({});
  });

  it('prefers lines the room reacted to when pulling quotes', () => {
    const c = {
      lines: [
        { name: 'OP3N', text: 'If replays are unavailable, how is the mods watching them?' },
        { name: 'UFO', text: 'lol' },
        { name: 'x', text: 'k' },
        { name: 'y', text: 'this one is long enough to count but nobody laughed at it' },
      ],
    };
    const quotes = pickQuotes(c);
    expect(quotes[0].name).toBe('OP3N');
    // "k" is too short to be worth quoting
    expect(quotes.map((q) => q.text)).not.toContain('k');
  });

  it('turns picks into digest sections and collects the tags they touch', () => {
    const candidates = [
      { id: 'm:patch', kind: 'theme', term: 'patch', why: '111 messages', lines: [{ name: 'OP3N', tag: 'OP3N#11598', text: 'why is replays not working at all here' }] },
      { id: 't:1', kind: 'thread', who: [{ name: 'IvanOoze' }, { name: 'Tepixx' }], why: '93 messages', lines: [{ name: 'Tepixx', tag: 'Tepixx#2988', text: 'scores matter? i can creep all game' }] },
    ];
    const picks = { 'm:patch': 'lead', 't:1': 'highlight' };
    const out = toSections(candidates, picks);
    expect(out).toContain('DRAMA: HEADLINE HERE');
    expect(out).toContain('Subject: patch');
    expect(out).toContain('HIGHLIGHTS: HEADLINE HERE');
    expect(out).toContain('Subject: IvanOoze, Tepixx');
    expect(pickedTags(candidates, picks)).toEqual(['OP3N#11598', 'Tepixx#2988']);
    expect(toSections(candidates, {})).toBe('');
    expect(inSlot(candidates, picks, 'lead')).toHaveLength(1);
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

  it('returns nothing rather than throwing on an empty week', () => {
    expect(findThreads([])).toEqual([]);
    expect(findThemes([], [])).toEqual([]);
  });
});
