import config from './config.js';

/**
 * Token-bucket rate limiter, keyed by client IP.
 *
 * Each client gets a bucket that refills at `tokensPerSecond`.
 * Bursts up to `maxBurst` are allowed to handle short spikes.
 */
export class TokenBucketLimiter {
  #buckets = new Map();
  #tokensPerSecond;
  #maxBurst;
  #intervalMs;

  /**
   * @param {object} opts
   * @param {number} [opts.tokensPerSecond=10]
   * @param {number} [opts.maxBurst=20]
   * @param {number} [opts.cleanupIntervalMs=60000] - How often to purge stale buckets.
   */
  constructor(opts = {}) {
    this.#tokensPerSecond = opts.tokensPerSecond ?? config.rateLimit.tokensPerSecond;
    this.#maxBurst = opts.maxBurst ?? config.rateLimit.maxBurst;
    this.#intervalMs = opts.cleanupIntervalMs ?? 60_000;

    // Periodically purge stale buckets to prevent memory leaks
    if (this.#intervalMs > 0) {
      setInterval(() => this.#cleanup(), this.#intervalMs);
    }
  }

  /**
   * Attempt to consume tokens from a client's bucket.
   *
   * @param {string} clientKey - Typically the IP address.
   * @param {number} [cost=1] - Token cost of this request.
   * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
   *   retryAfter is seconds until the bucket is full again (0 if allowed).
   */
  consume(clientKey, cost = 1) {
    const now = Date.now();
    let bucket = this.#buckets.get(clientKey);

    if (!bucket) {
      bucket = { tokens: this.#maxBurst, lastRefill: now };
      this.#buckets.set(clientKey, bucket);
    }

    // Refill based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    const refill = elapsed * this.#tokensPerSecond;
    bucket.tokens = Math.min(this.#maxBurst, bucket.tokens + refill);
    bucket.lastRefill = now;

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfter: 0 };
    }

    const deficit = cost - bucket.tokens;
    const retryAfter = Math.ceil((deficit / this.#tokensPerSecond) * 10) / 10;

    return { allowed: false, remaining: 0, retryAfter };
  }

  /**
   * Remove stale buckets that haven't been touched in over a minute.
   */
  #cleanup() {
    const now = Date.now();
    const staleThreshold = now - 120_000; // 2 minutes without activity

    for (const [key, bucket] of this.#buckets) {
      if (bucket.lastRefill < staleThreshold) {
        this.#buckets.delete(key);
      }
    }
  }

  /**
   * Current number of tracked clients.
   */
  get clientCount() {
    return this.#buckets.size;
  }
}
