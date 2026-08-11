import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatRelativeTime, safeDomain } from '@/lib/format';

// Pure value-level tests for the shared dashboard formatters.
// formatRelativeTime is time-sensitive; pin the clock so boundaries are exact.

afterEach(() => {
  vi.useRealTimers();
});

describe('formatRelativeTime', () => {
  it('labels sub-minute ages as "just now"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T12:00:00Z'));
    expect(formatRelativeTime(new Date('2026-08-11T11:59:30Z'))).toBe('just now');
  });

  it('labels minute/hour/day ages compactly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T12:00:00Z'));
    expect(formatRelativeTime(new Date('2026-08-11T11:59:00Z'))).toBe('1m ago');
    expect(formatRelativeTime(new Date('2026-08-11T11:00:00Z'))).toBe('1h ago');
    expect(formatRelativeTime(new Date('2026-08-10T12:00:00Z'))).toBe('1d ago');
  });

  it('falls back to a locale date at 30+ days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T12:00:00Z'));
    const date29d = new Date('2026-07-13T12:00:00Z');
    const date30d = new Date('2026-07-12T12:00:00Z');
    expect(formatRelativeTime(date29d)).toBe('29d ago');
    expect(formatRelativeTime(date30d)).toBe(date30d.toLocaleDateString());
  });

  it('handles future dates as "just now"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T12:00:00Z'));
    expect(formatRelativeTime(new Date('2026-08-11T12:00:05Z'))).toBe('just now');
  });
});

describe('safeDomain', () => {
  it('strips the leading www.', () => {
    expect(safeDomain('https://www.example.com/path')).toBe('example.com');
  });

  it('keeps subdomains and ports', () => {
    expect(safeDomain('http://sub.domain.io:8080/x')).toBe('sub.domain.io');
  });

  it('returns null for unparsable URLs', () => {
    expect(safeDomain('not a url')).toBeNull();
    expect(safeDomain('')).toBeNull();
  });
});
