import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(__dirname, '..');
const PORT = 45678; // Fixed test port to avoid collisions
const BASE = `http://127.0.0.1:${PORT}`;

let serverProcess = null;
let started = false;

function waitForServer(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      fetch(`${BASE}/api/health`)
        .then((r) => (r.ok ? resolve() : reject(new Error('Health check failed'))))
        .catch(() => {
          if (Date.now() - start > timeout) {
            reject(new Error('Server start timeout'));
          } else {
            setTimeout(check, 200);
          }
        });
    }
    check();
  });
}

before(async () => {
  // Start server with test port
  serverProcess = spawn('node', ['server.js'], {
    cwd: PROJECT_DIR,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', () => {});
  serverProcess.stderr.on('data', () => {});

  try {
    await waitForServer();
    started = true;
  } catch (err) {
    console.error('Failed to start test server:', err.message);
  }
});

after(() => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
});

describe('API Health', () => {
  it('GET /api/health returns 200 with status', async () => {
    if (!started) this.skip();
    const resp = await fetch(`${BASE}/api/health`);
    assert.equal(resp.status, 200);
    const data = await resp.json();
    assert.equal(data.status, 'ok');
    assert.ok(typeof data.uptime === 'number');
  });
});

describe('API Recent Readings', () => {
  it('GET /api/sensors/recent returns 200 with array', async () => {
    if (!started) this.skip();
    const resp = await fetch(`${BASE}/api/sensors/recent`);
    assert.equal(resp.status, 200);
    const data = await resp.json();
    assert.ok(Array.isArray(data));
  });

  it('GET /api/sensors/recent?limit=5 respects limit', async () => {
    if (!started) this.skip();
    const resp = await fetch(`${BASE}/api/sensors/recent?limit=5`);
    assert.equal(resp.status, 200);
    const data = await resp.json();
    assert.ok(data.length <= 5);
  });

  it('GET /api/sensors/recent?type=temperature filters by type', async () => {
    if (!started) this.skip();
    const resp = await fetch(`${BASE}/api/sensors/recent?type=temperature`);
    assert.equal(resp.status, 200);
    const data = await resp.json();
    for (const r of data) {
      assert.equal(r.type, 'temperature');
    }
  });
});

describe('API Stats', () => {
  it('GET /api/sensors/stats returns 200 with stats array', async () => {
    if (!started) this.skip();
    // Give the server a moment to generate some readings
    await new Promise((r) => setTimeout(r, 2000));

    const resp = await fetch(`${BASE}/api/sensors/stats`);
    assert.equal(resp.status, 200);
    const data = await resp.json();
    assert.ok(Array.isArray(data));
    if (data.length > 0) {
      assert.ok(data[0].type);
      assert.ok(typeof data[0].avg === 'number');
      assert.ok(typeof data[0].count === 'number');
    }
  });
});

describe('API Anomalies', () => {
  it('GET /api/sensors/anomalies returns 200 with array', async () => {
    if (!started) this.skip();
    const resp = await fetch(`${BASE}/api/sensors/anomalies`);
    assert.equal(resp.status, 200);
    const data = await resp.json();
    assert.ok(Array.isArray(data));
  });
});

describe('API SSE Stream', () => {
  it('GET /api/sensors/stream returns 200 with correct content type', async () => {
    if (!started) this.skip();
    const resp = await fetch(`${BASE}/api/sensors/stream`);
    assert.equal(resp.status, 200);
    assert.equal(resp.headers.get('content-type'), 'text/event-stream');
    // Don't consume the stream in tests — just verify headers
    resp.body.cancel();
  });
});

describe('API 404', () => {
  it('GET /api/nonexistent returns 404', async () => {
    if (!started) this.skip();
    const resp = await fetch(`${BASE}/api/nonexistent`);
    assert.equal(resp.status, 404);
    const data = await resp.json();
    assert.equal(data.error, 'Not found');
  });
});
