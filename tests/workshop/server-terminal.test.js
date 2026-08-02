const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { createServer } = require('../../app/server');

/** Real-pty route tests need node-pty (same gate as the unit lifecycle tests). */
let HAS_PTY = true;
try {
  require('node-pty');
} catch {
  HAS_PTY = false;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Read the initial SSE frames (connected + replay) from a stream response.
 * Stops once two complete frames are seen or no data arrives for 500ms —
 * a live stream never closes, so an unbounded read would block forever. */
async function readSseFrames(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (let i = 0; i < 10; i++) {
    const stalled = new Promise((resolve) => setTimeout(() => resolve({ stalled: true }), 500));
    const result = await Promise.race([reader.read(), stalled]);
    if (result.stalled || result.done) break;
    text += decoder.decode(result.value, { stream: true });
    if ((text.match(/\n\n/g) || []).length >= 2) break; // connected + replay frames complete
  }
  decoder.decode(); // flush any partial sequence
  await reader.cancel();
  return text.split('\n\n').filter(Boolean);
}

let server;
let base;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

const jsonBody = (obj) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(obj),
});

async function api(path, options = {}) {
  const res = await fetch(`${base}${path}`, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

describe('terminal HTTP API', () => {
  it('rejects an invalid cwd', async () => {
    const r = await api('/api/terminal', jsonBody({ cwd: 'C:\\__no_such_dir__' }));
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.error);
  });

  it('rejects non-POST on the collection route', async () => {
    const r = await api('/api/terminal', { method: 'GET' });
    assert.strictEqual(r.status, 405);
  });

  it('returns 404 for unknown terminals', async () => {
    const probe = await api('/api/terminal/does-not-exist/opencode');
    assert.strictEqual(probe.status, 404);
    const input = await api('/api/terminal/does-not-exist/input', jsonBody({ data: 'x' }));
    assert.strictEqual(input.status, 404);
  });

  it('returns 410 for streams of unknown terminals', async () => {
    const res = await fetch(`${base}/api/terminal/does-not-exist/stream`);
    assert.strictEqual(res.status, 410);
    await res.text(); // drain so the connection can close
  });

  it('rejects input without a string payload', async () => {
    const r = await api('/api/terminal/does-not-exist/input', jsonBody({ data: 42 }));
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.error);
  });

  it('returns 404 for resize and kill of unknown terminals', async () => {
    const resize = await api(
      '/api/terminal/does-not-exist/resize',
      jsonBody({ cols: 80, rows: 24 }),
    );
    assert.strictEqual(resize.status, 404);
    const kill = await api('/api/terminal/does-not-exist/kill', { method: 'POST' });
    assert.strictEqual(kill.status, 404);
  });

  it('caps oversized request bodies without hanging', async () => {
    const huge = jsonBody({ data: 'x'.repeat(2 * 1024 * 1024) }); // 2 MiB > cap
    const r = await api('/api/terminal/does-not-exist/input', huge);
    // The oversized body is treated as empty → the missing-data check fires.
    assert.strictEqual(r.status, 400);
  });

  it('creates a session and reports opencode state', { skip: !HAS_PTY }, async () => {
    const created = await api('/api/terminal', jsonBody({ cols: 80, rows: 24 }));
    assert.strictEqual(created.status, 200);
    assert.ok(created.body.id);
    assert.strictEqual(created.body.cols, 80);
    assert.strictEqual(created.body.rows, 24);

    const probe = await api(`/api/terminal/${created.body.id}/opencode`);
    assert.strictEqual(probe.status, 200);
    assert.strictEqual(probe.body.running, false);
    assert.ok(probe.body.openCodeCommand);

    await api(`/api/terminal/${created.body.id}/kill`, { method: 'POST' });
  });

  it('creates a session in an explicit cwd', { skip: !HAS_PTY }, async () => {
    const created = await api('/api/terminal', jsonBody({ cwd: process.cwd() }));
    assert.strictEqual(created.status, 200);
    assert.ok(created.body.id);
    await api(`/api/terminal/${created.body.id}/kill`, { method: 'POST' });
  });

  it('streams connected + replay to a late-attaching client', { skip: !HAS_PTY }, async () => {
    const created = await api('/api/terminal', jsonBody({ cols: 80, rows: 24 }));
    const id = created.body.id;
    try {
      await api(`/api/terminal/${id}/input`, jsonBody({ data: 'echo __ROUTE_MARKER__\r' }));
      // Shell boot time varies widely (cold vs warm), so a fixed sleep is
      // flaky. Re-attach until the echoed marker is inside the replay frame —
      // each attach replays the latest output, so this converges whenever the
      // shell echoes, mirroring real late-attach behavior.
      const MAX_ATTACH_ATTEMPTS = 20;
      const ATTACH_INTERVAL_MS = 500;
      let replayFrame = null;
      for (
        let attempt = 0;
        attempt < MAX_ATTACH_ATTEMPTS && !(replayFrame && replayFrame.includes('__ROUTE_MARKER__'));
        attempt++
      ) {
        await sleep(ATTACH_INTERVAL_MS);
        const res = await fetch(`${base}/api/terminal/${id}/stream`);
        assert.strictEqual(res.status, 200);
        const frames = await readSseFrames(res);
        assert.ok(
          frames.some((f) => f.includes('"type":"connected"')),
          `attempt ${attempt + 1}: expected a connected frame`,
        );
        const found = frames.find((f) => f.includes('"type":"replay"'));
        if (found) replayFrame = found;
      }

      assert.ok(replayFrame, 'expected a replay frame');
      assert.ok(
        replayFrame.includes('__ROUTE_MARKER__'),
        `replay frame should include the echoed command (after up to ${
          MAX_ATTACH_ATTEMPTS * ATTACH_INTERVAL_MS
        }ms of re-attaches)`,
      );
    } finally {
      await api(`/api/terminal/${id}/kill`, { method: 'POST' });
    }
  });

  it('rejects non-POST methods on sub-routes', { skip: !HAS_PTY }, async () => {
    const created = await api('/api/terminal', jsonBody({ cols: 80, rows: 24 }));
    const id = created.body.id;
    try {
      const input = await api(`/api/terminal/${id}/input`, { method: 'GET' });
      assert.strictEqual(input.status, 405);
      const kill = await api(`/api/terminal/${id}/kill`, { method: 'GET' });
      assert.strictEqual(kill.status, 405);
    } finally {
      await api(`/api/terminal/${id}/kill`, { method: 'POST' });
    }
  });

  it('kills a session and then reports it unknown', { skip: !HAS_PTY }, async () => {
    const created = await api('/api/terminal', jsonBody({ cols: 80, rows: 24 }));
    const id = created.body.id;
    const killed = await api(`/api/terminal/${id}/kill`, { method: 'POST' });
    assert.strictEqual(killed.status, 200);
    const probe = await api(`/api/terminal/${id}/opencode`);
    assert.strictEqual(probe.status, 404);
  });
});
