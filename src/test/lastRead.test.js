import { describe, it, expect, beforeEach } from 'vitest';
import { loadLastRead, saveLastRead, clearLastRead, resetLastReadThrottle, STALE_AFTER_MS } from '../lib/chat/lastRead';

const at = (iso) => new Date(iso).getTime();
const msg = (id, iso) => ({ id, sentAt: iso });

describe('last read position', () => {
  beforeEach(() => {
    localStorage.clear();
    resetLastReadThrottle();
  });

  // Message times are relative to now: loadLastRead drops anything older
  // than STALE_AFTER_MS, so a fixed date made these fail a week after it
  // was written
  const recent = (secondsAgo) => new Date(Date.now() - secondsAgo * 1000).toISOString();

  it('remembers the message and reads it back', () => {
    const sentAt = recent(3600);
    saveLastRead(msg('m1', sentAt));
    expect(loadLastRead()).toEqual({ id: 'm1', at: at(sentAt) });
  });

  it('writes at most once every few seconds unless forced', () => {
    const now = Date.now();
    saveLastRead(msg('m1', recent(60)), { now });
    saveLastRead(msg('m2', recent(59)), { now: now + 1000 });
    expect(loadLastRead().id).toBe('m1');
    // leaving the page writes whatever the reader actually reached
    saveLastRead(msg('m3', recent(58)), { now: now + 1200, force: true });
    expect(loadLastRead().id).toBe('m3');
    // and the throttle opens again with time
    saveLastRead(msg('m4', recent(51)), { now: now + 9000 });
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
