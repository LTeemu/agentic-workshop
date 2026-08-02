/**
 * Terminal sessions for the dashboard: spawns a real shell (PowerShell on
 * Windows, $SHELL on Unix) in a ConPTY (node-pty). A shortcut in the UI can
 * launch the `opencode2` TUI inside the same session, and exiting it returns
 * to the shell. If the shell exits for any reason (including opencode2's
 * Windows ConPTY-corruption bug on exit), a fresh shell is respawned in place
 * so the session stays usable; repeated crashes (rate-limited) end it.
 *
 * Transport mirrors the dashboard's existing patterns: SSE server→browser
 * (`/api/terminal/:id/stream`), JSON POSTs browser→server for input/resize.
 */
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');

let pty = null;
try {
  pty = require('node-pty');
} catch {
  pty = null;
}

const ID_RE = /^[a-zA-Z0-9_-]+$/;
const MAX_COLS = 500;
const MAX_ROWS = 300;

/**
 * How much pty output to keep per session for replay. Late-attaching clients
 * (e.g. after a page refresh) get this buffer replayed so the screen isn't
 * blank. Trimmed at line boundaries so escape sequences survive the cut.
 */
const BUFFER_MAX = 256 * 1024;

/** id → { id, pty, cols, rows, clients: Set<res>, exited } */
const terminals = new Map();

/** Locate the opencode2 executable; falls back to the PATH name. */
function resolveOpenCodeBin(platform = process.platform, env = process.env) {
  if (env.OPENCODE_BIN && fs.existsSync(env.OPENCODE_BIN)) {
    return env.OPENCODE_BIN;
  }
  if (platform === 'win32') {
    const candidates = [
      path.join(
        env.APPDATA || '',
        'npm',
        'node_modules',
        '@opencode-ai',
        'cli',
        'bin',
        'opencode2.exe',
      ),
      path.join(
        env.LOCALAPPDATA || '',
        'npm',
        'node_modules',
        '@opencode-ai',
        'cli',
        'bin',
        'opencode2.exe',
      ),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  return 'opencode2';
}

/** Shell executable + args for the host platform. */
function shellCommand() {
  if (process.platform === 'win32') {
    return { file: 'powershell.exe', args: ['-NoLogo'] };
  }
  return { file: process.env.SHELL || '/bin/bash', args: [] };
}

/** Restart throttling: at most RESPAWN_LIMIT respawns per window, so a broken
 * shell (e.g. a crashing profile) can't loop forever. */
const RESPAWN_WINDOW_MS = 10_000;
const RESPAWN_LIMIT = 5;

/**
 * How long a session survives with no attached viewers. Long enough to outlive
 * a page refresh (the new page re-attaches within a second or two), short
 * enough that a forgotten tab can't pin a shell and the opencode poller forever.
 */
const IDLE_TTL_MS = 10 * 60 * 1000;

/** Drop restart timestamps outside the rate-limit window (mutates term). */
function pruneRestartTimes(term, now) {
  term.restartTimes = term.restartTimes.filter((t) => now - t < RESPAWN_WINDOW_MS);
}

/** Whether the terminal may respawn its shell. Closed terminals and terminals
 * at the rate limit return false. */
function shouldRespawn(term, now = Date.now()) {
  if (term.closing) return false;
  pruneRestartTimes(term, now);
  return term.restartTimes.length < RESPAWN_LIMIT;
}

function spawnShell(cwd, cols, rows) {
  if (!pty) throw new Error('node-pty is not installed — run `npm install`');
  const { file, args } = shellCommand();
  // useConptyDll: kill via the bundled ConPTY DLL instead of forking
  // conpty_console_list_agent, whose AttachConsole fails outside an
  // interactive console (e.g. git hooks) and prints a noisy crash.
  return pty.spawn(file, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    useConpty: true,
    useConptyDll: true,
  });
}

/** Clamp terminal dimensions to sane bounds. */
function sanitizeSize(cols, rows) {
  return {
    cols: Math.min(Math.max(2, cols | 0), MAX_COLS),
    rows: Math.min(Math.max(2, rows | 0), MAX_ROWS),
  };
}

/**
 * Append pty output to the session's replay buffer. When the buffer exceeds
 * BUFFER_MAX, drop the front so the newest output survives. The cut prefers the
 * next line boundary past the excess point (so a mid-line slice can't corrupt a
 * partially-applied ANSI sequence); a hard cut is the last resort so a single
 * unbroken line (spinner, huge dump) can't wipe the whole history. A line
 * boundary far past the excess point keeps less than the cap — bounded, never
 * empty, and always the newest bytes.
 */
function appendBuffer(term, data) {
  term.buffer += data;
  if (term.buffer.length <= BUFFER_MAX) return;
  const excess = term.buffer.length - BUFFER_MAX;
  // Cut at the first safe boundary past the excess: an ESC (start of an ANSI
  // sequence — the reliable boundary for TUI/alt-screen output, which mostly
  // redraws with cursor moves), else a newline (keeps whole lines), else the
  // hard cut so a single unbroken run can't wipe the whole history.
  const atEsc = term.buffer.indexOf('\x1b', excess);
  const atNl = term.buffer.indexOf('\n', excess);
  const esc = atEsc >= 0 ? atEsc : Infinity;
  const nl = atNl >= 0 ? atNl + 1 : Infinity;
  const cut = Math.min(esc, nl);
  term.buffer = term.buffer.slice(cut === Infinity ? excess : cut);
}

/**
 * Shell command that launches the opencode2 binary. `platform` is injectable
 * for tests; the caller must quote for the shell actually running.
 */
function quoteForShell(bin, platform = process.platform) {
  if (bin === 'opencode2') return 'opencode2';
  if (platform === 'win32') {
    // PowerShell: & '...' invokes a quoted path; ' is escaped by doubling.
    return `& '${bin.replace(/'/g, "''")}'`;
  }
  // POSIX shell: single-quote, escaping embedded ' as '\''.
  return `'${bin.replace(/'/g, "'\\''")}'`;
}

function openCodeLaunchCommand() {
  return quoteForShell(resolveOpenCodeBin());
}

// ── opencode2 TUI detection ────────────────────────────────────────────
// The opencode2 button types the launch command into the shell. Once the TUI
// is running it owns the terminal in raw mode, so typing the command again
// would paste it into opencode's chat. The UI hides the button while a probe
// finds an opencode2 process under the shell's process tree. One shared
// poller lists processes once per tick and updates every attached terminal,
// so N sessions cost one process query per tick instead of N.

/** How often to poll the process tree for a running opencode2 TUI. */
const OPENCODE_POLL_MS = 1000;
/** Timeout for a single process-list query. */
const OPENCODE_PROBE_TIMEOUT_MS = 3000;

/** Command that lists every process as pid/ppid/name. */
function processListCommand(platform = process.platform) {
  if (platform === 'win32') {
    return [
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name | ConvertTo-Json -Compress',
      ],
    ];
  }
  return ['ps', ['-eo', 'pid=,ppid=,comm=']];
}

