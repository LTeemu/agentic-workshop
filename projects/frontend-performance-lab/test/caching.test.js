import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditCaching } from '../server/audit/caching.js';

function makeResource(url, headers) {
  return { url, type: 'script', headers };
}

describe('auditCaching', () => {
  it('returns 100 score when all resources have long cache TTL', () => {
    const resources = [
      makeResource('https://example.com/a.js', { 'cache-control': 'public, max-age=31536000' }),
      makeResource('https://example.com/b.css', { 'cache-control': 'public, max-age=86400' }),
    ];
    const result = auditCaching(resources);
    assert.equal(result.score, 100);
    assert.equal(result.poorCacheCount, 0);
  });

  it('flags resources with short/no cache TTL', () => {
    const resources = [
      makeResource('https://example.com/a.js', { 'cache-control': 'no-cache' }),
      makeResource('https://example.com/b.css', { 'cache-control': 'max-age=60' }),
    ];
    const result = auditCaching(resources);
    assert.ok(result.poorCacheCount > 0);
    assert.ok(result.score < 100);
  });

  it('handles empty resource list', () => {
    const result = auditCaching([]);
    assert.equal(result.score, 100);
    assert.equal(result.poorCacheCount, 0);
  });

  it('handles resources without headers', () => {
    const resources = [
      makeResource('https://example.com/a.js', null),
      { url: 'https://example.com/b.js', type: 'script' },
    ];
    const result = auditCaching(resources);
    assert.equal(result.totalResources, 0);
    assert.equal(result.score, 100);
  });
});
