import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { TokenBucketLimiter } from '../rate-limiter.js';

// Freeze Date.now so token refill math is deterministic. The absolute value is
// irrelevant (math is in seconds); tests advance it explicitly with advance().
const realDateNow = Date.now;
let now;
before(() => {
  now = Date.now();
  Date.now = () => now;
});
after(() => {
  Date.now = realDateNow;
});
const advance = (ms) => {
  now += ms;
};

// cleanupIntervalMs: 0 disables the interval timer so a limiter never keeps the
// test process alive or leaks a periodic task between assertions.
const makeLimiter = (opts) => new TokenBucketLimiter({ cleanupIntervalMs: 0, ...opts });

describe('TokenBucketLimiter', () => {
  it('allows a full burst up to maxBurst, then denies', () => {
    const limiter = makeLimiter({ tokensPerSecond: 1, maxBurst: 3 });
    for (let i = 0; i < 3; i++) {
      assert.equal(limiter.consume('a').allowed, true, `request ${i + 1} should pass`);
    }
    assert.equal(limiter.consume('a').allowed, false);
  });

  it('reports the remaining tokens after each consume', () => {
    const limiter = makeLimiter({ tokensPerSecond: 1, maxBurst: 5 });
    assert.equal(limiter.consume('a').remaining, 4);
    assert.equal(limiter.consume('a').remaining, 3);
  });

  it('refills tokens over elapsed time', () => {
    const limiter = makeLimiter({ tokensPerSecond: 1, maxBurst: 2 });
    limiter.consume('a');
    limiter.consume('a'); // both tokens used
    assert.equal(limiter.consume('a').allowed, false); // bucket empty

    advance(1000); // +1 token at 1/sec
    const r = limiter.consume('a');
    assert.equal(r.allowed, true);
    assert.equal(r.remaining, 0);
  });

  it('caps refilled tokens at maxBurst', () => {
    const limiter = makeLimiter({ tokensPerSecond: 2, maxBurst: 5 });
    limiter.consume('a'); // 5 → 4
    advance(100_000); // far more refill than maxBurst
    const r = limiter.consume('a'); // capped at 5, then 5 → 4
    assert.equal(r.allowed, true);
    assert.equal(r.remaining, 4, 'refill must never push the bucket past maxBurst');
  });

  it('handles fractional token refills from sub-second waits', () => {
    const limiter = makeLimiter({ tokensPerSecond: 10, maxBurst: 10 });
    for (let i = 0; i < 10; i++) limiter.consume('a'); // 10 → 0

    advance(50); // +0.5 token
    const partial = limiter.consume('a');
    assert.equal(partial.allowed, false);
    assert.equal(partial.retryAfter, 0.1); // deficit 0.5 → 0.05s, rounded up

    advance(100); // +1 more token → 1.5 in the bucket
    const r = limiter.consume('a');
    assert.equal(r.allowed, true);
    assert.equal(r.remaining, 0); // floor(1.5 - 1) = 0
  });

  it('prorates retryAfter by the refill rate, rounding up to 0.1s', () => {
    const fast = makeLimiter({ tokensPerSecond: 10, maxBurst: 10 });
    for (let i = 0; i < 10; i++) fast.consume('a'); // 10 → 0
    assert.equal(fast.consume('a').retryAfter, 0.1); // 1/10s exactly

    // tps=3: 1 token needs 1/3s ≈ 0.333s; the ceil-to-0.1s step must yield 0.4.
    // An unrounded implementation returning 0.333 would fail this assertion.
    const slow = makeLimiter({ tokensPerSecond: 3, maxBurst: 3 });
    for (let i = 0; i < 3; i++) slow.consume('a'); // 3 → 0
    assert.equal(slow.consume('a').retryAfter, 0.4);
  });

  it('supports costs greater than one, prorating the bucket', () => {
    const limiter = makeLimiter({ tokensPerSecond: 1, maxBurst: 3 });
    assert.equal(limiter.consume('a', 2).allowed, true);
    assert.equal(limiter.consume('a', 2).allowed, false); // only 1 token left
  });

  it('keeps buckets independent per client', () => {
    const limiter = makeLimiter({ tokensPerSecond: 1, maxBurst: 1 });
    limiter.consume('a'); // exhaust a's bucket
    assert.equal(limiter.consume('b').allowed, true, 'b has its own fresh bucket');
  });

  it('tracks the number of known clients', () => {
    const limiter = makeLimiter({ tokensPerSecond: 1, maxBurst: 1 });
    assert.equal(limiter.clientCount, 0);
    limiter.consume('a');
    limiter.consume('b');
    assert.equal(limiter.clientCount, 2);
  });
});
