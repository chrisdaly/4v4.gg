import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import useStreamRows, { sameRow, groupMatches } from '../lib/chat/useStreamRows';

// The rows pipeline on its own: identity is the thing being tested, and the
// DOM cannot show it. A row that has not changed must come back as the same
// object, or the memoized row component has nothing to compare and one
// arriving line re-renders every visible group mid-read.

const T0 = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.getTime(); })();
const iso = (ms) => new Date(T0 + ms).toISOString();
const msg = (id, tag, ms, text, extra = {}) => ({
  id, battleTag: tag, userName: tag.split('#')[0], clanTag: '', text,
  sentAt: iso(ms), receivedAt: null, deleted: false,
  kind: tag === 'system' ? 'system' : 'message', ...extra,
});

const base = [
  msg('a1', 'Grubby#1', 0, 'hello'),
  msg('a2', 'Grubby#1', 30000, 'again'),
  msg('b1', 'Moon#2', 120000, 'hi'),
  msg('c1', 'Lyn#9', 240000, 'gg'),
];

function harness(props) {
  const out = { current: null };
  function Probe(p) {
    out.current = useStreamRows(p);
    return null;
  }
  const { rerender } = render(<Probe {...props} />);
  return { out, rerender: (next) => rerender(<Probe {...next} />) };
}

afterEach(cleanup);

describe('useStreamRows identity', () => {
  it('reuses the row objects of untouched groups when a message arrives', () => {
    const { out, rerender } = harness({ messages: base });
    const before = new Map(out.current.rows.map((r) => [r.key, r]));

    rerender({ messages: [...base, msg('n1', 'Sok#4', 600000, 'fresh line')] });

    const after = out.current.rows;
    expect(after.find((r) => r.key === 'n1')).toBeTruthy();
    const carried = after.filter((r) => before.has(r.key));
    expect(carried.length).toBe(before.size);
    for (const row of carried) expect(row).toBe(before.get(row.key));
  });

  it('gives a new object only to the group that gained a line', () => {
    const { out, rerender } = harness({ messages: base });
    const before = new Map(out.current.rows.map((r) => [r.key, r]));

    // same author, within the 2 minute window: joins the last group
    rerender({ messages: [...base, msg('n2', 'Lyn#9', 270000, 'and another')] });

    const changed = out.current.rows.filter((r) => before.has(r.key) && r !== before.get(r.key));
    expect(changed).toHaveLength(1);
    expect(changed[0].key).toBe('c1');
    expect(changed[0].msgs.map((m) => m.id)).toEqual(['c1', 'n2']);
  });

  it('keeps the day divider objects too', () => {
    const { out, rerender } = harness({ messages: base });
    const divider = out.current.rows.find((r) => r.kind === 'divider');
    expect(divider).toBeTruthy();
    rerender({ messages: [...base, msg('n3', 'Sok#4', 600000, 'later')] });
    expect(out.current.rows.find((r) => r.kind === 'divider')).toBe(divider);
  });

  it('holds the row that was first when a page of older history lands above it', () => {
    const { out, rerender } = harness({ messages: base });
    const firstRow = out.current.rows.find((r) => r.kind !== 'divider');
    expect(firstRow.key).toBe('a1');

    // three more Grubby lines just before a1, inside the grouping window:
    // without a boundary they would swallow a1 and the row the viewport is
    // held against would change key mid-prepend
    const older = [
      msg('o1', 'Grubby#1', -90000, 'earlier 1'),
      msg('o2', 'Grubby#1', -60000, 'earlier 2'),
      msg('o3', 'Grubby#1', -30000, 'earlier 3'),
    ];
    rerender({ messages: [...older, ...base] });

    const kept = out.current.rows.find((r) => r.key === 'a1');
    expect(kept).toBe(firstRow);
    expect(kept.msgs.map((m) => m.id)).toEqual(['a1', 'a2']);
    expect(out.current.rows.find((r) => r.key === 'o1').msgs.map((m) => m.id)).toEqual(['o1', 'o2', 'o3']);
  });

  it('starts over when the window is replaced', () => {
    const { out, rerender } = harness({ messages: base, windowId: 0 });
    const before = out.current.rows.find((r) => r.key === 'a1');
    rerender({ messages: base, windowId: 1 });
    // same content, but nothing is being held across a window swap
    expect(out.current.rows.find((r) => r.key === 'a1')).toBe(before);
  });
});

describe('useStreamRows shape', () => {
  it('puts a day divider ahead of the first row of each day', () => {
    const { out } = harness({ messages: base });
    expect(out.current.rows[0].kind).toBe('divider');
    expect(out.current.rows.filter((r) => r.kind === 'divider')).toHaveLength(1);
  });

  it('marks the first row past the marker time and counts filter hits', () => {
    const { out } = harness({ messages: base, newMarkerTime: T0 + 60000 });
    expect(out.current.newMarkerKey).toBe('b1');

    const { out: filtered } = harness({ messages: base, filterActive: true, filterQ: 'moon' });
    expect(filtered.current.foundCount).toBe(1);
    expect(filtered.current.rows.filter((r) => r.kind === 'group')).toHaveLength(1);
  });
});

describe('sameRow / groupMatches', () => {
  it('sameRow compares kind, the first line and the last', () => {
    const row = { kind: 'group', msg: base[0], msgs: [base[0], base[1]] };
    expect(sameRow(row, { ...row })).toBe(true);
    expect(sameRow(row, { kind: 'group', msg: base[0], msgs: [base[0]] })).toBe(false);
    expect(sameRow(row, { kind: 'system', msg: base[0], msgs: [base[0], base[1]] })).toBe(false);
    expect(sameRow(null, row)).toBe(false);
  });

  it('groupMatches reads the display name and every line', () => {
    const row = { msg: base[0], msgs: [base[0], base[1]] };
    expect(groupMatches(row, 'grub')).toBe(true);
    expect(groupMatches(row, 'again')).toBe(true);
    expect(groupMatches(row, 'nope')).toBe(false);
  });
});
