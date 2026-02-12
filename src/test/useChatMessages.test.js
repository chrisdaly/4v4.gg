import { describe, it, expect } from 'vitest';
// Test the extracted formatting functions directly
import { formatDateDivider, getDateKey, formatTime, formatDateTime } from '../lib/useChatMessages';

describe('getDateKey', () => {
  it('returns same key for same date', () => {
    // Use times that fall on the same local date regardless of timezone
    expect(getDateKey('2025-06-15T12:00:00Z')).toBe(getDateKey('2025-06-15T12:30:00Z'));
  });

  it('returns different keys for different dates', () => {
    expect(getDateKey('2025-06-15T10:00:00Z')).not.toBe(getDateKey('2025-06-16T10:00:00Z'));
  });
});

describe('formatDateDivider', () => {
  it('returns "Today" for today', () => {
    const now = new Date().toISOString();
    expect(formatDateDivider(now)).toBe('Today');
  });

  it('returns "Yesterday" for yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(formatDateDivider(yesterday)).toBe('Yesterday');
  });

  it('returns formatted date for older dates', () => {
    const result = formatDateDivider('2024-01-15T12:00:00Z');
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/15/);
  });
});

describe('formatTime', () => {
  it('formats as HH:MM', () => {
    const result = formatTime('2025-06-15T14:30:00Z');
    // Result depends on timezone, just check it's a valid time string
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('formatDateTime', () => {
  it('returns time only for today', () => {
    const now = new Date().toISOString();
    const result = formatDateTime(now);
    // Should not contain "Yesterday" or a date
    expect(result).not.toContain('Yesterday');
  });

  it('prefixes "Yesterday" for yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000);
    yesterday.setHours(14, 30, 0, 0);
    const result = formatDateTime(yesterday.toISOString());
    expect(result).toContain('Yesterday');
  });
});
