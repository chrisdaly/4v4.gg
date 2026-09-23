import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecentConversations, { groupMessages } from '../components/RecentConversations';

vi.mock('../lib/profileCache', () => ({
  getCachedProfile: (tag) => (tag === 'ToD#2412' ? { pic: 'https://x/tod.jpg' } : null),
  fetchAndCacheProfile: () => Promise.resolve(null),
}));

const row = (battle_tag, user_name, received_at, message) => ({ battle_tag, user_name, received_at, message });

const playerRows = [
  row('ToD#2412', 'ToD', '2026-09-23 21:34:00', 'gg wp that was close'),
];
const contextRows = [
  row('ToD#2412', 'ToD', '2026-09-23 21:34:00', 'gg wp that was close'),
  row('ToD#2412', 'ToD', '2026-09-23 21:34:20', 'human mirror is pain'),
  row('Mubarak#1123', 'Mubarak', '2026-09-23 21:35:00', 'you got lucky with that expo timing'),
];

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    const body = String(url).includes('/search/context') ? contextRows : { results: playerRows };
    return Promise.resolve({ ok: true, json: async () => body });
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RecentConversations', () => {
  it('groups consecutive relay rows into ChatMessage groups with ISO times', () => {
    const groups = groupMessages(contextRows);
    expect(groups.length).toBe(2);
    expect(groups[0].author).toEqual({ battleTag: 'ToD#2412', userName: 'ToD' });
    expect(groups[0].lines.map((l) => l.text)).toEqual(['gg wp that was close', 'human mirror is pain']);
    expect(groups[0].lines[0].sentAt).toBe('2026-09-23T21:34:00.000Z');
    expect(groups[1].author.userName).toBe('Mubarak');
  });

  it('renders the active conversation through the transcript variant and tints the target player', async () => {
    render(
      <MemoryRouter>
        <RecentConversations battleTag="ToD#2412" playerName="ToD" />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('gg wp that was close')).toBeInTheDocument());

    const groups = document.querySelectorAll('[data-variant="transcript"]');
    expect(groups.length).toBe(2);
    // no hand-rolled row markup left
    expect(document.querySelector('.rc-group, .rc-msg, .rc-name')).toBeNull();
    // target player's group carries the avatar from the profile cache and a /player link
    expect(groups[0].querySelector('img[src="https://x/tod.jpg"]')).not.toBeNull();
    expect(screen.getAllByText('ToD')[0]).toHaveAttribute('href', '/player/ToD%232412');
    expect(screen.getByText('Mubarak')).toHaveAttribute('href', '/player/Mubarak%231123');
    // tab label summarises the session
    expect(screen.getByText('1 msg')).toBeInTheDocument();
    expect(screen.getByText('w/ Mubarak')).toBeInTheDocument();
  });
});
