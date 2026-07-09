const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PROJECTS_DIR = path.join(ROOT, 'projects');

/**
 * Returns the list of project directories under PROJECTS_DIR.
 * @returns {string[]}
 */
function getProjects() {
  try {
    return fs
      .readdirSync(PROJECTS_DIR)
      .filter((f) => fs.statSync(path.join(PROJECTS_DIR, f)).isDirectory());
  } catch {
    return [];
  }
}

/**
 * Try to find the binary for a simple npm script in node_modules/.bin/.
 * For simple scripts like "next dev" or "vite" this returns the full path
 * to the .cmd file, allowing direct invocation that bypasses npm's PATH
 * management. This is more reliable on Windows when node_modules has been
 * moved (e.g. after unzipping) because .cmd files use %~dp0 which is
 * relative to their own location.
 *
 * Returns null for complex scripts containing shell operators (&&, |, ;)
 * or when the .cmd file doesn't exist.
 *
 * @param {string} projectPath
 * @param {string} script - the npm script content (e.g. "next dev")
 * @returns {string|null} full path to .cmd file, or null
 */
function tryResolveBin(projectPath, script) {
  const parts = script.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  // Only handle simple binary invocations — skip if there are shell operators
  if (/[&|;<>]/.test(script)) return null;
  const binName = parts[0];
  const cmdPath = path.join(projectPath, 'node_modules', '.bin', `${binName}.cmd`);
  if (fs.existsSync(cmdPath)) return cmdPath;
  return null;
}

/**
 * Runs `npm install` in the given project directory, streaming output to logs.
 * @param {string} projectPath
 * @param {string} name - project name for log tagging
 * @param {(name: string, stream: string, text: string) => void} logFn
 * @returns {Promise<void>}
 */
function runNpmInstall(projectPath, name, logFn) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['install'], { cwd: projectPath, stdio: 'pipe', shell: true });
    child.stdout.on('data', (d) => logFn(name, 'stdout', d.toString()));
    child.stderr.on('data', (d) => logFn(name, 'stderr', d.toString()));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm install exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

/**
 * Runs `npm run build` in the given project directory, streaming output to logs.
 * @param {string} projectPath
 * @param {string} name - project name for log tagging
 * @param {(name: string, stream: string, text: string) => void} logFn
 * @returns {Promise<void>}
 */
function runNpmBuild(projectPath, name, logFn) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'build'], { cwd: projectPath, stdio: 'pipe', shell: true });
    child.stdout.on('data', (d) => logFn(name, 'stdout', d.toString()));
    child.stderr.on('data', (d) => logFn(name, 'stderr', d.toString()));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm run build exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

/**
 * Runs `npx playwright install chromium` for projects that need browser testing.
 * Skips if Playwright isn't a dependency or browsers are already installed.
 * @param {string} projectPath
 * @param {string} name - project name for log tagging
 * @param {(name: string, stream: string, text: string) => void} logFn
 * @returns {Promise<void>}
 */
async function ensurePlaywrightBrowsers(projectPath, name, logFn) {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
  } catch {
    return;
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const hasPlaywright = Object.keys(deps).some(
    (d) => d === 'playwright' || d === '@playwright/test' || d === '@vitest/browser',
  );
  if (!hasPlaywright) return;

  // Check if browsers are already installed
  const msPlaywright = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    'AppData',
    'Local',
    'ms-playwright',
  );
  let hasBrowser = false;
  try {
    const entries = fs.readdirSync(msPlaywright);
    hasBrowser = entries.some((e) => /^chromium-/i.test(e));
  } catch {
    /* directory doesn't exist yet */
  }
  if (hasBrowser) return;

  logFn(name, 'system', 'Installing Playwright Chromium browser...');
  return new Promise((resolve) => {
    const child = spawn('npx', ['playwright', 'install', 'chromium'], {
      cwd: projectPath,
      stdio: 'pipe',
      shell: true,
    });
    child.stdout.on('data', (d) => logFn(name, 'stdout', d.toString()));
    child.stderr.on('data', (d) => logFn(name, 'stderr', d.toString()));
    child.on('close', (code) => {
      if (code === 0) {
        logFn(name, 'system', 'Playwright Chromium installed');
      } else {
        logFn(
          name,
          'system',
          `Playwright install exited with code ${code} — browser tests may fail`,
        );
      }
      resolve();
    });
    child.on('error', (err) => {
      logFn(name, 'system', `Playwright install failed: ${err.message}`);
      resolve();
    });
  });
}

