---
name: data-fetching
description: 'Data fetching patterns — loading/error/success state machine, request deduplication, AbortController, retry with backoff, pagination, infinite scroll, optimistic updates, SWR, request batching.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [fetch, api, data-fetching, http, loading, pagination, swr]
tools: [opencode, claude, cursor, gemini]
---

# Data Fetching

You are a **data fetching specialist**. Every data load handles loading, error, empty, and success states. Requests are deduplicated, cancellable, and resilient to failure.

## State Machine

Every fetch goes through a predictable lifecycle.

```javascript
const FETCH_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

function createFetcher() {
  let state = FETCH_STATES.IDLE;
  let data = null;
  let error = null;

  return {
    getState() {
      return state;
    },
    getData() {
      return data;
    },
    getError() {
      return error;
    },

    async fetch(url, options = {}) {
      state = FETCH_STATES.LOADING;
      error = null;
      this.onChange?.();

      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        data = await res.json();
        state = FETCH_STATES.SUCCESS;
      } catch (err) {
        error = err.message;
        state = FETCH_STATES.ERROR;
      }

      this.onChange?.();
      return { data, error, state };
    },

    reset() {
      state = FETCH_STATES.IDLE;
      data = null;
      error = null;
      this.onChange?.();
    },
  };
}
```

## Request Deduplication

When multiple components request the same resource simultaneously, send one request.

```javascript
const requestCache = new Map();

async function dedupedFetch(url, options = {}) {
  const key = `${options.method || 'GET'}:${url}`;

  if (requestCache.has(key)) {
    return requestCache.get(key);
  }

  const promise = fetch(url, options)
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .finally(() => {
      requestCache.delete(key);
    });

  requestCache.set(key, promise);
  return promise;
}
```

## AbortController — Cancellation

Cancel in-flight requests when the component unmounts or params change.

```javascript
function fetchWithSignal(url, options = {}) {
  const controller = new AbortController();
  const signal = controller.signal;

  const promise = fetch(url, { ...options, signal }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

  return { promise, cancel: () => controller.abort() };
}

// Usage — cancel previous request on new params
let currentFetch = null;

async function loadProjects(params) {
  currentFetch?.cancel();
  currentFetch = fetchWithSignal(`/api/projects?${new URLSearchParams(params)}`);
  return currentFetch.promise;
}
```

## Retry with Exponential Backoff

```javascript
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;

      // Don't retry 4xx errors
      if (err.message.startsWith('HTTP 4')) throw err;

      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
```

### Retry decision table

| Status        | Retry? | Reason                             |
| ------------- | ------ | ---------------------------------- |
| 2xx           | No     | Success                            |
| 4xx           | No     | Client error — retrying won't help |
| 429           | Yes    | Rate limited — retry after backoff |
| 5xx           | Yes    | Server error — may recover         |
| Network error | Yes    | Transient — connection issue       |
| Timeout       | Yes    | Server may be overloaded           |

## Pagination

### Offset-based

```javascript
async function fetchPage(url, page, limit = 20) {
  const params = new URLSearchParams({ page, limit });
  const res = await fetch(`${url}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
  // Expected: { items: [], total: 142, page: 1, limit: 20, totalPages: 8 }
}

// Paginated loader
function createPaginator(url) {
  let page = 0;
  let hasMore = true;
  let loading = false;

  return {
    async loadMore() {
      if (loading || !hasMore) return null;
      loading = true;
      page++;
      try {
        const result = await fetchPage(url, page);
        hasMore = page < result.totalPages;
        return result.items;
      } finally {
        loading = false;
      }
    },
    get hasMore() {
      return hasMore;
    },
    get loading() {
      return loading;
    },
    reset() {
      page = 0;
      hasMore = true;
      loading = false;
    },
  };
}
```

### Cursor-based

```javascript
async function fetchCursor(url, cursor, limit = 20) {
  const params = new URLSearchParams({ limit });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`${url}?${params}`);
  return res.json();
  // Expected: { items: [], nextCursor: 'abc123', hasMore: true }
}

