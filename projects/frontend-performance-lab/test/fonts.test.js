import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditFonts } from '../server/audit/fonts.js';

describe('auditFonts', () => {
  it('returns 100 score when no fonts used', () => {
    const html = '<html><head><title>T</title></head><body></body></html>';
    const result = auditFonts(html);
    assert.equal(result.score, 100);
    assert.equal(result.issues.length, 0);
  });

  it('detects Google Fonts without preload', () => {
    const html =
      '<html><head><link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet"><title>T</title></head><body></body></html>';
    const result = auditFonts(html);
    assert.ok(result.issues.length > 0);
    assert.equal(result.googleFonts, true);
  });

  it('flags @font-face without font-display', () => {
    const html =
      '<html><head><style>@font-face { font-family: "Custom"; src: url("/font.woff2"); }</style><title>T</title></head><body></body></html>';
    const result = auditFonts(html);
    assert.ok(result.issues.some((i) => i.includes('font-display')));
  });

  it('handles empty HTML', () => {
    const result = auditFonts('');
    assert.equal(result.total, 0);
    assert.equal(result.score, 100);
  });
});
