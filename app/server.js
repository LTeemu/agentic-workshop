const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const {
  getProjects,
  tryResolveBin,
  runNpmInstall,
  runNpmBuild,
  ensureDependencies,
  getFileDependencies,
  hasBuildOutput,
  PROJECTS_DIR,
} = require('./project-utils');
const { detectTest, runTest } = require('./test-runner');
const { paint, colorizeUrls } = require('./colors');
const term = require('./terminal');

const PORT = 3000;
const PROJECTS_BASE = 4000;
const ROOT = path.resolve(__dirname, '..');
const ACTIVE_FILE = path.join(ROOT, '.active-project');
const PUBLIC_DIR = path.join(__dirname, 'public');
const BACKUPS_DIR = path.join(ROOT, '_backups');

const MAX_LOG_LINES = 500;
const LIVENESS_TIMEOUT = 30000; // Max ms to wait for project to respond (cold starts: first compile, deps, migrations)
const LIVENESS_INTERVAL = 500; // Poll interval
const RECOVERY_TIMEOUT = 60000; // How much longer to watch after a liveness timeout
const GRACEFUL_TIMEOUT = 3000; // Max ms to wait for a child process to exit before force-kill

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const BUILD_MIME = {
  '.css': 'text/css',
  '.js': 'application/javascript',
};

// Directories whose contents are transient artifacts — skip in file watchers
// and build walkers to avoid unnecessary iframe reloads and traversal.
const ARTIFACT_DIRS = new Set(['node_modules', '__pycache__', 'dist', 'build', 'data']);

/**
 * Simple HTTP GET returning the status code.
 * @param {string} url
 * @returns {Promise<number>} status code
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        res.resume();
        resolve(res.statusCode);
      })
      .on('error', reject);
  });
}

/**
 * Poll a URL until it responds or timeout expires.
 * @param {string} url
 * @param {number} [timeoutMs=10000]
 * @param {number} [intervalMs=500]
 * @returns {Promise<boolean>} true if server responded
 */
async function waitForLiveness(url, timeoutMs = LIVENESS_TIMEOUT, intervalMs = LIVENESS_INTERVAL) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const status = await httpGet(url);
      if (status >= 200 && status < 500) return true;
    } catch {
      /* server not ready yet */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * Keep polling after a liveness timeout: a slow cold start can still bind the
 * port late. Broadcasts 'running' once the project finally responds, so a
 * timed-out dot recovers to green instead of sticking red. Stops when the
 * process exits or the recovery window expires.
 * @param {string} name
 * @param {string} url
 * @param {() => boolean} isExited - true once the child process has exited
 */
async function watchLateLiveness(name, url, isExited) {
  const start = Date.now();
  while (!isExited() && Date.now() - start < RECOVERY_TIMEOUT) {
    try {
      const status = await httpGet(url);
      if (status >= 200 && status < 500) {
        pushLog(name, 'system', `Server is ready on ${url}`);
        broadcastSSE({ type: 'project-status', project: name, status: 'running', url });
        return;
      }
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, LIVENESS_INTERVAL));
  }
}

/**
 * Force-kill any process currently listening on the given port.
 * Uses netstat (available on all Windows versions) to find the owner PID.
 * Returns true if at least one process was killed.
 */
function killPortOwner(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port} "`, {
      stdio: 'pipe',
      timeout: 3000,
    }).toString();
    let killed = false;
    for (const line of out.split('\n')) {
      const m = line.trim().match(/LISTENING\s+(\d+)$/);
      if (m) {
        try {
          execSync(`taskkill /F /PID ${m[1]}`, { stdio: 'ignore' });
          killed = true;
        } catch {}
      }
    }
    return killed;
  } catch {
    return false;
  }
}

let active = null; // The currently-focused project (shown in iframe)
let runningProjects = {}; // All projects with live processes: { name: { port, child } }
let startingProjects = new Set(); // Projects currently being started (prevents double-start)
// ChildProcess refs whose exit broadcast was already sent by an explicit stop
// request (stopActive / stop / stop-all). Their real 'exit' event re-fires
// afterwards with the raw OS code (null after SIGTERM, non-zero after
// taskkill /F on Windows); suppressing the duplicate keeps a clean manual stop
// from looking like a crash in other tabs. Keyed by the child object so a
// restart of the same project name can't be affected by a stale flag.
let stoppedByRequest = new Set();
let sseClients = [];
let activeWatcher = null;
let projectsWatcher = null;
const projectLogs = {};
const startTime = Date.now();

function isProjectRunning(name) {
  return !!(runningProjects[name] && runningProjects[name].child);
}

/** Single source of truth for a project's dot state. */
function projectStatus(name) {
  return isProjectRunning(name) ? 'running' : startingProjects.has(name) ? 'starting' : 'stopped';
}

