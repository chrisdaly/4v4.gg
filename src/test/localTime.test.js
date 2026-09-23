import { describe, it, expect } from 'vitest';
import { utcOffsetOf, localTimeLabel } from '../lib/chat/localTime';

describe('utcOffsetOf', () => {
  it('maps country codes to standard-time offsets, case-insensitively', () => {
    expect(utcOffsetOf('FR')).toBe(1);
    expect(utcOffsetOf('fr')).toBe(1);
    expect(utcOffsetOf('GB')).toBe(0);
    expect(utcOffsetOf('KR')).toBe(9);
    expect(utcOffsetOf('US')).toBe(-5);
    expect(utcOffsetOf('IN')).toBe(5.5);
  });

  it('is null for unknown or missing codes', () => {
    expect(utcOffsetOf('ZZ')).toBeNull();
    expect(utcOffsetOf('')).toBeNull();
    expect(utcOffsetOf(null)).toBeNull();
    expect(utcOffsetOf(undefined)).toBeNull();
  });
});

describe('localTimeLabel', () => {
  it('formats the wall clock in that country as h:mm with a one-letter meridiem', () => {
    expect(localTimeLabel('KR', '2026-09-23T12:01:00Z')).toBe('9:01p');
    expect(localTimeLabel('FR', new Date('2026-09-23T12:00:00Z'))).toBe('1:00p');
    expect(localTimeLabel('GB', '2026-09-23T00:05:00Z')).toBe('12:05a');
    expect(localTimeLabel('GB', '2026-09-23T12:00:00Z')).toBe('12:00p');
    expect(localTimeLabel('IN', '2026-09-23T12:00:00Z')).toBe('5:30p');
  });

  it('wraps across midnight in both directions', () => {
    expect(localTimeLabel('US', '2026-09-23T03:30:00Z')).toBe('10:30p');
    expect(localTimeLabel('NZ', '2026-09-23T13:15:00Z')).toBe('1:15a');
  });

  it('is null for an unknown country or an unparseable date', () => {
    expect(localTimeLabel('ZZ', '2026-09-23T12:00:00Z')).toBeNull();
    expect(localTimeLabel(null, '2026-09-23T12:00:00Z')).toBeNull();
    expect(localTimeLabel('FR', 'garbage')).toBeNull();
  });

  it('defaults to now', () => {
    expect(localTimeLabel('FR')).toMatch(/^\d{1,2}:\d{2}[ap]$/);
  });
});
