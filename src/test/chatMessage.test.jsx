import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChatMessage from '../components/chat/ChatMessage';
import { buildTickerText, cardNotes } from '../components/chat/GameRow';
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
  it('renders avatar, flag, name link, clan, MMR, local time, chip, twitch, lines, times, translation and extras', () => {
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
    expect(root.querySelector('img[alt="de"]')).not.toBeNull();
    expect(screen.getByText('ToastBrot')).toHaveAttribute('href', '/player/ToastBrot%232101');
    expect(screen.getByText('FOALS')).toBeInTheDocument();
    expect(screen.getByText('1847 MMR')).toBeInTheDocument();
    // the sender's clock from their country: 12:00Z in Germany (UTC+1)
    expect(root.querySelector('[data-local-time]')).toHaveTextContent('1:00p local');
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
    expect(root.querySelectorAll('[data-line-end]').length).toBe(2);
  });

  it('falls back to a race icon without an avatar and omits missing accessories', () => {
    renderIn(<ChatMessage variant="feed" group={group} meta={{ race: 2 }} />);
    const root = document.querySelector('[data-variant="feed"]');
    expect(root.querySelector('img')).not.toBeNull();
    expect(root.querySelector('[data-chip]')).toBeNull();
    expect(root.querySelector('[data-local-time]')).toBeNull();
    expect(root.querySelector('a[href^="https://twitch.tv"]')).toBeNull();
    expect(screen.queryByText(/MMR$/)).toBeNull();
  });

  it('omits the local time for a country it does not know', () => {
    renderIn(<ChatMessage variant="feed" group={group} meta={{ countryCode: 'ZZ' }} />);
    expect(document.querySelector('[data-local-time]')).toBeNull();
  });

  it('shows one chip, in each of its states', () => {
    for (const chip of [
      { kind: 'ingame', label: 'in game 12m' },
      { kind: 'won', label: 'won +12' },
      { kind: 'lost', label: 'lost -9' },
    ]) {
      renderIn(<ChatMessage variant="feed" group={group} meta={{ chip }} />);
      expect(screen.getByText(chip.label)).toHaveAttribute('data-chip', chip.kind);
      expect(document.querySelectorAll('[data-chip]')).toHaveLength(1);
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
  it('renders avatar, name, lines and times; target flags the focus author; no local time', () => {
    renderIn(<ChatMessage variant="transcript" group={group} meta={meta} target />);
    const root = document.querySelector('[data-variant="transcript"]');
    expect(root).not.toBeNull();
    expect(root.querySelector('img[src="https://x/toast.jpg"]')).not.toBeNull();
    expect(screen.getByText('ToastBrot')).toHaveAttribute('href', '/player/ToastBrot%232101');
    expect(screen.getByText('gg wp')).toBeInTheDocument();
    expect(screen.getByText('rematch?')).toBeInTheDocument();
    expect(screen.getByText('1847 MMR')).toBeInTheDocument();
    expect(screen.getByText('in game 12m')).toBeInTheDocument();
    expect(root.querySelector('[data-local-time]')).toBeNull();
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

describe('GameRow text', () => {
  const lobby = (names, inChannel = []) =>
    names.map((n) => ({ battleTag: `${n}#1`, name: n, mmr: 1800, inChannel: inChannel.includes(n) }));

  it('names channel members for a start', () => {
    const ev = {
      type: 'game_start', mapName: 'Royal Gardens', teamMmrs: [1847, 1790],
      teams: [lobby(['ToastBrot', 'Shamiko', 'A', 'B'], ['ToastBrot', 'Shamiko']), lobby(['C', 'D', 'E', 'F'])],
    };
    expect(buildTickerText(ev)).toBe('ToastBrot, Shamiko +2 started on Royal Gardens, 1847 avg');
  });

  it('names at most two players, the rest as +N', () => {
    const ev = {
      type: 'game_start', mapName: 'Ferocity', teamMmrs: [1700, 1690],
      teams: [lobby(['A', 'B', 'C', 'D'], ['A', 'B', 'C']), lobby(['E', 'F', 'G', 'H'])],
    };
    expect(buildTickerText(ev)).toBe('A, B +2 started on Ferocity, 1700 avg');
  });

  it('reports the channel side of a finish with duration and average gain', () => {
    const winners = lobby(['A', 'B', 'C', 'D']).map((p) => ({ ...p, mmrGain: 12 }));
    const losers = lobby(['Shamiko', 'E', 'F', 'G'], ['Shamiko']).map((p) => ({ ...p, mmrGain: -9 }));
    const ev = { type: 'game_end', mapName: 'Ferocity', durationInSeconds: 842, winners, losers };
    expect(buildTickerText(ev)).toBe('Shamiko +3 lost 14:02 on Ferocity, -9 avg');
    const won = { ...ev, winners: winners.map((p) => ({ ...p, inChannel: p.name === 'A' || p.name === 'B' })), losers: losers.map((p) => ({ ...p, inChannel: false })) };
    expect(buildTickerText(won)).toBe('A, B +2 won 14:02 on Ferocity, +12 avg');
  });
});

describe('GameRow card notes', () => {
  it('tags the note MVP when its subject is the match MVP, NOTE otherwise', () => {
    const note = { text: 'fielded a 94-supply army', tag: 'Solana#1', name: 'Solana' };
    expect(cardNotes({ note, mvp: 'Solana#1' })).toEqual([
      { tag: 'MVP', name: 'Solana', href: '/player/Solana%231', text: 'fielded a 94-supply army', quote: null },
    ]);
    expect(cardNotes({ note, mvp: 'Other#1' })[0].tag).toBe('NOTE');
  });

  it('tags upsets and race stacks, and drops the upset prefix', () => {
    expect(cardNotes({ note: { text: 'upset - the 1900 MMR favorites fell', tag: null } })).toEqual([
      { tag: 'UPSET', name: null, href: null, text: 'the 1900 MMR favorites fell', quote: null },
    ]);
    expect(cardNotes({ note: { text: 'all-Human victory', tag: null, raceId: 1, quote: 'For the Alliance!' } })).toEqual([
      { tag: 'STACK', name: null, href: null, text: 'all-Human victory', quote: 'For the Alliance!' },
    ]);
  });

  it('keeps string notes and skips events without one', () => {
    expect(cardNotes({ note: 'close one' })[0]).toMatchObject({ tag: 'NOTE', text: 'close one' });
    expect(cardNotes({})).toEqual([]);
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
