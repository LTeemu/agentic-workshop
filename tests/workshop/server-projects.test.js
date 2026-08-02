const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createServer } = require('../../app/server');

const PROJECTS_DIR = path.resolve(__dirname, '..', '..', 'projects');
const ACTIVE_FILE = path.resolve(__dirname, '..', '..', '.active-project');

let server;
let base;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

// Undici's global fetch keeps pooled keep-alive sockets open; with
// `--test-force-exit` on Windows those pooled handles race the forced exit and
// abort the process with a libuv UV_HANDLE_CLOSING assertion. Plain
// `http.request` with agent:false gives each request a dedicated socket that
// closes after the response, so nothing lingers at teardown. (The SSE stream
// below still uses fetch, but its reader is explicitly cancelled — the same
// pattern the terminal HTTP tests already rely on.)
function api(pathname, { method = 'GET', body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      base + pathname,
      {
        method,
        agent: false,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (text += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null });
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

async function waitFor(fn, { timeout = 8000, interval = 150 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return false;
}

/** Read SSE frames from an open stream until `predicate` matches; returns it or null. */
async function collectEvent(res, predicate, maxMs = 8000) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  const deadline = Date.now() + maxMs;
  try {
    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      const stalled = new Promise((resolve) =>
        setTimeout(() => resolve({ stalled: true }), Math.min(250, remaining)),
      );
      const chunk = await Promise.race([reader.read(), stalled]);
      if (chunk.stalled || chunk.done) break;
      text += decoder.decode(chunk.value, { stream: true });
      for (const frame of text.split('\n\n')) {
        if (!frame.trim()) continue;
        try {
          const ev = JSON.parse(frame.replace(/^data: /, ''));
          if (predicate(ev)) return ev;
        } catch {
          // partial/invalid frame — keep reading
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return null;
}

/**
 * Create a throwaway project under projects/, run `fn`, then remove it and
 * restore the active-project file (the server may have re-written it). An empty
 * node_modules dir is created up front so npm projects skip `npm install`.
 * If the test body fails after spawning a process, the server's /stop endpoint
 * kills it best-effort so it can't hold the port or lock the directory.
 */
async function withTempProject(name, files, fn) {
  const dir = path.join(PROJECTS_DIR, name);
  const savedActive = fs.existsSync(ACTIVE_FILE) ? fs.readFileSync(ACTIVE_FILE, 'utf-8') : null;
  fs.mkdirSync(path.join(dir, 'node_modules'), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, rel), content);
  }
  try {
    return await fn(dir);
  } finally {
    await api(`/api/projects/${name}/stop`, { method: 'POST', body: {} }).catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
    if (savedActive === null) fs.rmSync(ACTIVE_FILE, { force: true });
    else fs.writeFileSync(ACTIVE_FILE, savedActive, 'utf-8');
  }
}

describe('project status payload', () => {
  it('reports a valid status for every project in the list', async () => {
    const r = await api('/api/projects');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body));
    assert.ok(r.body.length > 0, 'workspace should contain projects');
    for (const p of r.body) {
      assert.ok(
        ['running', 'starting', 'stopped'].includes(p.status),
        `unexpected status ${p.status} for ${p.name}`,
      );
      // The `running` boolean and `status` must agree.
      assert.strictEqual(
        p.running,
        p.status === 'running',
        `status/running mismatch for ${p.name}`,
      );
    }
  });

  it('reports idle projects as stopped with a consistent running flag', async () => {
    const r = await api('/api/projects');
    const idle = r.body.filter((p) => p.status === 'stopped');
    // Server boots with no project running, so every project is idle.
    assert.strictEqual(idle.length, r.body.length);
    for (const p of idle) assert.strictEqual(p.running, false);
  });

  it('includes a status field in the single-project status endpoint', async () => {
    const list = await api('/api/projects');
    const name = list.body[0].name;
    const r = await api(`/api/projects/${name}/status`);
    assert.strictEqual(r.status, 200);
    assert.ok(['running', 'starting', 'stopped'].includes(r.body.status));
    assert.strictEqual(r.body.running, r.body.status === 'running');
  });

  it('broadcasts a clean stopped exit when a spawned project is stopped', async () => {
    const name = `__ws-status-${Date.now()}`;
    // Minimal npm project with a node start script.
    await withTempProject(
      name,
      {
        'package.json': JSON.stringify({ name, scripts: { start: 'node server.js' } }),
        'server.js':
          "const http = require('http'); http.createServer((req, res) => res.end('ok')).listen(process.env.PORT || 3000);",
      },
      async () => {
        const sel = await api(`/api/projects/${name}/select?autoStop=false`, {
          method: 'POST',
          body: {},
        });
        assert.strictEqual(sel.status, 200, JSON.stringify(sel.body));
        assert.ok(sel.body.url);

        const becameRunning = await waitFor(async () => {
          const st = await api(`/api/projects/${name}/status`);
          return st.body.status === 'running';
        });
        assert.ok(becameRunning, 'project should reach running');

        // Open the SSE stream before stopping so it can't miss the exit broadcast.
        const events = await fetch(`${base}/api/events`);

        const stop = await api(`/api/projects/${name}/stop`, { method: 'POST', body: {} });
        assert.strictEqual(stop.status, 200);
        assert.strictEqual(stop.body.stopped, name);

        // The exit broadcast must be the clean 'stopped' — never the raw OS exit
        // code (null after SIGTERM, non-zero after taskkill /F), which would
        // render a red dot in other tabs for a manual stop.
        const exitEv = await collectEvent(
          events,
          (e) => e.type === 'project-exit' && e.project === name,
        );
        assert.ok(exitEv, 'expected a project-exit broadcast');
        assert.strictEqual(exitEv.code, 'stopped');

        const after = await api(`/api/projects/${name}/status`);
        assert.strictEqual(after.body.status, 'stopped');
      },
    );
  });

  it('rejects a project with no start method and keeps the dot gray', async () => {
    const name = `__ws-nostart-${Date.now()}`;
    await withTempProject(name, { 'readme.txt': 'not a runnable project' }, async () => {
      // Open the SSE stream before selecting so it can't miss a broadcast.
      const events = await fetch(`${base}/api/events`);

      const sel = await api(`/api/projects/${name}/select?autoStop=false`, {
        method: 'POST',
        body: {},
      });
      assert.strictEqual(sel.status, 400, JSON.stringify(sel.body));
      assert.match(sel.body.error, /no start method/i);
      assert.strictEqual(sel.body.neverStarted, true);

      // Nothing ever spawned, so the dot must not turn red. The only
      // terminal broadcast after the 'starting' event is a clean 'stopped'
      // — never a project-exit failed code — so other tabs fall back to gray
      // instead of showing a red dot (or sticking on yellow).
      const terminal = await collectEvent(
        events,
        (e) =>
          (e.type === 'project-status' && e.project === name && e.status === 'stopped') ||
          (e.type === 'project-exit' && e.project === name),
      );
      assert.ok(terminal, 'expected a terminal broadcast for the failed start');
      assert.strictEqual(
        terminal.type,
        'project-status',
        'must be a clean stopped, not a failed exit',
      );
      assert.strictEqual(terminal.status, 'stopped');
    });
  });
});
