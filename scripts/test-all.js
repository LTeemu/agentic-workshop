const { getProjects } = require('../app/project-utils');
const { runTest, detectTest } = require('../app/test-runner');
const path = require('path');

const PROJECTS_DIR = path.resolve(__dirname, '..', 'projects');

async function main() {
  const projects = getProjects();
  const results = [];

  const logFn = (name, stream, text) => {
    if (stream === 'system') console.log(`[${name}] ${text}`);
    else process.stdout.write(`[${name}] ${text}`);
  };

  for (const name of projects) {
    if (!detectTest(path.join(PROJECTS_DIR, name))) continue;
    const result = await runTest(name, logFn);
    results.push({ project: name, ...result });
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n${passed} passed, ${failed} failed, ${results.length} total`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
