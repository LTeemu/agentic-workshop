import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import compression from 'compression';
import { runAudit } from './audit/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, '..', 'data');
const AUDITS_DIR = path.join(DATA_DIR, 'audits');

// Compress all responses
app.use(compression());

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src *; connect-src 'self'; frame-ancestors 'self' http://localhost:* https://localhost:*",
  );
  next();
});

app.use(express.json());

// Static assets — hashed filenames get long immutable cache, others get short cache
app.use(
  '/assets',
  express.static(path.join(__dirname, '..', 'dist', 'assets'), {
    maxAge: '1y',
    immutable: true,
  }),
);
app.use(
  express.static(path.join(__dirname, '..', 'dist'), {
    maxAge: '5m',
  }),
);

function sanitizeHostname(hostname) {
  return hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
}

function safeTimestamp(iso) {
  return iso.replace(/:/g, '-').replace(/\./g, '-');
}

function loadPreviousAudit(hostDir) {
  const auditDir = path.join(AUDITS_DIR, hostDir);
  if (!fs.existsSync(auditDir)) return null;

  const files = fs
    .readdirSync(auditDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  try {
    return JSON.parse(fs.readFileSync(path.join(auditDir, files[0]), 'utf-8'));
  } catch {
    return null;
  }
}

function computeChanges(current, previous) {
  if (!previous) return { isFirst: true, deltas: {} };

  const deltas = {};

  const lhCur = current.lighthouse || {};
  const lhPrev = previous.lighthouse || {};

  for (const key of ['performance', 'accessibility', 'bestPractices', 'seo']) {
    const c = lhCur[key];
    const p = lhPrev[key];
    if (c !== null && c !== undefined && p !== null && p !== undefined) {
      const diff = Math.round((c - p) * 100);
      if (diff !== 0) deltas[`lh.${key}`] = `${diff > 0 ? '+' : ''}${diff}`;
    }
  }

  for (const key of ['lcp', 'tbt']) {
    const c = lhCur[key];
    const p = lhPrev[key];
    if (c !== null && c !== undefined && p !== null && p !== undefined && p > 0) {
      const pct = Math.round(((c - p) / p) * 100);
      if (Math.abs(pct) >= 5) deltas[`lh.${key}`] = `${pct > 0 ? '+' : ''}${pct}%`;
    }
  }

  for (const [key, label] of [['cls', 'CLS']]) {
    const c = lhCur[key];
    const p = lhPrev[key];
    if (c !== null && c !== undefined && p !== null && p !== undefined) {
      const diff = c - p;
      if (Math.abs(diff) > 0.01) deltas[`lh.${key}`] = `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`;
    }
  }

  const aCur = current.anatomy || {};
  const aPrev = previous.anatomy || {};
  if (aCur.totalBytes && aPrev.totalBytes && aPrev.totalBytes > 0) {
    const pct = Math.round(((aCur.totalBytes - aPrev.totalBytes) / aPrev.totalBytes) * 100);
    if (Math.abs(pct) >= 5) deltas['size'] = `${pct > 0 ? '+' : ''}${pct}%`;
  }
  if (
    aCur.totalRequests !== undefined &&
    aPrev.totalRequests !== undefined &&
    aPrev.totalRequests > 0
  ) {
    const diff = aCur.totalRequests - aPrev.totalRequests;
    if (diff !== 0) deltas['requests'] = `${diff > 0 ? '+' : ''}${diff}`;
  }

  for (const key of ['compression', 'caching']) {
    const c = current[key]?.score;
    const p = previous[key]?.score;
    if (c !== undefined && p !== undefined && c !== null && p !== null) {
      const diff = c - p;
      if (Math.abs(diff) >= 5) deltas[key] = `${diff > 0 ? '+' : ''}${diff}`;
    }
  }

  const cCarbon = current.carbon?.rating;
  const pCarbon = previous.carbon?.rating;
  if (cCarbon && pCarbon && cCarbon !== pCarbon) {
    deltas.carbon = `${pCarbon} → ${cCarbon}`;
  }

  return { isFirst: false, deltas };
}

function buildChangeTag(changes) {
  if (changes.isFirst) return '';
  const d = changes.deltas;
  const parts = [];

  if (d['lh.performance']) parts.push(`perf${d['lh.performance']}`);
  if (d['lh.lcp']) parts.push(`lcp${d['lh.lcp']}`);
  if (d.size) parts.push(`size${d.size}`);
  if (d.requests) parts.push(`req${d.requests}`);

  return parts.length > 0 ? `_${parts.join('_')}` : '_same';
}

app.post('/api/audit', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  let normalized, parsed;
  try {
    normalized = url.startsWith('http') ? url : `https://${url}`;
    parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Only http and https URLs are supported' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    const result = await runAudit(normalized);
    result.url = normalized;
    result.timestamp = new Date().toISOString();

    // Extract screenshot buffer before serialising (can't JSON.stringify a Buffer)
    const screenshot = result.screenshot || null;
    delete result.screenshot;

    const hostDir = sanitizeHostname(parsed.host);
    const changes = computeChanges(result, loadPreviousAudit(hostDir));
    result.changes = changes;

    const hasError = !!result.lighthouse?.error;
    if (!hasError) {
      const auditDir = path.join(AUDITS_DIR, hostDir);
      const tag = buildChangeTag(changes);
      const filename = `${safeTimestamp(result.timestamp)}${tag}.json`;
      const filepath = path.join(auditDir, filename);

      fs.mkdirSync(auditDir, { recursive: true });
      fs.writeFileSync(filepath, JSON.stringify(result, null, 2));

      // Save screenshot alongside the JSON if one was captured
      if (screenshot) {
        const shotFilename = `${safeTimestamp(result.timestamp)}${tag}.png`;
        fs.writeFileSync(path.join(auditDir, shotFilename), screenshot);
      }

      // Don't embed screenshot in latest.json either
      fs.writeFileSync(path.join(DATA_DIR, 'latest.json'), JSON.stringify(result, null, 2));
    }

    // Return screenshot URL in the response so frontend can load it
    const screenshotFilename =
      hasError || !screenshot
        ? null
        : `${safeTimestamp(result.timestamp)}${buildChangeTag(changes)}.png`;

    res.json({ ...result, screenshotFilename });
  } catch (err) {
    console.error('Audit failed:', err);
    res.status(500).json({
      error: 'Audit failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

app.get('/api/latest', (_req, res) => {
  try {
    const file = path.join(DATA_DIR, 'latest.json');
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf-8');
      return res.json(JSON.parse(data));
    }
    res.json(null);
  } catch {
    res.json(null);
  }
});

app.get('/api/urls', (_req, res) => {
  try {
    if (!fs.existsSync(AUDITS_DIR)) return res.json([]);

    const entries = fs.readdirSync(AUDITS_DIR, { withFileTypes: true });
    const urls = entries
      .filter((e) => e.isDirectory())
      .map((dir) => {
        const audits = fs
          .readdirSync(path.join(AUDITS_DIR, dir.name))
          .filter((f) => f.endsWith('.json'))
          .sort()
          .reverse();
        // Read the latest audit to get the original URL and host
        let url = null;
        let host = null;
        if (audits.length > 0) {
          try {
            const data = JSON.parse(
              fs.readFileSync(path.join(AUDITS_DIR, dir.name, audits[0]), 'utf-8'),
            );
            url = data.url || null;
            if (url) host = new URL(url).host;
          } catch {
            /* ignore */
          }
        }
        return { hostname: dir.name, audits, url, host };
      })
      .filter((u) => u.audits.length > 0);

    res.json(urls);
  } catch {
    res.json([]);
  }
});

app.get('/api/history', (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url query parameter is required' });
  }

  try {
    const parsed = new URL(url);
    const hostDir = sanitizeHostname(parsed.host);
    const auditDir = path.join(AUDITS_DIR, hostDir);

    if (!fs.existsSync(auditDir)) {
      return res.json([]);
    }

    const files = fs
      .readdirSync(auditDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, 50);

    const audits = files
      .map((f) => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(auditDir, f), 'utf-8'));
          const lh = data.lighthouse || {};
          return {
            timestamp: data.timestamp,
            lighthouse: {
              performance: lh.performance ?? null,
              accessibility: lh.accessibility ?? null,
              bestPractices: lh.bestPractices ?? null,
              seo: lh.seo ?? null,
              fcp: lh.fcp ?? null,
              lcp: lh.lcp ?? null,
              tbt: lh.tbt ?? null,
              cls: lh.cls ?? null,
              si: lh.si ?? null,
            },
            anatomy: data.anatomy
              ? { totalBytes: data.anatomy.totalBytes, totalRequests: data.anatomy.totalRequests }
              : null,
            compression: data.compression ? { score: data.compression.score } : null,
            caching: data.caching ? { score: data.caching.score } : null,
            durationMs: data.durationMs,
            changes: data.changes || null,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    res.json(audits);
  } catch {
    res.json([]);
  }
});

app.get('/api/audit/:hostname/:filename', (req, res) => {
  const { hostname, filename } = req.params;
  const safe = sanitizeHostname(hostname);
  const filepath = path.join(AUDITS_DIR, safe, filename);

  if (!filename.endsWith('.json') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  try {
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Audit not found' });
    }
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to load audit' });
  }
});

// Serve a saved screenshot alongside an audit result
app.get('/api/screenshot/:hostname/:filename', (req, res) => {
  const { hostname, filename } = req.params;
  const safe = sanitizeHostname(hostname);
  const filepath = path.join(AUDITS_DIR, safe, filename);

  if (!filename.endsWith('.png') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  try {
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }
    const shot = fs.readFileSync(filepath);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(shot);
  } catch {
    res.status(500).json({ error: 'Failed to load screenshot' });
  }
});

function deleteAuditFile(hostname, filename) {
  if (!filename.endsWith('.json') || filename.includes('..')) {
    return { ok: false, status: 400, error: 'Invalid filename' };
  }
  const safe = sanitizeHostname(hostname);
  const filepath = path.join(AUDITS_DIR, safe, filename);
  if (!fs.existsSync(filepath)) {
    return { ok: false, status: 404, error: 'Audit not found' };
  }
  fs.unlinkSync(filepath);
  // Also delete the associated screenshot if one exists
  const shotFilepath = filepath.replace(/\.json$/, '.png');
  try {
    if (fs.existsSync(shotFilepath)) fs.unlinkSync(shotFilepath);
  } catch {
    /* ignore */
  }
  // Clean up empty hostname directories
  try {
    const remaining = fs.readdirSync(path.join(AUDITS_DIR, safe));
    if (remaining.length === 0) {
      fs.rmdirSync(path.join(AUDITS_DIR, safe));
    }
  } catch {
    /* race: directory already removed */
  }
  return { ok: true };
}

app.delete('/api/audit/:hostname/:filename', (req, res) => {
  const { hostname, filename } = req.params;
  const r = deleteAuditFile(hostname, filename);
  if (!r.ok) return res.status(r.status).json({ error: r.error });

  const safe = sanitizeHostname(hostname);
  const auditDir = path.join(AUDITS_DIR, safe);
  const remaining = fs.existsSync(auditDir)
    ? fs.readdirSync(auditDir).filter((f) => f.endsWith('.json'))
    : [];

  res.json({ deleted: filename, remaining });
});

app.post('/api/audits/delete', express.json(), (req, res) => {
  const { files } = req.body;
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'files array is required' });
  }

  const results = [];
  for (const f of files) {
    const r = deleteAuditFile(f.hostname, f.filename);
    results.push({ hostname: f.hostname, filename: f.filename, ok: r.ok, error: r.error });
  }

  const ok = results.every((r) => r.ok);
  res.json({ ok, results });
});

// Inline the small CSS into HTML to eliminate render-blocking
let cachedHtml = null;
function getIndexHtml() {
  if (cachedHtml) return cachedHtml;
  const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (!fs.existsSync(htmlPath)) return null;
  let html = fs.readFileSync(htmlPath, 'utf-8');
  // Replace external CSS link with inline <style>
  const cssMatch = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
  if (cssMatch) {
    const cssPath = path.join(__dirname, '..', 'dist', cssMatch[1]);
    if (fs.existsSync(cssPath)) {
      const css = fs.readFileSync(cssPath, 'utf-8');
      html = html.replace(cssMatch[0], `<style>${css}</style>`);
    }
  }
  cachedHtml = html;
  return html;
}

app.get('*', (_req, res) => {
  const html = getIndexHtml();
  if (html) {
    res.type('html').set('Cache-Control', 'no-cache').send(html);
  } else {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Performance Lab server running on http://localhost:${PORT}`);
});