/** Parse `ps`/`Get-CimInstance` output into [{ pid, ppid, name }]. */
function parseProcessList(platform, stdout) {
  if (platform === 'win32') {
    const arr = JSON.parse(stdout);
    const rows = Array.isArray(arr) ? arr : [arr];
    return rows.map((p) => ({
      pid: p.ProcessId,
      ppid: p.ParentProcessId,
      name: p.Name || '',
    }));
  }
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [pid, ppid, ...nameParts] = line.trim().split(/\s+/);
      return { pid: +pid, ppid: +ppid, name: nameParts.join(' ') || '' };
    });
}

/** Whether a process name refers to the opencode2 CLI (any of its processes). */
function isOpenCodeName(name) {
  const base = name
    .replace(/\.exe$/i, '')
    .split(/[\\/]/)
    .pop()
    .trim();
  return /^opencode2?$/i.test(base);
}

/**
 * One process-list query → an index for descendant lookups. `run` is
 * injectable for tests.
 */
async function snapshotProcessTree(platform = process.platform, run = execFile) {
  const [file, args] = processListCommand(platform);
  const stdout = await new Promise((resolve, reject) => {
    run(file, args, { windowsHide: true, timeout: OPENCODE_PROBE_TIMEOUT_MS }, (err, out) =>
      err ? reject(err) : resolve(out),
    );
  });
  const procs = parseProcessList(platform, stdout);
  const byPid = new Map(procs.map((p) => [p.pid, p]));
  const childrenByPpid = new Map();
  for (const p of procs) {
    if (!childrenByPpid.has(p.ppid)) childrenByPpid.set(p.ppid, []);
    childrenByPpid.get(p.ppid).push(p);
  }
  return { byPid, childrenByPpid };
}