/**
 * Stop a background (non-focused) project: mark its child so the duplicate
 * exit broadcast is suppressed, kill it, then announce the clean stop.
 * Static servers have no child process — close them directly.
 */
async function stopBackgroundProject(name) {
  const entry = runningProjects[name];
  if (!entry) return;
  const child = entry.child;
  if (child && typeof child.pid === 'number') {
    stoppedByRequest.add(child);
    await killProcessTree(child.pid, child);
  } else if (child && typeof child.close === 'function') {
    child.close(); // static server — no 'exit' event, nothing to suppress
  }
  delete runningProjects[name];
  broadcastSSE({ type: 'project-exit', project: name, code: 'stopped' });
}

// Deterministic port for a project — stable across project add/remove.
// Port range: 4001–4999.
// Pin to a specific port by placing a `.port` file containing the port number
// in the project directory (e.g. `projects/vibify/.port` with content `4007`).
function projectPort(name) {
  const portFile = path.join(PROJECTS_DIR, name, '.port');
  try {
    const pinned = parseInt(fs.readFileSync(portFile, 'utf-8').trim(), 10);
    if (pinned >= 4001 && pinned <= 4999) return pinned;
  } catch {
    /* no .port file or invalid — fall through */
  }

  // DJB2 hash of the project name → stable port 4001–4999
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) + hash + name.charCodeAt(i);
    hash |= 0;
  }
  return 4000 + (Math.abs(hash) % 998) + 1;
}

function detectRun(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      // Prefer `start` over `dev` — `start` is the production command, `dev` often
      // adds watch-mode flags (--watch, nodemon) that produce noisy stderr and
      // complicate process management inside the Workshop.
      const script = pkg.scripts && (pkg.scripts.start || pkg.scripts.dev);
      if (script) {
        // If the script is a direct `node` command, use node directly (avoids
        // requiring npx/npm on PATH, which is especially problematic on Windows
        // where they are .cmd files that need shell: true to spawn).
        if (script.startsWith('node ')) {
          const args = script.slice(5).split(/\s+/).filter(Boolean);
          return { type: 'npm', cmd: 'node', args };
        }
        return {
          type: 'npm',
          cmd: 'npm',
          args: ['run', pkg.scripts.start ? 'start' : 'dev'],
        };
      }
    } catch {}
  }
  if (fs.existsSync(path.join(projectPath, 'server.js'))) {
    return { type: 'node', cmd: 'node', args: [path.join(projectPath, 'server.js')] };
  }
  if (fs.existsSync(path.join(projectPath, 'index.html'))) {
    return { type: 'static' };
  }
  if (fs.readdirSync(projectPath).some((f) => f.endsWith('.csproj'))) {
    return { type: 'dotnet', cmd: 'dotnet', args: ['run'] };
  }
  return null;
}

/**
 * Returns a human-readable description of a project's type, even when the
 * project isn't directly runnable by the workshop (e.g. Gradle, Python, etc.).
 * Used for the project-list type badge and for better error messages.
 * @param {string} projectPath
 * @returns {string|null}
 */
function describeProject(projectPath) {
  // Non-npm project types — check first so a test-only package.json
  // doesn't override the type badge on Gradle/Python/Cargo/etc. projects.
  if (fs.existsSync(path.join(projectPath, 'build.gradle.kts'))) return 'gradle (kotlin)';
  if (fs.existsSync(path.join(projectPath, 'build.gradle'))) return 'gradle';
  if (
    fs.existsSync(path.join(projectPath, 'gradlew')) ||
    fs.existsSync(path.join(projectPath, 'gradlew.bat'))
  )
    return 'gradle';
  if (fs.existsSync(path.join(projectPath, 'pom.xml'))) return 'maven';
  if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) return 'rust (cargo)';
  if (fs.existsSync(path.join(projectPath, 'main.py'))) return 'python';
  if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) return 'python';
  if (fs.existsSync(path.join(projectPath, 'Dockerfile'))) return 'docker';
  if (fs.readdirSync(projectPath).some((f) => f.endsWith('.csproj'))) return '.net';

  // npm/Node/HTML projects — delegate to detectRun to avoid duplicated checks
  const run = detectRun(projectPath);
  if (run) {
    if (run.type === 'npm') return 'npm';
    if (run.type === 'node') return 'node.js';
    if (run.type === 'static') return 'static html';
  }

  // Has a package.json but no runnable script (e.g. test-only) — still an npm project
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts && pkg.scripts.test) {
        return 'npm';
      }
    } catch {}
  }

  // Docker Compose checked last so a project with build.gradle + docker-compose
  // shows as Gradle, not Docker Compose.
  if (
    fs.existsSync(path.join(projectPath, 'docker-compose.yml')) ||
    fs.existsSync(path.join(projectPath, 'docker-compose.yaml'))
  )
    return 'docker compose';
  return null;
}

