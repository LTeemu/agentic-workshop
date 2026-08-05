/**
 * Frame-rate agnostic requestAnimationFrame loop.
 * Accumulates real elapsed time and calls `callback({ time, delta })` with
 * seconds. `start()` / `stop()` are idempotent; time keeps accumulating
 * across pause/resume so animations stay in sync.
 *
 * @param {(frame: { time: number, delta: number }) => void} callback
 * @returns {{ start: () => void, stop: () => void }}
 */
export function createAnimationLoop(callback) {
  let animId = null;
  let running = false;
  let lastFrame = 0;
  let time = 0;

  function tick(ts) {
    if (!running) {
      animId = null;
      return;
    }
    // First frame has no previous timestamp — treat dt as 0
    if (lastFrame === 0) lastFrame = ts;
    const delta = Math.min((ts - lastFrame) / 1000, 0.05);
    lastFrame = ts;
    time += delta;
    callback({ time, delta });
    if (running) animId = requestAnimationFrame(tick);
    else animId = null;
  }

  function start() {
    if (running) return;
    running = true;
    lastFrame = 0;
    animId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (animId) cancelAnimationFrame(animId);
    animId = null;
  }

  return { start, stop };
}