/**
 * Whether an opencode2 process runs in the process tree rooted at `shellPid`
 * (the shell the TUI was launched from, itself included).
 */
function isOpenCodeInTree({ byPid, childrenByPpid }, shellPid) {
  const stack = [shellPid];
  const seen = new Set();
  while (stack.length) {
    const pid = stack.pop();
    if (seen.has(pid)) continue;
    seen.add(pid);
    const proc = byPid.get(pid);
    if (proc && isOpenCodeName(proc.name)) return true;
    for (const child of childrenByPpid.get(pid) || []) stack.push(child.pid);
  }
  return false;
}

/**
 * Whether an opencode2 process runs under the process tree rooted at
 * `shellPid`. Used by the on-demand `/opencode` route; the shared poller
 * queries once and updates every attached terminal from one snapshot.
 */
async function isOpenCodeRunning(shellPid, platform = process.platform, run = execFile) {
  return isOpenCodeInTree(await snapshotProcessTree(platform, run), shellPid);
}

/** Global in-flight guard: a slow query skips the tick instead of piling up. */
let openCodeProbeInFlight = false;
/** Shared interval, started on demand and stopped when no sessions remain. */
let openCodeTimer = null;

/**
 * One poll tick: refresh every attached terminal's opencode state from a
 * single process snapshot. Terminals with no attached clients are skipped
 * (their state is refreshed by the `/opencode` route when a viewer returns),
 * and a failed snapshot keeps every terminal's last known state.
 */
async function pollOpenCodeState(platform = process.platform, run = execFile) {
  if (openCodeProbeInFlight) return; // slow query still running — skip this tick
  const targets = [...terminals.values()].filter(
    (t) => !t.exited && !t.closing && t.clients.size > 0,
  );
  if (targets.length === 0) return;
  openCodeProbeInFlight = true;
  let snapshot;
  try {
    snapshot = await snapshotProcessTree(platform, run);
  } catch {
    openCodeProbeInFlight = false;
    return; // probe failed — keep the last known state
  }
  openCodeProbeInFlight = false;
  for (const t of targets) {
    const running = isOpenCodeInTree(snapshot, t.pty.pid);
    if (running !== t.openCodeRunning) {
      t.openCodeRunning = running;
      broadcast(t, 'opencode', running);
    }
  }
}

/** Start the shared poller (idempotent). */
function startOpenCodePoller(platform = process.platform, run = execFile) {
  if (openCodeTimer) return;
  openCodeTimer = setInterval(() => pollOpenCodeState(platform, run), OPENCODE_POLL_MS);
}

/** Stop the shared poller (called when the last session is torn down). */
function stopOpenCodePoller() {
  clearInterval(openCodeTimer);
  openCodeTimer = null;
  openCodeProbeInFlight = false; // a stale in-flight query must not stall a new poller
}

/** Write an SSE event to every attached client; drops dead clients. */
function broadcast(term, type, data) {
  for (const client of term.clients) {
    if (client.writableEnded) continue;
    try {
      client.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    } catch {
      term.clients.delete(client);
    }
  }
}

/** End and detach all SSE clients (session is over). */
function closeClients(term) {
  for (const client of term.clients) {
    if (!client.writableEnded) client.end();
  }
  term.clients.clear();
}

/** Mark a terminal as finished and detach all clients (idempotent). */
function teardownTerminal(term, exitCode) {
  if (term.exited) return;
  term.exited = true;
  clearTimeout(term.idleTimer);
  broadcast(term, 'exit', exitCode);
  closeClients(term);
  terminals.delete(term.id);
  if (terminals.size === 0) stopOpenCodePoller();
}

/**
 * Wire a terminal's pty to its SSE clients. When the shell exits, the session
 * is respawned in place (a fresh ConPTY, since the old console is gone) unless
 * the terminal was closed explicitly or the respawn rate limit was hit.
 */
function attachTerminal(term, cwd) {
  term.pty.onData((data) => {
    appendBuffer(term, data);
    broadcast(term, 'data', data);
  });

  term.pty.onExit(({ exitCode }) => {
    if (shouldRespawn(term)) {
      let next;
      try {
        next = spawnShell(cwd, term.cols, term.rows);
      } catch {
        next = null; // spawn failed — end the session
      }
      if (next) {
        term.pty = next;
        term.buffer = ''; // the new shell's screen starts fresh
        term.restartTimes.push(Date.now());
        if (term.openCodeRunning) {
          // The old TUI died with the shell — tell the UI before the next poll.
          term.openCodeRunning = false;
          broadcast(term, 'opencode', false);
        }
        attachTerminal(term, cwd);
        broadcast(term, 'restart', exitCode);
        return;
      }
    }
    teardownTerminal(term, exitCode);
  });
}