function pushLog(name, stream, text) {
  if (!projectLogs[name]) projectLogs[name] = [];
  const lines = text.split('\n').filter(Boolean);
  for (const line of lines) {
    projectLogs[name].push({ ts: Date.now(), stream, line });
  }
  if (projectLogs[name].length > MAX_LOG_LINES) {
    projectLogs[name] = projectLogs[name].slice(-MAX_LOG_LINES);
  }
  broadcastSSE({ type: 'log', project: name, stream, lines });
}

function broadcastSSE(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch {}
  }
}

function watchProjectsDir() {
  try {
    let timer = null;
    if (projectsWatcher) {
      try {
        projectsWatcher.close();
      } catch (err) {
        console.error('[watchProjectsDir] Error closing watcher:', err?.message || err);
      }
    }
    projectsWatcher = fs.watch(PROJECTS_DIR, (eventType, filename) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        broadcastSSE({ type: 'project-list-change' });
      }, 300);
    });
  } catch (err) {
    console.error('Failed to watch projects directory:', err.message);
  }
}

/**
 * Returns true if the file path should be ignored by the watcher.
 * Skips artifact directories, dotfiles, and empty paths to avoid
 * unnecessary iframe reloads from transient filesystem activity.
 */
function isIgnoredPath(filename) {
  if (!filename) return true;
  const parts = filename.split(/[\\/]/);
  return parts.some((p) => ARTIFACT_DIRS.has(p) || p.startsWith('.'));
}

function watchProject(name) {
  if (activeWatcher) {
    try {
      activeWatcher.close();
    } catch (err) {
      console.error(`[watchProject] Error closing watcher for ${name}:`, err?.message || err);
    }
    activeWatcher = null;
  }
  if (!name) return;
  const projectPath = path.join(PROJECTS_DIR, name);
  if (!fs.existsSync(projectPath)) return;
  try {
    let timer = null;
    activeWatcher = fs.watch(projectPath, { recursive: true }, (eventType, filename) => {
      if (isIgnoredPath(filename)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        broadcastSSE({ type: 'file-change', project: name, file: filename });
      }, 200);
    });
  } catch (err) {
    console.error(`Failed to watch ${name}:`, err.message);
  }
}

/**
 * Force-kill a process tree and wait for it to be gone.
 * On Windows, gentle shutdown (taskkill without /F) is unreliable —
 * /F is used immediately to avoid leaving orphaned processes holding ports.
 *
 * @param {number} pid
 * @param {object} [child] - The ChildProcess object for exit event listening.
 * @returns {Promise<void>}
 */
function killProcessTree(pid, child) {
  return new Promise((resolve) => {
    if (!pid) {
      resolve();
      return;
    }

    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    // If we have a ChildProcess ref that's still running, listen for its exit
    if (child && child.exitCode == null) {
      child.once('exit', done);
    }

    if (process.platform === 'win32') {
      // Force-kill the entire tree immediately (/F /T).
      // taskkill is synchronous and blocks until the process tree is dead.
      try {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      } catch {}
      // Resolve immediately — taskkill /F /T is forceful and synchronous.
      done();
    } else {
      try {
        process.kill(-pid, 'SIGTERM');
      } catch {}
      // Fallback force-kill if SIGTERM doesn't work within the timeout
      setTimeout(() => {
        try {
          process.kill(-pid, 'SIGKILL');
        } catch {}
        done();
      }, GRACEFUL_TIMEOUT);
      // Safety timeout — resolve even if the 'exit' event never fires
      setTimeout(done, GRACEFUL_TIMEOUT + 1000);
    }
  });
}

/**
 * Stop the currently active project.
 * Static servers close immediately (different ports per project).
 * Child processes are force-killed via taskkill/SIGTERM.
 * @returns {Promise<void>}
 */
async function stopActive() {
  if (activeWatcher) {
    try {
      activeWatcher.close();
    } catch (err) {
      console.error('[stopActive] Error closing watcher:', err?.message || err);
    }
    activeWatcher = null;
  }
  const prev = active;
  active = null;
  if (!prev) return;

  delete runningProjects[prev.name];
  if (prev.process && typeof prev.process.pid === 'number') {
    stoppedByRequest.add(prev.process); // suppress the duplicate exit broadcast
  }
  broadcastSSE({ type: 'project-exit', project: prev.name, code: 'stopped' });

  // Guard against the early-start state where active is set but has no process yet
  if (!prev.process) return;

  try {
    if (typeof prev.process.close === 'function') {
      // Static server — close immediately. Ports are project-specific
      // and never reused across different projects, so no wait needed.
      prev.process.close();
    } else if (typeof prev.process.pid === 'number') {
      // Wait for the child process to fully exit before returning
      await killProcessTree(prev.process.pid, prev.process);
    }
  } catch (err) {
    console.error(`[stopActive] Error stopping ${prev.name}:`, err?.message || err);
  }
}

