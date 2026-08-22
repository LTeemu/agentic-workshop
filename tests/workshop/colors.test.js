const { describe, it } = require('node:test');
const assert = require('node:assert');

const { paint, colorizeUrls } = require('../../app/server-utils/color-utils');

describe('colorizeUrls', () => {
  it('wraps URLs with ANSI when enabled', () => {
    const out = colorizeUrls('go to http://localhost:4469/ now', true);
    assert.ok(out.includes('\x1b['), 'enabled output should carry color codes');
    assert.ok(out.includes('http://localhost:4469/'), 'URL text must be preserved');
  });

  it('keeps output plain (no ANSI) when disabled, so stored logs stay clean', () => {
    const out = colorizeUrls('go to http://localhost:4469/ now', false);
    assert.ok(!out.includes('\x1b['), 'disabled output must not carry color codes');
    assert.ok(out.includes('http://localhost:4469/'), 'URL text must be preserved');
  });
});

describe('paint', () => {
  it('throws on unknown style names', () => {
    assert.throws(() => paint('x', 'greed'), /Unknown color style/);
  });
});
