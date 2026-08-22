const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { PROJECTS_DIR, ACTIVE_FILE } = require('./constants');
const {
  detectRun,
  describeProject,
  startStaticServer,
  projectPort,
} = require('./execution/detect');
const { prepareNpmRun } = require('./execution/npm-runner');
const { pushLog } = require('./services/logger');
const { broadcastSSE } = require('./services/sse');
const { waitForLiveness, watchLateLiveness } = require('./services/liveness');
const { killPortOwner, killProcessTree } = require('./services/platform');
const { closeActiveWatcher } = require('./services/watcher');
const { paint, colorizeUrls } = require('./server-utils/color-utils');

let active = null;
let runningProjects = {};
let startingProjects = new Set();
let stoppedByRequest = new Set();

// ── simple state helpers ──
function isProjectRunning(name) {
  return !!(runningProjects[name] && runningProjects[name].child);
}
function projectStatus(name) {
  return isProjectRunning(name) ? 'running' : startingProjects.has(name) ? 'starting' : 'stopped';
}
function getActive() {
  return active;
}
function getRunningProjects() {
  return runningProjects;
}
function getStartingProjects() {
  return startingProjects;
}
function getActiveFile() {
  return ACTIVE_FILE;
}
function _setActive(value) {
  active = value;
}
function focusRunningProject(name) {
  const entry = runningProjects[name];
  if (!entry) return null;
  active = {
    name,
    process: entry.child,
    port: entry.port,
    url: `http://localhost:${entry.port}`,
    runType: null,
  };
  return active;
}

// ── active-file helpers (single source of truth for `projects/<name>` format) ──
function readActiveProjectName() {
  try {
    const raw = fs.readFileSync(ACTIVE_FILE, 'utf-8').trim();
    const m = raw.match(/^projects\/([^/]+)$/);
    if (m && fs.existsSync(path.join(PROJECTS_DIR, m[1]))) return m[1];
  } catch {}
  return null;
}
function writeActiveProject(name) {
  try {
    fs.writeFileSync(ACTIVE_FILE, `projects/${name}`, 'utf-8');
  } catch {}
}
function clearActiveIf(name) {
  try {
    if (fs.readFileSync(ACTIVE_FILE, 'utf-8').trim() === `projects/${name}`)
      fs.unlinkSync(ACTIVE_FILE);
  } catch {}
}
function clearPlaceholder(name) {
  if (active && active.name === name) active = null;
}
function neverStartedResponse(name, error) {
  broadcastSSE({ type: 'project-status', project: name, status: 'stopped' });
  clearPlaceholder(name);
  return { error, neverStarted: true };
}