function backupProject(name) {
  const src = path.join(PROJECTS_DIR, name);
  if (!fs.existsSync(src)) return;
  try {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(BACKUPS_DIR, `${name}-${stamp}`);
    execSync(`xcopy "${src}" "${dest}" /E /I /Q /Y >nul 2>&1`, { stdio: 'ignore' });
    return dest;
  } catch {
    return null;
  }
}

function startStaticServer(projectPath, port) {
  const server = http.createServer((req, res) => {
    let filePath = path.join(
      projectPath,
      req.url === '/' ? 'index.html' : decodeURIComponent(req.url).split('?')[0],
    );
    if (!filePath.startsWith(projectPath)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
      const content = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      });
      res.end(content);
    } catch {
      try {
        const content = fs.readFileSync(path.join(projectPath, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    }
  });
  server.on('error', (err) => {
    console.error(`Static server error on port ${port}:`, err.message);
  });
  server.listen(port);
  return server;
}

async function startProject(name, { autoStop = true } = {}) {
  // Forget a start attempt that never produced a live process, so a re-click
  // re-attempts instead of being treated as "already active/starting".
  const clearActivePlaceholder = (name) => {
    if (active && active.name === name) active = null;
  };

  // A start that fails before any process is spawned must not look like a
  // crash: clear the placeholder active, tell other tabs the attempt ended
  // cleanly (their dot would otherwise stick on yellow after the 'starting'
  // broadcast below), and mark the response so the client keeps the dot gray
  // instead of red.
  const neverStarted = (error) => {
    broadcastSSE({ type: 'project-status', project: name, status: 'stopped' });
    clearActivePlaceholder(name);
    return { error, neverStarted: true };
  };
  try {
    const projectPath = path.join(PROJECTS_DIR, name);
    if (!fs.existsSync(projectPath)) return neverStarted('not found');

    const port = projectPort(name);

    const prevName = active ? active.name : null;
    if (autoStop) {
      await stopActive();
    }

    // When restarting the same project (same port), give the OS a moment
    // to release the socket after the process exited.
    if (prevName === name) {
      await new Promise((r) => setTimeout(r, 300));
    }

    // Clean up any orphaned processes still holding the target port.
    // Needed when switching to a project whose port was left occupied by
    // a pre-crash or improperly killed process from a prior session.
    if (killPortOwner(port)) {
      pushLog(name, 'system', `Killed orphaned process on port ${port}`);
      await new Promise((r) => setTimeout(r, 200));
    }

    try {
      fs.writeFileSync(ACTIVE_FILE, `projects/${name}`, 'utf-8');
    } catch {}

    // Prevent double-start: if the same project is already being started by the
    // auto-start path, return early so the client waits for SSE completion events
    // instead of spawning a second (conflicting) process.
    if (startingProjects.has(name)) {
      const url = `http://localhost:${port}`;
      pushLog(name, 'system', `Already starting — waiting for completion on ${url}`);
      return { url, starting: true, runType: null };
    }
    startingProjects.add(name);

    // Mark as starting immediately so /api/active reflects the in-flight start
    // and the client won't show a stale "no active project" state.
    active = { name, port, url: null, runType: null };
    pushLog(name, 'system', 'Starting project...');
    broadcastSSE({ type: 'project-status', project: name, status: 'starting' });

    const run = detectRun(projectPath);
    if (!run) {
      const desc = describeProject(projectPath) || 'unknown';
      pushLog(name, 'system', `No start method detected — project type: ${desc}`);
      return neverStarted(`no start method detected (project type: ${desc})`);
    }

    // Auto-install dependencies if node_modules is missing and project uses npm
    if (run.type === 'npm') {
      const depErr = await ensureDependencies(projectPath, name, (n, s, t) => pushLog(n, s, t));
      if (depErr) return neverStarted(depErr);

      let pkg;
      try {
        pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
      } catch (err) {
        pushLog(name, 'system', `Failed to parse package.json: ${err.message}`);
        return neverStarted(`Failed to parse package.json for ${name}: ${err.message}`);
      }

      // If using 'start' but build output is missing, handle it.
      // Prefer falling back to 'dev' (fast startup) over running a full build.
      // Only switch to dev when the original start was an npm-run command
      // (not a node-direct script like "start": "node server.js").
      const usesStart = !!(pkg.scripts && pkg.scripts.start);
      if (usesStart && !hasBuildOutput(projectPath)) {
        const isNpmRunStart = run.cmd === 'npm' && run.args[0] === 'run' && run.args[1] === 'start';
        if (isNpmRunStart && pkg.scripts && pkg.scripts.dev) {
          const devScript = pkg.scripts.dev;
          // Try running the dev binary directly from node_modules/.bin/
          // instead of going through npm run. This avoids PATH issues on
          // Windows where .cmd files can have broken paths after unzipping.
          const binPath = tryResolveBin(projectPath, devScript);
          if (binPath) {
            pushLog(name, 'system', 'Build output not found — starting in dev mode');
            run.cmd = binPath;
            run.args = devScript.split(/\s+/).filter(Boolean).slice(1);
          } else {
            pushLog(name, 'system', 'Build output not found — starting in dev mode (npm run)');
            run.args = ['run', 'dev'];
          }
        } else if (pkg.scripts && pkg.scripts.build) {
          pushLog(name, 'system', 'Build output not found — running npm run build...');
          try {
            await runNpmBuild(projectPath, name, (n, s, t) => pushLog(n, s, t));
            pushLog(name, 'system', 'Build completed');
          } catch (err) {
            pushLog(name, 'system', `Build failed: ${err.message}`);
            return neverStarted(`Build failed: ${err.message}`);
          }
        }
      }
    }

    const url = `http://localhost:${port}`;

    if (run.type === 'static') {
      const server = startStaticServer(projectPath, port);
      active = { name, process: server, port, url, runType: 'static' };
      // Register like any other process so isProjectRunning, projectStatus and
      // /stop agree with the client's green dot for a live static server.
      runningProjects[name] = { port, child: server };
      pushLog(name, 'system', `Static server started on port ${port}`);
      // Static servers are ready immediately
      broadcastSSE({ type: 'project-status', project: name, status: 'running', url });
      return { url };
    }

    const env = { ...process.env, PORT: String(port) };
    const child = spawn(run.cmd, run.args, { cwd: projectPath, stdio: 'pipe', env, shell: true });

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

    // Detect immediate spawn failures (e.g. ENOENT on Windows where .cmd files
    // like npx.cmd can't spawn without shell: true) and surface them as API errors
    // instead of silently returning { starting: true }.
    const immediateError = await new Promise((resolve) => {
      child.on('error', (err) => resolve(err));
      // The 'error' event fires on the next tick if the command wasn't found
      setImmediate(() => resolve(null));
    });
    if (immediateError) {
      pushLog(name, 'system', `Process error: ${immediateError.message}`);
      broadcastSSE({
        type: 'project-exit',
        project: name,
        code: -1,
        error: immediateError.message,
      });
      console.error(`[${name}] Failed to start: ${immediateError.message}`);
      clearActivePlaceholder(name);
      return { error: `Failed to start process: ${immediateError.message}` };
    }

    child.on('error', (err) => {
      pushLog(name, 'system', `Process error: ${err.message}`);
      delete runningProjects[name];
      broadcastSSE({ type: 'project-exit', project: name, code: -1, error: err.message });
      console.error(`[${name}] Process error: ${err.message}`);
      clearActivePlaceholder(name);
    });

    // Set when this specific child terminates, so the liveness polling below
    // can discard stale results: a stop/restart reuses the same port, and the
    // old chain must not broadcast 'timeout' (or 'running') for the new
    // process on that port.
    let processExited = false;
    child.on('exit', (code) => {
      processExited = true;
      pushLog(name, 'system', `Process exited with code ${code}`);
      delete runningProjects[name];
      // An explicit stop request already broadcast project-exit ('stopped');
      // the real OS exit code (null on SIGTERM, non-zero after taskkill /F)
      // would make a clean manual stop look like a crash in other tabs.
      if (!stoppedByRequest.has(child)) {
        broadcastSSE({ type: 'project-exit', project: name, code });
      }
      stoppedByRequest.delete(child);
      clearActivePlaceholder(name);
    });

    // Track in runningProjects (all live processes regardless of autoStop)
    runningProjects[name] = { port, child };
    // Register as the active (focused) project
    active = { name, process: child, port, url, runType: run.type };

    // Poll for liveness before reporting success
    pushLog(name, 'system', `Waiting for server to be ready on ${url}...`);
    const livenessUrl = `${url}/api/health`;
    waitForLiveness(livenessUrl)
      .then((ready) => {
        if (processExited) return false; // stale — the process is already gone
        if (!ready) {
          return waitForLiveness(url, 3000, 300);
        }
        return ready;
      })
      .then((ready) => {
        if (processExited) return; // stale result — never broadcast for a dead child
        if (ready) {
          pushLog(name, 'system', `Server is ready on ${url}`);
          broadcastSSE({ type: 'project-status', project: name, status: 'running', url });
        } else {
          pushLog(name, 'system', `Server did not respond within timeout on ${url}`);
          broadcastSSE({ type: 'project-status', project: name, status: 'timeout', url });
          // Keep watching: a late cold start may still come up. When it does,
          // broadcast 'running' so the red dot recovers instead of sticking.
          watchLateLiveness(name, url, () => processExited);
        }
      });

    pushLog(name, 'system', `Process started on port ${port} (${run.type})`);
    return { url, starting: true };
  } catch (err) {
    console.error(`Failed to start project ${name}:`, err.message);
    // An exception before any process spawned (e.g. the project dir vanished
    // mid-start) is still a never-started failure — keep the dot gray.
    if (active && active.name === name && !active.process) {
      return neverStarted(err.message);
    }
    return { error: err.message };
  } finally {
    startingProjects.delete(name);
    // Safety net: never leave the placeholder active for an attempt that ended
    // without a live process — a re-click would otherwise look "already
    // active" and stick on starting. Every path above either cleared it or
    // assigned a process. (Pre-spawn failures never broadcast project-exit
    // here: they go through neverStarted, which sends a clean 'stopped'.)
    if (active && active.name === name && !active.process) {
      clearActivePlaceholder(name);
    }
  }
}

function minifyCSS(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;\s*}/g, '}')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function minifyJS(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\s*([{}=+\-*/%!;&:;,()|^~<>?])\s*/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function buildProject(name) {
  const projectPath = path.join(PROJECTS_DIR, name);
  if (!fs.existsSync(projectPath)) return { error: 'not found' };

  const distDir = path.join(projectPath, 'dist');
  try {
    fs.mkdirSync(distDir, { recursive: true });
  } catch {}

  const candidates = [];
  walkDir(projectPath, (file) => {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.css' || ext === '.js') candidates.push(file);
  });

  const results = [];
  for (const file of candidates) {
    const ext = path.extname(file);
    const isCSS = ext === '.css';
    try {
      const code = fs.readFileSync(file, 'utf-8');
      const min = isCSS ? minifyCSS(code) : minifyJS(code);
      const inSize = Buffer.byteLength(code, 'utf-8');
      const outSize = Buffer.byteLength(min, 'utf-8');
      const rel = path.relative(projectPath, file);
      const outFile = path.join(distDir, rel);
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, min, 'utf-8');
      results.push({ file: rel, inSize, outSize, saved: inSize - outSize });
    } catch (err) {
      results.push({ file: path.relative(projectPath, file), error: err.message });
    }
  }

  return { built: results.length, results };
}

