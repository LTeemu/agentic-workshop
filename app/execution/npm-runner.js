const fs = require('fs');
const path = require('path');
const {
  tryResolveBin,
  hasBuildOutput,
  runNpmBuild,
  ensureDependencies,
} = require('../server-utils/project-utils');

/**
 * Prepare npm execution: install deps + handle missing build output.
 * Mutates `run` to dev mode when appropriate.
 * @returns {Promise<string|null>} error message or null on success
 */
async function prepareNpmRun(projectPath, name, run, pushLog) {
  const depErr = await ensureDependencies(projectPath, name, pushLog);
  if (depErr) return depErr;

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
  } catch (err) {
    const msg = `Failed to parse package.json for ${name}: ${err.message}`;
    pushLog(name, 'system', `Failed to parse package.json: ${err.message}`);
    return msg;
  }

  const usesStart = !!(pkg.scripts && pkg.scripts.start);
  if (usesStart && !hasBuildOutput(projectPath)) {
    const isNpmRunStart = run.cmd === 'npm' && run.args[0] === 'run' && run.args[1] === 'start';
    if (isNpmRunStart && pkg.scripts && pkg.scripts.dev) {
      const devScript = pkg.scripts.dev;
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
        await runNpmBuild(projectPath, name, pushLog);
        pushLog(name, 'system', 'Build completed');
      } catch (err) {
        pushLog(name, 'system', `Build failed: ${err.message}`);
        return `Build failed: ${err.message}`;
      }
    }
  }
  return null;
}

module.exports = { prepareNpmRun };
