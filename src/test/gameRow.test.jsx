import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GameRow from '../components/game/GameRow';

afterEach(cleanup);

// One 4v4 from the profile's match history, as /matches/search returns it.
// MMRs are deliberately out of order so the sort is what the test sees.
const player = (name, oldMmr, won, extra = {}) => ({
  battleTag: `${name}#1`, name, oldMmr, currentMmr: oldMmr + (won ? 7 : -7), won, race: 1, ...extra,
});
const match = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa', mapName: '(4)Ferocity', gameMode: 4, durationInSeconds: 1500,
  endTime: new Date().toISOString(),
  teams: [
    { players: [player('Me', 1500, true), player('Carry', 1800, true), player('Low', 1300, true), player('Mid', 1600, true)] },
    { players: [player('A', 1550, false), player('B', 1750, false), player('C', 1350, false), player('D', 1650, false)] },
  ],
};

const renderRow = (props = {}) =>
  render(
    <MemoryRouter>
      <GameRow game={match} playerBattleTag="Me#1" {...props} />
    </MemoryRouter>
  );

const names = (container, side) =>
  [...container.querySelectorAll(`.gr-side--${side} .gr-p-name`)].map((el) => el.textContent);

describe('profile match history row', () => {
  it('lists each side highest MMR first with the profile player in gold', () => {
    const { container } = renderRow();
    expect(names(container, 'mine')).toEqual(['Carry', 'Mid', 'Me', 'Low']);
    expect(names(container, 'theirs')).toEqual(['B', 'D', 'A', 'C']);
    const self = container.querySelector('.gr-p--self');
    expect(self.textContent).toBe('Me');
    expect(self.getAttribute('data-self-seat')).toBe('3');
  });

  it('puts the result and the MMR it moved together in the first column', () => {
    const { container } = renderRow();
    const result = container.querySelector('.gr-game .gr-result');
    expect(result.className).toContain('gr-result--won');
    expect(result.textContent).toBe('W+7');
    expect(container.querySelector('.gr-score')).toBeNull();
  });

  it('badges the MVP on whichever side they played, and nobody without one', () => {
    const { container, rerender } = renderRow({ mvpTag: 'B#1' });
    const chips = container.querySelectorAll('.gr-mvp');
    expect(chips).toHaveLength(1);
    expect(chips[0].closest('.gr-p').textContent).toBe('BMVP');
    expect(chips[0].closest('.gr-side').className).toContain('gr-side--theirs');

    rerender(
      <MemoryRouter>
        <GameRow game={match} playerBattleTag="Me#1" mvpTag="Carry#1" />
      </MemoryRouter>
    );
    const mine = container.querySelector('.gr-side--mine .gr-mvp');
    expect(mine.closest('.gr-p').textContent).toBe('MVPCarry');

    rerender(
      <MemoryRouter>
        <GameRow game={match} playerBattleTag="Me#1" mvpTag={null} />
      </MemoryRouter>
    );
    expect(container.querySelector('.gr-mvp')).toBeNull();
  });
});
