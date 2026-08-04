import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditProtocol } from '../server/audit/protocol.js';

describe('auditProtocol', () => {
  it('scores 100 when all resources use HTTP/2', () => {
    const result = auditProtocol(
      [
        { protocol: 'h2', headers: {} },
        { protocol: 'HTTP/2', headers: {} },
      ],
      { headers: {} },
    );
    assert.equal(result.http2Resources, 2);
    assert.equal(result.http1Resources, 0);
    assert.equal(result.unknownResources, 0);
    assert.equal(result.http2Percent, 100);
    assert.equal(result.score, 100);
  });

  it('scores 50 for an even HTTP/2 vs HTTP/1 mix', () => {
    const result = auditProtocol(
      [
        { protocol: 'h2', headers: {} },
        { protocol: 'http/1.1', headers: {} },
      ],
      { headers: {} },
    );
    assert.equal(result.http2Percent, 50);
    assert.equal(result.score, 50);
  });

  it('classifies content-encoding as HTTP/2 when protocol is unknown', () => {
    const result = auditProtocol([{ headers: { 'content-encoding': 'br' } }], { headers: {} });
    assert.equal(result.http2Resources, 1);
    assert.equal(result.unknownResources, 0);
  });

  it('counts resources with no protocol info as unknown', () => {
    const result = auditProtocol([{ headers: {} }], { headers: {} });
    assert.equal(result.unknownResources, 1);
    assert.equal(result.http2Percent, 0);
    assert.equal(result.score, 0);
  });

  it('handles an empty resource list', () => {
    const result = auditProtocol([], { headers: {} });
    assert.equal(result.totalChecked, 0);
    assert.equal(result.mainPageProtocol, 'unknown');
    assert.equal(result.http2Percent, 0);
  });

  it('reads the main page protocol from the x-protocol header', () => {
    const result = auditProtocol([], { headers: { 'x-protocol': 'h2' } });
    assert.equal(result.mainPageProtocol, 'h2');
  });
});
