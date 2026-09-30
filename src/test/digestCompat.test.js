import { describe, it, expect } from 'vitest';
import { parseDigestSections, parseStatLine, extractHeadline, extractTeaser } from '../lib/digestUtils';
import { parseDramaFromText, parseHighlightsFromText, parseWeekTrendFromText, parseMostTalkedAboutFromText } from '../lib/useDigestData';
import { keyNumbers } from '../lib/news/issueRules';
import { quoteOfTheDay } from '../lib/home/quoteOfTheDay';

/**
 * Digests already in the database must keep rendering. There are weekly
 * issues back to March 2026 and dailies before July 2026, written by a
 * generator that no longer runs, and their format is the contract: no
 * headlines on sub-stories, no WEEK_TREND, no MOST_TALKED_ABOUT, no quotes
 * on the spotlight cards. See docs/GRAVEYARD.md.
 */

// The shape a March 2026 issue actually has
const OLD_WEEKLY = [
  'TOPICS: instagram wars, CaSpEND, tower rushes',
  'DRAMA: Instagram Wars | CaSpEND lost it at Mogul over an ignored chat "CaSpEND: he ignore chat" "Mogul: cry more"; Serein and Toast argued about expansions for an hour "Serein: you never expo"',
  'HIGHLIGHTS: GosuXtreme summed up the ladder "GosuXtreme: when u enter 4s u entering a zoo"',
  'BEST_OF_CHAT: "GosuXtreme: when u enter 4s u entering a zoo"',
  'RECAP: A loud week on the ladder, with more shouting than usual.',
  'WINNER: Serein#2103[NE] +180 MMR (40W-20L) WLWWL',
  'LOSER: Toast#1187[ORC] -150 MMR (18W-33L)',
  'HOTSTREAK: Mogul#2211[UD] 9W streak +60 MMR (25W-14L)',
  'POWER_RANKINGS: 1. Serein#2103 +180 MMR (40W-20L); 2. Mogul#2211 +60 MMR (25W-14L)',
  'NEW_BLOOD: Newbie#1234 debuted at 1200 MMR (30 games, 50% WR) first:2026-03-23',
  'MENTIONS: CaSpEND#2318,Mogul#2211,Serein#2103,Toast#1187,GosuXtreme#2101,Newbie#1234',
].join('\n');

const OLD_DAILY = [
  'DRAMA: CaSpEND rage-quit after Mogul went AFK "CaSpEND: 1 lvl harras"',
  'HIGHLIGHTS: Serein won his first six of the day',
  'MENTIONS: CaSpEND#2318,Mogul#2211,Serein#2103',
].join('\n');

describe('old digests keep working', () => {
  it('parses a March 2026 weekly, sections and all', () => {
    const secs = parseDigestSections(OLD_WEEKLY);
    expect(secs.map((s) => s.key)).toEqual([
      'TOPICS', 'DRAMA', 'HIGHLIGHTS', 'BEST_OF_CHAT', 'RECAP',
      'WINNER', 'LOSER', 'HOTSTREAK', 'POWER_RANKINGS', 'NEW_BLOOD', 'MENTIONS',
    ]);
    expect(extractHeadline(OLD_WEEKLY)).toBe('Instagram Wars');
    expect(extractTeaser(OLD_WEEKLY)).toContain('CaSpEND lost it at Mogul');
  });

  it('renders sub-stories that never had a headline', () => {
    const secs = parseDigestSections(OLD_WEEKLY);
    const drama = parseDramaFromText(secs);
    expect(drama).toHaveLength(2);
    expect(drama[0].headline).toBe('Instagram Wars');
    // The second item predates per-item headlines and must still carry its text
    expect(drama[1].headline).toBeUndefined();
    expect(drama[1].summary).toBe('Serein and Toast argued about expansions for an hour');
    expect(drama[1].quotes).toEqual([{ speaker: 'Serein', text: 'you never expo' }]);

    const highlights = parseHighlightsFromText(secs);
    expect(highlights[0].headline).toBeUndefined();
    expect(highlights[0].summary).toBe('GosuXtreme summed up the ladder');
  });

  it('treats the sections added later as absent, not broken', () => {
    const secs = parseDigestSections(OLD_WEEKLY);
    expect(parseWeekTrendFromText(secs)).toBeNull();
    expect(parseMostTalkedAboutFromText(secs)).toBeNull();
    // No stats column on an old row either
    expect(keyNumbers({ weekly: { digest: OLD_WEEKLY } })).toEqual([]);
  });

  it('still reads stat lines with and without a trailing form string', () => {
    const secs = parseDigestSections(OLD_WEEKLY);
    const winner = parseStatLine(secs.find((s) => s.key === 'WINNER').content);
    expect(winner).toMatchObject({ battleTag: 'Serein#2103', race: 'NE', mmrChange: 180, wins: 40, losses: 20, form: 'WLWWL' });
    const loser = parseStatLine(secs.find((s) => s.key === 'LOSER').content);
    expect(loser).toMatchObject({ battleTag: 'Toast#1187', mmrChange: -150, form: '' });
    const hot = parseStatLine(secs.find((s) => s.key === 'HOTSTREAK').content);
    expect(hot).toMatchObject({ streakLen: 9, streakType: 'W' });
  });

  it('still finds a quote in an old daily, which has no BEST_OF_CHAT', () => {
    expect(quoteOfTheDay({ digest: OLD_DAILY })).toMatchObject({
      speaker: 'CaSpEND', text: '1 lvl harras', battleTag: 'CaSpEND#2318',
    });
    const secs = parseDigestSections(OLD_DAILY);
    expect(parseDramaFromText(secs)[0].summary).toBe('CaSpEND rage-quit after Mogul went AFK');
  });
});
