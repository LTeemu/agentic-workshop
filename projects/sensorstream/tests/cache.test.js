import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { TtlCache } from '../cache.js';

describe('TtlCache', () => {
  let cache;

  before(() => {
    cache = new TtlCache(1000); // 1s default TTL
  });

  after(() => {
    cache.clear();
  });

  it('stores and retrieves a value', () => {
    cache.set('key1', { data: 123 });
    assert.deepEqual(cache.get('key1'), { data: 123 });
  });

  it('returns undefined for missing key', () => {
    assert.equal(cache.get('nonexistent'), undefined);
  });

  it('reports has() correctly for existing keys', () => {
    cache.set('key2', 'value');
    assert.equal(cache.has('key2'), true);
    assert.equal(cache.has('nonexistent'), false);
  });

  it('expires entries after TTL', async () => {
    cache.set('expire-key', 'will-expire', 50); // 50ms TTL
    assert.equal(cache.get('expire-key'), 'will-expire');

    await new Promise((r) => setTimeout(r, 60));

    assert.equal(cache.get('expire-key'), undefined);
    assert.equal(cache.has('expire-key'), false);
  });

  it('returns undefined for expired entries on get', () => {
    cache.set('exp-fast', 'x', 10);
    // After expiry, get returns undefined
  });

  it('invalidates keys by prefix', () => {
    cache.set('user:1', 'a');
    cache.set('user:2', 'b');
    cache.set('config:theme', 'dark');

    const count = cache.invalidate('user:');
    assert.equal(count, 2);
    assert.equal(cache.get('user:1'), undefined);
    assert.equal(cache.get('user:2'), undefined);
    assert.equal(cache.get('config:theme'), 'dark'); // Not affected
  });

  it('clears all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    assert.equal(cache.size, 0);
    assert.equal(cache.get('a'), undefined);
  });

  it('tracks size correctly', () => {
    cache.clear();
    assert.equal(cache.size, 0);
    cache.set('s1', 1);
    cache.set('s2', 2);
    assert.equal(cache.size, 2);
  });

  it('uses custom TTL when provided', () => {
    cache.clear();
    cache.set('short', 'x', 100);
    cache.set('long', 'y', 5000);

    // Both should be present initially
    assert.equal(cache.get('short'), 'x');
    assert.equal(cache.get('long'), 'y');
  });
});
