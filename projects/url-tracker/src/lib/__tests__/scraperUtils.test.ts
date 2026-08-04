import { describe, it, expect } from 'vitest';
import { parseNumber, parseBoolean, matchRobotsPattern } from '@/lib/scraper/scraper';

// Direct, value-level tests for the pure parsing/matching logic in scraper.ts.
// These are the highest-signal targets: subtle format handling that you would
// not trust without explicit verification. The heavier mock-everything
// integration cases in scraper.test.ts only cover wiring.

describe('parseNumber', () => {
  it.each([
    ['$29.99', '29.99'],
    ['£49.95', '49.95'],
    ['€12.5', '12.5'],
    ['1,234.56', '1234.56'],
    ['  $12.50  ', '12.5'],
    ['0.99', '0.99'],
    // parseFloat ignores trailing junk — only the leading digits are used
    ['29.99 USD', '29.99'],
  ])("parses '%s' as '%s'", (raw, expected) => {
    expect(parseNumber(raw)).toBe(expected);
  });

  it('returns null for unparseable or empty input', () => {
    expect(parseNumber('N/A')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('$')).toBeNull();
    expect(parseNumber('   ')).toBeNull();
  });
});

describe('parseBoolean', () => {
  it.each([
    ['In Stock', 'true'],
    ['in stock', 'true'],
    ['instock', 'true'],
    ['Available', 'true'],
    ['Available now', 'true'], // startsWith semantics
    ['true', 'true'],
    ['yes', 'true'],
    ['enabled', 'true'],
    ['Out of Stock', 'false'],
    ['Out of stock', 'false'],
    ['outofstock', 'false'],
    ['Unavailable', 'false'],
    ['false', 'false'],
    ['no', 'false'],
    ['disabled', 'false'],
    // Trailing data attributes / JSON must not break the match
    ['In Stock extra-data', 'true'],
  ])("parses '%s' as '%s'", (raw, expected) => {
    expect(parseBoolean(raw)).toBe(expected);
  });

  it('returns null for unrecognized status', () => {
    expect(parseBoolean('maybe')).toBeNull();
    expect(parseBoolean('')).toBeNull();
    expect(parseBoolean('unknown')).toBeNull();
  });
});

describe('matchRobotsPattern', () => {
  it('never matches an empty pattern', () => {
    expect(matchRobotsPattern('', '/anything')).toBe(false);
  });

  it('matches a plain path as a substring', () => {
    expect(matchRobotsPattern('/product', '/product')).toBe(true);
    expect(matchRobotsPattern('/product', '/products')).toBe(true); // no anchor
    expect(matchRobotsPattern('/private', '/public/private')).toBe(true);
  });

  it('wildcard * matches any character sequence', () => {
    expect(matchRobotsPattern('/product/*', '/product/123')).toBe(true);
    expect(matchRobotsPattern('/product/*', '/product/a/b')).toBe(true);
    expect(matchRobotsPattern('*', '/any/path')).toBe(true);
    expect(matchRobotsPattern('/product*', '/product')).toBe(true); // * matches empty
  });

  it('trailing $ anchors the match to end-of-path', () => {
    expect(matchRobotsPattern('/private$', '/private')).toBe(true);
    expect(matchRobotsPattern('/private$', '/private/page')).toBe(false);
  });

  it('escapes regex metacharacters, matching them literally', () => {
    // The '.' in the pattern must not act as a regex wildcard.
    expect(matchRobotsPattern('/a.b', '/a.b')).toBe(true);
    expect(matchRobotsPattern('/a.b', '/axb')).toBe(false);
    expect(matchRobotsPattern('?query$', '/a?query')).toBe(true);
  });
});
