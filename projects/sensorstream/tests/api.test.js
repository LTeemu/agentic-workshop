import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { rmSync } from 'fs';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(__dirname, '..');
// Unique port + throwaway DB per run: tests must not collide with a stale
// server or depend on data collected by previous runs.
const PORT = 45000 + (process.pid % 2000);
const DB_PATH = join(tmpdir(), `sensorstream-test-${process.pid}.db`);
const BASE = `http://127.0.0.1:${PORT}`;

let serverProcess = null;
let stderrLog = '';

function waitForServer(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setTimeout(() => reject(new Error('Server start timeout')), timeout);

    // If the child dies before becoming healthy, fail fast with its stderr
    // (e.g. a native module crash trace) instead of timing out blindly.
    serverProcess.once('exit', (code) => {
      clearTimeout(timer);
      const detail = stderrLog ? `:\n${stderrLog}` : '';
      reject(new Error(`Server exited before becoming healthy (code ${code})${detail}`));
    });
    serverProcess.once('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Server failed to start: ${err.message}`));
    });

    function check() {
      fetch(`${BASE}/api/health`)
        .then((r) => {
          if (r.ok) {
            clearTimeout(timer);
            resolve();
          }
        })
        .catch(() => {
          if (Date.now() - start < timeout) setTimeout(check, 200);
        });
    }
    check();
  });
}

// Wait until the simulator has generated (and stored) at least one reading,
// so stats assertions run against known data instead of an arbitrary sleep.
async function waitForReadings(timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const resp = await fetch(`${BASE}/api/health`);
    const data = await resp.json();
    if (data.readingsGenerated > 0) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Server generated no readings within timeout');
}

// Remove the throwaway DB files. Windows can hold file handles briefly
// after process exit, so retry rather than fail the run on EPERM.
async function removeDbFiles() {
  for (const file of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        rmSync(file, { force: true });
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }
}

before(async () => {
  await removeDbFiles();

  // Start server with isolated test port and throwaway database
  serverProcess = spawn('node', ['server.js'], {
    cwd: PROJECT_DIR,
    env: { ...process.env, PORT: String(PORT), SENSORSTREAM_DB: DB_PATH },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', () => {});
  serverProcess.stderr.on('data', (d) => {
    stderrLog += d.toString();
  });

  // If the server never becomes healthy, fail the suite loudly instead of
  // silently skipping every API test (e.g. a node:sqlite incompatibility on
  // the running Node version would otherwise turn the whole suite green as
  // "skipped").
  await waitForServer();
});

after(async () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    // Wait for the child to release its DB handle before deleting the files
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        serverProcess.kill('SIGKILL');
        resolve();
      }, 5000);
      serverProcess.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  await removeDbFiles();
});

describe('API Health', () => {
  it('GET /api/health returns 200 with status', async () => {
    const resp = await fetch(`${BASE}/api/health`);
    assert.equal(resp.status, 200);
    const data = await resp.json();
    assert.equal(data.status, 'ok');
    assert.ok(typeof data.uptime === 'number');
  });
});

describe('API Recent Readings', () => {
  it('GET /api/sensors/recent returns 200 with array', async () => {
    const resp = await fetch(`${BASE}/api/sensors/recent`);
    assert.equal(resp.status, 200);
    const data = await resp.json();
    assert.ok(Array.isArray(data));
  });

  it('GET /api/sensors/recent?limit=5 respects limit', async () => {
    const resp = await fetch(`${BASE}/api/sensors/recent?limit=5`);
    assert.equal(resp.status, 200);
    const data = await resp.json();
    assert.ok(data.length <= 5);
  });

  it('GET /api/sensors/recent?type=temperature filters by type', async () => {
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
    await waitForReadings();

    const resp = await fetch(`${BASE}/api/sensors/stats`);
    assert.equal(resp.status, 200);
    const data = await resp.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0, 'Stats should include at least one stored reading');
    assert.ok(data[0].type);
    assert.ok(typeof data[0].avg === 'number');
    assert.ok(typeof data[0].count === 'number');
  });
});

describe('API Anomalies', () => {
  it('GET /api/sensors/anomalies returns 200 with array', async () => {
    const resp = await fetch(`${BASE}/api/sensors/anomalies`);
    assert.equal(resp.status, 200);
    const data = await resp.json();
    assert.ok(Array.isArray(data));
  });
});

describe('API SSE Stream', () => {
  it('GET /api/sensors/stream returns 200 with correct content type', async () => {
    const resp = await fetch(`${BASE}/api/sensors/stream`);
    assert.equal(resp.status, 200);
    assert.equal(resp.headers.get('content-type'), 'text/event-stream');
    // Don't consume the stream in tests — just verify headers
    resp.body.cancel();
  });
});

describe('API 404', () => {
  it('GET /api/nonexistent returns 404', async () => {
    const resp = await fetch(`${BASE}/api/nonexistent`);
    assert.equal(resp.status, 404);
    const data = await resp.json();
    assert.equal(data.error, 'Not found');
  });
});
