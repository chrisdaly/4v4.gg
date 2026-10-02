import { describe, it, expect } from 'vitest';
import { toUtterances, burstLevels, findThreads, findEchoes } from '../../server/src/storyCandidates.js';

const msg = (id, at, name, message) => ({
  id, received_at: at, user_name: name, battle_tag: `${name}#1`, message,
});

/**
 * Both cases here are real failures from the week of 2026-09-21, kept so the
 * detectors cannot regress to them. See docs/NEWS.md.
 */
describe('toUtterances', () => {
  it('joins a word the chat client split into two rows', () => {
    // ToastBrot's "lol" arrived as "lo" then "l", a second apart, and the old
    // scorer read it as two messages in zero minutes
    const turns = toUtterances([
      msg(1, '2026-09-25 08:04:31', 'ToastBrot', 'lo'),
      msg(2, '2026-09-25 08:04:32', 'ToastBrot', 'l'),
      msg(3, '2026-09-25 08:04:40', 'ViCtOry', '50 %'),
    ]);
    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({ user_name: 'ToastBrot', message: 'lo l', parts: 2 });
  });

  it('keeps a pause longer than the window as a separate turn', () => {
    const turns = toUtterances([
      msg(1, '2026-09-25 08:00:00', 'A', 'first'),
      msg(2, '2026-09-25 08:00:30', 'A', 'second'),
    ], { windowSeconds: 10 });
    expect(turns).toHaveLength(2);
  });

  it('never merges across speakers', () => {
    const turns = toUtterances([
      msg(1, '2026-09-25 08:00:00', 'A', 'one'),
      msg(2, '2026-09-25 08:00:01', 'B', 'two'),
      msg(3, '2026-09-25 08:00:02', 'A', 'three'),
    ]);
    expect(turns).toHaveLength(3);
  });

  it('handles nothing and one', () => {
    expect(toUtterances([])).toEqual([]);
    expect(toUtterances(null)).toEqual([]);
    expect(toUtterances([msg(1, '2026-09-25 08:00:00', 'A', 'x')])).toHaveLength(1);
  });
});

describe('burstLevels', () => {
  const span = (startSec, count, stepSec) =>
    Array.from({ length: count }, (_, i) => (startSec + i * stepSec) * 1000);

  it('lifts a dense stretch above the quiet traffic around it', () => {
    // An hour of one message a minute, then thirty in thirty seconds
    const times = [...span(0, 60, 60), ...span(3700, 30, 1), ...span(5000, 60, 60)];
    const levels = burstLevels(times);
    const quiet = levels.slice(0, 60);
    const dense = levels.slice(60, 90);
    expect(Math.max(...dense)).toBeGreaterThan(Math.max(...quiet));
    expect(Math.max(...dense)).toBeGreaterThanOrEqual(1);
  });

  it('stays flat when the rate never changes', () => {
    expect(new Set(burstLevels(span(0, 80, 60)))).toEqual(new Set([0]));
  });

  it('returns one level per message and nothing negative', () => {
    const times = span(0, 40, 30);
    const levels = burstLevels(times);
    expect(levels).toHaveLength(times.length);
    expect(levels.every((l) => l >= 0)).toBe(true);
  });

  it('refuses to guess from too few points', () => {
    expect(burstLevels([])).toEqual([]);
    expect(burstLevels([1000, 2000])).toEqual([0, 0]);
  });
});

describe('findThreads', () => {
  it('ranks a sustained argument above a split word', () => {
    const rows = [];
    // The junk that won last week: two people, nine rows, thirty seconds
    rows.push(msg('j1', '2026-09-25 08:04:31', 'ToastBrot', 'lo'));
    rows.push(msg('j2', '2026-09-25 08:04:32', 'ToastBrot', 'l'));
    for (let i = 0; i < 7; i++) {
      rows.push(msg(`j${i + 3}`, `2026-09-25 08:04:${40 + i}`, i % 2 ? 'ViCtOry' : 'ToastBrot', 'xd'));
    }
    // A real one: seven people going back and forth for twelve minutes
    for (let i = 0; i < 36; i++) {
      const mm = String(10 + Math.floor(i / 3)).padStart(2, '0');
      rows.push(msg(`r${i}`, `2026-09-25 09:${mm}:${String((i * 7) % 60).padStart(2, '0')}`,
        `P${i % 7}`, 'you lost your side, report him'));
    }
    const threads = findThreads(rows, { minMessages: 5 });
    const top = threads[0];
    expect(top.cast).toBe(7);
    expect(top.minutes).toBeGreaterThan(5);
    expect(top.alternationPct).toBeGreaterThan(80);
  });

  it('reports the turn count, not the keystroke count', () => {
    // A's split word is one turn; the alternating lines after it are eight more,
    // so ten rows go in and nine turns come out
    const rows = [msg(1, '2026-09-25 08:00:00', 'A', 'lo'), msg(2, '2026-09-25 08:00:01', 'A', 'l')];
    for (let i = 0; i < 8; i++) {
      rows.push(msg(`x${i}`, `2026-09-25 08:0${Math.floor(i / 2)}:${String(20 + (i % 2) * 25).padStart(2, '0')}`,
        i % 2 ? 'B' : 'A', 'what about it'));
    }
    const [t] = findThreads(rows, { minMessages: 5 });
    expect(rows).toHaveLength(10);
    expect(t.messages).toBe(9);
    expect(t.why).toContain('turns');
  });

  it('still returns nothing for nothing', () => {
    expect(findThreads([])).toEqual([]);
  });
});

