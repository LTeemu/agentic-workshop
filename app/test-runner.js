const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { ensureDependencies, tryResolveBin, PROJECTS_DIR } = require('./project-utils');

/**
 * Determine the test runner for a project.
 * @param {string} projectPath
 * @returns {{ type: string, label: string } | null}
 */
function detectTest(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts && pkg.scripts.test) {
        return { type: 'npm', label: 'npm test' };
      }
    } catch {}
  }
  return null;
}

/**
 * Runs the project's test script directly from package.json, bypassing npm
 * lifecycle hooks (pretest/posttest). Resolves the first word to a binary in
 * node_modules/.bin when possible — same pattern as startProject().
 *
 * @param {string} projectPath
 * @param {string} name - project name for log tagging
 * @param {(name: string, stream: string, text: string) => void} logFn
 * @returns {Promise<void>}
 */
function runNpmTest(projectPath, name, logFn) {
  return new Promise((resolve, reject) => {
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
    } catch (err) {
      reject(new Error(`Failed to read package.json: ${err.message}`));
      return;
    }
    const testScript = pkg.scripts && pkg.scripts.test;
    if (!testScript) {
      reject(new Error('No test script found in package.json'));
      return;
    }

    logFn(name, 'system', `Running: ${testScript}`);

    const binPath = tryResolveBin(projectPath, testScript);
    let child;

    if (binPath) {
      // Resolved to a binary in node_modules/.bin/ (e.g. vitest, jest).
      // .cmd files on Windows need shell: true to execute.
      child = spawn(binPath, testScript.trim().split(/\s+/).filter(Boolean).slice(1), {
        cwd: projectPath,
        stdio: 'pipe',
        shell: true,
      });
    } else {
      const parts = testScript.trim().split(/\s+/).filter(Boolean);
      if (parts[0] === 'node') {
        // Use 'node' resolved via PATH (avoids quoting issues with shell: true
        // on paths containing spaces like C:\Program Files).
        child = spawn('node', parts.slice(1), { cwd: projectPath, stdio: 'pipe', shell: true });
      } else {
        // Complex script (cd &&, |, etc.) — run directly via cmd.exe.
        child = spawn(process.env.COMSPEC || 'cmd.exe', ['/d', '/s', '/c', testScript], {
          cwd: projectPath,
          stdio: 'pipe',
        });
      }
    }
    child.stdout.on('data', (d) => logFn(name, 'stdout', d.toString()));
    child.stderr.on('data', (d) => logFn(name, 'stderr', d.toString()));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Tests exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

/**
 * Run tests for a project. Auto-installs dependencies if needed.
 * @param {string} name
 * @param {(name: string, stream: string, text: string) => void} logFn
 * @returns {Promise<{error?: string, passed?: boolean, runner?: string}>}
 */
async function runTest(name, logFn) {
  const projectPath = path.join(PROJECTS_DIR, name);
  if (!fs.existsSync(projectPath)) return { error: 'not found' };

  // Check for a test script first — avoids running npm install on projects
  // that have no test script (e.g. Gradle/Android projects).
  const runner = detectTest(projectPath);
  if (!runner) {
    logFn(name, 'system', 'No test script found in package.json');
    return { error: 'No test script found' };
  }

  logFn(name, 'system', 'Running tests...');

  // Auto-install dependencies if needed
  const depErr = await ensureDependencies(projectPath, name, logFn);
  if (depErr) return { error: depErr };

  logFn(name, 'system', `Running: ${runner.label}...`);

  try {
    if (runner.type === 'npm') {
      await runNpmTest(projectPath, name, logFn);
    }
    logFn(name, 'system', 'Tests passed');
    return { passed: true, runner: runner.label };
  } catch (err) {
    logFn(name, 'system', `Tests failed: ${err.message}`);
    return {
      passed: false,
      error: err.message,
      runner: runner.label,
    };
  }
}

module.exports = { detectTest, runNpmTest, runTest };
