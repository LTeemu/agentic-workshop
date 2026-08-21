const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ACTIVE_FILE = path.join(ROOT, '.active-project');
const PUBLIC_DIR = path.join(__dirname, 'public');
const BACKUPS_DIR = path.join(ROOT, '_backups');
const PROJECTS_DIR = path.join(ROOT, 'projects');

const ARTIFACT_DIRS = new Set(['node_modules', '__pycache__', 'dist', 'build', 'data']);

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

module.exports = {
  ROOT,
  ACTIVE_FILE,
  PUBLIC_DIR,
  BACKUPS_DIR,
  PROJECTS_DIR,
  ARTIFACT_DIRS,
  PORT,
  MIME,
};