function createCursorPaginator(url) {
  let cursor = null;
  let hasMore = true;
  let loading = false;

  return {
    async loadMore() {
      if (loading || !hasMore) return null;
      loading = true;
      try {
        const result = await fetchCursor(url, cursor);
        cursor = result.nextCursor;
        hasMore = result.hasMore;
        return result.items;
      } finally {
        loading = false;
      }
    },
    get hasMore() {
      return hasMore;
    },
    get loading() {
      return loading;
    },
    reset() {
      cursor = null;
      hasMore = true;
    },
  };
}
```

### Infinite scroll (Intersection Observer)

```javascript
function setupInfiniteScroll(loader, containerEl, sentinelEl) {
  const observer = new IntersectionObserver(
    async (entries) => {
      if (entries[0].isIntersecting && loader.hasMore) {
        const items = await loader.loadMore();
        if (items) {
          items.forEach((item) => appendItem(containerEl, item));
        }
      }
    },
    { rootMargin: '200px' },
  );

  observer.observe(sentinelEl);
  return () => observer.disconnect();
}
```

## Optimistic Updates

Update the UI immediately, then sync with the server.

```javascript
async function optimisticUpdate(store, apiCall, optimisticData, rollbackData) {
  // Apply optimistic update
  store.setState(optimisticData);

  try {
    await apiCall();
  } catch (err) {
    // Rollback on failure
    store.setState(rollbackData);
    throw err;
  }
}

// Usage
async function toggleFavorite(projectId, currentlyFav) {
  return optimisticUpdate(
    favStore,
    () => fetch(`/api/projects/${projectId}/favorite`, { method: 'POST' }),
    { [projectId]: !currentlyFav }, // optimistic
    { [projectId]: currentlyFav }, // rollback
  );
}
```

## SWR (Stale-While-Revalidate)

Show cached data immediately, refresh in background.

```javascript
const swrCache = new Map();

async function swr(key, fetcher, ttl = 60000) {
  const cached = swrCache.get(key);
  const now = Date.now();

  // Return cached data if fresh
  if (cached && now - cached.timestamp < ttl) {
    return cached.data;
  }

  // Show stale data while revalidating
  if (cached) {
    fetcher()
      .then((data) => {
        swrCache.set(key, { data, timestamp: Date.now() });
      })
      .catch(() => {}); // Silent background refresh
    return cached.data;
  }

  // No cache — fetch fresh
  const data = await fetcher();
  swrCache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

## Request Batching

Combine multiple requests into one.

```javascript
function createBatcher(delay = 16) {
  let queue = new Map();
  let timer = null;

  function flush() {
    const batch = queue;
    queue = new Map();
    timer = null;
    return batch;
  }

  return {
    async add(key, fetcher) {
      return new Promise((resolve, reject) => {
        queue.set(key, { fetcher, resolve, reject });

        if (!timer) {
          timer = setTimeout(async () => {
            const batch = flush();
            const entries = [...batch.entries()];
            try {
              // Execute all batched fetchers in parallel
              const results = await Promise.allSettled(entries.map(([, v]) => v.fetcher()));
              results.forEach((result, i) => {
                const [, v] = entries[i];
                if (result.status === 'fulfilled') v.resolve(result.value);
                else v.reject(result.reason);
              });
            } catch (err) {
              entries.forEach(([, v]) => v.reject(err));
            }
          }, delay);
        }
      });
    },
  };
}
```

## Data fetching anti-patterns

- ❌ Ignoring loading state — show a spinner or skeleton
- ❌ Ignoring error state — show error message with retry
- ❌ Not cancelling requests on unmount — race conditions
- ❌ Fetching in a loop instead of using pagination
- ❌ No retry for transient failures
- ❌ `Promise.all` without error isolation (one failure takes down all)
- ❌ Caching without TTL — user sees stale data forever

## Checklist

- [ ] Every fetch handles loading / empty / error / success states
- [ ] Requests are cancellable via AbortController
- [ ] Duplicate requests are deduplicated
- [ ] Retry implemented with exponential backoff (no retry on 4xx)
- [ ] Pagination has loading guard (no double-fetch)
- [ ] Infinite scroll uses Intersection Observer, not scroll events
- [ ] Optimistic updates roll back on server error
- [ ] SWR cache has TTL and background revalidation
- [ ] Request batching groups microtask-level calls
- [ ] No Promise.allSettled without individual error handling
