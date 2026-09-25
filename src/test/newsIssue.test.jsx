import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  SECTION_RULES, longestRun, spotlightVerdict, streakDistributionVerdict, newBloodPasses, stackPasses,
  issueNumber, issueTitle, issueDateRange, neighbourIssues, dayByDay, keyNumbers,
} from '../lib/news/issueRules';
import { issueCountLabel } from '../pages/News';
import IssueCover from '../components/news/IssueCover';
import { LedeSection, QuoteOfWeek, DayByDay, IssueNav, LeftOut } from '../components/news/IssueParts';
import { quoteOfTheDay } from '../lib/home/quoteOfTheDay';
import { formatWeekRange } from '../lib/digestUtils';

const weeklies = [
  { week_start: '2026-03-23', week_end: '2026-03-29', digest: 'DRAMA: Instagram Wars | CaSpEND lost it "CaSpEND: he ignore chat"' },
  { week_start: '2026-03-16', week_end: '2026-03-22', digest: "DRAMA: Lacoste's Naga Orc Era | Lacoste went Naga" },
  { week_start: '2026-03-09', week_end: '2026-03-15', digest: 'RECAP: quiet week' },
];

const renderIn = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
afterEach(cleanup);

describe('issue rules', () => {
  it('finds the longest run in a form string', () => {
    expect(longestRun('WWLWWWWWWWWWWWWWWWWWWLW')).toEqual({ length: 18, result: 'W' });
    expect(longestRun('LLWL')).toEqual({ length: 2, result: 'L' });
    expect(longestRun('')).toEqual({ length: 0, result: null });
  });

  it('lets a spotlight through on a 10+ streak, ±120 MMR or 150+ games, and explains a miss', () => {
    expect(spotlightVerdict({ form: 'WWWWWWWWWWL', mmrChange: 40, wins: 10, losses: 1 }, 'WINNER').pass).toBe(true);
    expect(spotlightVerdict({ form: 'WLWL', mmrChange: -130, wins: 2, losses: 2 }, 'LOSER').pass).toBe(true);
    expect(spotlightVerdict({ form: 'WLWL', mmrChange: 10, wins: 80, losses: 75 }, 'GRINDER').pass).toBe(true);
    const miss = spotlightVerdict({ form: 'WLWLWWL', mmrChange: 30, wins: 4, losses: 3 }, 'WINNER');
    expect(miss.pass).toBe(false);
    expect(miss.reason).toBe(`longest 2, +30 MMR, 7 games (needs ${SECTION_RULES.spotlightStreak}+ streak, ±${SECTION_RULES.spotlightNet} MMR or ${SECTION_RULES.spotlightGames}+ games)`);
    expect(spotlightVerdict({ streakLength: 12, form: '' }, 'HOTSTREAK').pass).toBe(true);
    expect(spotlightVerdict({ headline: '95 hero kills' }, 'HEROSLAYER').pass).toBe(true);
    expect(spotlightVerdict(null, 'WINNER').pass).toBe(false);
  });

  it('shows the streak distribution only once someone hit 8, and gates newcomers and stacks by games', () => {
    expect(streakDistributionVerdict({ win: [{ len: 3 }, { len: 9 }], loss: [{ len: 4 }] }).pass).toBe(true);
    expect(streakDistributionVerdict({ win: [{ len: 5 }], loss: [{ len: 7 }] })).toEqual({ pass: false, reason: 'longest streak only 7 (needs 8)' });
    expect(streakDistributionVerdict(null).pass).toBe(false);
    expect(newBloodPasses({ games: 20 })).toBe(true);
    expect(newBloodPasses({ games: 9 })).toBe(false);
    expect(stackPasses({ wins: 4, losses: 2 })).toBe(true);
    expect(stackPasses({ wins: 3, losses: 2 })).toBe(false);
  });

  it('numbers issues from the oldest week, titles them from the DRAMA headline and formats the range', () => {
    expect(issueNumber(weeklies, '2026-03-23')).toBe(3);
    expect(issueNumber(weeklies, '2026-03-09')).toBe(1);
    expect(issueNumber(weeklies, '2020-01-01')).toBeNull();
    expect(issueTitle(weeklies[0])).toBe('Instagram Wars');
    expect(issueTitle(weeklies[2])).toBe(formatWeekRange('2026-03-09', '2026-03-15'));
    expect(issueDateRange(weeklies[0])).toBe('MAR 23 – 29, 2026');
    expect(issueDateRange({ week_start: '2026-02-23', week_end: '2026-03-01' })).toBe('FEB 23 – MAR 1, 2026');
    expect(neighbourIssues(weeklies, '2026-03-16')).toEqual({ prev: weeklies[2], next: weeklies[0] });
    expect(neighbourIssues(weeklies, '2026-03-23')).toEqual({ prev: weeklies[1], next: null });
    expect(issueCountLabel(weeklies)).toEqual({ count: 3, label: 'ISSUES SINCE MAR 2026' });
    expect(issueCountLabel([])).toBeNull();
  });

  it("turns the week's daily digests into dated one-liners, oldest first", () => {
    const dailies = [
      { date: '2026-03-24', digest: 'DRAMA: CaSpEND rage-quit after Mogul went AFK "CaSpEND: 1 lvl harras"' },
      { date: '2026-03-23', digest: 'HIGHLIGHTS: Serein won his first six of the week' },
      { date: '2026-03-30', digest: 'DRAMA: next week' },
      { date: '2026-03-25', digest: '' },
    ];
    expect(dayByDay(dailies, '2026-03-23', '2026-03-29')).toEqual([
      { date: '2026-03-23', dow: 'MON', label: 'Mar 23', text: 'Serein won his first six of the week' },
      { date: '2026-03-24', dow: 'TUE', label: 'Mar 24', text: 'CaSpEND rage-quit after Mogul went AFK' },
    ]);
    expect(dayByDay(null, '2026-03-23', '2026-03-29')).toEqual([]);
  });

  it('builds the key numbers from the week stats, not the spotlight cards', () => {
    const stats = '{"totalGames": 1288, "totalPlayers": 567, "totalMessages": 18896, "busiestDayGames": 262, "busiestDay": "Sat"}';
    expect(keyNumbers({ weekly: { stats } })).toEqual([
      { value: '1,288', label: 'GAMES PLAYED', tone: 'white' },
      { value: '567', label: 'PLAYERS', tone: 'white' },
      { value: '18,896', label: 'CHAT MESSAGES', tone: 'white' },
      { value: '262', label: 'BUSIEST DAY, SAT', tone: 'gold' },
    ]);
    // Streak lengths and upsets have their own cards further down the issue
    expect(keyNumbers({ weekly: {} })).toEqual([]);
    expect(keyNumbers({ weekly: { stats: '{"totalGames": 12}' } })).toEqual([
      { value: '12', label: 'GAMES PLAYED', tone: 'white' },
    ]);
  });

  it('picks the quote of the week from BEST_OF_CHAT only', () => {
    const weekly = { digest: 'DRAMA: x "Toast: garbage"\nBEST_OF_CHAT: zoo "GosuXtreme: when u enter 4s u entering a zoo"\nMENTIONS: GosuXtreme#2101' };
    expect(quoteOfTheDay(weekly, { sources: ['BEST_OF_CHAT'] })).toMatchObject({ text: 'when u enter 4s u entering a zoo', speaker: 'GosuXtreme', battleTag: 'GosuXtreme#2101' });
    expect(quoteOfTheDay({ digest: 'DRAMA: x "Toast: garbage"' }, { sources: ['BEST_OF_CHAT'] })).toBeNull();
  });
});