function walkDir(dir, fn) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!ARTIFACT_DIRS.has(entry.name)) walkDir(full, fn);
      } else {
        fn(full);
      }
    }
  } catch {}
}

function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  filePath = path.join(PUBLIC_DIR, filePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

/** Reject request bodies larger than this (JSON API payloads are tiny). */
const MAX_BODY_BYTES = 1024 * 1024;

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    req.on('data', (chunk) => {
      if (settled) return; // oversized — ignore the rest of the body
      body += chunk;
      // Oversized body — stop buffering; the route sees an empty body. The
      // connection is left alone so the route can still answer normally.
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) settle({});
    });
    req.on('end', () => {
      try {
        settle(JSON.parse(body));
      } catch {
        settle({});
      }
    });
    // A reset or aborted socket must not leave the route hanging forever.
    req.on('error', () => settle({}));
    req.on('aborted', () => settle({}));
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/** Start an SSE response: headers + initial `connected` event. */
function startSSE(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
}

async function handleAPI(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (parts[0] === 'api' && parts[1] === 'health' && !parts[2]) {
    const mem = process.memoryUsage();
    const projects = getProjects();
    return json(res, {
      uptime: Date.now() - startTime,
      memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
      projects: { total: projects.length, running: Object.keys(runningProjects).length },
      active: active ? { name: active.name, url: active.url, runType: active.runType } : null,
      runningProjects: Object.keys(runningProjects),
    });
  }

  if (parts[0] === 'api' && parts[1] === 'projects' && !parts[2]) {
    if (req.method === 'GET') {
      return json(
        res,
        getProjects().map((name) => {
          const projectPath = path.join(PROJECTS_DIR, name);
          const stat = fs.statSync(projectPath);
          const isActive = active && active.name === name;
          const running = isProjectRunning(name);
          const run = isActive ? null : detectRun(projectPath);
          return {
            name,
            modified: stat.mtimeMs,
            running,
            status: projectStatus(name),
            url: isActive ? active.url : null,
            runType: isActive ? active.runType : run ? run.type : null,
            type: describeProject(projectPath),
          };
        }),
      );
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.name || !/^[a-zA-Z0-9_-]+$/.test(body.name)) {
        return json(
          res,
          { error: 'invalid name (use letters, numbers, hyphens, underscores)' },
          400,
        );
      }
      const projectPath = path.join(PROJECTS_DIR, body.name);
      if (fs.existsSync(projectPath)) return json(res, { error: 'exists' }, 409);

      fs.mkdirSync(projectPath, { recursive: true });
      return json(res, { name: body.name });
    }
  }

  // Run tests for all projects that have a test script
  if (parts[0] === 'api' && parts[1] === 'projects' && parts[2] === 'test-all') {
    if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
    const projects = getProjects();
    const results = [];
    const logWrapper = (n, s, t) => pushLog(n, s, t);
    for (const name of projects) {
      const projectPath = path.join(PROJECTS_DIR, name);
      if (!detectTest(projectPath)) continue;
      const logStart = (projectLogs[name] || []).length;
      const result = await runTest(name, logWrapper);
      const logs = (projectLogs[name] || []).slice(logStart);
      results.push({ project: name, ...result, output: logs.map((l) => l.line) });
    }
    return json(res, { results });
  }

  // Special: stop all background projects
  if (parts[0] === 'api' && parts[1] === 'projects' && parts[2] === 'stop-all') {
    if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
    const names = Object.keys(runningProjects);
    for (const n of names) {
      if (active && active.name === n) continue; // keep the focused project
      await stopBackgroundProject(n);
    }
    return json(res, { stopped: names.filter((n) => !active || active.name !== n) });
  }

  if (parts[0] === 'api' && parts[1] === 'projects' && parts[2]) {
    const name = parts[2];
    const projectPath = path.join(PROJECTS_DIR, name);

    if (req.method === 'DELETE') {
      if (!fs.existsSync(projectPath)) return json(res, { error: 'not found' }, 404);
      if (active && active.name === name) await stopActive();
      else if (isProjectRunning(name)) await stopBackgroundProject(name);
      backupProject(name);
      fs.rmSync(projectPath, { recursive: true, force: true });
      try {
        if (fs.readFileSync(ACTIVE_FILE, 'utf-8').trim() === `projects/${name}`)
          fs.unlinkSync(ACTIVE_FILE);
      } catch {}
      if (projectLogs[name]) delete projectLogs[name];
      return json(res, { deleted: name });
    }

    if (parts[3] === 'select') {
      try {
        fs.writeFileSync(ACTIVE_FILE, `projects/${name}`, 'utf-8');
      } catch {}
      const autoStop = url.searchParams.get('autoStop') !== 'false';

      // If already active (including while still starting up), don't double-start
      if (active && active.name === name) {
        const url = `http://localhost:${projectPort(name)}`;
        return json(res, { url, starting: !active.process, runType: active.runType });
      }

      // If project is already running in background, just focus it — don't restart
      if (isProjectRunning(name) && (!active || active.name !== name)) {
        if (autoStop) {
          await stopActive();
        }
        const entry = runningProjects[name];
        active = {
          name,
          process: entry.child,
          port: entry.port,
          url: `http://localhost:${entry.port}`,
          runType: null,
        };
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

    if (parts[3] === 'stop') {
      if (isProjectRunning(name)) {
        if (active && active.name === name) {
          await stopActive();
        } else {
          // Stop a background project that isn't the focused one
          await stopBackgroundProject(name);
        }
        return json(res, { stopped: name });
      }
      return json(res, { error: 'not running' }, 400);
    }

    if (parts[3] === 'status' || !parts[3]) {
      const run = detectRun(projectPath);
      const isActive = active && active.name === name;
      const running = isProjectRunning(name);
      return json(res, {
        name,
        exists: fs.existsSync(projectPath),
        active: isActive,
        running,
        status: projectStatus(name),
        url: isActive ? active.url : null,
        runType: isActive ? active.runType : run ? run.type : null,
        modified: fs.existsSync(projectPath) ? fs.statSync(projectPath).mtimeMs : null,
      });
    }

    if (parts[3] === 'details') {
      const pkgPath = path.join(projectPath, 'package.json');
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

    if (parts[3] === 'logs') {
      const limit = Math.min(
        parseInt(url.searchParams.get('limit')) || MAX_LOG_LINES,
        MAX_LOG_LINES,
      );
      const logs = projectLogs[name] || [];
      return json(res, logs.slice(-limit));
    }

    if (parts[3] === 'build') {
      if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
      const result = buildProject(name);
      return json(res, result, result.error ? 400 : 200);
    }

    if (parts[3] === 'test') {
      if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
      const result = await runTest(name, (n, s, t) => pushLog(n, s, t));
      return json(res, result, result.error ? 400 : 200);
    }
  }

  if (parts[0] === 'api' && parts[1] === 'active' && !parts[2]) {
    let file = null;
    try {
      file = fs.readFileSync(ACTIVE_FILE, 'utf-8').trim();
    } catch {}
    return json(res, {
      active: active ? { name: active.name, url: active.url } : null,
      file,
    });
  }

  if (parts[0] === 'api' && parts[1] === 'events' && !parts[2]) {
    startSSE(res);
    sseClients.push(res);
    req.on('close', () => {
      sseClients = sseClients.filter((c) => c !== res);
    });
    return;
  }

  // ── Terminal (real shell via PTY, opencode2 shortcut) ────────────

  // Start a terminal: POST /api/terminal { cwd?, cols?, rows? }
  if (parts[0] === 'api' && parts[1] === 'terminal' && !parts[2]) {
    if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
    const body = await parseBody(req);
    const cwd = body.cwd && typeof body.cwd === 'string' ? body.cwd : ROOT;
    if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
      return json(res, { error: 'invalid cwd' }, 400);
    }
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

  if (parts[0] === 'api' && parts[1] === 'terminal' && parts[2]) {
    const terminalID = parts[2];

    // SSE stream: GET /api/terminal/:id or /api/terminal/:id/stream
    if ((!parts[3] || (parts[3] === 'stream' && !parts[4])) && req.method === 'GET') {
      if (!term.attachStream(terminalID, res, startSSE)) {
        return json(res, { error: 'terminal exited' }, 410);
      }
      return;
    }
    if ((!parts[3] || parts[3] === 'stream') && req.method !== 'GET') {
      return json(res, { error: 'method not allowed' }, 405);
    }

    if (parts[3] === 'input' && !parts[4]) {
      if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
      const body = await parseBody(req);
      if (typeof body.data !== 'string') {
        return json(res, { error: 'missing data' }, 400);
      }
      if (!term.writeInput(terminalID, body.data)) {
        return json(res, { error: 'unknown terminal' }, 404);
      }
      return json(res, { ok: true });
    }

    if (parts[3] === 'resize' && !parts[4]) {
      if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
      const body = await parseBody(req);
      if (!term.resizeTerminal(terminalID, body.cols, body.rows)) {
        return json(res, { error: 'unknown terminal' }, 404);
      }
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
        // Probe failed — report the last known state instead of a wrong
        // "not running", which would let the client type the launch command
        // into a live TUI's chat.
        return json(res, {
          running: t.openCodeRunning === true,
          openCodeCommand: term.openCodeLaunchCommand(),
        });
      }
    }

    if (parts[3] === 'kill' && !parts[4]) {
      if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);
      if (!term.killTerminal(terminalID)) {
        return json(res, { error: 'unknown terminal' }, 404);
      }
      return json(res, { ok: true });
    }
  }

  json(res, { error: 'not found' }, 404);
}