function startTerminal(cwd, cols, rows, opts = {}) {
  const id = crypto.randomUUID();
  const size = sanitizeSize(cols, rows);
  const term = {
    id,
    pty: spawnShell(cwd, size.cols, size.rows),
    cols: size.cols,
    rows: size.rows,
    clients: new Set(),
    exited: false,
    closing: false,
    restartTimes: [],
    buffer: '',
    openCodeRunning: false,
    idleTtlMs: opts.idleTtlMs || IDLE_TTL_MS,
  };
  terminals.set(id, term);
  attachTerminal(term, cwd);
  startOpenCodePoller(opts.platform, opts.run);

  return term;
}

function getTerminal(id) {
  return ID_RE.test(id) ? terminals.get(id) : null;
}

function writeInput(id, data) {
  const term = getTerminal(id);
  if (!term || term.exited) return false;
  try {
    term.pty.write(data);
  } catch {
    return false; // pty may have just exited — the respawn path takes over
  }
  return true;
}

function resizeTerminal(id, cols, rows) {
  const term = getTerminal(id);
  if (!term || term.exited) return false;
  const size = sanitizeSize(cols, rows);
  if (size.cols !== term.cols || size.rows !== term.rows) {
    term.cols = size.cols;
    term.rows = size.rows;
    try {
      term.pty.resize(size.cols, size.rows);
    } catch {
      // pty may have just exited — the respawned shell picks up term.cols/rows
    }
  }
  return true;
}

function killTerminal(id) {
  const term = getTerminal(id);
  if (!term) return false;
  term.closing = true; // explicit close — do not respawn a new shell
  try {
    term.pty.kill();
  } catch {
    // pty may already be gone; onExit normally handles cleanup
  }
  // Fallback cleanup in case onExit never fires.
  teardownTerminal(term);
  return true;
}

/** Schedule teardown of a session with no attached viewers. Attaching a viewer
 * cancels the timer; the timer re-checks so a racing attach always wins. */
function scheduleIdleTeardown(term, ttlMs = term.idleTtlMs || IDLE_TTL_MS) {
  clearTimeout(term.idleTimer);
  term.idleTimer = setTimeout(() => {
    if (term.clients.size === 0 && !term.exited && !term.closing) killTerminal(term.id);
  }, ttlMs);
}

/** Attach an SSE response to a live terminal. Returns false if unknown/exited.
 * On attach, replays the session's output buffer so the client (e.g. after a
 * page refresh) sees the shell's current state instead of a blank screen. */
function attachStream(id, res, startSSE) {
  const term = getTerminal(id);
  if (!term || term.exited) return false;
  startSSE(res);
  term.clients.add(res);
  clearTimeout(term.idleTimer); // a viewer is back — cancel pending idle teardown
  res.on('close', () => {
    term.clients.delete(res);
    if (term.clients.size === 0) scheduleIdleTeardown(term);
  });
  if (term.buffer) {
    try {
      res.write(`data: ${JSON.stringify({ type: 'replay', data: term.buffer })}\n\n`);
    } catch {
      // Socket is already gone — the 'close' handler cleans up.
    }
  }
  return true;
}

// Best-effort cleanup when the dashboard server shuts down.
process.on('exit', () => {
  for (const term of terminals.values()) {
    try {
      term.pty.kill();
    } catch {}
  }
});

/** Test seam: swap the pty implementation (returns the previous one for restore). */
function _setPty(impl) {
  const prev = pty;
  pty = impl;
  return prev;
}

module.exports = {
  startTerminal,
  getTerminal,
  writeInput,
  resizeTerminal,
  killTerminal,
  attachStream,
  appendBuffer,
  BUFFER_MAX,
  IDLE_TTL_MS,
  resolveOpenCodeBin,
  quoteForShell,
  openCodeLaunchCommand,
  shouldRespawn,
  pruneRestartTimes,
  processListCommand,
  parseProcessList,
  isOpenCodeName,
  isOpenCodeRunning,
  snapshotProcessTree,
  isOpenCodeInTree,
  pollOpenCodeState,
  startOpenCodePoller,
  stopOpenCodePoller,
  scheduleIdleTeardown,
  _setPty,
};
