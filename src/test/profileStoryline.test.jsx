import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import {
  PROFILE_RULES, playerMatchLite, activeStreak, longestWinStreak,
  weeklyMentions, featuredIn, weeklyCounts, inactiveGaps, gapLabel,
} from '../lib/profile/storyline';
import ActivityOverTime from '../components/ActivityOverTime';
import SeasonHistoryBars from '../components/SeasonHistoryBars';

const NOW = new Date('2026-09-25T15:00:00');
const at = (daysAgo, hour = 12) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const lite = (daysAgo, won, delta) => ({ endTime: at(daysAgo), won, delta });

afterEach(cleanup);

describe('storyline helpers', () => {
  it("reads the player's side of a match", () => {
    const match = { endTime: at(0), mapName: '(4)Arathor', teams: [
      { players: [{ battleTag: 'Me#1', won: true, oldMmr: 1800, currentMmr: 1808 }] },
      { players: [{ battleTag: 'Them#1', won: false, oldMmr: 1790, currentMmr: 1782 }] },
    ] };
    expect(playerMatchLite(match, 'me#1')).toEqual({ endTime: at(0), won: true, delta: 8, mapName: '(4)Arathor' });
    expect(playerMatchLite(match, 'nobody#1')).toBeNull();
  });

  it('measures the active streak and the longest win streak', () => {
    const list = [lite(0, true, 8), lite(0, true, 7), lite(1, true, 9), lite(1, false, -8), lite(2, true, 6)];
    expect(activeStreak(list)).toEqual({ length: 3, won: true });
    expect(activeStreak([lite(0, false, -5), lite(1, true, 5)])).toEqual({ length: 1, won: false });
    expect(activeStreak([])).toEqual({ length: 0, won: null });
    // oldest first: W (2d), W then L (1d), W W (today): two runs of 2, the first one reported
    expect(longestWinStreak(list)).toEqual({ length: 2, endTime: at(1) });
    expect(longestWinStreak([lite(0, false, -5)])).toEqual({ length: 0, endTime: null });
  });

  it('finds the issues that feature a player, newest first, with the section and a snippet', () => {
    const weeklies = [
      { week_start: '2026-03-23', digest: 'DRAMA: Instagram Wars | CaSpEND lost it after Mogul went AFK "CaSpEND: bad" \nWINNER: Serein#1[NE] +164 (60W-21L) WWW\nMENTIONS: Serein#1' },
      { week_start: '2026-03-16', digest: 'HIGHLIGHTS: Serein went 13-0 on Tuesday; Someone else did a thing' },
      { week_start: '2026-03-09', digest: 'RECAP: quiet' },
    ];
    const mentions = weeklyMentions(weeklies, 'Serein');
    expect(mentions).toEqual([
      { week_start: '2026-03-23', issueNo: 3, section: 'WINNER', snippet: 'Serein#1[NE] +164 (60W-21L) WWW' },
      { week_start: '2026-03-16', issueNo: 2, section: 'HIGHLIGHTS', snippet: 'Serein went 13-0 on Tuesday' },
    ]);
    expect(featuredIn(weeklies, 'Serein')).toEqual({ week_start: '2026-03-23', issueNo: 3, section: 'WINNER' });
    expect(featuredIn(weeklies, 'Nobody')).toBeNull();
    expect(weeklyMentions(weeklies, 'CaSpEND')[0].snippet).toBe('CaSpEND lost it after Mogul went AFK');
  });

  it('turns day counts into weekly counts and finds inactive stretches of 3+ weeks', () => {
    const dayCounts = { '2026-06-01': 3, '2026-06-03': 2, '2026-07-13': 1, '2026-07-27': 4 };
    const weeks = weeklyCounts(dayCounts, new Date('2026-08-03T12:00:00'));
    // Mondays from Jun 1 to Aug 3: 10 weeks
    expect(weeks).toHaveLength(10);
    expect(weeks.map((w) => w.count)).toEqual([5, 0, 0, 0, 0, 0, 1, 0, 4, 0]);
    expect(inactiveGaps(weeks)).toEqual([{ from: 1, to: 5, weeks: 5 }]);
    expect(inactiveGaps(weeks, 2)).toEqual([{ from: 1, to: 5, weeks: 5 }]);
    expect(weeklyCounts({}, NOW)).toEqual([]);
    expect(gapLabel(5)).toBe('away 5 weeks');
    expect(gapLabel(11)).toBe('away 3 months');
    expect(gapLabel(60)).toBe('away 1 year');
    expect(PROFILE_RULES.inactiveWeeks).toBe(3);
  });
});

describe('activity components', () => {
  it('draws the games-per-week line with shaded gaps and season ticks', () => {
    const dayCounts = {};
    const start = new Date('2025-01-06T12:00:00');
    for (let w = 0; w < 40; w++) {
      if (w >= 10 && w < 16) continue; // six empty weeks
      const d = new Date(start);
      d.setDate(d.getDate() + w * 7);
      dayCounts[d.toISOString().slice(0, 10)] = 3;
    }
    render(<ActivityOverTime seasonActivity={[{ season: 21, dayCounts }]} />);
    const chart = document.querySelector('[data-activity-over-time]');
    expect(chart).not.toBeNull();
    expect(document.querySelector('[data-gap="6"]')).toHaveTextContent('away 6 weeks');
    expect(document.querySelectorAll('.aot-season').length).toBeGreaterThan(0);
    cleanup();
    render(<ActivityOverTime seasonActivity={[]} />);
    expect(document.querySelector('[data-activity-over-time]')).toBeNull();
  });

  it('shows peak MMR per season with the current season in gold', () => {
    render(<SeasonHistoryBars seasonActivity={[{ season: 23, peakMmr: 1941, games: 200 }, { season: 24, peakMmr: 2011, games: 150 }, { season: 25, peakMmr: 2065, games: 80 }]} currentSeason={25} />);
    expect(document.querySelectorAll('[data-season]')).toHaveLength(3);
    expect(document.querySelector('[data-season="25"]')).toHaveClass('shb-col--current');
    expect(document.querySelector('[data-season="24"]')).not.toHaveClass('shb-col--current');
    expect(screen.getByText('2,065')).toBeInTheDocument();
  });
});
