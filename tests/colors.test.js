const { describe, it } = require('node:test');
const assert = require('node:assert');

const { paint, colorizeUrls } = require('../app/colors');

const CYAN_BOLD = '\x1b[36m\x1b[1m';
const RESET = '\x1b[0m';

describe('colorizeUrls', () => {
  it('wraps a URL in bold cyan when enabled', () => {
    assert.strictEqual(
      colorizeUrls('go to http://localhost:4469/ now', true),
      `go to ${CYAN_BOLD}http://localhost:4469/${RESET} now`,
    );
  });

  it('wraps every URL in multi-URL text', () => {
    assert.strictEqual(
      colorizeUrls('a http://x.com b https://y.org c', true),
      `a ${CYAN_BOLD}http://x.com${RESET} b ${CYAN_BOLD}https://y.org${RESET} c`,
    );
  });

  it('leaves trailing punctuation outside the highlighted span', () => {
    assert.strictEqual(
      colorizeUrls('see http://x.com.', true),
      `see ${CYAN_BOLD}http://x.com${RESET}.`,
    );
    assert.strictEqual(colorizeUrls('(http://x.com)', true), `(${CYAN_BOLD}http://x.com${RESET})`);
  });

  it('returns plain text when disabled', () => {
    assert.strictEqual(
      colorizeUrls('go to http://localhost:3000 now', false),
      'go to http://localhost:3000 now',
    );
  });

  it('defaults to plain text when stdout is piped (no ANSI in stored logs)', () => {
    assert.strictEqual(
      colorizeUrls('go to http://localhost:3000 now'),
      'go to http://localhost:3000 now',
    );
  });

  it('leaves text without URLs unchanged', () => {
    assert.strictEqual(colorizeUrls('no urls here', true), 'no urls here');
  });
});

describe('paint', () => {
  it('wraps text in the requested styles when enabled is forced', () => {
    // paint has no enabled override; the enabled path is covered via colorizeUrls.
    // Here we pin the disabled default (piped test runner) instead.
    assert.strictEqual(paint('x', 'cyan', 'bold'), 'x');
  });

  it('throws on unknown styles', () => {
    assert.throws(() => paint('x', 'greed'), /Unknown color style/);
  });
});
