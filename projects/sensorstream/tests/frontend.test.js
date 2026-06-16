import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Directly import the pure functions from shared modules
import { parseSSEChunk } from '../shared/sse-parser.js';
import { backoffDelay } from '../shared/reconnect.js';

describe('parseSSEChunk', () => {
  it('parses a single data event', () => {
    const chunk = 'data: {"id":"abc","value":22.5}\n\n';
    const events = parseSSEChunk(chunk);
    assert.equal(events.length, 1);
    assert.equal(events[0].event, 'message');
    assert.equal(events[0].id, null);
    assert.equal(events[0].data.id, 'abc');
    assert.equal(events[0].data.value, 22.5);
  });

  it('parses event with type and id', () => {
    const chunk = 'event: reading\nid: evt-001\ndata: {"type":"temperature"}\n\n';
    const events = parseSSEChunk(chunk);
    assert.equal(events.length, 1);
    assert.equal(events[0].event, 'reading');
    assert.equal(events[0].id, 'evt-001');
    assert.equal(events[0].data.type, 'temperature');
  });

  it('parses multiple events in one chunk', () => {
    const chunk = 'event: a\ndata: {"i":1}\n\nevent: b\ndata: {"i":2}\n\n';
    const events = parseSSEChunk(chunk);
    assert.equal(events.length, 2);
    assert.equal(events[0].event, 'a');
    assert.equal(events[0].data.i, 1);
    assert.equal(events[1].event, 'b');
    assert.equal(events[1].data.i, 2);
  });

  it('handles multi-line data fields', () => {
    const chunk = 'data: {"id":"abc"\ndata: ,"value":42}\n\n';
    const events = parseSSEChunk(chunk);
    assert.equal(events.length, 1);
    assert.equal(events[0].data.id, 'abc');
    assert.equal(events[0].data.value, 42);
  });

  it('skips malformed JSON gracefully', () => {
    const chunk = 'data: {bad json}\n\n';
    const events = parseSSEChunk(chunk);
    assert.equal(events.length, 0);
  });

  it('skips comment-only lines (heartbeat)', () => {
    const chunk = ':heartbeat 12345\n\n';
    const events = parseSSEChunk(chunk);
    assert.equal(events.length, 0);
  });

  it('returns empty array for empty input', () => {
    assert.deepEqual(parseSSEChunk(''), []);
    assert.deepEqual(parseSSEChunk('   '), []);
  });
});

describe('backoffDelay', () => {
  it('returns base delay for attempt 0', () => {
    const delay = backoffDelay(0, { baseMs: 1000, jitter: 0 });
    assert.equal(delay, 1000);
  });

  it('doubles for each attempt', () => {
    const d0 = backoffDelay(0, { baseMs: 1000, jitter: 0 });
    const d1 = backoffDelay(1, { baseMs: 1000, jitter: 0 });
    const d2 = backoffDelay(2, { baseMs: 1000, jitter: 0 });
    assert.equal(d0, 1000);
    assert.equal(d1, 2000);
    assert.equal(d2, 4000);
  });

  it('caps at maxMs', () => {
    const delay = backoffDelay(10, { baseMs: 1000, maxMs: 5000, jitter: 0 });
    assert.equal(delay, 5000);
  });

  it('applies jitter within expected range', () => {
    const baseMs = 1000;
    const jitter = 0.2;
    const delays = Array.from({ length: 50 }, () => backoffDelay(3, { baseMs, jitter }));
    for (const d of delays) {
      // jitter: ±20% of 8000 (2^3 * 1000)
      assert.ok(d >= 6400, `Delay ${d} too low (min 6400)`);
      assert.ok(d <= 9600, `Delay ${d} too high (max 9600)`);
    }
  });

  it('defaults work without opts', () => {
    const delay = backoffDelay(0);
    assert.ok(typeof delay === 'number');
    assert.ok(delay > 0);
  });

  it('randomness distributes across attempts', () => {
    // Multiple calls with same attempt should give different values due to jitter
    const delays = new Set(Array.from({ length: 20 }, () => backoffDelay(2)));
    assert.ok(delays.size > 1, 'Should produce varied delays with jitter');
  });
});
