import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { estimateCarbon } from '../server/audit/carbon.js';

describe('estimateCarbon', () => {
  it('computes exact grams and an A rating for a small page', () => {
    const result = estimateCarbon(50000);
    assert.equal(result.gramsPerVisit, 0.01);
    assert.equal(result.rating, 'A');
  });

  it('grams scale deterministically with page size', () => {
    assert.equal(estimateCarbon(100000).gramsPerVisit, 0.03);
    assert.equal(estimateCarbon(5000000).gramsPerVisit, 1.46);
  });

  it('returns accurate ratings across the range', () => {
    assert.equal(estimateCarbon(2000000).gramsPerVisit, 0.59);
    assert.equal(estimateCarbon(2000000).rating, 'D');
    assert.equal(estimateCarbon(5000000).rating, 'F');
  });

  it('handles zero bytes', () => {
    const result = estimateCarbon(0);
    assert.equal(result.gramsPerVisit, 0);
    assert.equal(result.rating, 'A');
    assert.equal(result.equivalent, 'No data');
  });

  it('handles negative and undefined values', () => {
    assert.equal(estimateCarbon(-1).gramsPerVisit, 0);
    assert.equal(estimateCarbon(undefined).gramsPerVisit, 0);
  });
});
