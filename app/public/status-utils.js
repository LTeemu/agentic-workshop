/**
 * Status-dot helpers shared between the dashboard UI and its unit tests.
 * UMD-style so the browser gets `window.StatusUtils` while node:test can
 * `require()` the same file without a DOM.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StatusUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Map a raw SSE project-status value to a dot status. */
  function normalizeProjectStatus(raw, fallback) {
    if (raw === 'starting' || raw === 'running' || raw === 'stopped') return raw;
    if (raw === 'timeout') return 'error';
    return fallback || 'stopped';
  }

  /** Map a project-exit code to a dot status: only clean stops are gray. */
  function exitCodeToStatus(code) {
    return code === 0 || code === 'stopped' ? 'stopped' : 'error';
  }

  /**
   * Reconcile a known dot status with the authoritative /api/projects payload.
   * The payload can't distinguish a crash (red) from a clean stop (gray), so
   * SSE events stay authoritative while a project is alive — but once the
   * server confirms a project is stopped, transient alert states ('error',
   * stale 'starting') resolve to gray instead of sticking forever; and a stale
   * gray dot upgrades to 'running' once the payload confirms liveness (e.g.
   * after an SSE reconnect blip).
   * @param {string|undefined} cur current dot status
   * @param {string} payload server-reported status (running/starting/stopped)
   */
  function reconcileStatus(cur, payload) {
    if (cur === undefined) return payload;
    if (cur === 'starting') {
      if (payload === 'running') return 'running';
      if (payload === 'stopped') return 'stopped';
      return cur;
    }
    if (cur === 'running' && payload === 'stopped') return 'stopped';
    if (cur === 'stopped' && payload === 'running') return 'running';
    if (cur === 'error' && payload === 'stopped') return 'stopped';
    return cur;
  }

  return { normalizeProjectStatus, exitCodeToStatus, reconcileStatus };
});
