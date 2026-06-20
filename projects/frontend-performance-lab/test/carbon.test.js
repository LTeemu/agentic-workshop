import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { estimateCarbon } from '../server/audit/carbon.js';

describe('estimateCarbon', () => {
  it('returns A rating and positive grams for small pages', () => {
    const result = estimateCarbon(50000);
    assert.equal(result.rating, 'A');
    assert.ok(result.gramsPerVisit > 0);
  });

  it('returns lower rating for larger pages', () => {
    const small = estimateCarbon(100000);
    const large = estimateCarbon(5000000);
    assert.ok(small.gramsPerVisit < large.gramsPerVisit);
  });

  it('handles zero bytes', () => {
    const result = estimateCarbon(0);
    assert.equal(result.gramsPerVisit, 0);
    assert.equal(result.rating, 'A');
  });

  it('handles negative/undefined values', () => {
    const result = estimateCarbon(-1);
    assert.equal(result.gramsPerVisit, 0);
  });
});
