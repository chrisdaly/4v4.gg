import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Relay REST: history is empty so the hook starts from nothing
vi.mock('../lib/relay', () => ({
  RELAY_URL: 'http://relay.test',
  relayFetch: vi.fn(async () => ({ ok: true, json: async () => [] })),
}));

import useChatStream, { MAX_MESSAGES, TRIM_HYSTERESIS } from '../lib/useChatStream';
import { setTrimPaused, isTrimPaused } from '../lib/chat/trimGate';

// A hand-driven EventSource: the test emits the relay's SSE events
class FakeEventSource {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.closed = false;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  emit(type, payload) {
    const data = JSON.stringify(payload);
    for (const fn of this.listeners.get(type) || []) fn({ data });
  }
  close() {
    this.closed = true;
  }
}

const T0 = Date.parse('2026-09-23T12:00:00Z');
let seq = 0;
const raw = () => {
  const i = seq++;
  return { id: `m${i}`, battleTag: `Player#${i % 5}`, userName: 'Player', clanTag: '', message: `line ${i}`, sentAt: new Date(T0 + i * 1000).toISOString() };
};
const batch = (n) => Array.from({ length: n }, raw);

describe('useChatStream live cap', () => {
  let es;
  let hook;
  beforeEach(() => {
    seq = 0;
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    setTrimPaused(false);
    hook = renderHook(() => useChatStream());
    es = FakeEventSource.instances[0];
  });
  afterEach(() => {
    hook.unmount();
    vi.unstubAllGlobals();
    setTrimPaused(false);
  });

  const ids = () => hook.result.current.messages.map((m) => m.id);
  const emitHistory = (n) => act(() => es.emit('history', batch(n)));
  const emitOne = () => act(() => es.emit('message', raw()));

  it('trims with hysteresis: grows past the cap and drops back to the cap only past cap + hysteresis', () => {
    emitHistory(MAX_MESSAGES);
    expect(ids()).toHaveLength(MAX_MESSAGES);

    // Up to the threshold nothing is trimmed
    emitHistory(TRIM_HYSTERESIS);
    expect(ids()).toHaveLength(MAX_MESSAGES + TRIM_HYSTERESIS);
    expect(ids()[0]).toBe('m0');

    // One past it: one trim back to the cap, keeping the newest
    emitOne();
    expect(ids()).toHaveLength(MAX_MESSAGES);
    expect(ids()[0]).toBe(`m${TRIM_HYSTERESIS + 1}`);
    expect(ids()[ids().length - 1]).toBe(`m${MAX_MESSAGES + TRIM_HYSTERESIS}`);
  });

  it('defers the trim while the gate is paused and catches up on the next append after it resumes', () => {
    emitHistory(MAX_MESSAGES + TRIM_HYSTERESIS);
    expect(ids()).toHaveLength(MAX_MESSAGES + TRIM_HYSTERESIS);

    // Reader scrolled up: the list grows past the threshold untouched
    setTrimPaused(true);
    expect(isTrimPaused()).toBe(true);
    emitOne();
    emitHistory(50);
    expect(ids()).toHaveLength(MAX_MESSAGES + TRIM_HYSTERESIS + 51);
    expect(ids()[0]).toBe('m0');

    // Back at the bottom: nothing happens until the next append
    setTrimPaused(false);
    expect(ids()).toHaveLength(MAX_MESSAGES + TRIM_HYSTERESIS + 51);

    emitOne();
    const after = ids();
    expect(after).toHaveLength(MAX_MESSAGES);
    expect(after[after.length - 1]).toBe(`m${MAX_MESSAGES + TRIM_HYSTERESIS + 51}`);
    expect(after[0]).toBe(`m${TRIM_HYSTERESIS + 52}`);
  });

  it('ignores duplicate ids and never trims below the cap', () => {
    emitHistory(10);
    act(() => es.emit('message', { ...raw(), id: 'm0' }));
    expect(ids()).toHaveLength(10);
  });
});
