import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlayerSheet from '../components/chat/PlayerSheet';
import GameSheet from '../components/chat/GameSheet';

const minsAgo = (m) => new Date(Date.now() - m * 60 * 1000).toISOString();

const onlineUsers = [
  { battleTag: 'Moon#2', name: 'Moon' },
  { battleTag: 'Grubby#1', name: 'Grubby' },
];
const stats = new Map([
  ['Moon#2', { mmr: 1800.4, race: 4 }],
  ['Grubby#1', { mmr: 1900, race: 2 }],
]);
const avatars = new Map([['Moon#2', { profilePicUrl: 'https://x/moon.jpg', country: 'KR' }]]);
const sessions = new Map([['Moon#2', [true, false, true, true, false, true, true, true, false, true, true, false]]]);
const inGameTags = new Set(['Moon#2']);
const gameInfo = { matchId: 'm2', mapName: 'Royal Gardens', startTime: minsAgo(12) };
const inGameInfoMap = new Map([['Moon#2', gameInfo]]);

const renderIn = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

afterEach(cleanup);

describe('PlayerSheet', () => {
  const base = { onlineUsers, avatars, stats, sessions, inGameTags, inGameInfoMap };

  it('shows the player with avatar, flag, MMR, in-game status, the last ten games and both buttons; Watch game hands over the game', () => {
    const onWatchGame = vi.fn();
    const onClose = vi.fn();
    renderIn(<PlayerSheet {...base} battleTag="Moon#2" onWatchGame={onWatchGame} onClose={onClose} />);
    const sheet = document.querySelector('[data-player-sheet="Moon#2"]');
    expect(sheet).toHaveAttribute('role', 'dialog');
    expect(sheet.querySelector('img[src="https://x/moon.jpg"]')).not.toBeNull();
    expect(sheet.querySelector('img[alt="kr"]')).not.toBeNull();
    expect(within(sheet).getByText('Moon')).toBeInTheDocument();
    expect(within(sheet).getByText(/^1800/)).toBeInTheDocument();
    expect(sheet.querySelector('[data-sheet-in-game]')).toHaveTextContent('in game 12m');
    expect(within(sheet).getByText('Last 10 games')).toBeInTheDocument();
    // twelve games, the last ten shown
    expect(sheet.querySelectorAll('.form-dots span').length).toBe(10);
    expect(within(sheet).getByRole('link', { name: 'View profile' })).toHaveAttribute('href', '/player/Moon%232');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Watch game' }));
    expect(onWatchGame).toHaveBeenCalledWith(gameInfo);
    fireEvent.click(document.querySelector('[data-player-sheet-scrim]'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('leaves out the status, form and Watch game for a player who is idle with no history', () => {
    renderIn(<PlayerSheet {...base} battleTag="Grubby#1" onWatchGame={() => {}} onClose={() => {}} />);
    const sheet = document.querySelector('[data-player-sheet="Grubby#1"]');
    expect(sheet.querySelector('[data-sheet-in-game]')).toBeNull();
    expect(within(sheet).queryByText(/Last \d+ games/)).toBeNull();
    expect(within(sheet).queryByRole('button', { name: 'Watch game' })).toBeNull();
    expect(within(sheet).getByRole('link', { name: 'View profile' })).toBeInTheDocument();
  });
});

describe('GameSheet', () => {
  const lobby = (names) => names.map((n, i) => ({ battleTag: `${n}#1`, name: n, mmr: 1800 + i * 10, inChannel: n === 'Moon' }));
  const startEvent = {
    id: 'gs-m2', type: 'game_start', time: minsAgo(12), matchId: 'm2', mapName: 'Royal Gardens', teamMmrs: [1815, 1855],
    teams: [lobby(['Moon', 'A', 'B', 'C']), lobby(['D', 'E', 'F', 'G']).map((p) => ({ ...p, mmr: p.mmr + 40 }))],
  };
  const base = { gameEvents: [startEvent], ongoingMatches: [], ongoingMatchIds: new Set(['m2']), onlineUsers, inGameInfoMap, stats, avatars };

  it('lays out the live header, team 1 cells, the MMR chart, team 2 cells and closes from the button and Esc', () => {
    const onClose = vi.fn();
    renderIn(<GameSheet {...base} game={gameInfo} onClose={onClose} />);
    const sheet = document.querySelector('[data-game-sheet="m2"]');
    expect(sheet).toHaveAttribute('role', 'dialog');
    expect(within(sheet).getByText('LIVE')).toBeInTheDocument();
    expect(within(sheet).getByText('Royal Gardens')).toBeInTheDocument();
    expect(within(sheet).getByText('12 mins')).toBeInTheDocument();
    const teamA = sheet.querySelector('[data-team="a"]');
    const teamB = sheet.querySelector('[data-team="b"]');
    expect(teamA.querySelectorAll('a').length).toBe(4);
    expect(teamB.querySelectorAll('a').length).toBe(4);
    expect(within(teamA).getByText('Moon').closest('a')).toHaveAttribute('href', '/player/Moon%231');
    expect(sheet.querySelector('[data-mmr-strip]')).not.toBeNull();
    // the team headers in Game.jsx's mobile order, with the lobby averages
    const headers = [...sheet.querySelectorAll('span')].filter((el) => /^TEAM [12]$/.test(el.textContent));
    expect(headers.map((el) => el.textContent)).toEqual(['TEAM 1', 'TEAM 2']);
    expect(headers[0].compareDocumentPosition(teamA) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(teamB.compareDocumentPosition(headers[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(sheet).getByText('1815')).toBeInTheDocument();
    expect(within(sheet).getByText('1855')).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close game' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('says Finished once the match leaves the ongoing set, and lists channel players without card data', () => {
    renderIn(<GameSheet {...base} game={gameInfo} ongoingMatchIds={new Set()} onClose={() => {}} />);
    expect(screen.getByText('FINISHED')).toBeInTheDocument();
    expect(screen.queryByText(/mins$/)).toBeNull();
    cleanup();
    renderIn(<GameSheet {...base} gameEvents={[]} game={gameInfo} onClose={() => {}} />);
    expect(screen.getByText(/No lobby data yet/)).toBeInTheDocument();
    const roster = document.querySelector('[data-game-roster]');
    expect(within(roster).getByRole('link', { name: 'Moon' })).toHaveAttribute('href', '/player/Moon%232');
    expect(within(roster).getByText('1800')).toBeInTheDocument();
  });
});
