---
name: caching
description: 'Caching strategies — HTTP cache headers, ETag/If-None-Match, in-memory TTL caches, Redis caching patterns, CDN, service worker, stale-while-revalidate, memoization, cache invalidation.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [caching, cache, performance, http-cache, redis, cdn, memoization]
tools: [opencode, claude, cursor, gemini]
---

# Caching

You are a **caching specialist**. You decide what to cache, for how long, and how to invalidate it — at every layer of the stack.

## Cache Layers (top to bottom)

| Layer                     | Scope                 | Latency | Typical TTL     |
| ------------------------- | --------------------- | ------- | --------------- |
| Browser memory            | Single page session   | 0ms     | Session         |
| localStorage/IndexedDB    | Single origin         | 1-5ms   | Hours/days      |
| Service worker            | Single origin         | 1-10ms  | Configurable    |
| HTTP cache (CDN)          | Edge/multiple users   | 10-50ms | Minutes/hours   |
| Application cache (Redis) | Server, all instances | 0.5-2ms | Seconds/minutes |
| Database cache            | Server                | 1-10ms  | Query-specific  |

## HTTP Caching Headers

Control caching at the browser and CDN level.

### Cache-Control

```javascript
// Never cache (auth responses, dynamic data)
res.setHeader('Cache-Control', 'no-store');

// Cache for 1 hour, allow CDN to cache
res.setHeader('Cache-Control', 'public, max-age=3600');

// Cache for 1 hour, stale for 1 more hour (stale-while-revalidate)
res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=3600');

// Cache for 1 minute, private (no CDN)
res.setHeader('Cache-Control', 'private, max-age=60');

// Must revalidate with server before using cached copy
res.setHeader('Cache-Control', 'no-cache');
```

| Directive                  | Meaning                                        |
| -------------------------- | ---------------------------------------------- |
| `public`                   | CDN and browser may cache                      |
| `private`                  | Only browser may cache (no CDN)                |
| `no-store`                 | Never cache                                    |
| `no-cache`                 | Must revalidate on every use                   |
| `max-age=N`                | Cache for N seconds from response              |
| `stale-while-revalidate=N` | Serve stale for N seconds while fetching fresh |
| `must-revalidate`          | Strict revalidation when stale                 |

### ETag / If-None-Match

```javascript
// Server: generate and send ETag
app.get('/api/projects', async (req, res) => {
  const data = await loadProjects();
  const etag = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');

  // Client sent matching ETag — not modified
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.setHeader('ETag', etag);
  res.json(data);
});
```

### Last-Modified / If-Modified-Since

```javascript
app.get('/api/projects', async (req, res) => {
  const lastModified = await getLastModified();

  const since = req.headers['if-modified-since'];
  if (since && new Date(since) >= lastModified) {
    return res.status(304).end();
  }

  res.setHeader('Last-Modified', lastModified.toUTCString());
  const data = await loadProjects();
  res.json(data);
});
```

## In-Memory Cache (Single Process)

```javascript
class MemoryCache {
  constructor(defaultTTL = 60000) {
    this.store = new Map();
    this.defaultTTL = defaultTTL;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttl = this.defaultTTL) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  // Auto-cleanup stale entries every minute
  startCleanup(interval = 60000) {
    return setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (now > entry.expiresAt) this.store.delete(key);
      }
    }, interval);
  }

  stopCleanup(timer) {
    clearInterval(timer);
  }
}

// Usage
const projectCache = new MemoryCache(30000); // 30s TTL

async function getProject(id) {
  const cached = projectCache.get(id);
  if (cached) return cached;

  const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  projectCache.set(id, project);
  return project;
}
```

## Redis Caching (Multi-Process / Distributed)

### Basic pattern

```javascript
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

async function getCachedOrFetch(key, fetcher, ttl = 300) {
  const cached = await client.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetcher();
  await client.setEx(key, ttl, JSON.stringify(data));
  return data;
}
```

### Cache-aside (lazy population)

```
1. Read from cache
2. If miss → read from DB, write to cache
3. Return data
```

### Write-through

```
1. Write to DB
2. Write to cache (or invalidate)
3. Return
```

### Cache invalidation strategies

| Strategy             | How                                        | Best for                                  |
| -------------------- | ------------------------------------------ | ----------------------------------------- |
| TTL expiry           | Set max-age on every entry                 | Most cases — simple, eventual consistency |
| Write-through update | Update cache when DB is written            | Read-heavy, write-light data              |
| Cache invalidation   | Delete cache key on write                  | When stale data is unacceptable           |
| Versioned keys       | `projects:v2:123` — bump version on deploy | Schema changes, migrations                |

```javascript
// Invalidation on write
async function updateProject(id, data) {
  const project = await db
    .prepare('UPDATE projects SET ... WHERE id = ? RETURNING *')
    .get(data, id);
  await client.del(`project:${id}`); // Invalidate cache
  await client.del('projects:list'); // Invalidate list cache
  return project;
}

// Versioned keys — bump VERSION on schema change
const VERSION = 'v2';
async function getProject(id) {
  const cached = await client.get(`${VERSION}:project:${id}`);
  if (cached) return JSON.parse(cached);
  // ... fetch and cache
}
```

