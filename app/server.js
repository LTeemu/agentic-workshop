const http = require('http');
const fs = require('fs');
const path = require('path');
const { PORT, PUBLIC_DIR, PROJECTS_DIR } = require('./constants');
const { MIME } = require('./constants');
const { getProjects } = require('./project-utils');
const { detectRun } = require('./execution/detect');
const {
  getActive,
  startProject,
  readActiveProjectName,
  writeActiveProject,
} = require('./project-manager');
const { watchProjectsDir, watchProject } = require('./services/watcher');
const { handleAPI, json } = require('./api-handler');
const { paint } = require('./colors');

const startTime = Date.now();

function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  filePath = path.join(PUBLIC_DIR, filePath);
  const rel = path.relative(PUBLIC_DIR, filePath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
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

function createServer() {
  return http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) {
      const maybePromise = handleAPI(req, res, { startTime, PORT });
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise
          .then((handled) => {
            if (handled === null) json(res, { error: 'not found' }, 404);
          })
          .catch((err) => {
            console.error('[api]', err.message);
            try {
              if (!res.headersSent) json(res, { error: 'internal error' }, 500);
            } catch {}
          });
      } else if (maybePromise === null) json(res, { error: 'not found' }, 404);
    } else serveStatic(req, res);
  });
}

function resolveAutoStartProject() {
  let name = readActiveProjectName();
  if (name) return name;
  const projects = getProjects();
  if (projects.length === 0) return null;
  name = projects[0];
  writeActiveProject(name);
  console.log(`No .active-project — auto-selected first project: ${name}`);
  return name;
}

module.exports = { createServer, PORT };

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`Workshop running at ${paint(`http://localhost:${PORT}`, 'cyan', 'bold')}`);
    watchProjectsDir();
    const projectName = resolveAutoStartProject();
    if (!projectName) return console.log('No projects found — nothing to auto-start.');
    const projectPath = path.join(PROJECTS_DIR, projectName);
    const run = fs.existsSync(projectPath) ? detectRun(projectPath) : null;
    if (!run)
      return console.log(
        `Project ${projectName} has no runnable entry point — skipping auto-start.`,
      );
    console.log(`Auto-starting project: ${projectName}`);
    startProject(projectName).then((result) => {
      if (result && !result.error) {
        watchProject(projectName);
        console.log(`Project ${projectName} is ready at ${result.url}`);
      } else if (result && result.error)
        console.error(`Failed to auto-start ${projectName}: ${result.error}`);
    });
  });
}
