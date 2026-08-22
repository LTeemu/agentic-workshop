const fs = require('fs');
const path = require('path');
const { PROJECTS_DIR } = require('./server-utils/project-utils');
const { detectTest, runTest } = require('./test-runner');
const { detectRun, describeProject, buildProject, projectPort } = require('./execution/detect');
const {
  getActive,
  getRunningProjects,
  isProjectRunning,
  projectStatus,
  startProject,
  stopActive,
  stopBackgroundProject,
  focusRunningProject,
  writeActiveProject,
  clearActiveIf,
} = require('./project-manager');
const { ACTIVE_FILE, ROOT } = require('./constants');
const { projectLogs, getLogs, pushLog, clearLogs, MAX_LOG_LINES } = require('./services/logger');
const { broadcastSSE, startSSE, addSSEClient, removeSSEClient } = require('./services/sse');
const { watchProject } = require('./services/watcher');
const { backupProject } = require('./services/platform');
const { getProjects } = require('./server-utils/project-utils');
const term = require('./terminal');

const MAX_BODY_BYTES = 1024 * 1024;

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    let settled = false;
    const settle = (v) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    req.on('data', (c) => {
      if (settled) return;
      body += c;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) settle({});
    });
    req.on('end', () => {
      try {
        settle(JSON.parse(body));
      } catch {
        settle({});
      }
    });
    req.on('error', () => settle({}));
    req.on('aborted', () => settle({}));
  });
}

// ── health & meta ──
function handleHealth(res, startTime) {
  const mem = process.memoryUsage();
  const projects = getProjects();
  const active = getActive();
  const running = getRunningProjects();
  return json(res, {
    uptime: Date.now() - (startTime || 0),
    memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
    projects: { total: projects.length, running: Object.keys(running).length },
    active: active ? { name: active.name, url: active.url, runType: active.runType } : null,
    runningProjects: Object.keys(running),
  });
}

function handleActive(res) {
  let file = null;
  try {
    file = fs.readFileSync(ACTIVE_FILE, 'utf-8').trim();
  } catch {}
  const active = getActive();
  return json(res, { active: active ? { name: active.name, url: active.url } : null, file });
}

function handleEvents(req, res) {
  startSSE(res);
  addSSEClient(res);
  req.on('close', () => removeSSEClient(res));
}

// ── projects collection ──
async function handleProjectsCollection(req, res) {
  const active = getActive();
  if (req.method === 'GET') return handleProjectsList(res, active);
  if (req.method === 'POST') return handleProjectsCreate(req, res);
  return null;
}

function handleProjectsList(res, active) {
  return json(
    res,
    getProjects().map((name) => {
      const projectPath = path.join(PROJECTS_DIR, name);
      const stat = fs.statSync(projectPath);
      const isActive = active && active.name === name;
      const run = isActive ? null : detectRun(projectPath);
      return {
        name,
        modified: stat.mtimeMs,
        running: isProjectRunning(name),
        status: projectStatus(name),
        url: isActive ? active.url : null,
        runType: isActive ? active.runType : run ? run.type : null,
        type: describeProject(projectPath),
      };
    }),
  );
}

async function handleProjectsCreate(req, res) {
  const body = await parseBody(req);
  if (!body.name || !/^[a-zA-Z0-9_-]+$/.test(body.name)) {
    return json(res, { error: 'invalid name (use letters, numbers, hyphens, underscores)' }, 400);
  }
  const projectPath = path.join(PROJECTS_DIR, body.name);
  if (fs.existsSync(projectPath)) return json(res, { error: 'exists' }, 409);
  fs.mkdirSync(projectPath, { recursive: true });
  return json(res, { name: body.name });
}

// ── bulk ops ──
async function handleTestAll(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
  const results = [];
  for (const name of getProjects()) {
    if (!detectTest(path.join(PROJECTS_DIR, name))) continue;
    const logStart = (projectLogs[name] || []).length;
    const result = await runTest(name, pushLog);
    const logs = (projectLogs[name] || []).slice(logStart);
    results.push({ project: name, ...result, output: logs.map((l) => l.line) });
  }
  return json(res, { results });
}

