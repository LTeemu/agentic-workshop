import { execSync } from 'child_process';
import express from 'express';
import helmet from 'helmet';
import { generateReading } from './sensor-sim.js';
import { validateReading, validateReadingSafe } from './pipeline/validate.js';
import { cleanReading } from './pipeline/clean.js';
import { getThresholds, updateThresholds } from './pipeline/thresholds.js';
import {
  storeReading,
  getReadings,
  getStats,
  getAnomalies,
  pruneOldReadings,
} from './pipeline/store.js';
import { TtlCache } from './cache.js';
import { TokenBucketLimiter } from './rate-limiter.js';
import config from './config.js';

const app = express();
const cache = new TtlCache();
const limiter = new TokenBucketLimiter();

// ── SSE clients ──
const sseClients = [];

// ── Middleware ──

app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline styles/scripts for the demo dashboard
    frameguard: false, // Allow embedding in Workshop iframe (localhost:3000)
  }),
);
app.use(express.json({ limit: '1kb' }));

// Block outside access — only allow localhost connections
app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  const isLocal =
    ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';
  if (!isLocal) {
    res.status(403).json({ error: 'Access denied — localhost only' });
    return;
  }
  next();
});

app.use((req, res, next) => {
  // Remove any CORS headers to prevent cross-origin access
  res.removeHeader('Access-Control-Allow-Origin');
  next();
});

// ── REST API Routes ──

/**
 * GET /api/health
 * Returns server status and metrics.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    readingsGenerated: readingCount,
    sseClients: sseClients.length,
    cacheSize: cache.size,
    rateLimitClients: limiter.clientCount,
  });
});

/**
 * GET /api/sensors/recent
 * Returns the most recent readings (from cache first, then DB).
 */
app.get('/api/sensors/recent', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const type = req.query.type || undefined;

  // Try cache first
  const cacheKey = `recent:${limit}:${type || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const readings = getReadings({ limit, type });
  cache.set(cacheKey, readings, config.cache.recentTtlMs);
  res.json(readings);
});

/**
 * GET /api/sensors/history
 * Paginated history with optional type and time range filters.
 */
app.get('/api/sensors/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  const type = req.query.type || undefined;
  const since = req.query.since ? parseInt(req.query.since, 10) : undefined;

  const readings = getReadings({ limit, type, since });
  res.json(readings);
});

/**
 * GET /api/sensors/stats
 * Aggregated statistics per sensor type.
 */
app.get('/api/sensors/stats', (req, res) => {
  const since = req.query.since ? parseInt(req.query.since, 10) : undefined;

  const cacheKey = `stats:${since || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const stats = getStats(since);
  cache.set(cacheKey, stats, config.cache.statsTtlMs);
  res.json(stats);
});

/**
 * GET /api/sensors/anomalies
 * Recently detected anomaly events.
 */
app.get('/api/sensors/anomalies', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 200);
  res.json(getAnomalies(limit));
});

/**
 * GET /api/sensors/thresholds
 * Returns current anomaly thresholds per sensor type.
 */
app.get('/api/sensors/thresholds', (req, res) => {
  res.json(getThresholds());
});

/**
 * PUT /api/sensors/thresholds
 * Update anomaly thresholds at runtime. Accepts partial updates.
 * Body: { temperature: { max: 50 }, maxTempJump: 20 }
 */
app.put('/api/sensors/thresholds', express.json(), (req, res) => {
  updateThresholds(req.body);
  res.json(getThresholds());
});

// ── SSE Stream ──

/**
 * GET /api/sensors/stream
 * Server-Sent Events endpoint. Streams sensor readings as they are generated.
 * Supports Last-Event-ID for reconnection.
 */
app.get('/api/sensors/stream', (req, res) => {
  // Rate limit check
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const result = limiter.consume(clientIp);
  if (!result.allowed) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: result.retryAfter,
    });
    return;
  }

  if (sseClients.length >= config.sse.maxClients) {
    res.status(503).json({ error: 'Server busy, too many clients' });
    return;
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Send initial connected event
  res.write(
    `event: connected\ndata: {"status":"connected","clientCount":${sseClients.length + 1}}\n\n`,
  );

  sseClients.push(res);
  let heartbeatTimer = null;

  // Heartbeat to keep connection alive
  heartbeatTimer = setInterval(() => {
    try {
      res.write(`:heartbeat ${Date.now()}\n\n`);
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, config.sse.heartbeatMs);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeatTimer);
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// ── Frontend static files ──

app.use(
  express.static(config.staticDir, {
    index: 'index.html',
    extensions: ['html', 'js', 'css'],
    setHeaders(res, filePath) {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    },
  }),
);

// ── 404 Handler ──

app.use((req, res) => {
  if (req.url.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' });
  } else {
    res.status(404).send('Not found');
  }
});

// ── Error Handler ──

app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${err.message}`, err.stack?.split('\n').slice(0, 3).join(' '));

  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ── Sensor Data Generator ──

let readingCount = 0;

/**
 * Generate a reading, run it through the pipeline, cache + broadcast it.
 */
function generateAndBroadcast() {
  try {
    const raw = generateReading();
    const validated = validateReading(raw);
    const cleaned = cleanReading(validated);
    storeReading(cleaned);
    readingCount++;

    // Update recent cache
    const recentCacheKey = `recent:50:all`;
    const cached = cache.get(recentCacheKey);
    if (cached) {
      cached.unshift(cleaned);
      if (cached.length > 100) cached.pop();
      cache.set(recentCacheKey, cached, config.cache.recentTtlMs);
    }

    // Invalidate stats cache so next request re-computes
    cache.invalidate('stats:');

    // Broadcast to SSE clients
    const eventType = cleaned.anomaly ? 'anomaly' : 'reading';
    const payload = `event: ${eventType}\nid: ${cleaned.id}\ndata: ${JSON.stringify(cleaned)}\n\n`;

    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        // Client disconnected — will be cleaned up on 'close' event
      }
    }

    // Periodically prune old data
    if (readingCount % 100 === 0) {
      pruneOldReadings();
    }
  } catch (err) {
    console.error('[PIPELINE] Error processing reading:', err.message);
    // Pipeline failures are logged but don't crash the server
  }
}

// Start generating sensor data
setInterval(generateAndBroadcast, config.sensor.intervalMs);

// ── Start Server ──

let server = null;
const MAX_LISTEN_RETRIES = 10;

/**
 * Try to listen on the configured port with exponential backoff.
 * Only one attempt is in flight at a time — no overlapping retries.
 */
function tryListen(attempt) {
  // Close any previous server instance cleanly before retrying
  if (server) {
    server.removeAllListeners('error');
    const old = server;
    server = null;
    old.close();
  }

  server = app.listen(config.port, config.bindAddr, () => {
    console.log(`SensorStream running at http://${config.bindAddr}:${config.port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < MAX_LISTEN_RETRIES) {
      const delay = Math.min(500 * Math.pow(2, attempt), 4000);
      console.error(
        `Port ${config.port} in use (attempt ${attempt + 1}/${MAX_LISTEN_RETRIES}) — retrying in ${delay}ms...`,
      );
      setTimeout(() => tryListen(attempt + 1), delay);
      return;
    }
    console.error('Fatal server error:', err.message);
    process.exit(1);
  });
}

tryListen(0);

// ── Graceful Shutdown ──

function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);

  // Close SSE clients
  for (const client of sseClients) {
    try {
      client.write(`event: shutdown\ndata: {}\n\n`);
      client.end();
    } catch {
      /* ignore */
    }
  }

  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });

  // Force exit after 5s
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
