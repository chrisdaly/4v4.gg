import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChatMessage from '../components/chat/ChatMessage';
import { buildTickerText } from '../components/chat/GameTicker';
import { Chip, chipForTag, formatGameMinutes } from '../components/chat/chip';

const group = {
  author: { battleTag: 'ToastBrot#2101', userName: 'ToastBrot', clanTag: 'FOALS' },
  lines: [
    { id: 'l1', text: 'gg wp', sentAt: '2026-09-23T12:00:00Z', kind: 'message' },
    { id: 'l2', text: 'rematch?', sentAt: '2026-09-23T12:00:30Z', kind: 'message', translation: 'revanche?', highlight: true },
  ],
};

const meta = {
  avatarUrl: 'https://x/toast.jpg',
  race: 1,
  countryCode: 'DE',
  mmr: 1847.4,
  chip: { kind: 'ingame', label: 'in game 12m' },
  twitchLogin: 'toastbrot',
  twitchTitle: 'ladder grind',
};

const renderIn = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

afterEach(cleanup);

describe('ChatMessage feed variant', () => {
  it('renders avatar, name link, clan, MMR, chip, twitch, lines, times, translation and extras', () => {
    renderIn(
      <ChatMessage
        variant="feed"
        group={group}
        meta={meta}
        watched
        renderLine={(line) => <em>{line.text}</em>}
        renderAfterLine={(line) => (line.id === 'l1' ? <div>bot reply</div> : null)}
      />
    );
    const root = document.querySelector('[data-variant="feed"]');
    expect(root).not.toBeNull();
    expect(root.querySelector('img[src="https://x/toast.jpg"]')).not.toBeNull();
    expect(screen.getByText('ToastBrot')).toHaveAttribute('href', '/player/ToastBrot%232101');
    expect(screen.getByText('FOALS')).toBeInTheDocument();
    expect(screen.getByText('1847 MMR')).toBeInTheDocument();
    expect(screen.getByText('in game 12m')).toHaveAttribute('data-chip', 'ingame');
    expect(screen.getByTitle('ladder grind')).toHaveAttribute('href', 'https://twitch.tv/toastbrot');
    expect(document.getElementById('msg-l1')).toContainElement(screen.getByText('gg wp'));
    expect(document.getElementById('msg-l2')).toContainElement(screen.getByText('rematch?'));
    expect(screen.getByText('gg wp').tagName).toBe('EM');
    expect(screen.getByText('revanche?')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('bot reply')).toBeInTheDocument();
    // one timestamp per line
    expect(root.querySelectorAll('[id^="msg-"]').length).toBe(2);
  });

  it('falls back to a race icon without an avatar and omits missing accessories', () => {
    renderIn(<ChatMessage variant="feed" group={group} meta={{ race: 2 }} />);
    const root = document.querySelector('[data-variant="feed"]');
    expect(root.querySelector('img')).not.toBeNull();
    expect(root.querySelector('[data-chip]')).toBeNull();
    expect(root.querySelector('a[href^="https://twitch.tv"]')).toBeNull();
    expect(screen.queryByText(/MMR$/)).toBeNull();
  });

  it('shows each chip state', () => {
    for (const chip of [
      { kind: 'ingame', label: 'in game 12m' },
      { kind: 'won', label: 'won +12' },
      { kind: 'lost', label: 'lost -9' },
    ]) {
      renderIn(<ChatMessage variant="feed" group={group} meta={{ chip }} />);
      expect(screen.getByText(chip.label)).toHaveAttribute('data-chip', chip.kind);
      cleanup();
    }
  });

  it('uses a button when onNameClick is set and wraps the name', () => {
    const onNameClick = vi.fn();
    renderIn(
      <ChatMessage
        variant="feed"
        group={group}
        meta={meta}
        onNameClick={onNameClick}
        wrapName={(node) => <span data-testid="hover">{node}</span>}
      />
    );
    const name = screen.getByText('ToastBrot');
    expect(name.tagName).toBe('BUTTON');
    expect(screen.getByTestId('hover')).toContainElement(name);
    fireEvent.click(name);
    expect(onNameClick).toHaveBeenCalledWith(group.author);
  });
});

