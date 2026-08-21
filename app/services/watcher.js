const fs = require('fs');
const path = require('path');
const { PROJECTS_DIR, ARTIFACT_DIRS } = require('../constants');
const { broadcastSSE } = require('./sse');

let activeWatcher = null;
let projectsWatcher = null;

function isIgnoredPath(filename) {
  if (!filename) return true;
  const parts = filename.split(/[\\/]/);
  return parts.some((p) => ARTIFACT_DIRS.has(p) || p.startsWith('.'));
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
    projectsWatcher = fs.watch(PROJECTS_DIR, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        broadcastSSE({ type: 'project-list-change' });
      }, 300);
    });
  } catch (err) {
    console.error('Failed to watch projects directory:', err.message);
  }
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

function closeActiveWatcher() {
  if (activeWatcher) {
    try {
      activeWatcher.close();
    } catch (err) {
      console.error('[closeActiveWatcher] Error closing watcher:', err?.message || err);
    }
    activeWatcher = null;
  }
}

module.exports = {
  ARTIFACT_DIRS,
  isIgnoredPath,
  watchProjectsDir,
  watchProject,
  closeActiveWatcher,
  getActiveWatcher: () => activeWatcher,
  getProjectsWatcher: () => projectsWatcher,
};
