const { describe, it } = require('node:test');
const assert = require('node:assert');
const { watchResize } = require('../../app/public/browser-utils/resize-utils');

const flushTimers = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('watchResize', () => {
  it('debounces a burst of observer notifications into one callback', async () => {
    let fired = 0;
    let notify = null;
    const FakeObserver = class {
      constructor(callback) {
        notify = callback;
      }
      observe() {}
      disconnect() {}
    };
    const stop = watchResize(
      {},
      () => {
        fired += 1;
      },
      0,
      FakeObserver,
    );
    notify();
    notify();
    notify();
    assert.strictEqual(fired, 0);
    await flushTimers();
    assert.strictEqual(fired, 1);
    notify();
    await flushTimers();
    assert.strictEqual(fired, 2);
    stop();
  });

  it('falls back to a resize listener on the target without an observer', async () => {
    const listeners = {};
    const target = {
      addEventListener(type, callback) {
        listeners[type] = callback;
      },
      removeEventListener(type) {
        delete listeners[type];
      },
    };
    let fired = 0;
    const stop = watchResize(
      {},
      () => {
        fired += 1;
      },
      0,
      null,
      target,
    );
    assert.ok(listeners.resize);
    listeners.resize();
    listeners.resize();
    assert.strictEqual(fired, 0);
    await flushTimers();
    assert.strictEqual(fired, 1);
    stop();
    assert.strictEqual(listeners.resize, undefined);
  });

  it('no-ops when neither an observer nor a usable target exists', () => {
    assert.doesNotThrow(() => watchResize({}, () => {}, 100, null, {}));
  });
});