describe('ChatMessage transcript variant', () => {
  it('renders avatar, name, lines and times; target flags the focus author', () => {
    renderIn(<ChatMessage variant="transcript" group={group} meta={meta} target />);
    const root = document.querySelector('[data-variant="transcript"]');
    expect(root).not.toBeNull();
    expect(root.querySelector('img[src="https://x/toast.jpg"]')).not.toBeNull();
    expect(screen.getByText('ToastBrot')).toHaveAttribute('href', '/player/ToastBrot%232101');
    expect(screen.getByText('gg wp')).toBeInTheDocument();
    expect(screen.getByText('rematch?')).toBeInTheDocument();
    expect(screen.getByText('1847 MMR')).toBeInTheDocument();
    expect(screen.getByText('in game 12m')).toBeInTheDocument();
    // no twitch icon outside the feed
    expect(root.querySelector('a[href^="https://twitch.tv"]')).toBeNull();
    expect(root.querySelectorAll('[id^="msg-"]').length).toBe(2);
  });
});

describe('ChatMessage quote variant', () => {
  it('renders name and blockquotes without avatar, MMR or chip', () => {
    renderIn(<ChatMessage variant="quote" group={group} meta={meta} />);
    const root = document.querySelector('[data-variant="quote"]');
    expect(root).not.toBeNull();
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelectorAll('blockquote').length).toBe(2);
    expect(screen.getByText('ToastBrot')).toBeInTheDocument();
    expect(screen.getByText('gg wp').tagName).toBe('BLOCKQUOTE');
    expect(screen.queryByText('1847 MMR')).toBeNull();
    expect(root.querySelector('[data-chip]')).toBeNull();
  });
});

describe('GameTicker text', () => {
  const lobby = (names, inChannel = []) =>
    names.map((n) => ({ battleTag: `${n}#1`, name: n, mmr: 1800, inChannel: inChannel.includes(n) }));

  it('names channel members for a start', () => {
    const ev = {
      type: 'game_start', mapName: 'Royal Gardens', teamMmrs: [1847, 1790],
      teams: [lobby(['ToastBrot', 'Shamiko', 'A', 'B'], ['ToastBrot', 'Shamiko']), lobby(['C', 'D', 'E', 'F'])],
    };
    expect(buildTickerText(ev)).toBe('ToastBrot, Shamiko +2 started on Royal Gardens, 1847 avg');
  });

  it('reports the channel side of a finish with duration and average gain', () => {
    const winners = lobby(['A', 'B', 'C', 'D']).map((p) => ({ ...p, mmrGain: 12 }));
    const losers = lobby(['Shamiko', 'E', 'F', 'G'], ['Shamiko']).map((p) => ({ ...p, mmrGain: -9 }));
    const ev = { type: 'game_end', mapName: 'Ferocity', durationInSeconds: 842, winners, losers };
    expect(buildTickerText(ev)).toBe('Shamiko +3 lost 14:02 on Ferocity, -9 avg');
  });
});

describe('chipForTag', () => {
  const now = Date.parse('2026-09-23T12:00:00Z');
  const ctx = {
    inGameTags: new Set(['Toast#1']),
    startTimes: new Map([['Toast#1', { startTime: new Date(now - 12 * 60 * 1000).toISOString() }]]),
    recentDeltas: new Map([['Win#1', 12], ['Lose#1', -9]]),
    recentWinners: new Set(['Win#1', 'Crown#1']),
  };

  it('prefers in game, then delta, then the bare winner crown', () => {
    expect(chipForTag('Toast#1', ctx, now)).toEqual({ kind: 'ingame', label: 'in game 12m' });
    expect(chipForTag('Win#1', ctx, now)).toEqual({ kind: 'won', label: 'won +12' });
    expect(chipForTag('Lose#1', ctx, now)).toEqual({ kind: 'lost', label: 'lost -9' });
    expect(chipForTag('Crown#1', ctx, now)).toEqual({ kind: 'won', label: 'won' });
    expect(chipForTag('Nobody#1', ctx, now)).toBeNull();
    expect(chipForTag(null, ctx, now)).toBeNull();
  });

  it('drops the elapsed suffix when the start time is missing or stale', () => {
    const noTime = { ...ctx, startTimes: new Map() };
    expect(chipForTag('Toast#1', noTime, now)).toEqual({ kind: 'ingame', label: 'in game' });
    const stale = { ...ctx, startTimes: new Map([['Toast#1', new Date(now - 4 * 60 * 60 * 1000).toISOString()]]) };
    expect(chipForTag('Toast#1', stale, now)).toEqual({ kind: 'ingame', label: 'in game' });
    expect(formatGameMinutes(new Date(now - 60 * 1000).toISOString(), now)).toBe('1m');
    expect(formatGameMinutes('garbage', now)).toBeNull();
  });

  it('renders the shared Chip with a data-chip attribute', () => {
    renderIn(<Chip $kind="lost">lost -9</Chip>);
    expect(screen.getByText('lost -9')).toHaveAttribute('data-chip', 'lost');
  });
});