describe('issue components', () => {
  it('renders the latest cover with kicker, number, title and range, and grid covers with the number top right', () => {
    renderIn(<IssueCover weekly={weeklies[0]} issueNo={14} variant="latest" />);
    const latest = document.querySelector('[data-issue="2026-03-23"]');
    expect(latest).toHaveAttribute('href', '/news?week=2026-03-23');
    expect(latest).toHaveTextContent('LATEST ISSUE');
    expect(latest).toHaveTextContent('No. 14');
    expect(latest).toHaveTextContent('Instagram Wars');
    expect(latest).toHaveTextContent('MAR 23 – 29, 2026');
    cleanup();
    renderIn(<IssueCover weekly={weeklies[1]} issueNo={13} variant="grid" />);
    const grid = document.querySelector('[data-issue="2026-03-16"]');
    expect(grid).toHaveClass('nw-issue--grid');
    expect(grid).not.toHaveTextContent('LATEST ISSUE');
    expect(grid).toHaveTextContent("Lacoste's Naga Orc Era");
  });

  it('shows the lede beside the numbers, or neither without a story', () => {
    renderIn(<LedeSection recap="A quiet week." numbers={[{ value: '18W', label: 'LONGEST WIN STREAK', tone: 'green' }, { value: '2', label: 'UPSETS' }]} />);
    expect(screen.getByText('A quiet week.')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-key-number]')).toHaveLength(2);
    cleanup();
    renderIn(<LedeSection recap="Only words." numbers={[{ value: '1', label: 'BAN' }]} />);
    expect(document.querySelectorAll('[data-key-number]')).toHaveLength(0);
    cleanup();
    renderIn(<LedeSection recap={null} numbers={[]} />);
    expect(document.querySelector('[data-issue-lede]')).toBeNull();
  });

  it('renders the quote of the week with the speaker linked and faded art, and nothing without a quote', () => {
    renderIn(<QuoteOfWeek quote={{ text: 'zoo', speaker: 'GosuXtreme', battleTag: 'GosuXtreme#2101' }} profile={{ pic: 'https://x/g.jpg' }} context="Best of chat" />);
    expect(screen.getByText('zoo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'GosuXtreme' })).toHaveAttribute('href', '/player/GosuXtreme%232101');
    expect(document.querySelector('.mg-qow-art').style.backgroundImage).toContain('https://x/g.jpg');
    cleanup();
    renderIn(<QuoteOfWeek quote={null} />);
    expect(document.querySelector('[data-quote-of-week]')).toBeNull();
  });

  it('lists the days with links, and the prev / next issues with Out Monday for the latest', () => {
    renderIn(<DayByDay days={[{ date: '2026-03-23', dow: 'MON', label: 'Mar 23', text: 'Quiet Monday.' }]} />);
    expect(document.querySelector('[data-day="2026-03-23"]')).toHaveAttribute('href', '/news?day=2026-03-23');
    expect(screen.getByText('Quiet Monday.')).toBeInTheDocument();
    cleanup();
    renderIn(<IssueNav prev={weeklies[1]} next={null} prevNo={13} nextNo={null} />);
    expect(document.querySelector('[data-issue-prev="2026-03-16"]')).toHaveTextContent('← Previous · No. 13');
    expect(document.querySelector('[data-issue-prev="2026-03-16"]')).toHaveTextContent("Lacoste's Naga Orc Era");
    expect(document.querySelector('[data-issue-next="soon"]')).toHaveTextContent('Out Monday');
    cleanup();
    renderIn(<IssueNav prev={null} next={weeklies[0]} prevNo={null} nextNo={14} />);
    expect(document.querySelector('[data-issue-next="2026-03-23"]')).toHaveTextContent('Next · No. 14 →');
    cleanup();
    renderIn(<LeftOut items={[{ name: 'Streak distribution', reason: 'longest streak only 7 (needs 8)' }]} />);
    expect(screen.getByText('longest streak only 7 (needs 8)')).toBeInTheDocument();
    cleanup();
    renderIn(<LeftOut items={[]} />);
    expect(screen.getByText('Nothing. Every section had a story.')).toBeInTheDocument();
  });
});