/**
 * Returns true if common build output directories exist for the project.
 *
 * Covers:
 *   - dist/  — standard for most bundlers (Vite, webpack, etc.)
 *   - build/ — common alternative (create-react-app, etc.)
 *   - .next/BUILD_ID — Next.js production build only (next dev creates
 *     .next/ without BUILD_ID; next start needs the production artifact)
 * @param {string} projectPath
 * @returns {boolean}
 */
function hasBuildOutput(projectPath) {
  if (fs.existsSync(path.join(projectPath, 'dist'))) return true;
  if (fs.existsSync(path.join(projectPath, 'build'))) return true;
  // Only count .next/ as build output when BUILD_ID exists (production build)
  if (fs.existsSync(path.join(projectPath, '.next', 'BUILD_ID'))) return true;
  return false;
}

/**
 * Returns workspace file: dependencies from a package.json.
 * These are `file:`-protocol deps that point to another project in the
 * projects/ directory. They must be built before the main project can start.
 * Also scans devDependencies and peerDependencies for completeness.
 * @param {string} projectPath
 * @param {object} pkg - parsed package.json
 * @returns {Array<{name: string, path: string}>}
 */
function getFileDependencies(projectPath, pkg) {
  const result = [];
  const seen = new Set();
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  for (const [depName, depVersion] of Object.entries(deps)) {
    if (typeof depVersion === 'string' && depVersion.startsWith('file:')) {
      if (seen.has(depName)) continue;
      seen.add(depName);
      const depPath = path.resolve(projectPath, depVersion.slice(5));
      if (depPath.startsWith(PROJECTS_DIR)) {
        result.push({ name: depName, path: depPath });
      }
    }
  }
  return result;
}

/**
 * Auto-install node_modules and build file: dependencies if needed.
 * Returns null on success, or an error message string on failure.
 *
 * @param {string} projectPath
 * @param {string} name - project name for log tagging
 * @param {(name: string, stream: string, text: string) => void} logFn
 * @returns {Promise<string|null>}
 */
async function ensureDependencies(projectPath, name, logFn) {
  const nmPath = path.join(projectPath, 'node_modules');
  if (!fs.existsSync(nmPath)) {
    logFn(name, 'system', 'node_modules not found — running npm install...');
    try {
      await runNpmInstall(projectPath, name, logFn);
      logFn(name, 'system', 'npm install completed');
    } catch (err) {
      logFn(name, 'system', `npm install failed: ${err.message}`);
      return `npm install failed: ${err.message}`;
    }
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
  } catch (err) {
    return `Failed to parse package.json for ${name}: ${err.message}`;
  }

  // Ensure Playwright browser binaries for projects that need them
  await ensurePlaywrightBrowsers(projectPath, name, logFn);

  // Build any workspace file: dependencies first
  const fileDeps = getFileDependencies(projectPath, pkg);
  for (const dep of fileDeps) {
    const depPkgPath = path.join(dep.path, 'package.json');
    if (!fs.existsSync(depPkgPath)) continue;
    let depPkg;
    try {
      depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf-8'));
    } catch {
      logFn(name, 'system', `Skipping dependency "${dep.name}" — unreadable package.json`);
      continue;
    }
    const depNeedsBuild = depPkg.scripts && depPkg.scripts.build && !hasBuildOutput(dep.path);
    const depNeedsInstall = !fs.existsSync(path.join(dep.path, 'node_modules'));
    if (depNeedsInstall || depNeedsBuild) {
      logFn(name, 'system', `Preparing file: dependency "${dep.name}"...`);
      if (depNeedsInstall) {
        try {
          await runNpmInstall(dep.path, `${name}:${dep.name}`, logFn);
        } catch (err) {
          logFn(name, 'system', `npm install failed for dependency "${dep.name}": ${err.message}`);
          return `Failed to install dependency "${dep.name}": ${err.message}`;
        }
      }
      if (depNeedsBuild) {
        try {
          await runNpmBuild(dep.path, `${name}:${dep.name}`, logFn);
          logFn(name, 'system', `Dependency "${dep.name}" built successfully`);
        } catch (err) {
          logFn(name, 'system', `Failed to build dependency "${dep.name}": ${err.message}`);
          return `Failed to build dependency "${dep.name}": ${err.message}`;
        }
      }
    }
    // Install Playwright browsers for file: deps too
    await ensurePlaywrightBrowsers(dep.path, `${name}:${dep.name}`, logFn);
  }

  return null;
}

module.exports = {
  getProjects,
  tryResolveBin,
  runNpmInstall,
  runNpmBuild,
  ensurePlaywrightBrowsers,
  hasBuildOutput,
  getFileDependencies,
  ensureDependencies,
  PROJECTS_DIR,
};
