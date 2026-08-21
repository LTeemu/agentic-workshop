const fs = require('fs');
const path = require('path');
const http = require('http');
const { PROJECTS_DIR, ARTIFACT_DIRS, MIME } = require('../constants');

function projectPort(name) {
  const portFile = path.join(PROJECTS_DIR, name, '.port');
  try {
    const pinned = parseInt(fs.readFileSync(portFile, 'utf-8').trim(), 10);
    if (pinned >= 4001 && pinned <= 4999) return pinned;
  } catch {
    /* no .port file or invalid — fall through */
  }
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) + hash + name.charCodeAt(i);
    hash |= 0;
  }
  return 4000 + (Math.abs(hash) % 998) + 1;
}

function detectRun(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const script = pkg.scripts && (pkg.scripts.start || pkg.scripts.dev);
      if (script) {
        if (script.startsWith('node ')) {
          const args = script.slice(5).split(/\s+/).filter(Boolean);
          return { type: 'npm', cmd: 'node', args };
        }
        return {
          type: 'npm',
          cmd: 'npm',
          args: ['run', pkg.scripts.start ? 'start' : 'dev'],
        };
      }
    } catch {}
  }
  if (fs.existsSync(path.join(projectPath, 'server.js'))) {
    return { type: 'node', cmd: 'node', args: [path.join(projectPath, 'server.js')] };
  }
  if (fs.existsSync(path.join(projectPath, 'index.html'))) {
    return { type: 'static' };
  }
  if (fs.readdirSync(projectPath).some((f) => f.endsWith('.csproj'))) {
    return { type: 'dotnet', cmd: 'dotnet', args: ['run'] };
  }
  return null;
}

function describeProject(projectPath) {
  if (fs.existsSync(path.join(projectPath, 'build.gradle.kts'))) return 'gradle (kotlin)';
  if (fs.existsSync(path.join(projectPath, 'build.gradle'))) return 'gradle';
  if (
    fs.existsSync(path.join(projectPath, 'gradlew')) ||
    fs.existsSync(path.join(projectPath, 'gradlew.bat'))
  )
    return 'gradle';
  if (fs.existsSync(path.join(projectPath, 'pom.xml'))) return 'maven';
  if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) return 'rust (cargo)';
  if (fs.existsSync(path.join(projectPath, 'main.py'))) return 'python';
  if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) return 'python';
  if (fs.existsSync(path.join(projectPath, 'Dockerfile'))) return 'docker';
  if (fs.readdirSync(projectPath).some((f) => f.endsWith('.csproj'))) return '.net';

  const run = detectRun(projectPath);
  if (run) {
    if (run.type === 'npm') return 'npm';
    if (run.type === 'node') return 'node.js';
    if (run.type === 'static') return 'static html';
  }

  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts && pkg.scripts.test) return 'npm';
    } catch {}
  }

  if (
    fs.existsSync(path.join(projectPath, 'docker-compose.yml')) ||
    fs.existsSync(path.join(projectPath, 'docker-compose.yaml'))
  )
    return 'docker compose';
  return null;
}

function startStaticServer(projectPath, port) {
  const server = http.createServer((req, res) => {
    let filePath = path.join(
      projectPath,
      req.url === '/' ? 'index.html' : decodeURIComponent(req.url).split('?')[0],
    );
    const rel = path.relative(projectPath, filePath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
      const content = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      });
      res.end(content);
    } catch {
      try {
        const content = fs.readFileSync(path.join(projectPath, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    }
  });
  server.on('error', (err) => {
    console.error(`Static server error on port ${port}:`, err.message);
  });
  server.listen(port);
  return server;
}

function walkDir(dir, fn) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!ARTIFACT_DIRS.has(entry.name)) walkDir(full, fn);
      } else {
        fn(full);
      }
    }
  } catch {}
}

function minifyCSS(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;\s*}/g, '}')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function minifyJS(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\s*([{}=+\-*/%!;&:;,()|^~<>?])\s*/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function buildProject(name) {
  const projectPath = path.join(PROJECTS_DIR, name);
  if (!fs.existsSync(projectPath)) return { error: 'not found' };

  const distDir = path.join(projectPath, 'dist');
  try {
    fs.mkdirSync(distDir, { recursive: true });
  } catch {}

  const candidates = [];
  walkDir(projectPath, (file) => {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.css' || ext === '.js') candidates.push(file);
  });

  const results = [];
  for (const file of candidates) {
    const ext = path.extname(file);
    const isCSS = ext === '.css';
    try {
      const code = fs.readFileSync(file, 'utf-8');
      const min = isCSS ? minifyCSS(code) : minifyJS(code);
      const inSize = Buffer.byteLength(code, 'utf-8');
      const outSize = Buffer.byteLength(min, 'utf-8');
      const rel = path.relative(projectPath, file);
      const outFile = path.join(distDir, rel);
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, min, 'utf-8');
      results.push({ file: rel, inSize, outSize, saved: inSize - outSize });
    } catch (err) {
      results.push({ file: path.relative(projectPath, file), error: err.message });
    }
  }

  return { built: results.length, results };
}

module.exports = {
  MIME,
  projectPort,
  detectRun,
  describeProject,
  startStaticServer,
  walkDir,
  minifyCSS,
  minifyJS,
  buildProject,
};