async function handleStopAll(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
  const active = getActive();
  const names = Object.keys(getRunningProjects());
  for (const n of names) if (!active || active.name !== n) await stopBackgroundProject(n);
  return json(res, { stopped: names.filter((n) => !active || active.name !== n) });
}

// ── single project sub-routes ──
async function handleProjectDelete(name, projectPath, res) {
  const active = getActive();
  if (active && active.name === name) await stopActive();
  else if (isProjectRunning(name)) await stopBackgroundProject(name);
  backupProject(name, PROJECTS_DIR);
  fs.rmSync(projectPath, { recursive: true, force: true });
  clearActiveIf(name);
  clearLogs(name);
  return json(res, { deleted: name });
}

async function handleProjectSelect(name, url, res) {
  writeActiveProject(name);
  const autoStop = url.searchParams.get('autoStop') !== 'false';
  const active = getActive();
  if (active && active.name === name) {
    const u = `http://localhost:${projectPort(name)}`;
    return json(res, { url: u, starting: !active.process, runType: active.runType });
  }
  if (isProjectRunning(name) && (!active || active.name !== name)) {
    if (autoStop) await stopActive();
    const entry = getRunningProjects()[name];
    focusRunningProject(name);
    watchProject(name);
    broadcastSSE({
      type: 'project-status',
      project: name,
      status: 'running',
      url: `http://localhost:${entry.port}`,
    });
    return json(res, { url: `http://localhost:${entry.port}`, runType: entry.runType || null });
  }
  const result = await startProject(name, { autoStop });
  if (result && !result.error) watchProject(name);
  return json(res, result || { error: 'unknown error' }, result && result.error ? 400 : 200);
}

async function handleProjectStop(name, res) {
  if (!isProjectRunning(name)) return json(res, { error: 'not running' }, 400);
  const active = getActive();
  if (active && active.name === name) await stopActive();
  else await stopBackgroundProject(name);
  return json(res, { stopped: name });
}

function handleProjectStatus(name, projectPath, res) {
  const active = getActive();
  const run = detectRun(projectPath);
  const isActive = active && active.name === name;
  return json(res, {
    name,
    exists: fs.existsSync(projectPath),
    active: isActive,
    running: isProjectRunning(name),
    status: projectStatus(name),
    url: isActive ? active.url : null,
    runType: isActive ? active.runType : run ? run.type : null,
    modified: fs.existsSync(projectPath) ? fs.statSync(projectPath).mtimeMs : null,
  });
}

function handleProjectDetails(name, projectPath, res) {
  const details = {
    name,
    runType: describeProject(projectPath),
    hasPackageJson: false,
    version: null,
    description: null,
    scripts: {},
    dependencies: {},
    devDependencies: {},
    hasTestScript: false,
  };
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      details.hasPackageJson = true;
      details.version = pkg.version || null;
      details.description = pkg.description || null;
      details.scripts = pkg.scripts || {};
      details.dependencies = pkg.dependencies || {};
      details.devDependencies = pkg.devDependencies || {};
      details.hasTestScript = !!(pkg.scripts && pkg.scripts.test);
    } catch {}
  }
  return json(res, details);
}

function handleProjectLogs(name, url, res) {
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || MAX_LOG_LINES, MAX_LOG_LINES);
  return json(res, getLogs(name, limit));
}

function handleProjectBuild(name, req, res) {
  if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
  const result = buildProject(name);
  return json(res, result, result.error ? 400 : 200);
}

async function handleProjectTest(name, req, res) {
  if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
  const result = await runTest(name, pushLog);
  return json(res, result, result.error ? 400 : 200);
}

async function dispatchProjectRoutes(name, projectPath, parts, url, req, res) {
  if (req.method === 'DELETE' && !parts[3]) return handleProjectDelete(name, projectPath, res);
  if (parts[3] === 'select') return handleProjectSelect(name, url, res);
  if (parts[3] === 'stop') return handleProjectStop(name, res);
  if (parts[3] === 'details') return handleProjectDetails(name, projectPath, res);
  if (parts[3] === 'logs') return handleProjectLogs(name, url, res);
  if (parts[3] === 'build') return handleProjectBuild(name, req, res);
  if (parts[3] === 'test') return handleProjectTest(name, req, res);
  if (parts[3] === 'status' || !parts[3]) return handleProjectStatus(name, projectPath, res);
  return null;
}

