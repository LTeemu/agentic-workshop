import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditCompression } from '../server/audit/compression.js';

function makeResource(url, headers) {
  return { url, type: 'script', headers };
}

describe('auditCompression', () => {
  it('returns 100 score when all resources are compressed', () => {
    const pageHeaders = { url: 'https://example.com', headers: { 'content-encoding': 'gzip' } };
    const resources = [
      makeResource('https://example.com/a.js', {
        'content-encoding': 'gzip',
        'content-length': '1000',
      }),
      makeResource('https://example.com/b.css', {
        'content-encoding': 'br',
        'content-length': '500',
      }),
    ];
    const result = auditCompression(pageHeaders, resources);
    assert.equal(result.score, 100);
    assert.equal(result.resourcesWithoutCompression, 0);
    assert.equal(result.mainPageCompressed, true);
    assert.equal(result.mainPageEncoding, 'gzip');
  });

  it('flags uncompressed resources', () => {
    const pageHeaders = { url: 'https://example.com', headers: {} };
    const resources = [
      makeResource('https://example.com/a.js', { 'content-length': '2000' }),
      makeResource('https://example.com/b.css', { 'content-length': '1000' }),
    ];
    const result = auditCompression(pageHeaders, resources);
    assert.equal(result.resourcesWithoutCompression, 2);
    assert.ok(result.potentialSavingsBytes > 0);
    assert.equal(result.mainPageCompressed, false);
  });

  it('handles empty resource list', () => {
    const pageHeaders = { url: 'https://example.com', headers: {} };
    const result = auditCompression(pageHeaders, []);
    assert.equal(result.score, 100);
    assert.equal(result.resourcesWithoutCompression, 0);
  });

  it('handles resources without content-length', () => {
    const pageHeaders = { url: 'https://example.com', headers: {} };
    const resources = [makeResource('https://example.com/a.js', {})];
    const result = auditCompression(pageHeaders, resources);
    assert.equal(result.resourcesWithoutCompression, 0);
  });

  it('handles mixed compressed and uncompressed content', () => {
    const pageHeaders = { url: 'https://example.com', headers: { 'content-encoding': 'gzip' } };
    const resources = [
      makeResource('https://example.com/a.js', {
        'content-encoding': 'gzip',
        'content-length': '1000',
      }),
      makeResource('https://example.com/b.js', { 'content-length': '500' }),
    ];
    const result = auditCompression(pageHeaders, resources);
    assert.equal(result.resourcesWithoutCompression, 1);
    assert.ok(result.score < 100);
  });
});
