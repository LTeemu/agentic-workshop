const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ROOT, BACKUPS_DIR } = require('../constants');

const GRACEFUL_TIMEOUT = 3000;

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
    if (child && child.exitCode == null) {
      child.once('exit', done);
    }
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      } catch {}
      done();
    } else {
      try {
        process.kill(-pid, 'SIGTERM');
      } catch {}
      setTimeout(() => {
        try {
          process.kill(-pid, 'SIGKILL');
        } catch {}
        done();
      }, GRACEFUL_TIMEOUT);
      setTimeout(done, GRACEFUL_TIMEOUT + 1000);
    }
  });
}

function backupProject(name, projectsDir) {
  const src = path.join(projectsDir, name);
  if (!fs.existsSync(src)) return null;
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

module.exports = {
  killPortOwner,
  killProcessTree,
  backupProject,
  BACKUPS_DIR,
  GRACEFUL_TIMEOUT,
  ROOT,
};
