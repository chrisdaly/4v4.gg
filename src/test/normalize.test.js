import { describe, it, expect } from 'vitest';
import { normalizeMessage, normalizeMessages } from '../lib/chat/normalize';

const SHAPE = ['id', 'battleTag', 'userName', 'clanTag', 'text', 'sentAt', 'receivedAt', 'deleted', 'kind'];

describe('normalizeMessage', () => {
  it('maps a SQLite row (REST history / SSE history / search)', () => {
    const row = {
      id: 'abc',
      battle_tag: 'Grubby#1234',
      user_name: 'Grubby',
      clan_tag: 'W3C',
      message: 'gl hf',
      sent_at: '2026-09-23T10:00:00.000Z',
      received_at: '2026-09-23 10:00:01',
      deleted: 0,
      room: '4 vs 4',
    };
    expect(normalizeMessage(row)).toEqual({
      id: 'abc',
      battleTag: 'Grubby#1234',
      userName: 'Grubby',
      clanTag: 'W3C',
      text: 'gl hf',
      sentAt: '2026-09-23T10:00:00.000Z',
      receivedAt: '2026-09-23 10:00:01',
      deleted: false,
      kind: 'message',
    });
  });

  it('maps a live SSE message (camelCase, no receivedAt)', () => {
    const msg = {
      id: 'live1',
      battleTag: 'Moon#5678',
      userName: 'Moon',
      clanTag: '',
      message: 'gg',
      sentAt: '2026-09-23T10:05:00.000Z',
      room: '4 vs 4',
    };
    const out = normalizeMessage(msg);
    expect(Object.keys(out).sort()).toEqual([...SHAPE].sort());
    expect(out.receivedAt).toBeNull();
    expect(out.deleted).toBe(false);
    expect(out.kind).toBe('message');
    expect(out.text).toBe('gg');
  });

  it('is idempotent on already-normalized messages', () => {
    const once = normalizeMessage({ id: 'x', battle_tag: 'A#1', user_name: 'A', message: 'hi', sent_at: 't', received_at: 'r', deleted: 1 });
    expect(normalizeMessage(once)).toEqual(once);
    expect(once.deleted).toBe(true);
  });

  it('flags system rows by tag', () => {
    expect(normalizeMessage({ id: 's1', battle_tag: 'system', user_name: '', message: 'Joined channel', sent_at: 't' }).kind).toBe('system');
    expect(normalizeMessage({ id: 's2', message: 'no author', sent_at: 't' }).kind).toBe('system');
    expect(normalizeMessage({ id: 's2', message: 'no author', sent_at: 't' }).battleTag).toBe('');
  });

  it('keeps explicit bot / translation kinds', () => {
    expect(normalizeMessage({ id: 'b', battleTag: 'bot#1', message: '...', kind: 'bot' }).kind).toBe('bot');
    expect(normalizeMessage({ id: 't', battleTag: 'A#1', message: '...', kind: 'translation' }).kind).toBe('translation');
  });

  it('normalizeMessages handles arrays and junk', () => {
    expect(normalizeMessages(null)).toEqual([]);
    const out = normalizeMessages([{ id: '1', battle_tag: 'A#1', message: 'a', sent_at: 't' }, null]);
    expect(out).toHaveLength(1);
    expect(out[0].battleTag).toBe('A#1');
  });
});
