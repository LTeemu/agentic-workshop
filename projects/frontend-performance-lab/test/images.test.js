import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditImages } from '../server/audit/images.js';

describe('auditImages', () => {
  it('passes when all images are optimized', () => {
    const html = `
      <img src="a.jpg" loading="lazy" width="100" height="100" alt="A">
      <img src="b.jpg" loading="lazy" width="200" height="200" alt="B">
    `;
    const result = auditImages(html);
    assert.equal(result.total, 2);
    assert.equal(result.withoutLazyLoading, 0);
    assert.equal(result.withoutDimensions, 0);
    assert.equal(result.withoutAlt, 0);
  });

  it('flags missing attributes', () => {
    const html = '<img src="a.jpg"><img src="b.jpg">';
    const result = auditImages(html);
    assert.equal(result.total, 2);
    assert.equal(result.withoutLazyLoading, 2);
    assert.equal(result.withoutDimensions, 2);
    assert.equal(result.withoutAlt, 2);
  });

  it('ignores data URLs', () => {
    const html = '<img src="data:image/png;base64,abc123">';
    const result = auditImages(html);
    assert.equal(result.total, 0);
  });

  it('handles empty HTML', () => {
    const result = auditImages('');
    assert.equal(result.total, 0);
    assert.equal(result.score, 100);
  });
});