describe('findEchoes', () => {
  it('finds one verdict pasted by five different people', () => {
    // The real shape: the bot line, with and without each player's own preamble
    const rows = [
      msg(1, '2026-09-27 10:00:00', 'Lyvz', 'oh RIP: xlrenxuanwei#3229 early leave accepted, 100 days 90+10'),
      msg(2, '2026-09-27 11:00:00', 'GazanResolve', 'xlrenxuanwei#3229 early leave accepted, 100 days'),
      msg(3, '2026-09-27 12:00:00', 'lumos', 'xlrenxuanwei#3229 early leave accepted, 100 days'),
      msg(4, '2026-09-27 13:00:00', 'Magnus', 'xlrenxuanwei#3229 early leave accepted, 100 days today is a good day'),
      msg(5, '2026-09-27 14:00:00', 'sunflowers', 'xlrenxuanwei#3229 early leave accepted, 100 days'),
    ];
    const [echo] = findEchoes(rows, { minSpeakers: 3 });
    expect(echo.speakers).toBe(5);
    expect(echo.repeats).toBe(5);
    expect(echo.why).toContain('5 different people');
  });

  it('ignores one person repeating himself', () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      msg(i, `2026-09-27 1${i}:00:00`, 'lumos', 'xlrenxuanwei#3229 early leave accepted, 100 days'));
    expect(findEchoes(rows, { minSpeakers: 3 })).toEqual([]);
  });

  it('ignores the filler everyone types every day', () => {
    const rows = ['gg', 'lol', 'gg wp', 'ty'].flatMap((t, i) =>
      Array.from({ length: 4 }, (_, j) => msg(`${i}-${j}`, `2026-09-27 1${i}:0${j}:00`, `P${j}`, t)));
    expect(findEchoes(rows, { minSpeakers: 3 })).toEqual([]);
  });

  it('handles nothing', () => {
    expect(findEchoes([])).toEqual([]);
    expect(findEchoes(null)).toEqual([]);
  });
});

describe('findEchoes, defects from the first real week', () => {
  it('ignores the client furniture people paste with a quote', () => {
    // Six people "said" this, and it was the top-ranked echo of the week
    const rows = ['IvanOoze', 'lumos', 'TommyHsu', 'Krystalus'].map((n, i) =>
      msg(i, `2026-09-23 0${i}:50:00`, n, `${n} Sep 23 - 00:50 Message hidden from blocked player Show message`));
    expect(findEchoes(rows, { minSpeakers: 3 })).toEqual([]);
  });

  it('keeps two players’ verdicts apart, template and all', () => {
    // Every verdict shares "early leave accepted days", so CoolGhoul's ban had
    // joined xlrenxuanwei's and the group stopped being about anybody
    const rows = [
      msg(1, '2026-09-27 10:00:00', 'Lyvz', 'xlrenxuanwei#3229 early leave accepted, 100 days'),
      msg(2, '2026-09-27 11:00:00', 'lumos', 'xlrenxuanwei#3229 early leave accepted, 100 days'),
      msg(3, '2026-09-27 12:00:00', 'Magnus', 'xlrenxuanwei#3229 early leave accepted, 100 days'),
      msg(4, '2026-09-25 10:00:00', 'GazanResolve', 'CoolGhoul#11519 early leave accepted, 3 days'),
      msg(5, '2026-09-25 11:00:00', 'vitruviuss', 'CoolGhoul#11519 early leave accepted, 3 days'),
      msg(6, '2026-09-25 12:00:00', 'sunflowers', 'CoolGhoul#11519 early leave accepted, 3 days'),
    ];
    const echoes = findEchoes(rows, { minSpeakers: 3 });
    expect(echoes).toHaveLength(2);
    for (const e of echoes) {
      const tags = new Set(e.lines.flatMap((l) => l.text.match(/\S+#\d+/g) || []));
      expect(tags.size).toBe(1);
    }
  });

  it('still groups one player’s verdict however it was introduced', () => {
    const rows = [
      msg(1, '2026-09-27 10:00:00', 'Lyvz', 'oh RIP: xlrenxuanwei#3229 early leave accepted, 100 days 90+10'),
      msg(2, '2026-09-27 11:00:00', 'lumos', 'xlrenxuanwei#3229 early leave accepted, 100 days'),
      msg(3, '2026-09-27 12:00:00', 'Magnus', 'xlrenxuanwei#3229 early leave accepted, 100 days today is a good day'),
    ];
    const [echo] = findEchoes(rows, { minSpeakers: 3 });
    expect(echo.speakers).toBe(3);
  });
});
