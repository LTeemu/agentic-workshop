import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditThirdParties } from '../server/audit/third-parties.js';

const res = (url, type = 'script') => ({ url, type });

describe('auditThirdParties', () => {
  it('ignores same-origin resources', () => {
    const result = auditThirdParties([res('https://example.com/app.js')], 'https://example.com');
    assert.equal(result.totalExternal, 0);
    assert.equal(result.score, 100);
  });

  it('counts and groups external resources by domain', () => {
    const result = auditThirdParties(
      [res('https://cdn.x.com/a.js'), res('https://cdn.x.com/b.js'), res('https://www.y.com/c.js')],
      'https://example.com',
    );
    assert.equal(result.totalExternal, 3);
    assert.equal(result.uniqueDomains, 2);
    assert.equal(result.domains[0].hostname, 'cdn.x.com');
    assert.equal(result.domains[0].count, 2);
  });

  it('detects known tracker domains', () => {
    const result = auditThirdParties(
      [res('https://www.google-analytics.com/ga.js'), res('https://cdn.example.net/normal.js')],
      'https://example.com',
    );
    assert.ok(result.trackerDomains.includes('www.google-analytics.com'));
    const tracker = result.resources.find((r) => r.hostname === 'www.google-analytics.com');
    assert.equal(tracker.isTracker, true);
    const normal = result.resources.find((r) => r.hostname === 'cdn.example.net');
    assert.equal(normal.isTracker, false);
  });

  it('detects path-based tracker entries (linkedin.com/tr)', () => {
    const result = auditThirdParties(
      [res('https://www.linkedin.com/tr/pixel?id=1')],
      'https://example.com',
    );
    assert.equal(result.resources[0].isTracker, true);
    assert.ok(result.trackerDomains.includes('www.linkedin.com'));
  });

  it('skips invalid resource URLs', () => {
    const result = auditThirdParties(
      [res('not a url'), res('https://cdn.x.com/a.js')],
      'https://example.com',
    );
    assert.equal(result.totalExternal, 1);
  });

  it('returns the fallback result for an invalid page URL', () => {
    const result = auditThirdParties([res('https://cdn.x.com/a.js')], 'not a url');
    assert.equal(result.totalExternal, 0);
    assert.equal(result.score, 100);
  });

  it('scores proportionally to the external resource count', () => {
    // score = 100 - min(count, 50)
    const one = auditThirdParties([res('https://cdn.x.com/a.js')], 'https://example.com');
    assert.equal(one.score, 99);
    const fifty = auditThirdParties(
      Array.from({ length: 50 }, (_, i) => res(`https://cdn.x.com/${i}.js`)),
      'https://example.com',
    );
    assert.equal(fifty.score, 50);
  });
});
