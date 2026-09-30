import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GameEventCardView } from '../components/chat/GameRow';

afterEach(cleanup);

// The card the game activity panel and the game modal both open. It used to
// be reached by clicking a ticker in the stream, which is where these
// assertions lived.
const endEvent = {
  id: 'ge-m1', type: 'game_end', time: new Date().toISOString(), matchId: 'm1', mapName: 'Ferocity',
  durationInSeconds: 1200,
  winners: [{ battleTag: 'Moon#2', name: 'Moon', mmr: 1800, mmrGain: 12, inChannel: true }],
  losers: [{ battleTag: 'X#9', name: 'X', mmr: 1700, mmrGain: -9, inChannel: false }],
  winnersMmr: 1800, losersMmr: 1700,
  note: { text: 'close one', tag: null }, badges: [], rivals: [],
};

const renderCard = (event = endEvent, props = {}) =>
  render(
    <MemoryRouter>
      <GameEventCardView event={event} {...props} />
    </MemoryRouter>
  );

describe('game card', () => {
  it('heads with the tag, duration, lobby average and time, and links the map to the match', () => {
    renderCard();
    const card = document.querySelector('[data-game-card="ge-m1"]');
    expect(card).toHaveTextContent('FINISHED');
    expect(card).toHaveTextContent('20:00');
    expect(card).toHaveTextContent('1750 avg');
    expect(screen.getByRole('link', { name: 'Ferocity' })).toHaveAttribute('href', '/match/m1');
  });

  it('shows both teams with MMR and deltas, the MMR strip and the note', () => {
    renderCard();
    const card = document.querySelector('[data-game-card="ge-m1"]');
    expect(card.querySelector('[data-team="a"]')).toHaveTextContent('Moon');
    expect(card.querySelector('[data-team="a"]')).toHaveTextContent('1800');
    expect(card.querySelector('[data-team="a"]')).toHaveTextContent('+12');
    expect(card.querySelector('[data-team="b"]')).toHaveTextContent('X');
    expect(card.querySelector('[data-team="b"]')).toHaveTextContent('-9');
    expect(card.querySelector('[data-mmr-strip]')).not.toBeNull();
    expect(card.querySelector('[data-note="NOTE"]')).toHaveTextContent('close one');
    expect(card.querySelector('[data-badge]')).toBeNull();
  });

  it('badges the MVP and tags their note', () => {
    renderCard({
      ...endEvent,
      mvp: 'Moon#2',
      note: { text: 'fielded a 94-supply army', tag: 'Moon#2', name: 'Moon', mmr: 1800, race: 4, heroes: null, raceId: null, quote: null },
    });
    const card = document.querySelector('[data-game-card="ge-m1"]');
    expect(card.querySelector('[data-team="a"] [data-mvp]')).toHaveTextContent('MVP');
    expect(card.querySelector('[data-team="b"] [data-mvp]')).toBeNull();
    const note = card.querySelector('[data-note="MVP"]');
    expect(note).toHaveTextContent('fielded a 94-supply army');
    expect(note.querySelector('a')).toHaveAttribute('href', '/player/Moon%232');
  });

  it('collapses from the header when it was opened from a row', () => {
    const onToggle = vi.fn();
    renderCard(endEvent, { onToggle });
    fireEvent.click(screen.getByTitle('Collapse'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('a running game links the map to the live page instead of the match', () => {
    renderCard({
      id: 'gs-m2', type: 'game_start', time: new Date().toISOString(), matchId: 'm2', mapName: 'Royal Gardens',
      teamMmrs: [1847, 1790],
      teams: [
        [{ battleTag: 'Moon#2', name: 'Moon', mmr: 1800, inChannel: true }],
        [{ battleTag: 'W#1', name: 'W', mmr: 1790, inChannel: false }],
      ],
    }, { stillRunning: true });
    expect(document.querySelector('[data-game-card="gs-m2"]')).toHaveTextContent('LIVE');
    expect(screen.getByRole('link', { name: 'Royal Gardens' })).toHaveAttribute('href', '/live');
  });
});
