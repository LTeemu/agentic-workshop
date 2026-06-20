import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditSecurity } from '../server/audit/security.js';

describe('auditSecurity', () => {
  it('returns 100 score when all headers present', () => {
    const pageHeaders = {
      headers: {
        'content-security-policy': "default-src 'self'",
        'strict-transport-security': 'max-age=31536000',
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=()',
      },
    };
    const result = auditSecurity(pageHeaders);
    assert.equal(result.score, 100);
    assert.equal(result.missing.length, 0);
  });

  it('flags missing headers', () => {
    const pageHeaders = { headers: {} };
    const result = auditSecurity(pageHeaders);
    assert.equal(result.score, 0);
    assert.ok(result.missing.length > 0);
  });

  it('handles partial header set', () => {
    const pageHeaders = {
      headers: {
        'content-security-policy': "default-src 'self'",
        'x-frame-options': 'SAMEORIGIN',
      },
    };
    const result = auditSecurity(pageHeaders);
    assert.ok(result.score > 0 && result.score < 100);
    assert.ok(result.missing.length > 0);
  });

  it('returns present headers with values', () => {
    const pageHeaders = { headers: { 'x-frame-options': 'DENY' } };
    const result = auditSecurity(pageHeaders);
    assert.equal(result.present.length, 1);
    assert.equal(result.present[0].header, 'X-Frame-Options');
    assert.equal(result.present[0].value, 'DENY');
  });
});