/** Create the dashboard HTTP server (exported so tests can run it on a port). */
function createServer() {
  return http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) {
      // handleAPI is async; a rejected route (e.g. a destroyed socket mid-parse)
      // must never crash the process — answer with a 500 if still writable.
      handleAPI(req, res).catch((err) => {
        console.error('[api]', err.message);
        try {
          if (!res.headersSent) json(res, { error: 'internal error' }, 500);
        } catch {}
      });
    } else serveStatic(req, res);
  });
}

module.exports = { createServer, PORT };

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`Workshop running at ${paint(`http://localhost:${PORT}`, 'cyan', 'bold')}`);
    watchProjectsDir();

    // Auto-start a project. Priority: .active-project contents, then first
    // project in projects/, then nothing.
    let projectName = null;
    try {
      const activeFile = fs.readFileSync(ACTIVE_FILE, 'utf-8').trim();
      const m = activeFile.match(/^projects\/([^/]+)$/);
      if (m && fs.existsSync(path.join(PROJECTS_DIR, m[1]))) {
        projectName = m[1];
      }
    } catch {
      // .active-project missing or unreadable — fall through to first project.
    }

    // No valid pointer in .active-project — pick the first available project.
    if (!projectName) {
      const projects = getProjects();
      if (projects.length > 0) {
        projectName = projects[0];
        try {
          fs.writeFileSync(ACTIVE_FILE, `projects/${projectName}`, 'utf-8');
        } catch {}
        console.log(`No .active-project — auto-selected first project: ${projectName}`);
      }
    }

    if (projectName) {
      const projectPath = path.join(PROJECTS_DIR, projectName);
      const run = fs.existsSync(projectPath) ? detectRun(projectPath) : null;
      if (!run) {
        console.log(`Project ${projectName} has no runnable entry point — skipping auto-start.`);
      } else {
        console.log(`Auto-starting project: ${projectName}`);
        startProject(projectName).then((result) => {
          if (result && !result.error) {
            watchProject(projectName);
            console.log(`Project ${projectName} is ready at ${result.url}`);
          } else if (result && result.error) {
            console.error(`Failed to auto-start ${projectName}: ${result.error}`);
          }
        });
      }
    } else {
      console.log('No projects found — nothing to auto-start.');
    }
  });
}
