/**
 * Pure function: calculates exponential backoff delay.
 *
 * @param {number} attempt - 0-based retry attempt number.
 * @param {object} [opts]
 * @param {number} [opts.baseMs=1000] - Initial delay in ms.
 * @param {number} [opts.maxMs=30000] - Maximum delay cap.
 * @param {number} [opts.jitter=0.2] - Random jitter fraction (0 = none, 0.2 = ±20%).
 * @returns {number} Delay in milliseconds.
 */
export function backoffDelay(attempt, opts = {}) {
  const baseMs = opts.baseMs ?? 1000;
  const maxMs = opts.maxMs ?? 30_000;
  const jitter = opts.jitter ?? 0.2;

  const delay = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  const jitterAmount = delay * jitter * (Math.random() * 2 - 1);
  return Math.round(delay + jitterAmount);
}
