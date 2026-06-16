/**
 * Simple in-memory TTL cache with automatic expiry.
 *
 * Supports: get, set, has, invalidate (by prefix), clear, size.
 */
export class TtlCache {
  #store = new Map();
  #timers = new Map();

  /**
   * @param {number} [defaultTtlMs=5000] - Default TTL in milliseconds.
   */
  constructor(defaultTtlMs = 5000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Get a cached value. Returns undefined if missing or expired.
   * @param {string} key
   * @returns {*|undefined}
   */
  get(key) {
    const entry = this.#store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.#store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Set a cached value with optional TTL override.
   * @param {string} key
   * @param {*} value
   * @param {number} [ttlMs] - Override default TTL.
   */
  set(key, value, ttlMs) {
    const ttl = ttlMs ?? this.defaultTtlMs;
    this.#store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  /**
   * Check if a key exists and is not expired.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.#store.get(key);
    if (!entry) return false;
    if (entry.expiresAt <= Date.now()) {
      this.#store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Invalidate all keys matching a prefix.
   * @param {string} prefix
   * @returns {number} Number of invalidated entries.
   */
  invalidate(prefix) {
    let count = 0;
    for (const key of this.#store.keys()) {
      if (key.startsWith(prefix)) {
        this.#store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cached entries.
   */
  clear() {
    this.#store.clear();
  }

  /**
   * Number of entries currently stored.
   * @returns {number}
   */
  get size() {
    return this.#store.size;
  }
}