// ── terminal routes ──
async function handleTerminalCreate(req, res) {
  if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
  const body = await parseBody(req);
  const cwd = body.cwd && typeof body.cwd === 'string' ? body.cwd : ROOT;
  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory())
    return json(res, { error: 'invalid cwd' }, 400);
  try {
    const t = term.startTerminal(cwd, body.cols || 100, body.rows || 30);
    return json(res, {
      id: t.id,
      cols: t.cols,
      rows: t.rows,
      openCodeCommand: term.openCodeLaunchCommand(),
    });
  } catch (err) {
    console.error('[/api/terminal]', err.message);
    return json(res, { error: err.message }, 500);
  }
}

async function handleTerminalSubroutes(terminalID, parts, req, res) {
  if ((!parts[3] || (parts[3] === 'stream' && !parts[4])) && req.method === 'GET') {
    if (!term.attachStream(terminalID, res, startSSE))
      return json(res, { error: 'terminal exited' }, 410);
    return true;
  }
  if ((!parts[3] || parts[3] === 'stream') && req.method !== 'GET')
    return json(res, { error: 'method not allowed' }, 405);
  if (parts[3] === 'input' && !parts[4]) {
    if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
    const body = await parseBody(req);
    if (typeof body.data !== 'string') return json(res, { error: 'missing data' }, 400);
    if (!term.writeInput(terminalID, body.data))
      return json(res, { error: 'unknown terminal' }, 404);
    return json(res, { ok: true });
  }
  if (parts[3] === 'resize' && !parts[4]) {
    if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
    const body = await parseBody(req);
    if (!term.resizeTerminal(terminalID, body.cols, body.rows))
      return json(res, { error: 'unknown terminal' }, 404);
    return json(res, { ok: true });
  }
  if (parts[3] === 'opencode' && !parts[4]) {
    if (req.method !== 'GET') return json(res, { error: 'method not allowed' }, 405);
    const t = term.getTerminal(terminalID);
    if (!t || t.exited) return json(res, { error: 'unknown terminal' }, 404);
    try {
      return json(res, {
        running: await term.isOpenCodeRunning(t.pty.pid),
        openCodeCommand: term.openCodeLaunchCommand(),
      });
    } catch {
      return json(res, {
        running: t.openCodeRunning === true,
        openCodeCommand: term.openCodeLaunchCommand(),
      });
    }
  }
  if (parts[3] === 'kill' && !parts[4]) {
    if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
    if (!term.killTerminal(terminalID)) return json(res, { error: 'unknown terminal' }, 404);
    return json(res, { ok: true });
  }
  return null;
}

// ── main dispatcher ──
async function handleAPI(req, res, { startTime, PORT } = {}) {
  const url = new URL(req.url, `http://localhost:${PORT || 3000}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (parts[0] !== 'api') return null;

  if (parts[1] === 'health' && !parts[2]) return handleHealth(res, startTime);
  if (parts[1] === 'active' && !parts[2]) return handleActive(res);
  if (parts[1] === 'events' && !parts[2]) return handleEvents(req, res);

  if (parts[1] === 'projects' && !parts[2]) return handleProjectsCollection(req, res);
  if (parts[1] === 'projects' && parts[2] === 'test-all') return handleTestAll(req, res);
  if (parts[1] === 'projects' && parts[2] === 'stop-all') return handleStopAll(req, res);

  if (parts[1] === 'projects' && parts[2]) {
    const name = parts[2];
    const projectPath = path.join(PROJECTS_DIR, name);
    // DELETE without sub-route handled inside dispatch
    if (req.method === 'DELETE' && !parts[3]) return handleProjectDelete(name, projectPath, res);
    if (parts[3] !== undefined) {
      const out = await dispatchProjectRoutes(name, projectPath, parts, url, req, res);
      if (out !== null) return out;
    } else {
      return handleProjectStatus(name, projectPath, res);
    }
  }

  if (parts[1] === 'terminal' && !parts[2]) return handleTerminalCreate(req, res);
  if (parts[1] === 'terminal' && parts[2])
    return handleTerminalSubroutes(parts[2], parts, req, res);

  return null;
}

module.exports = { handleAPI, json, parseBody };
