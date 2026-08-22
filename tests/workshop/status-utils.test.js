const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  normalizeProjectStatus,
  exitCodeToStatus,
  reconcileStatus,
} = require('../../app/public/browser-utils/status-utils');

describe('normalizeProjectStatus', () => {
  it('passes through starting and running', () => {
    assert.strictEqual(normalizeProjectStatus('starting'), 'starting');
    assert.strictEqual(normalizeProjectStatus('running'), 'running');
  });

  it('maps timeout to error (red dot)', () => {
    assert.strictEqual(normalizeProjectStatus('timeout'), 'error');
  });

  it('passes through stopped even when the current dot is starting', () => {
    // The server broadcasts 'stopped' after a failed pre-spawn start; it must
    // clear a yellow dot in other tabs, not fall back to the stale 'starting'.
    assert.strictEqual(normalizeProjectStatus('stopped', 'starting'), 'stopped');
    assert.strictEqual(normalizeProjectStatus('stopped', 'error'), 'stopped');
    assert.strictEqual(normalizeProjectStatus('stopped'), 'stopped');
  });

  it('falls back to the current status or stopped for unknown values', () => {
    assert.strictEqual(normalizeProjectStatus('bogus', 'running'), 'running');
    assert.strictEqual(normalizeProjectStatus('bogus'), 'stopped');
  });
});

describe('exitCodeToStatus', () => {
  it('treats clean exits as stopped (gray dot)', () => {
    assert.strictEqual(exitCodeToStatus(0), 'stopped');
    assert.strictEqual(exitCodeToStatus('stopped'), 'stopped');
  });

  it('treats crashes and failed starts as error (red dot)', () => {
    assert.strictEqual(exitCodeToStatus(-1), 'error');
    assert.strictEqual(exitCodeToStatus(1), 'error');
    assert.strictEqual(exitCodeToStatus(null), 'error');
  });
});

describe('reconcileStatus', () => {
  it('adopts the payload for unknown projects', () => {
    assert.strictEqual(reconcileStatus(undefined, 'stopped'), 'stopped');
    assert.strictEqual(reconcileStatus(undefined, 'running'), 'running');
    assert.strictEqual(reconcileStatus(undefined, 'starting'), 'starting');
  });

  it('keeps running while the payload says running', () => {
    assert.strictEqual(reconcileStatus('running', 'running'), 'running');
  });

  it('recovers error to running once the payload confirms the process is alive', () => {
    // A liveness-timeout red self-heals: the server keeps watching after the
    // timeout and the payload confirms the process is still up, so the dot
    // recovers instead of sticking red.
    assert.strictEqual(reconcileStatus('error', 'running'), 'running');
  });

  it('downgrades running to stopped when the server confirms a stop', () => {
    assert.strictEqual(reconcileStatus('running', 'stopped'), 'stopped');
  });

  it('upgrades a stale stopped dot to running once the payload confirms liveness', () => {
    // SSE reconnect blip — the server says the project is live again.
    assert.strictEqual(reconcileStatus('stopped', 'running'), 'running');
  });

  it('clears error to stopped once the server confirms the project is stopped', () => {
    // A crash or failed start must not leave a red dot forever.
    assert.strictEqual(reconcileStatus('error', 'stopped'), 'stopped');
  });

  it('resolves a stale starting to stopped when the start attempt ended', () => {
    // Missed the -1 project-exit broadcast (reconnect blip) — the payload says
    // the attempt is over, so don't stay yellow forever.
    assert.strictEqual(reconcileStatus('starting', 'stopped'), 'stopped');
  });

  it('upgrades starting to running once the server confirms liveness', () => {
    assert.strictEqual(reconcileStatus('starting', 'running'), 'running');
  });

  it('keeps starting while the payload still reports starting', () => {
    assert.strictEqual(reconcileStatus('starting', 'starting'), 'starting');
  });

  it('keeps the current state during a transient starting payload', () => {
    // 'starting' is momentary; don't flicker already-known states.
    assert.strictEqual(reconcileStatus('running', 'starting'), 'running');
    assert.strictEqual(reconcileStatus('stopped', 'starting'), 'stopped');
    assert.strictEqual(reconcileStatus('error', 'starting'), 'error');
  });
});
