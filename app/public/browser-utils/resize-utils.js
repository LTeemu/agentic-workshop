/**
 * Resize watching shared between the dashboard UI and its unit tests.
 * UMD-style so the browser gets `window.ResizeUtils` while node:test can
 * `require()` the same file without a DOM.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ResizeUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Watch a container for size changes and call the callback after resizes
   * settle (debounced by `delayMs`). Falls back to a resize listener on the
   * target when ResizeObserver is unavailable, and no-ops without either.
   * Returns a cleanup function.
   */
  function watchResize(container, callback, delayMs, observerCtor, target) {
    const ctor = observerCtor || (typeof ResizeObserver !== 'undefined' ? ResizeObserver : null);
    const resizeTarget = target || (typeof self !== 'undefined' ? self : null);
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(callback, delayMs);
    };
    if (ctor) {
      const observer = new ctor(schedule);
      observer.observe(container);
      return () => observer.disconnect();
    }
    if (!resizeTarget || typeof resizeTarget.addEventListener !== 'function') {
      return () => {};
    }
    resizeTarget.addEventListener('resize', schedule);
    return () => resizeTarget.removeEventListener('resize', schedule);
  }

  return { watchResize };
});