// ── lifecycle helpers (<20 lines each) ──
async function ensurePortFree(port, name) {
  if (killPortOwner(port)) {
    pushLog(name, 'system', `Killed orphaned process on port ${port}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

function attachStdio(child, name) {
  child.stdout.on('data', (d) => {
    const text = d.toString();
    process.stdout.write(`${paint(`[${name}]`, 'green')} ${colorizeUrls(text)}`);
    pushLog(name, 'stdout', text);
  });
  child.stderr.on('data', (d) => {
    const text = d.toString();
    process.stderr.write(`${paint(`[${name}]`, 'green')} ${colorizeUrls(text)}`);
    pushLog(name, 'stderr', text);
  });
}

function waitForImmediateError(child) {
  return new Promise((resolve) => {
    child.on('error', (err) => resolve(err));
    setImmediate(() => resolve(null));
  });
}

function attachLifecycleHandlers(child, name) {
  let exited = false;
  child.on('error', (err) => {
    pushLog(name, 'system', `Process error: ${err.message}`);
    delete runningProjects[name];
    broadcastSSE({ type: 'project-exit', project: name, code: -1, error: err.message });
    console.error(`[${name}] Process error: ${err.message}`);
    clearPlaceholder(name);
  });
  child.on('exit', (code) => {
    exited = true;
    pushLog(name, 'system', `Process exited with code ${code}`);
    delete runningProjects[name];
    if (!stoppedByRequest.has(child)) broadcastSSE({ type: 'project-exit', project: name, code });
    stoppedByRequest.delete(child);
    clearPlaceholder(name);
  });
  return { isExited: () => exited };
}

function startLivenessPolling(name, url, isExited) {
  pushLog(name, 'system', `Waiting for server to be ready on ${url}...`);
  const healthUrl = `${url}/api/health`;
  waitForLiveness(healthUrl)
    .then((ready) => {
      if (isExited()) return false;
      if (!ready) return waitForLiveness(url, 3000, 300);
      return ready;
    })
    .then((ready) => {
      if (isExited()) return;
      if (ready) {
        pushLog(name, 'system', `Server is ready on ${url}`);
        broadcastSSE({ type: 'project-status', project: name, status: 'running', url });
      } else {
        pushLog(name, 'system', `Server did not respond within timeout on ${url}`);
        broadcastSSE({ type: 'project-status', project: name, status: 'timeout', url });
        watchLateLiveness(name, url, isExited);
      }
    });
}

async function stopBackgroundProject(name) {
  const entry = runningProjects[name];
  if (!entry) return;
  const child = entry.child;
  if (child && typeof child.pid === 'number') {
    stoppedByRequest.add(child);
    await killProcessTree(child.pid, child);
  } else if (child && typeof child.close === 'function') child.close();
  delete runningProjects[name];
  broadcastSSE({ type: 'project-exit', project: name, code: 'stopped' });
}

async function stopActive() {
  closeActiveWatcher();
  const prev = active;
  active = null;
  if (!prev) return;
  delete runningProjects[prev.name];
  if (prev.process && typeof prev.process.pid === 'number') stoppedByRequest.add(prev.process);
  broadcastSSE({ type: 'project-exit', project: prev.name, code: 'stopped' });
  if (!prev.process) return;
  try {
    if (typeof prev.process.close === 'function') prev.process.close();
    else if (typeof prev.process.pid === 'number')
      await killProcessTree(prev.process.pid, prev.process);
  } catch (err) {
    console.error(`[stopActive] Error stopping ${prev.name}:`, err?.message || err);
  }
}

async function startProject(name, { autoStop = true } = {}) {
  try {
    const projectPath = path.join(PROJECTS_DIR, name);
    if (!fs.existsSync(projectPath)) return neverStartedResponse(name, 'not found');

    const port = projectPort(name);
    if (startingProjects.has(name)) {
      const url = `http://localhost:${port}`;
      pushLog(name, 'system', `Already starting — waiting for completion on ${url}`);
      return { url, starting: true, runType: null };
    }

    const prevName = active ? active.name : null;
    if (autoStop) await stopActive();
    if (prevName === name) await new Promise((r) => setTimeout(r, 300));
    await ensurePortFree(port, name);
    writeActiveProject(name);

    startingProjects.add(name);
    active = { name, port, url: null, runType: null };
    pushLog(name, 'system', 'Starting project...');
    broadcastSSE({ type: 'project-status', project: name, status: 'starting' });

    const run = detectRun(projectPath);
    if (!run) {
      const desc = describeProject(projectPath) || 'unknown';
      pushLog(name, 'system', `No start method detected — project type: ${desc}`);
      return neverStartedResponse(name, `no start method detected (project type: ${desc})`);
    }
    if (run.type === 'npm') {
      const npmErr = await prepareNpmRun(projectPath, name, run, pushLog);
      if (npmErr) return neverStartedResponse(name, npmErr);
    }

    const url = `http://localhost:${port}`;
    if (run.type === 'static') {
      const server = startStaticServer(projectPath, port);
      active = { name, process: server, port, url, runType: 'static' };
      runningProjects[name] = { port, child: server };
      pushLog(name, 'system', `Static server started on port ${port}`);
      broadcastSSE({ type: 'project-status', project: name, status: 'running', url });
      return { url };
    }

    const env = { ...process.env, PORT: String(port) };
    const child = spawn(run.cmd, run.args, { cwd: projectPath, stdio: 'pipe', env, shell: true });
    attachStdio(child, name);
    const immediateError = await waitForImmediateError(child);
    if (immediateError) {
      pushLog(name, 'system', `Process error: ${immediateError.message}`);
      broadcastSSE({
        type: 'project-exit',
        project: name,
        code: -1,
        error: immediateError.message,
      });
      console.error(`[${name}] Failed to start: ${immediateError.message}`);
      clearPlaceholder(name);
      return { error: `Failed to start process: ${immediateError.message}` };
    }

    const { isExited } = attachLifecycleHandlers(child, name);
    runningProjects[name] = { port, child };
    active = { name, process: child, port, url, runType: run.type };
    startLivenessPolling(name, url, isExited);
    pushLog(name, 'system', `Process started on port ${port} (${run.type})`);
    return { url, starting: true };
  } catch (err) {
    console.error(`Failed to start project ${name}:`, err.message);
    if (active && active.name === name && !active.process) {
      broadcastSSE({ type: 'project-status', project: name, status: 'stopped' });
      active = null;
      return { error: err.message, neverStarted: true };
    }
    return { error: err.message };
  } finally {
    startingProjects.delete(name);
    if (active && active.name === name && !active.process) active = null;
  }
}

module.exports = {
  isProjectRunning,
  projectStatus,
  getActive,
  getRunningProjects,
  getStartingProjects,
  getActiveFile,
  readActiveProjectName,
  writeActiveProject,
  clearActiveIf,
  stopBackgroundProject,
  stopActive,
  startProject,
  focusRunningProject,
  _setActive,
  get ACTIVE_FILE() {
    return ACTIVE_FILE;
  },
  get ROOT() {
    return require('./constants').ROOT;
  },
};
