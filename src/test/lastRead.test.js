import { describe, it, expect, beforeEach } from 'vitest';
import { loadLastRead, saveLastRead, clearLastRead, resetLastReadThrottle, STALE_AFTER_MS } from '../lib/chat/lastRead';

const at = (iso) => new Date(iso).getTime();
const msg = (id, iso) => ({ id, sentAt: iso });

describe('last read position', () => {
  beforeEach(() => {
    localStorage.clear();
    resetLastReadThrottle();
  });

  it('remembers the message and reads it back', () => {
    saveLastRead(msg('m1', '2026-09-30T10:00:00.000Z'));
    expect(loadLastRead()).toEqual({ id: 'm1', at: at('2026-09-30T10:00:00.000Z') });
  });

  it('writes at most once every few seconds unless forced', () => {
    const now = Date.now();
    saveLastRead(msg('m1', '2026-09-30T10:00:00.000Z'), { now });
    saveLastRead(msg('m2', '2026-09-30T10:00:01.000Z'), { now: now + 1000 });
    expect(loadLastRead().id).toBe('m1');
    // leaving the page writes whatever the reader actually reached
    saveLastRead(msg('m3', '2026-09-30T10:00:02.000Z'), { now: now + 1200, force: true });
    expect(loadLastRead().id).toBe('m3');
    // and the throttle opens again with time
    saveLastRead(msg('m4', '2026-09-30T10:00:09.000Z'), { now: now + 9000 });
    expect(loadLastRead().id).toBe('m4');
  });

  it('ignores a position older than a week: the stream has moved on', () => {
    const now = Date.now();
    saveLastRead(msg('old', new Date(now - STALE_AFTER_MS - 1000).toISOString()));
    expect(loadLastRead(now)).toBeNull();
  });

  it('ignores junk, a message with no time, and a cleared slot', () => {
    localStorage.setItem('chat:lastRead', 'not json');
    expect(loadLastRead()).toBeNull();
    localStorage.clear();
    saveLastRead({ id: 'x' });
    expect(loadLastRead()).toBeNull();
    saveLastRead(msg('m1', '2026-09-30T10:00:00.000Z'), { force: true });
    clearLastRead();
    expect(loadLastRead()).toBeNull();
  });
});
