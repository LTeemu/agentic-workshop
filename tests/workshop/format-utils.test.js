const { describe, it } = require('node:test');
const assert = require('node:assert');
const { stripAnsi, escapeHtml } = require('../../app/public/browser-utils/format-utils');

describe('stripAnsi', () => {
  it('returns empty string for falsy input', () => {
    assert.strictEqual(stripAnsi(''), '');
    assert.strictEqual(stripAnsi(null), '');
    assert.strictEqual(stripAnsi(undefined), '');
  });

  it('strips CSI color codes', () => {
    assert.strictEqual(stripAnsi('\x1B[31mred\x1B[0m'), 'red');
    assert.strictEqual(stripAnsi('\x1B[1;32mhello\x1B[0m'), 'hello');
  });

  it('leaves plain text untouched', () => {
    assert.strictEqual(stripAnsi('hello world'), 'hello world');
  });

  it('strips multiple sequences', () => {
    assert.strictEqual(stripAnsi('\x1B[31mred\x1B[0m and \x1B[32mgreen\x1B[0m'), 'red and green');
  });
});

describe('escapeHtml', () => {
  it('returns empty string for falsy input', () => {
    assert.strictEqual(escapeHtml(''), '');
    assert.strictEqual(escapeHtml(null), '');
    assert.strictEqual(escapeHtml(undefined), '');
  });

  it('escapes &, <, >, "', () => {
    assert.strictEqual(escapeHtml('&'), '&amp;');
    assert.strictEqual(escapeHtml('<'), '&lt;');
    assert.strictEqual(escapeHtml('>'), '&gt;');
    assert.strictEqual(escapeHtml('"'), '&quot;');
    assert.strictEqual(
      escapeHtml('<a href="x">&</a>'),
      '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;',
    );
  });

  it('leaves plain text untouched', () => {
    assert.strictEqual(escapeHtml('hello'), 'hello');
  });
});
