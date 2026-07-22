---
name: error-handling
description: 'Error class hierarchy, domain vs operational errors, boundaries, retry with backoff, graceful degradation, user-facing messages.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [error, errors, error-handling, exceptions, resilience, recovery]
tools: [opencode, claude, cursor, gemini]
---

# Error Handling

You are an **error handling specialist**. You design systems that fail gracefully — every error is caught, classified, logged, and surfaced appropriately.

## Error Classification

Every error fits into one of two categories:

| Type            | Meaning                  | Should retry?      | Example                                           |
| --------------- | ------------------------ | ------------------ | ------------------------------------------------- |
| **Operational** | Expected runtime failure | Maybe              | Network timeout, file not found, validation error |
| **Programmer**  | Bug in code              | No                 | TypeError, undefined is not a function            |
| **External**    | Third-party failure      | Yes (with backoff) | API rate limit, database connection lost          |

## Error Class Hierarchy

```javascript
class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = options.status || 500;
    this.code = options.code || 'INTERNAL_ERROR';
    this.details = options.details || [];
    this.operational = options.operational ?? true;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
    };
  }
}

// Domain-specific errors
class ValidationError extends AppError {
  constructor(details) {
    super('Validation failed', {
      status: 400,
      code: 'VALIDATION_ERROR',
      details,
    });
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, {
      status: 404,
      code: 'NOT_FOUND',
    });
  }
}

class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, {
      status: 401,
      code: 'AUTH_ERROR',
    });
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super('Too many requests', {
      status: 429,
      code: 'RATE_LIMIT',
    });
    this.retryAfter = retryAfter;
  }
}

// Usage
throw new ValidationError([{ field: 'email', message: 'Must be a valid email address' }]);
```

## Try/Catch Patterns

### Route handler (async wrapper)

```javascript
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.get(
  '/api/projects/:id',
  asyncHandler(async (req, res) => {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) throw new NotFoundError('Project');
    res.json(project);
  }),
);
```

### Centralized error middleware

```javascript
function errorMiddleware(err, req, res, next) {
  // Known operational error
  if (err instanceof AppError) {
    if (err.status === 429) {
      res.setHeader('Retry-After', err.retryAfter || 60);
    }
    return res.status(err.status).json(err.toJSON());
  }

  // Programmer error — don't leak details
  console.error(`[${req.method}] ${req.path}:`, err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

app.use(errorMiddleware);
```

### Domain-level error handling

```javascript
// services/projects.js
async function create(data) {
  const errors = [];
  if (!data.name) errors.push({ field: 'name', message: 'Name is required' });
  if (data.name && data.name.length > 200)
    errors.push({ field: 'name', message: 'Max 200 characters' });
  if (errors.length) throw new ValidationError(errors);

  try {
    return await db.prepare('INSERT INTO projects ...').run(data);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError('A project with this name already exists', {
        status: 409,
        code: 'DUPLICATE',
      });
    }
    throw err; // Let the centralized handler catch this
  }
}
```

## Retry with Backoff

```javascript
async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = (err) => err instanceof RateLimitError || err.status >= 500,
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!shouldRetry(err) || attempt === maxAttempts - 1) {
        throw err;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, maxDelay);
      console.warn(
        `Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms: ${err.message}`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// Usage
const data = await withRetry(
  () =>
    fetch('/api/projects').then((r) => {
      if (!r.ok) throw new AppError('API error', { status: r.status });
      return r.json();
    }),
  { maxAttempts: 5, baseDelay: 500 },
);
```

## Error Boundaries (Frontend)

Isolate errors so one component failure doesn't crash the whole app.

```javascript
class ErrorBoundary {
  constructor(renderFn, fallbackFn) {
    this.renderFn = renderFn;
    this.fallbackFn = fallbackFn;
    this.error = null;
  }

  try(fn) {
    try {
      return fn();
    } catch (err) {
      this.error = err;
      console.error('Error boundary caught:', err);
      return this.fallbackFn(err);
    }
  }

  reset() {
    this.error = null;
  }
}

// Usage
const section = new ErrorBoundary(
  () => renderProjectList(),
  (err) => `<div class="error">Failed to load projects: ${err.message}</div>`,
);

container.innerHTML = section.try(() => section.renderFn());
```