## Stale-While-Revalidate Pattern

Serve stale data instantly, refresh in the background.

```javascript
class SWRCache {
  constructor(fetchFn, options = {}) {
    this.fetchFn = fetchFn;
    this.ttl = options.ttl || 60000;
    this.staleTtl = options.staleTtl || 300000;
    this.cache = new Map();
    this.pending = new Map();
  }

  async get(key) {
    const now = Date.now();
    const entry = this.cache.get(key);

    // Cache hit — fresh
    if (entry && now - entry.timestamp < this.ttl) {
      return entry.value;
    }

    // Cache hit — stale but usable, revalidate in background
    if (entry && now - entry.timestamp < this.staleTtl) {
      this.revalidate(key);
      return entry.value;
    }

    // Cache miss or too stale — fetch synchronously
    return this.fetch(key);
  }

  async revalidate(key) {
    if (this.pending.has(key)) return;
    this.pending.set(key, true);
    try {
      const value = await this.fetchFn(key);
      this.cache.set(key, { value, timestamp: Date.now() });
    } catch {
    } finally {
      this.pending.delete(key);
    }
  }

  async fetch(key) {
    const value = await this.fetchFn(key);
    this.cache.set(key, { value, timestamp: Date.now() });
    return value;
  }
}
```

## Memoization (Function-Level Cache)

```javascript
function memoize(fn, getKey = (...args) => JSON.stringify(args)) {
  const cache = new Map();

  return (...args) => {
    const key = getKey(...args);
    if (cache.has(key)) return cache.get(key);

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// With TTL
function memoizeWithTTL(fn, ttl = 60000, getKey = (...args) => JSON.stringify(args)) {
  const cache = new Map();

  return (...args) => {
    const key = getKey(...args);
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < ttl) {
      return entry.value;
    }

    const result = fn(...args);
    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  };
}

// Usage
const getProjectStats = memoize(async (projectId) => {
  const [views, likes, shares] = await Promise.all([
    db.prepare('SELECT COUNT(*) FROM views WHERE project_id = ?').get(projectId),
    db.prepare('SELECT COUNT(*) FROM likes WHERE project_id = ?').get(projectId),
    db.prepare('SELECT COUNT(*) FROM shares WHERE project_id = ?').get(projectId),
  ]);
  return { views: views['COUNT(*)'], likes: likes['COUNT(*)'], shares: shares['COUNT(*)'] };
}, 60000);
```

## Service Worker Caching (Browser)

```javascript
// sw.js
const CACHE = 'app-v1';
const PRECACHE_URLS = ['/', '/style.css', '/app.js', '/offline.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('fetch', (event) => {
  // Cache-first for static assets
  if (event.request.url.match(/\.(css|js|png|svg|woff2)$/)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Network-first for API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Stale-while-revalidate for everything else
  event.respondWith(staleWhileRevalidate(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  return cached || fetch(request);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    return caches.match(request) || caches.match('/offline.html');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}
```

## Cache Invalidation

The two hard things in computer science: cache invalidation and naming things.

### Invalidating on write

```javascript
async function writeProject(id, data) {
  // 1. Write to database
  await db.prepare('UPDATE projects SET ... WHERE id = ?').run(data, id);

  // 2. Invalidate all related cache keys
  await Promise.all([
    cache.delete(`project:${id}`),
    cache.delete('projects:list'),
    cache.delete('projects:stats'),
  ]);
}
```

### Tag-based invalidation

```javascript
// Assign tags to cached entries
cache.set(`project:${id}`, data, { tags: ['project', `project:${id}`] });

// Invalidate by tag
async function invalidateTag(tag) {
  const keys = await cache.getKeysByTag(tag);
  await Promise.all(keys.map((k) => cache.delete(k)));
}

// On project update, invalidate all project-related caches
await invalidateTag('project');
```

## Caching anti-patterns

- ❌ Caching everything — wastes memory, stale data risks
- ❌ No TTL on cache entries — memory leak, never refreshes
- ❌ Caching authenticated/user-specific data without private directive
- ❌ Cache-aside without write invalidation — users see stale data
- ❌ Over-caching — more cache misses than hits (wasted overhead)
- ❌ Memoization on non-pure functions (depends on Date, random, external state)

## Checklist

- [ ] Cache-Control headers set appropriately per response type
- [ ] ETag or Last-Modified used for API responses
- [ ] In-memory cache has TTL and cleanup interval
- [ ] Redis cache has TTL on every key
- [ ] Cache is invalidated on write (not just TTL)
- [ ] SWR pattern has separate fresh and stale TTLs
- [ ] Service worker has cache-first / network-first strategy per resource type
- [ ] Memoization only on pure functions
- [ ] Cache keys include version when schema may change
- [ ] No sensitive/user data cached in shared/CDN caches
