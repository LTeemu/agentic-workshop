const path = require('path');

// ── workspace paths ──
const ROOT = path.resolve(__dirname, '..');
const PROJECTS_DIR = path.join(ROOT, 'projects');
const ACTIVE_FILE = path.join(ROOT, '.active-project'); // tracks `projects/<name>`
const PUBLIC_DIR = path.join(__dirname, 'public');
const BACKUPS_DIR = path.join(ROOT, '_backups');

// ── server ──
const PORT = 3000;
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ── file watching ──
// Transient dirs — skipped by watchers and build walkers
const ARTIFACT_DIRS = new Set(['node_modules', '__pycache__', 'dist', 'build', 'data']);

// ── terminal ──
// Dimensions
const TERMINAL_MAX_COLS = 500;
const TERMINAL_MAX_ROWS = 300;
// Replay buffer — how much pty output to keep for late-attaching clients
const TERMINAL_BUFFER_MAX = 256 * 1024;
// Lifecycle
const TERMINAL_RESPAWN_WINDOW_MS = 10_000;
const TERMINAL_RESPAWN_LIMIT = 5;
const TERMINAL_IDLE_TTL_MS = 10 * 60 * 1000;
// Opencode TUI detection polling
const TERMINAL_OPENCODE_POLL_MS = 1000;
const TERMINAL_OPENCODE_PROBE_TIMEOUT_MS = 3000;

module.exports = {
  ROOT,
  PROJECTS_DIR,
  ACTIVE_FILE,
  PUBLIC_DIR,
  BACKUPS_DIR,
  PORT,
  MIME,
  ARTIFACT_DIRS,
  TERMINAL_MAX_COLS,
  TERMINAL_MAX_ROWS,
  TERMINAL_BUFFER_MAX,
  TERMINAL_RESPAWN_WINDOW_MS,
  TERMINAL_RESPAWN_LIMIT,
  TERMINAL_IDLE_TTL_MS,
  TERMINAL_OPENCODE_POLL_MS,
  TERMINAL_OPENCODE_PROBE_TIMEOUT_MS,
};