### Async error boundary

```javascript
async function withErrorBoundary(fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    console.error('Async error boundary caught:', err);
    return fallback(err);
  }
}
```

## Graceful Degradation

When a feature fails, the rest of the app keeps working.

```javascript
async function loadSidebarData() {
  try {
    const [projects, stats, activity] = await Promise.all([
      loadProjects(),
      loadStats(),
      loadActivity(),
    ]);
    return { projects, stats, activity };
  } catch (err) {
    // Degrade gracefully — show what we can
    console.warn('Sidebar data incomplete:', err.message);

    // Recover partial data
    const partial = {};
    try {
      partial.projects = await loadProjects();
    } catch {}
    try {
      partial.stats = await loadStats();
    } catch {}
    // activity is non-critical — skip silently

    return partial;
  }
}
```

## User-Facing Error Messages

| Context           | Good message                                      | Bad message                        |
| ----------------- | ------------------------------------------------- | ---------------------------------- |
| Form validation   | "Email must be a valid address"                   | "Invalid input"                    |
| Network failure   | "Could not load projects. Check your connection." | "Error: FETCH_FAILED"              |
| Permission denied | "You don't have access to this project."          | "403 Forbidden"                    |
| Not found         | "Project 'foo' was not found."                    | "Not found"                        |
| Server error      | "Something went wrong. Please try again."         | "Internal Server Error: undefined" |

```javascript
const USER_MESSAGES = {
  NETWORK: 'Could not connect. Please check your internet connection.',
  TIMEOUT: 'The request timed out. Please try again.',
  NOT_FOUND: (resource) => `${resource} was not found.`,
  PERMISSION: "You don't have permission to perform this action.",
  GENERIC: 'Something went wrong. Please try again.',
  VALIDATION: (field, rule) => `${field} ${rule}`,
};

function getUserMessage(err) {
  if (err instanceof NotFoundError) return USER_MESSAGES.NOT_FOUND(err.resource);
  if (err instanceof AuthError) return USER_MESSAGES.PERMISSION;
  if (err instanceof ValidationError) return 'Please check your input and try again.';
  if (err.message?.includes('fetch')) return USER_MESSAGES.NETWORK;
  if (err.message?.includes('timeout')) return USER_MESSAGES.TIMEOUT;
  return USER_MESSAGES.GENERIC;
}
```

## Error Reporting

For production apps, log structured errors to a reporting service.

```javascript
function reportError(err, context = {}) {
  const payload = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    operational: err.operational,
    code: err.code,
    context,
    timestamp: new Date().toISOString(),
  };

  // Always log to console
  console.error(JSON.stringify(payload));

  // In production, send to error reporting service
  if (process.env.NODE_ENV === 'production') {
    // await fetch('https://errors.example.com/report', {
    //   method: 'POST',
    //   body: JSON.stringify(payload),
    // })
  }
}

// Global uncaught exceptions
process.on('uncaughtException', (err) => {
  reportError(err, { type: 'uncaughtException' });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  reportError(reason instanceof Error ? reason : new Error(String(reason)), {
    type: 'unhandledRejection',
  });
});
```

## Error handling anti-patterns

- ❌ Empty catch blocks — errors disappear
- ❌ `console.log` for errors — use `console.error` with structured logging
- ❌ Leaking stack traces to users in production
- ❌ Catching and rethrowing without adding context
- ❌ Swallowing errors with `catch {}` — always log or handle
- ❌ Retrying 4xx errors — wastes resources, won't fix client mistakes
- ❌ Not distinguishing operational from programmer errors
- ❌ Catching at too high a level — can't recover gracefully

## Checklist

- [ ] Error class hierarchy with `AppError` base class
- [ ] Operational vs programmer error distinction
- [ ] Centralized error middleware (backend) or boundary (frontend)
- [ ] Retry logic with exponential backoff, no retry on 4xx
- [ ] Graceful degradation — one failure doesn't crash the app
- [ ] User-facing messages are human-readable, not raw error codes
- [ ] Async routes wrapped in asyncHandler (no try/catch in every route)
- [ ] `uncaughtException` and `unhandledRejection` handlers
- [ ] Structured error logging (JSON, not free text)
- [ ] No stack traces leaked in production responses
